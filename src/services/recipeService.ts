import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import * as FileSystem from 'expo-file-system';
import { db } from './firebase';
import { Recipe, Category } from '../types';

const recipesCol = (userId: string) =>
  query(collection(db, 'recipes'), where('userId', '==', userId));

export const getRecipes = async (userId: string): Promise<Recipe[]> => {
  const q = query(collection(db, 'recipes'), where('userId', '==', userId));
  const snap = await getDocs(q);
  const recipes = snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
    } as Recipe;
  });
  return recipes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const getRecipe = async (recipeId: string): Promise<Recipe | null> => {
  const snap = await getDoc(doc(db, 'recipes', recipeId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { ...data, id: snap.id, createdAt: data.createdAt?.toDate?.() ?? new Date() } as Recipe;
};

export const addRecipe = async (recipe: Omit<Recipe, 'id'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'recipes'), {
    ...recipe,
    createdAt: Timestamp.fromDate(recipe.createdAt),
  });
  return ref.id;
};

export const updateRecipe = async (id: string, recipe: Partial<Recipe>): Promise<void> => {
  await updateDoc(doc(db, 'recipes', id), recipe);
};

export const deleteRecipe = async (id: string): Promise<void> => {
  const snap = await getDoc(doc(db, 'recipes', id));
  if (snap.exists()) {
    const imageUrl = snap.data().imageUrl as string | undefined;
    if (imageUrl?.startsWith(FileSystem.documentDirectory ?? '')) {
      await FileSystem.deleteAsync(imageUrl, { idempotent: true });
    }
  }
  await deleteDoc(doc(db, 'recipes', id));
};

export const getCategories = async (userId: string): Promise<Category[]> => {
  const q = query(collection(db, 'categories'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Category));
};

export const addCategory = async (category: Omit<Category, 'id'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'categories'), category);
  return ref.id;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'categories', id));
};

export const calculateRecipeCost = (recipe: Recipe): { totalCost: number; costPerServing: number } => {
  const totalCost = recipe.ingredients.reduce((sum, ing) => sum + ing.price * ing.quantity, 0);
  const costPerServing = recipe.servings > 0 ? totalCost / recipe.servings : 0;
  return { totalCost, costPerServing };
};
