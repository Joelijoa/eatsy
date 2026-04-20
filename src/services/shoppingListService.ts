import {
  collection, doc, addDoc, getDocs, updateDoc, deleteDoc, query, where, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { ShoppingItem } from '../types';

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
