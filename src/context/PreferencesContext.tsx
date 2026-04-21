import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'fr' | 'en';
export type Currency = 'EUR' | 'MAD';

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  fr: {
    // Common
    common_save: 'Enregistrer',
    common_cancel: 'Annuler',
    common_delete: 'Supprimer',
    common_edit: 'Modifier',
    common_add: 'Ajouter',
    common_back: 'Retour',
    common_confirm: 'Confirmer',
    common_all: 'Tout',
    common_yes: 'Oui',
    common_no: 'Non',
    common_loading: 'Chargement...',
    common_error: 'Erreur',
    common_optional: 'Optionnel',
    common_required: 'Requis',
    common_name_required: 'Nom requis',
    // Tabs
    tabs_home: 'Accueil',
    tabs_planner: 'Planning',
    tabs_recipes: 'Recettes',
    tabs_shopping: 'Courses',
    tabs_budget: 'Budget',
    tabs_stock: 'Stock',
    // Wellness
    wellness_balanced: 'Équilibré',
    wellness_quick: 'Rapide',
    wellness_indulgent: 'Plaisir',
    // Meals
    meal_breakfast: 'Petit-déj.',
    meal_breakfast_full: 'Petit-déjeuner',
    meal_lunch: 'Déjeuner',
    meal_dinner: 'Dîner',
    // Dashboard
    dashboard_greeting_morning: 'Bonjour',
    dashboard_greeting_afternoon: 'Bon après-midi',
    dashboard_greeting_evening: 'Bonsoir',
    dashboard_next_meal: 'Prochain repas',
    dashboard_nothing_planned: 'Rien de planifié',
    dashboard_weekly_spend: 'Dépenses semaine',
    dashboard_meals: 'repas',
    dashboard_avg_day: 'moy./jour',
    dashboard_recipes_count: 'recettes',
    dashboard_today_menu: 'Menu du jour',
    dashboard_wellness: 'Équilibre alimentaire',
    dashboard_this_week: 'Cette semaine',
    dashboard_next_badge: 'Suivant',
    dashboard_not_planned: 'Non planifié',
    dashboard_variety_score: 'Variété',
    dashboard_total_planned: 'Planifiés',
    dashboard_wellness_score: 'Équilibre',
    dashboard_recipes_label: 'Recettes',
    dashboard_meals_label: 'Repas / sem.',
    dashboard_tip_over: 'Budget dépassé. Remplacez un repas par une soupe économique.',
    dashboard_tip_ok: 'Budget bien géré. Continuez ainsi !',
    dashboard_settings: 'Paramètres',
    dashboard_per_person: '/pers.',
    // Recipes
    recipes_title: 'Recettes',
    recipes_add: 'Ajouter',
    recipes_search: 'Rechercher...',
    recipes_no_results: 'Aucun résultat.',
    recipes_create_first: 'Créez votre première recette.',
    recipes_none: 'Aucune recette',
    recipes_count_one: 'recette',
    recipes_count_many: 'recettes',
    recipes_min: 'min',
    recipes_pers: 'pers.',
    recipes_scan: 'Scanner',
    // Shopping
    shopping_title: 'Courses',
    shopping_add_item: 'Ajouter un article',
    shopping_empty_title: 'Liste vide',
    shopping_empty_desc: 'Ajoutez vos articles de courses.',
    shopping_to_buy: 'À acheter',
    shopping_in_cart: 'Dans le panier',
    shopping_total: 'Total estimé',
    shopping_articles: 'Articles',
    shopping_checked: 'Cochés',
    shopping_subtotal: 'Sous-total',
    shopping_item_name: 'Nom de l\'article',
    shopping_quantity: 'Quantité',
    shopping_unit: 'Unité',
    shopping_price_unit: 'Prix unitaire',
    shopping_clear_checked: 'Effacer cochés',
    shopping_delete_confirm: 'Supprimer cet article ?',
    shopping_new_item: 'Nouvel article',
    // Planner
    planner_title: 'Planning',
    planner_week_of: 'Semaine du',
    planner_add_meal: 'Ajouter un repas',
    planner_choose_recipe: 'Choisir une recette',
    planner_no_recipes: 'Aucune recette disponible.',
    planner_day_cost: 'Coût du jour',
    planner_meals_planned: 'repas planifiés',
    planner_clear_slot: 'Vider le créneau',
    planner_overview: 'Vue semaine',
    // Budget
    budget_title: 'Budget',
    // Settings
    settings_title: 'Paramètres',
    settings_language: 'Langue',
    settings_currency: 'Devise',
    settings_french: 'Français',
    settings_english: 'English',
    settings_eur: 'Euro (€)',
    settings_mad: 'Dirham marocain (MAD)',
    settings_account: 'Compte',
    settings_logout: 'Se déconnecter',
    settings_app: 'Application',
    settings_preferences: 'Préférences',
    settings_logout_confirm: 'Se déconnecter de votre compte ?',
    settings_darkmode: 'Mode sombre',
    settings_darkmode_sub: 'Thème sombre pour les yeux',
    settings_help: 'Aide & guide',
    settings_help_title: 'Comment utiliser Eatsy',
    settings_copyright: 'À propos',
    settings_version: 'Version',
    settings_copyright_text: '© 2025 Eatsy. Tous droits réservés.',
    settings_appearance: 'Apparence',
    help_planner_title: 'Planning hebdomadaire',
    help_planner_desc: 'Planifiez vos repas (petit-déj., déjeuner, dîner) pour chaque jour de la semaine. Appuyez sur un créneau pour choisir une recette.',
    help_recipes_title: 'Recettes',
    help_recipes_desc: 'Créez et gérez vos recettes. Utilisez le scanner pour ajouter des ingrédients depuis un code-barres.',
    help_shopping_title: 'Liste de courses',
    help_shopping_desc: 'Ajoutez vos articles et cochez-les au fur et à mesure de vos achats. Le total estimé se calcule automatiquement.',
    help_budget_title: 'Budget',
    help_budget_desc: 'Suivez vos dépenses hebdomadaires. Le budget est calculé à partir du coût de vos repas planifiés.',
    help_pantry_title: 'Garde-manger',
    help_pantry_desc: 'Gérez votre stock d\'ingrédients à la maison. Mettez à jour les quantités après vos courses.',
    // Loading
    loading_1: 'Préparation de vos recettes…',
    loading_2: 'Calcul de votre budget hebdomadaire…',
    loading_3: 'Chargement de votre planning…',
    loading_4: 'Cuisinez malin avec Eatsy.',
    loading_5: 'Votre semaine culinaire se prépare…',
    loading_6: 'Synchronisation de vos listes de courses…',
  },
  en: {
    // Common
    common_save: 'Save',
    common_cancel: 'Cancel',
    common_delete: 'Delete',
    common_edit: 'Edit',
    common_add: 'Add',
    common_back: 'Back',
    common_confirm: 'Confirm',
    common_all: 'All',
    common_yes: 'Yes',
    common_no: 'No',
    common_loading: 'Loading...',
    common_error: 'Error',
    common_optional: 'Optional',
    common_required: 'Required',
    common_name_required: 'Name required',
    // Tabs
    tabs_home: 'Home',
    tabs_planner: 'Planner',
    tabs_recipes: 'Recipes',
    tabs_shopping: 'Shopping',
    tabs_budget: 'Budget',
    tabs_stock: 'Stock',
    // Wellness
    wellness_balanced: 'Balanced',
    wellness_quick: 'Quick',
    wellness_indulgent: 'Indulgent',
    // Meals
    meal_breakfast: 'Breakfast',
    meal_breakfast_full: 'Breakfast',
    meal_lunch: 'Lunch',
    meal_dinner: 'Dinner',
    // Dashboard
    dashboard_greeting_morning: 'Good morning',
    dashboard_greeting_afternoon: 'Good afternoon',
    dashboard_greeting_evening: 'Good evening',
    dashboard_next_meal: 'Next meal',
    dashboard_nothing_planned: 'Nothing planned',
    dashboard_weekly_spend: 'Weekly spending',
    dashboard_meals: 'meals',
    dashboard_avg_day: 'avg/day',
    dashboard_recipes_count: 'recipes',
    dashboard_today_menu: "Today's menu",
    dashboard_wellness: 'Food balance',
    dashboard_this_week: 'This week',
    dashboard_next_badge: 'Next',
    dashboard_not_planned: 'Not planned',
    dashboard_variety_score: 'Variety',
    dashboard_total_planned: 'Planned',
    dashboard_wellness_score: 'Balance',
    dashboard_recipes_label: 'Recipes',
    dashboard_meals_label: 'Meals / week',
    dashboard_tip_over: 'Budget exceeded. Try replacing a meal with a budget soup.',
    dashboard_tip_ok: 'Budget well managed. Keep it up!',
    dashboard_settings: 'Settings',
    dashboard_per_person: '/person',
    // Recipes
    recipes_title: 'Recipes',
    recipes_add: 'Add',
    recipes_search: 'Search...',
    recipes_no_results: 'No results.',
    recipes_create_first: 'Create your first recipe.',
    recipes_none: 'No recipes',
    recipes_count_one: 'recipe',
    recipes_count_many: 'recipes',
    recipes_min: 'min',
    recipes_pers: 'serv.',
    recipes_scan: 'Scan',
    // Shopping
    shopping_title: 'Shopping',
    shopping_add_item: 'Add item',
    shopping_empty_title: 'Empty list',
    shopping_empty_desc: 'Add your shopping items.',
    shopping_to_buy: 'To buy',
    shopping_in_cart: 'In cart',
    shopping_total: 'Estimated total',
    shopping_articles: 'Items',
    shopping_checked: 'Checked',
    shopping_subtotal: 'Cart subtotal',
    shopping_item_name: 'Item name',
    shopping_quantity: 'Quantity',
    shopping_unit: 'Unit',
    shopping_price_unit: 'Unit price',
    shopping_clear_checked: 'Clear checked',
    shopping_delete_confirm: 'Delete this item?',
    shopping_new_item: 'New item',
    // Planner
    planner_title: 'Planner',
    planner_week_of: 'Week of',
    planner_add_meal: 'Add a meal',
    planner_choose_recipe: 'Choose a recipe',
    planner_no_recipes: 'No recipes available.',
    planner_day_cost: 'Day cost',
    planner_meals_planned: 'meals planned',
    planner_clear_slot: 'Clear slot',
    planner_overview: 'Week overview',
    // Budget
    budget_title: 'Budget',
    // Settings
    settings_title: 'Settings',
    settings_language: 'Language',
    settings_currency: 'Currency',
    settings_french: 'Français',
    settings_english: 'English',
    settings_eur: 'Euro (€)',
    settings_mad: 'Moroccan Dirham (MAD)',
    settings_account: 'Account',
    settings_logout: 'Sign out',
    settings_app: 'App',
    settings_preferences: 'Preferences',
    settings_logout_confirm: 'Sign out of your account?',
    settings_darkmode: 'Dark mode',
    settings_darkmode_sub: 'Dark theme for your eyes',
    settings_help: 'Help & guide',
    settings_help_title: 'How to use Eatsy',
    settings_copyright: 'About',
    settings_version: 'Version',
    settings_copyright_text: '© 2025 Eatsy. All rights reserved.',
    settings_appearance: 'Appearance',
    help_planner_title: 'Weekly Planner',
    help_planner_desc: 'Plan your meals (breakfast, lunch, dinner) for each day of the week. Tap a slot to choose a recipe.',
    help_recipes_title: 'Recipes',
    help_recipes_desc: 'Create and manage your recipes. Use the scanner to add ingredients from a barcode.',
    help_shopping_title: 'Shopping List',
    help_shopping_desc: 'Add items and check them off as you shop. The estimated total is calculated automatically.',
    help_budget_title: 'Budget',
    help_budget_desc: 'Track your weekly spending. Budget is calculated from the cost of your planned meals.',
    help_pantry_title: 'Pantry',
    help_pantry_desc: 'Manage your home ingredient stock. Update quantities after shopping.',
    // Loading
    loading_1: 'Preparing your recipes…',
    loading_2: 'Calculating your weekly budget…',
    loading_3: 'Loading your planner…',
    loading_4: 'Cook smarter with Eatsy.',
    loading_5: 'Your culinary week is being prepared…',
    loading_6: 'Syncing your shopping lists…',
  },
};

interface PreferencesContextType {
  language: Language;
  currency: Currency;
  darkMode: boolean;
  loaded: boolean;
  setLanguage: (l: Language) => Promise<void>;
  setCurrency: (c: Currency) => Promise<void>;
  setDarkMode: (v: boolean) => Promise<void>;
  applyRemotePrefs: (prefs: { currency?: string; language?: string; darkMode?: boolean }) => void;
  t: (key: string) => string;
  formatCurrency: (amount: number) => string;
  currencySymbol: string;
}

const PreferencesContext = createContext<PreferencesContextType>({
  language: 'fr',
  currency: 'EUR',
  darkMode: false,
  loaded: false,
  setLanguage: async () => {},
  setCurrency: async () => {},
  setDarkMode: async () => {},
  applyRemotePrefs: () => {},
  t: (k) => k,
  formatCurrency: (a) => `${a.toFixed(2)} €`,
  currencySymbol: '€',
});

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('fr');
  const [currency, setCurrencyState] = useState<Currency>('EUR');
  const [darkMode, setDarkModeState] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [lang, curr, dark] = await Promise.all([
          AsyncStorage.getItem('eatsy_lang'),
          AsyncStorage.getItem('eatsy_currency'),
          AsyncStorage.getItem('eatsy_darkmode'),
        ]);
        if (lang === 'fr' || lang === 'en') setLanguageState(lang);
        if (curr === 'EUR' || curr === 'MAD') setCurrencyState(curr);
        if (dark === 'true') setDarkModeState(true);
      } catch (e) {
        // AsyncStorage unavailable, use defaults
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, []);

  const setLanguage = async (l: Language) => {
    setLanguageState(l);
    try { await AsyncStorage.setItem('eatsy_lang', l); } catch {}
  };

  const setCurrency = async (c: Currency) => {
    setCurrencyState(c);
    try { await AsyncStorage.setItem('eatsy_currency', c); } catch {}
  };

  const setDarkMode = async (v: boolean) => {
    setDarkModeState(v);
    try { await AsyncStorage.setItem('eatsy_darkmode', v ? 'true' : 'false'); } catch {}
  };

  const applyRemotePrefs = (prefs: { currency?: string; language?: string; darkMode?: boolean }) => {
    if (prefs.currency === 'EUR' || prefs.currency === 'MAD') setCurrencyState(prefs.currency);
    if (prefs.language === 'fr' || prefs.language === 'en') setLanguageState(prefs.language);
    if (typeof prefs.darkMode === 'boolean') setDarkModeState(prefs.darkMode);
  };

  const t = (key: string): string => TRANSLATIONS[language][key] ?? TRANSLATIONS['fr'][key] ?? key;

  const formatCurrency = (amount: number): string => {
    if (currency === 'EUR') return `${amount.toFixed(2)} €`;
    return `${amount.toFixed(2)} MAD`;
  };

  const currencySymbol = currency === 'EUR' ? '€' : 'MAD';

  return (
    <PreferencesContext.Provider value={{ language, currency, darkMode, loaded, setLanguage, setCurrency, setDarkMode, applyRemotePrefs, t, formatCurrency, currencySymbol }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => useContext(PreferencesContext);
