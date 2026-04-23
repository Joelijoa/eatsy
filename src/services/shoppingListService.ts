import {
  collection, doc, addDoc, getDocs, updateDoc, deleteDoc, query, where, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { ShoppingItem, WeekPlan } from '../types';
import { getRecipe } from './recipeService';
import { getPantryItems, convertAmount } from './pantryService';

const COLL = 'shoppingItems';

export const getShoppingItems = async (userId: string): Promise<ShoppingItem[]> => {
  const q = query(collection(db, COLL), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ ...d.data(), id: d.id } as ShoppingItem & { userId: string; createdAt?: any }))
    .sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
};

export const addShoppingItem = async (
  userId: string,
  item: Omit<ShoppingItem, 'id' | 'checked'>,
): Promise<ShoppingItem> => {
  const data = { ...item, userId, checked: false, createdAt: new Date() };
  const ref = await addDoc(collection(db, COLL), data);
  return { ...item, id: ref.id, checked: false };
};

export const toggleShoppingItem = async (itemId: string, checked: boolean): Promise<void> => {
  await updateDoc(doc(db, COLL, itemId), { checked });
};

export const deleteShoppingItem = async (itemId: string): Promise<void> => {
  await deleteDoc(doc(db, COLL, itemId));
};

export const clearCheckedItems = async (userId: string): Promise<void> => {
  const q = query(collection(db, COLL), where('userId', '==', userId), where('checked', '==', true));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
};

export const clearAllShoppingItems = async (userId: string): Promise<void> => {
  const q = query(collection(db, COLL), where('userId', '==', userId));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
};

const normName = (n: string) =>
  n.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '');

export interface GenerateResult {
  added: number;
  inStock: number;
  noMeals: boolean;
}

export const generateShoppingItemsFromPlan = async (
  userId: string,
  plan: WeekPlan,
  merge: boolean,
): Promise<GenerateResult> => {
  const DAY_KEYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;
  const MEAL_KEYS = ['breakfast','lunch','dinner'] as const;

  // 1. Count occurrences of each recipeId in the plan
  const recipeOccurrences = new Map<string, number>();
  const recipeNames = new Map<string, string>();
  for (const day of DAY_KEYS) {
    for (const meal of MEAL_KEYS) {
      const slot = plan.days[day][meal];
      if (slot.recipeId) {
        recipeOccurrences.set(slot.recipeId, (recipeOccurrences.get(slot.recipeId) ?? 0) + 1);
        if (slot.recipeName) recipeNames.set(slot.recipeId, slot.recipeName);
      }
    }
  }
  if (recipeOccurrences.size === 0) return { added: 0, inStock: 0, noMeals: true };

  // 2. Load recipes and aggregate ingredients (qty × occurrences)
  const recipeList = await Promise.all(
    Array.from(recipeOccurrences.entries()).map(([id]) => getRecipe(id)),
  );

  type AggregatedItem = { name: string; quantity: number; unit: string; price: number };
  const aggregated = new Map<string, AggregatedItem>();

  for (const recipe of recipeList) {
    if (!recipe) continue;
    const count = recipeOccurrences.get(recipe.id) ?? 1;
    for (const ing of recipe.ingredients) {
      const key = `${normName(ing.name)}__${ing.unit.toLowerCase()}`;
      if (aggregated.has(key)) {
        aggregated.get(key)!.quantity += ing.quantity * count;
      } else {
        aggregated.set(key, {
          name: ing.name,
          quantity: ing.quantity * count,
          unit: ing.unit,
          price: ing.price,
        });
      }
    }
  }

  // 3. Fetch pantry to subtract what's already available
  const pantry = await getPantryItems(userId);

  // 4. Clear existing list if replacing
  if (!merge) await clearAllShoppingItems(userId);

  // 5. Batch-add items that are still needed
  const batch = writeBatch(db);
  let added = 0;
  let inStock = 0;

  for (const item of aggregated.values()) {
    const pantryMatch = pantry.find((p) => normName(p.name) === normName(item.name));
    let neededQty = item.quantity;

    if (pantryMatch) {
      const available = convertAmount(pantryMatch.quantity, pantryMatch.unit, item.unit)
        ?? pantryMatch.quantity;
      if (available >= neededQty) { inStock++; continue; }
      neededQty = Math.round((neededQty - available) * 100) / 100;
    }

    const ref = doc(collection(db, COLL));
    batch.set(ref, {
      userId,
      name: item.name,
      quantity: Math.round(neededQty * 10) / 10,
      unit: item.unit,
      price: item.price,
      checked: false,
      createdAt: new Date(),
    });
    added++;
  }

  await batch.commit();
  return { added, inStock, noMeals: false };
};
