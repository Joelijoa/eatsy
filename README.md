# Eatsy — Planificateur de repas intelligent

> Organisez vos repas, gérez vos recettes et maîtrisez votre budget alimentaire.

---

## Présentation

**Eatsy** (easy + eat) est une application mobile de planification de repas qui vous aide à :

- **Planifier** votre semaine culinaire en quelques tapotements
- **Gérer** votre collection de recettes avec photos, ingrédients et instructions
- **Suivre** votre budget alimentaire semaine par semaine
- **Gérer** votre garde-manger et savoir ce qui vous manque
- **Créer** vos listes de courses manuellement ou depuis votre planning
- **Scanner** des produits en magasin via leur code-barres pour les ajouter directement

---

## Stack technique

| Technologie | Usage |
|---|---|
| React Native (Expo SDK 54) | Application mobile cross-platform |
| Firebase Auth | Authentification (email/mot de passe) |
| Cloud Firestore | Base de données (recettes, planning, courses, garde-manger) |
| expo-file-system | Stockage local des photos de recettes |
| expo-camera | Scanner de codes-barres |
| expo-local-authentication | Verrouillage biométrique |
| expo-notifications | Rappels de repas |

---

## Fonctionnalités

### Authentification
- Inscription / connexion par email
- Vérification d'adresse email
- Réinitialisation du mot de passe
- Session persistante (pas besoin de se reconnecter)
- Verrouillage biométrique optionnel (empreinte / Face ID)

### Recettes
- Créer, modifier, supprimer des recettes
- Photo depuis la galerie (stockée localement sur l'appareil)
- Ingrédients avec quantités, unités et prix
- Calcul automatique du coût total et coût par portion
- Instructions étape par étape
- Catégories personnalisées
- Filtres : type de repas (équilibré, rapide, gourmand), catégorie, recherche
- Mode cuisine (guide pas à pas avec minuteur intégré)

### Planning hebdomadaire
- Vue semaine avec petit-déjeuner, déjeuner et dîner pour chaque jour
- Assignation de recettes à chaque créneau
- Navigation entre semaines

### Liste de courses
- Ajout manuel d'articles
- Génération automatique depuis le planning de la semaine
- Cocher les articles achetés avec option d'ajout au garde-manger
- Suppression groupée des articles cochés

### Budget
- Suivi des dépenses alimentaires
- Budget hebdomadaire paramétrable

### Garde-manger
- Suivi des stocks (quantités disponibles)
- Vérification automatique des ingrédients disponibles pour une recette
- Déduction du stock après préparation
- Scanner de codes-barres pour ajouter un produit rapidement

### Paramètres
- Langue : Français / English
- Devise : EUR / MAD
- Mode sombre
- Notifications de repas configurables
- Verrouillage biométrique

---

## Installation & Configuration

### Prérequis
- [Node.js](https://nodejs.org/) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) : `npm install -g expo-cli`
- [EAS CLI](https://docs.expo.dev/eas/) : `npm install -g eas-cli`
- Un projet Firebase (voir ci-dessous)

### 1. Cloner et installer

```bash
git clone https://github.com/jjoanna/eatsy.git
cd EatsyApp
npm install
```

### 2. Configurer Firebase

Créer un projet sur [Firebase Console](https://console.firebase.google.com) et activer :
- **Authentication** → Email/Mot de passe
- **Cloud Firestore** → en mode production
- **Storage** (optionnel)

Copier les informations de configuration dans `src/services/firebase.ts` :

```ts
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};
```

Consulter `FIREBASE_SETUP.md` pour les règles Firestore à configurer.

### 3. Lancer en développement

```bash
npx expo start
```

Scanner le QR code avec **Expo Go** (iOS / Android).

### 4. Builder l'APK (Android)

```bash
eas login
eas build:configure   # première fois seulement
eas build --platform android --profile preview
```

Le lien de téléchargement de l'APK sera fourni à la fin du build (~10-15 min).

---

## Structure du projet

```
EatsyApp/
├── assets/               # Icône et favicon
├── src/
│   ├── components/       # Composants réutilisables (EatsyButton, EatsyInput, …)
│   ├── constants/        # Couleurs, typographie, espacements
│   ├── context/          # AuthContext, PreferencesContext (i18n + devise), AlertContext
│   ├── hooks/            # Hooks personnalisés
│   ├── navigation/       # AppNavigator (stack + onglets)
│   ├── screens/
│   │   ├── auth/         # Login, Register, ForgotPassword
│   │   ├── main/         # Dashboard, WeeklyPlanner, Recipes, ShoppingList, Budget, …
│   │   ├── OnboardingScreen.tsx
│   │   ├── WelcomeScreen.tsx
│   │   └── LockScreen.tsx
│   ├── services/         # Firebase, recettes, planning, courses, garde-manger
│   └── types/            # Types TypeScript
├── app.json              # Configuration Expo
├── eas.json              # Configuration EAS Build
└── FIREBASE_SETUP.md     # Guide de configuration Firebase
```

---

## Design system — *The Curated Table*

| Élément | Valeur |
|---|---|
| Couleur primaire | `#006b1b` (vert) |
| Couleur tertiaire | `#924700` (orange) |
| Police headlines | Plus Jakarta Sans |
| Police corps | Be Vietnam Pro |
| Style | Glassmorphism, cartes "lifted", pas de bordures 1px |

---

## Licence

Projet personnel — tous droits réservés.
