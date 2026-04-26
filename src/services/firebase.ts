import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyC3TacpcVZhQGDAWyk9MlDgH4TYCcwd_3M",
  authDomain: "eatsy-app-4424e.firebaseapp.com",
  projectId: "eatsy-app-4424e",
  storageBucket: "eatsy-app-4424e.firebasestorage.app",
  messagingSenderId: "1046792377093",
  appId: "1:1046792377093:web:deb2e136c1f4ad9de99d6c",
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }),
});
export const storage = getStorage(app);

export default app;
