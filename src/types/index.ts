export type WellnessType = 'balanced' | 'quick' | 'indulgent';
export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
}

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  categoryId: string;
  ingredients: Ingredient[];
  instructions: string[];
  wellnessType: WellnessType;
  userId: string;
  createdAt: Date;
  totalCost?: number;
  costPerServing?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  userId: string;
}

export interface MealSlot {
  recipeId: string | null;
  recipeName?: string;
  recipeImage?: string;
  cost?: number;
  wellnessType?: WellnessType;
}

export interface DayPlan {
  breakfast: MealSlot;
  lunch: MealSlot;
  dinner: MealSlot;
}

export interface WeekPlan {
  id: string;
  userId: string;
  weekStart: string;
  days: {
    monday: DayPlan;
    tuesday: DayPlan;
    wednesday: DayPlan;
    thursday: DayPlan;
    friday: DayPlan;
    saturday: DayPlan;
    sunday: DayPlan;
  };
  totalBudget?: number;
  weeklyBudgetLimit?: number;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  checked: boolean;
  recipeId?: string;
  recipeName?: string;
}

export interface ShoppingList {
  id: string;
  userId: string;
  weekStart: string;
  items: ShoppingItem[];
  totalCost: number;
  createdAt: Date;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  weeklyBudget: number;
  createdAt: Date;
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  MainTabs: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  WeeklyPlanner: undefined;
  Recipes: undefined;
  ShoppingList: undefined;
  Budget: undefined;
};

export type RecipeStackParamList = {
  RecipeList: undefined;
  RecipeDetail: { recipeId: string };
  AddRecipe: { recipeId?: string };
  CookingMode: { recipeId: string };
  FoodScanner: undefined;
};
