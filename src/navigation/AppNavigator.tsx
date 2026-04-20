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
        tabBarStyle: [styles.tabBar, { paddingBottom: insets.bottom + 28 }],
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.outline,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      {TAB_CONFIG.map(({ name, labelKey, icon, iconActive, component }) => (
        <Tab.Screen
          key={name}
          name={name}
          component={component}
          options={{
            tabBarLabel: t(labelKey),
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? iconActive : icon} size={22} color={color} />
            ),
          }}
        />
      ))}
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
