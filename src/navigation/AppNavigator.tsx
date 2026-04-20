import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize } from '../constants/typography';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';

import { DashboardScreen } from '../screens/main/DashboardScreen';
import { WeeklyPlannerScreen } from '../screens/main/WeeklyPlannerScreen';
import { RecipesScreen } from '../screens/main/RecipesScreen';
import { RecipeDetailScreen } from '../screens/main/RecipeDetailScreen';
import { AddRecipeScreen } from '../screens/main/AddRecipeScreen';
import { ShoppingListScreen } from '../screens/main/ShoppingListScreen';
import { BudgetScreen } from '../screens/main/BudgetScreen';
import { CookingModeScreen } from '../screens/main/CookingModeScreen';
import { FoodScannerScreen } from '../screens/main/FoodScannerScreen';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const RecipeStack = createNativeStackNavigator();

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Dashboard: { active: '🏠', inactive: '🏠' },
  WeeklyPlanner: { active: '📅', inactive: '📅' },
  Recipes: { active: '📖', inactive: '📖' },
  ShoppingList: { active: '🛒', inactive: '🛒' },
  Budget: { active: '💰', inactive: '💰' },
};

const TAB_LABELS: Record<string, string> = {
  Dashboard: 'Accueil',
  WeeklyPlanner: 'Planning',
  Recipes: 'Recettes',
  ShoppingList: 'Courses',
  Budget: 'Budget',
};

function RecipeStackNavigator() {
  return (
    <RecipeStack.Navigator screenOptions={{ headerShown: false }}>
      <RecipeStack.Screen name="RecipeList" component={RecipesScreen} />
      <RecipeStack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
      <RecipeStack.Screen name="AddRecipe" component={AddRecipeScreen} />
      <RecipeStack.Screen name="CookingMode" component={CookingModeScreen} />
      <RecipeStack.Screen name="FoodScanner" component={FoodScannerScreen} />
    </RecipeStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.onSurfaceVariant,
        tabBarLabelStyle: styles.tabLabel,
        tabBarLabel: TAB_LABELS[route.name] ?? route.name,
        tabBarIcon: ({ focused, size }) => (
          <Text style={{ fontSize: size - 4 }}>
            {TAB_ICONS[route.name]?.active ?? '●'}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="WeeklyPlanner" component={WeeklyPlannerScreen} />
      <Tab.Screen name="Recipes" component={RecipeStackNavigator} />
      <Tab.Screen name="ShoppingList" component={ShoppingListScreen} />
      <Tab.Screen name="Budget" component={BudgetScreen} />
    </Tab.Navigator>
  );
}

export const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashLogo}>🍴</Text>
        <Text style={styles.splashTitle}>Eatsy</Text>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <RootStack.Screen name="MainTabs" component={MainTabs} />
        ) : (
          <>
            <RootStack.Screen name="Login" component={LoginScreen} />
            <RootStack.Screen name="Register" component={RegisterScreen} />
            <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  splashLogo: { fontSize: 56 },
  splashTitle: {
    fontFamily: FontFamily.headlineBold, fontSize: 40,
    color: Colors.primary, marginTop: 12, letterSpacing: -1,
  },
  tabBar: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 0,
    elevation: 20,
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    height: 80,
    paddingBottom: 12,
    paddingTop: 8,
  },
  tabLabel: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.labelSm,
  },
});
