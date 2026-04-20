import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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

type TabIconName = keyof typeof Ionicons.glyphMap;

const TAB_CONFIG: Record<string, { label: string; icon: TabIconName; iconActive: TabIconName }> = {
  Dashboard:    { label: 'Accueil',  icon: 'home-outline',         iconActive: 'home' },
  WeeklyPlanner:{ label: 'Planning', icon: 'calendar-outline',      iconActive: 'calendar' },
  Recipes:      { label: 'Recettes', icon: 'book-outline',          iconActive: 'book' },
  ShoppingList: { label: 'Courses',  icon: 'cart-outline',          iconActive: 'cart' },
  Budget:       { label: 'Budget',   icon: 'wallet-outline',        iconActive: 'wallet' },
};

function RecipeStackNavigator() {
  return (
    <RecipeStack.Navigator screenOptions={{ headerShown: false }}>
      <RecipeStack.Screen name="RecipeList"   component={RecipesScreen} />
      <RecipeStack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
      <RecipeStack.Screen name="AddRecipe"    component={AddRecipeScreen} />
      <RecipeStack.Screen name="CookingMode"  component={CookingModeScreen} />
      <RecipeStack.Screen name="FoodScanner"  component={FoodScannerScreen} />
    </RecipeStack.Navigator>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [styles.tabBar, { paddingBottom: insets.bottom + 28 }],
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.outline,
        tabBarLabelStyle: styles.tabLabel,
        tabBarLabel: TAB_CONFIG[route.name]?.label ?? route.name,
        tabBarIcon: ({ focused, color, size }) => {
          const cfg = TAB_CONFIG[route.name];
          const iconName: TabIconName = focused ? cfg.iconActive : cfg.icon;
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard"     component={DashboardScreen} />
      <Tab.Screen name="WeeklyPlanner" component={WeeklyPlannerScreen} />
      <Tab.Screen name="Recipes"       component={RecipeStackNavigator} />
      <Tab.Screen name="ShoppingList"  component={ShoppingListScreen} />
      <Tab.Screen name="Budget"        component={BudgetScreen} />
    </Tab.Navigator>
  );
}

export const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <Ionicons name="restaurant" size={48} color={Colors.primary} />
        <Text style={styles.splashTitle}>Eatsy</Text>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <RootStack.Screen name="MainTabs" component={MainTabs} />
          ) : (
            <>
              <RootStack.Screen name="Login"          component={LoginScreen} />
              <RootStack.Screen name="Register"        component={RegisterScreen} />
              <RootStack.Screen name="ForgotPassword"  component={ForgotPasswordScreen} />
            </>
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  splashTitle: {
    fontFamily: FontFamily.headlineBold, fontSize: 36,
    color: Colors.primary, marginTop: 12, letterSpacing: -1,
  },
  tabBar: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 0,
    elevation: 0,
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    height: 95,
    paddingTop: 10,
  },
  tabLabel: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 10,
    marginTop: 2,
  },
});
