import { ActionCodeSettings } from 'firebase/auth';

// URL affichée après clic sur le lien dans l'email Firebase.
// Remplacez par votre domaine Firebase Hosting une fois configuré
// (Firebase Console → Hosting → "Ajouter un domaine personnalisé" ou utiliser le domaine par défaut).
// Exemple : https://eatsy-app.web.app
const CONTINUE_URL = process.env.EXPO_PUBLIC_EMAIL_ACTION_URL ?? 'https://eatsy-app.web.app';

export const EMAIL_VERIFICATION_SETTINGS: ActionCodeSettings = {
  url: CONTINUE_URL,
  handleCodeInApp: false,
};
