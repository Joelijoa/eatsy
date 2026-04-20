import {
  collection,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  doc,
  query,
  where,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { WeekPlan, DayPlan, ShoppingList, ShoppingItem } from '../types';

const emptyDay = (): DayPlan => ({
  breakfast: { recipeId: null },
  lunch: { recipeId: null },
  dinner: { recipeId: null },
});

export const getOrCreateWeekPlan = async (userId: string, weekStart: string): Promise<WeekPlan> => {
  const q = query(
    collection(db, 'weekPlans'),
    where('userId', '==', userId),
    where('weekStart', '==', weekStart)
  );
  const snap = await getDocs(q);

  if (!snap.empty) {
    const d = snap.docs[0];
    return { ...d.data(), id: d.id } as WeekPlan;
  }

  const newPlan: Omit<WeekPlan, 'id'> = {
    userId,
    weekStart,
    days: {
      monday: emptyDay(),
      tuesday: emptyDay(),
      wednesday: emptyDay(),
      thursday: emptyDay(),
      friday: emptyDay(),
      saturday: emptyDay(),
      sunday: emptyDay(),
    },
    weeklyBudgetLimit: 150,
  };

  const ref = await addDoc(collection(db, 'weekPlans'), newPlan);
  return { ...newPlan, id: ref.id };
};

export const updateMealSlot = async (
  planId: string,
  day: keyof WeekPlan['days'],
  mealType: keyof DayPlan,
  slot: Partial<DayPlan[keyof DayPlan]>
): Promise<void> => {
  await updateDoc(doc(db, 'weekPlans', planId), {
    [`days.${day}.${mealType}`]: slot,
  });
};

export const generateShoppingList = async (
  userId: string,
  plan: WeekPlan,
  recipes: Record<string, any>
): Promise<ShoppingList> => {
  const itemsMap: Record<string, ShoppingItem> = {};

  for (const [dayKey, dayPlan] of Object.entries(plan.days)) {
    for (const [mealKey, slot] of Object.entries(dayPlan)) {
      if (!slot.recipeId) continue;
      const recipe = recipes[slot.recipeId];
      if (!recipe) continue;

      for (const ing of recipe.ingredients) {
        const key = `${ing.name.toLowerCase()}-${ing.unit}`;
        if (itemsMap[key]) {
          itemsMap[key].quantity += ing.quantity;
        } else {
          itemsMap[key] = {
            id: key,
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            price: ing.price,
            checked: false,
            recipeId: slot.recipeId,
            recipeName: recipe.name,
          };
        }
      }
    }
  }

  const items = Object.values(itemsMap);
  const totalCost = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const shoppingList: Omit<ShoppingList, 'id'> = {
    userId,
    weekStart: plan.weekStart,
    items,
    totalCost,
    createdAt: new Date(),
  };

  const q = query(
    collection(db, 'shoppingLists'),
    where('userId', '==', userId),
    where('weekStart', '==', plan.weekStart)
  );
  const existing = await getDocs(q);

  if (!existing.empty) {
    const ref = existing.docs[0].ref;
    await updateDoc(ref, { items, totalCost });
    return { ...shoppingList, id: ref.id };
  }

  const ref = await addDoc(collection(db, 'shoppingLists'), {
    ...shoppingList,
    createdAt: Timestamp.fromDate(shoppingList.createdAt),
  });
  return { ...shoppingList, id: ref.id };
};

export const getWeekStart = (date: Date = new Date()): string => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
};
