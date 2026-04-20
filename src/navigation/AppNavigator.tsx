import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
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
import { SettingsScreen } from '../screens/main/SettingsScreen';
import { PantryScreen } from '../screens/main/PantryScreen';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const RecipeStack = createNativeStackNavigator();

type TabIconName = keyof typeof Ionicons.glyphMap;

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
  const { t } = usePreferences();

  const TAB_CONFIG: Array<{
    name: string;
    labelKey: string;
    icon: TabIconName;
    iconActive: TabIconName;
    component: React.ComponentType<any>;
  }> = [
    { name: 'Dashboard',     labelKey: 'tabs_home',     icon: 'home-outline',     iconActive: 'home',     component: DashboardScreen },
    { name: 'WeeklyPlanner', labelKey: 'tabs_planner',  icon: 'calendar-outline', iconActive: 'calendar', component: WeeklyPlannerScreen },
    { name: 'Recipes',       labelKey: 'tabs_recipes',  icon: 'book-outline',     iconActive: 'book',     component: RecipeStackNavigator },
    { name: 'ShoppingList',  labelKey: 'tabs_shopping', icon: 'cart-outline',     iconActive: 'cart',     component: ShoppingListScreen },
    { name: 'Budget',        labelKey: 'tabs_budget',   icon: 'wallet-outline',   iconActive: 'wallet',   component: BudgetScreen },
  ];

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { height: 58 + insets.bottom, paddingBottom: insets.bottom + 4 }],
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.outline,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' as const },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('tabs_home'),
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="WeeklyPlanner"
        component={WeeklyPlannerScreen}
        options={{
          tabBarLabel: t('tabs_planner'),
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Recipes"
        component={RecipeStackNavigator}
        options={{
          tabBarLabel: t('tabs_recipes'),
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'book' : 'book-outline'} size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="ShoppingList"
        component={ShoppingListScreen}
        options={{
          tabBarLabel: t('tabs_shopping'),
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'cart' : 'cart-outline'} size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Budget"
        component={BudgetScreen}
        options={{
          tabBarLabel: t('tabs_budget'),
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Pantry"
        component={PantryScreen}
        options={{
          tabBarLabel: t('tabs_stock'),
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'cube' : 'cube-outline'} size={22} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();
  const { t } = usePreferences();

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
            <>
              <RootStack.Screen name="MainTabs" component={MainTabs} />
              <RootStack.Screen name="Settings" component={SettingsScreen} options={{ presentation: 'modal' }} />
            </>
          ) : (
            <>
              <RootStack.Screen name="Login"         component={LoginScreen} />
              <RootStack.Screen name="Register"      component={RegisterScreen} />
              <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
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
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    paddingTop: 6,
  },
});
