import {
  collection, doc, addDoc, getDocs, updateDoc, deleteDoc,
  query, where, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { PantryItem, Ingredient } from '../types';

const COLL = 'pantryItems';

// ── Unit conversion ─────────────────────────────────────────────────────────

type UnitType = 'mass' | 'volume' | 'count';

const UNIT_BASE: Record<string, { factor: number; type: UnitType }> = {
  g:        { factor: 1,       type: 'mass' },
  kg:       { factor: 1000,    type: 'mass' },
  mg:       { factor: 0.001,   type: 'mass' },
  ml:       { factor: 1,       type: 'volume' },
  cl:       { factor: 10,      type: 'volume' },
  dl:       { factor: 100,     type: 'volume' },
  l:        { factor: 1000,    type: 'volume' },
  pcs:      { factor: 1,       type: 'count' },
  unité:    { factor: 1,       type: 'count' },
  unite:    { factor: 1,       type: 'count' },
  sachet:   { factor: 1,       type: 'count' },
  boîte:    { factor: 1,       type: 'count' },
  boite:    { factor: 1,       type: 'count' },
  bouteille:{ factor: 1,       type: 'count' },
  tranche:  { factor: 1,       type: 'count' },
};

const normalizeUnit = (u: string) => u.toLowerCase().trim();
const normalizeName = (n: string) => n.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Convert `qty` from `fromUnit` to `toUnit`. Returns null if incompatible. */
export const convertAmount = (qty: number, fromUnit: string, toUnit: string): number | null => {
  const from = UNIT_BASE[normalizeUnit(fromUnit)];
  const to   = UNIT_BASE[normalizeUnit(toUnit)];
  if (!from || !to) return null;
  if (from.type !== to.type) return null;
  return (qty * from.factor) / to.factor;
};

/** Display a quantity nicely: "1 000 g" → "1 kg", "500 ml" → "0.5 L" */
export const displayQty = (qty: number, unit: string): string => {
  const u = normalizeUnit(unit);
  if (u === 'g' && qty >= 1000) return `${(qty / 1000).toFixed(2).replace(/\.?0+$/, '')} kg`;
  if (u === 'ml' && qty >= 1000) return `${(qty / 1000).toFixed(2).replace(/\.?0+$/, '')} L`;
  return `${qty % 1 === 0 ? qty : qty.toFixed(1)} ${unit}`;
};

// ── CRUD ─────────────────────────────────────────────────────────────────────

export const getPantryItems = async (userId: string): Promise<PantryItem[]> => {
  const q = query(collection(db, COLL), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ ...d.data(), id: d.id } as PantryItem & { updatedAt: any }))
    .map((d) => ({ ...d, updatedAt: d.updatedAt?.toDate?.() ?? new Date() }))
    .sort((a, b) => normalizeName(a.name).localeCompare(normalizeName(b.name)));
};

export const addOrMergePantryItem = async (
  userId: string,
  name: string,
  quantity: number,
  unit: string,
): Promise<PantryItem> => {
  // Check if item with same name already exists
  const existing = await getPantryItems(userId);
  const match = existing.find((i) => normalizeName(i.name) === normalizeName(name));

  if (match) {
    // Try to merge quantities via unit conversion
    const converted = convertAmount(quantity, unit, match.unit);
    const newQty = converted !== null ? match.quantity + converted : match.quantity + quantity;
    await updateDoc(doc(db, COLL, match.id), { quantity: newQty, updatedAt: new Date() });
    return { ...match, quantity: newQty };
  }

  const data = { userId, name: name.trim(), quantity, unit, updatedAt: new Date() };
  const ref = await addDoc(collection(db, COLL), data);
  return { ...data, id: ref.id };
};

export const updatePantryQuantity = async (itemId: string, quantity: number): Promise<void> => {
  await updateDoc(doc(db, COLL, itemId), { quantity, updatedAt: new Date() });
};

export const deletePantryItem = async (itemId: string): Promise<void> => {
  await deleteDoc(doc(db, COLL, itemId));
};

// ── Stock check & deduction ──────────────────────────────────────────────────

export type StockStatus = 'ok' | 'partial' | 'missing';

export interface IngredientStockInfo {
  ingredient: Ingredient;
  status: StockStatus;
  availableQty: number;
  availableUnit: string;
  pantryItemId?: string;
}

/** Check which recipe ingredients are available in the pantry. */
export const checkRecipeStock = async (
  userId: string,
  ingredients: Ingredient[],
): Promise<IngredientStockInfo[]> => {
  const pantry = await getPantryItems(userId);

  return ingredients.map((ing) => {
    const match = pantry.find((p) => normalizeName(p.name) === normalizeName(ing.name));
    if (!match) return { ingredient: ing, status: 'missing', availableQty: 0, availableUnit: ing.unit };

    const available = convertAmount(match.quantity, match.unit, ing.unit);
    const qty = available !== null ? available : match.quantity;

    let status: StockStatus = 'missing';
    if (qty >= ing.quantity) status = 'ok';
    else if (qty > 0) status = 'partial';

    return {
      ingredient: ing,
      status,
      availableQty: match.quantity,
      availableUnit: match.unit,
      pantryItemId: match.id,
    };
  });
};

/** Deduct recipe ingredients from the pantry. */
export const deductRecipeFromPantry = async (
  userId: string,
  ingredients: Ingredient[],
): Promise<void> => {
  const pantry = await getPantryItems(userId);
  const batch = writeBatch(db);

  for (const ing of ingredients) {
    const match = pantry.find((p) => normalizeName(p.name) === normalizeName(ing.name));
    if (!match) continue;

    const neededInPantryUnit = convertAmount(ing.quantity, ing.unit, match.unit);
    const needed = neededInPantryUnit !== null ? neededInPantryUnit : ing.quantity;
    const remaining = Math.max(0, match.quantity - needed);

    if (remaining === 0) {
      batch.delete(doc(db, COLL, match.id));
    } else {
      batch.update(doc(db, COLL, match.id), { quantity: remaining, updatedAt: new Date() });
    }
  }

  await batch.commit();
};
