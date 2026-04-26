import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, ActivityIndicator, Animated, AppState, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { OnboardingScreen, ONBOARDING_KEY } from '../screens/OnboardingScreen';
import { LockScreen } from '../screens/LockScreen';

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { usePreferences, useColors } from '../context/PreferencesContext';
import { AlertProvider } from '../context/AlertContext';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize } from '../constants/typography';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { EmailVerificationScreen } from '../screens/auth/EmailVerificationScreen';

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
import { ProfileScreen } from '../screens/main/ProfileScreen';

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
    </RecipeStack.Navigator>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { t } = usePreferences();
  const Colors = useColors();

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
        tabBarStyle: [styles.tabBar, { height: 58 + insets.bottom, paddingBottom: insets.bottom + 4, backgroundColor: Colors.surfaceContainerLowest }],
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

const BIOMETRIC_KEY = 'eatsy_biometric_lock';
const LOCK_GRACE_MS = 30_000;

export const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();
  const { t, applyRemotePrefs, darkMode } = usePreferences();
  const [showWelcome, setShowWelcome] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const welcomeFade = useRef(new Animated.Value(1)).current;
  const initialLoadDone = useRef(false);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setOnboardingDone(false), 1500);
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      clearTimeout(timeout);
      setOnboardingDone(val === 'true');
    }).catch(() => {
      clearTimeout(timeout);
      setOnboardingDone(false);
    });
  }, []);

  // ── Biometric lock ──────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'background' || state === 'inactive') {
        backgroundedAt.current = Date.now();
      } else if (state === 'active') {
        const elapsed = backgroundedAt.current
          ? Date.now() - backgroundedAt.current
          : Infinity;
        backgroundedAt.current = null;
        const enabled = await AsyncStorage.getItem(BIOMETRIC_KEY).catch(() => null) === 'true';
        if (enabled && elapsed >= LOCK_GRACE_MS) setIsLocked(true);
      }
    });
    return () => sub.remove();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as any;
        if (data?.preferences) applyRemotePrefs(data.preferences);
      }
    }).catch(() => {});
  }, [user?.uid]);

  useEffect(() => {
    if (loading) return;
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      return;
    }
    if (user) {
      setShowWelcome(true);
      const hide = setTimeout(() => {
        Animated.timing(welcomeFade, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
          setShowWelcome(false);
          welcomeFade.setValue(1);
        });
      }, 2000);
      return () => clearTimeout(hide);
    }
  }, [user, loading]);

  if (loading || onboardingDone === null) {
    return (
      <View style={styles.splash}>
        <Image source={require('../../assets/Icon2.0.png')} style={{ width: 80, height: 80, borderRadius: 20 }} />
        <Text style={styles.splashTitle}>Eatsy</Text>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <AlertProvider>
      <StatusBar style={darkMode ? 'light' : 'dark'} backgroundColor={darkMode ? '#121212' : Colors.surface} />
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            user.emailVerified ? (
              <>
                <RootStack.Screen name="MainTabs"    component={MainTabs} />
                <RootStack.Screen name="FoodScanner" component={FoodScannerScreen} />
                <RootStack.Screen name="Settings"    component={SettingsScreen} options={{ presentation: 'modal' }} />
                <RootStack.Screen name="Profile"     component={ProfileScreen}  options={{ presentation: 'modal' }} />
              </>
            ) : (
              <RootStack.Screen name="EmailVerification" component={EmailVerificationScreen} />
            )
          ) : (
            <>
              {!onboardingDone && (
                <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
              )}
              <RootStack.Screen name="Login"          component={LoginScreen} />
              <RootStack.Screen name="Register"       component={RegisterScreen} />
              <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            </>
          )}
        </RootStack.Navigator>
      </NavigationContainer>

      {showWelcome && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: welcomeFade }]}>
          <WelcomeScreen userName={user?.displayName ?? user?.email ?? undefined} />
        </Animated.View>
      )}

      {isLocked && user && (
        <View style={StyleSheet.absoluteFill}>
          <LockScreen onUnlock={() => setIsLocked(false)} />
        </View>
      )}
    </AlertProvider>
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
