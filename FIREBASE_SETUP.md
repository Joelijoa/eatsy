# Configuration Firebase pour Eatsy

## 1. Créer un projet Firebase

1. Aller sur https://console.firebase.google.com
2. Cliquer "Ajouter un projet" → nommer "eatsy-app"
3. Désactiver Google Analytics (optionnel)

## 2. Activer les services

### Authentication
- Console Firebase → Authentication → Sign-in method
- Activer **Email/Password**

### Firestore Database
- Console Firebase → Firestore Database → Créer une base de données
- Choisir **mode production** (ou test pour développement)

### Storage (pour les images)
- Console Firebase → Storage → Commencer

## 3. Récupérer la configuration

- Console Firebase → Paramètres du projet (⚙️) → Vos applications → Ajouter une application **Web** (React Native utilise le SDK JS)
- Copier les valeurs dans `src/services/firebase.ts`

```ts
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "eatsy-app.firebaseapp.com",
  projectId: "eatsy-app",
  storageBucket: "eatsy-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc123",
};
```

## 4. Règles Firestore (à copier dans la console)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /recipes/{recipeId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
    match /categories/{categoryId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
    match /weekPlans/{planId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
    match /shoppingLists/{listId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
  }
}
```

## 5. Lancer l'application

```bash
cd EatsyApp
npm start
# Scanner le QR code avec Expo Go (Android/iOS)
# ou appuyer sur 'a' pour Android, 'i' pour iOS (simulateur)
```
