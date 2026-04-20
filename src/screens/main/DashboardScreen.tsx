import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { BudgetProgressBar } from '../../components/BudgetProgressBar';
import { WellnessBadge } from '../../components/WellnessBadge';
import { useAuth } from '../../context/AuthContext';
import { getRecipes } from '../../services/recipeService';
import { getOrCreateWeekPlan, getWeekStart } from '../../services/plannerService';
import { Recipe, WeekPlan, DayPlan, WellnessType } from '../../types';

export const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const weeklyBudgetLimit = weekPlan?.weeklyBudgetLimit ?? 150;

  const loadData = async () => {
    if (!user) return;
    try {
      const [r, wp] = await Promise.all([
        getRecipes(user.uid),
        getOrCreateWeekPlan(user.uid, getWeekStart()),
      ]);
      setRecipes(r);
      setWeekPlan(wp);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const plannedMeals = weekPlan
    ? Object.values(weekPlan.days).flatMap((day) =>
        [day.breakfast, day.lunch, day.dinner].filter((m) => m.recipeId !== null)
      )
    : [];

  const weeklySpend = plannedMeals.reduce((s, m) => s + (m.cost ?? 0), 0);

  const wellnessCounts: Record<WellnessType, number> = { balanced: 0, quick: 0, indulgent: 0 };
  plannedMeals.forEach((m) => { if (m.wellnessType) wellnessCounts[m.wellnessType]++; });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.userName}>{user?.displayName?.split(' ')[0] ?? 'Chef'} 👋</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>
            {user?.displayName?.[0]?.toUpperCase() ?? 'E'}
          </Text>
        </View>
      </View>

      {/* Budget card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Budget hebdomadaire</Text>
        <BudgetProgressBar spent={weeklySpend} total={weeklyBudgetLimit} />
        <View style={styles.budgetFooter}>
          <Text style={styles.budgetSaved}>
            Reste : <Text style={styles.budgetSavedAmount}>{Math.max(0, weeklyBudgetLimit - weeklySpend).toFixed(2)}€</Text>
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{plannedMeals.length}</Text>
          <Text style={styles.statLabel}>Repas planifiés</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{recipes.length}</Text>
          <Text style={styles.statLabel}>Recettes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{weeklySpend.toFixed(0)}€</Text>
          <Text style={styles.statLabel}>Dépenses</Text>
        </View>
      </View>

      {/* Wellness breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Répartition bien-être</Text>
        <View style={styles.wellnessRow}>
          {(['balanced', 'quick', 'indulgent'] as WellnessType[]).map((type) => (
            <View key={type} style={styles.wellnessItem}>
              <WellnessBadge type={type} />
              <Text style={styles.wellnessCount}>{wellnessCounts[type]} repas</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Today's meals */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Aujourd'hui</Text>
        {(['Petit-déjeuner', 'Déjeuner', 'Dîner'] as const).map((meal, idx) => {
          const dayKeys: Array<keyof WeekPlan['days']> = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          const dayKey = dayKeys[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
          const mealKeys: Array<keyof DayPlan> = ['breakfast', 'lunch', 'dinner'];
          const mealKey = mealKeys[idx];
          const slot = weekPlan?.days[dayKey]?.[mealKey] as any;
          return (
            <View key={meal} style={styles.todayMeal}>
              <Text style={styles.todayMealTime}>{meal}</Text>
              <Text style={styles.todayMealName}>
                {slot?.recipeId ? slot.recipeName ?? '🍽️ Recette planifiée' : '— Non planifié'}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Quick tip */}
      <View style={styles.tipCard}>
        <Text style={styles.tipEmoji}>💡</Text>
        <Text style={styles.tipText}>
          Planifiez vos repas le dimanche pour économiser jusqu'à 30% sur votre budget alimentaire.
        </Text>
      </View>

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Spacing.xl, paddingBottom: Spacing.lg,
  },
  greeting: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  userName: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineLg, color: Colors.onSurface, marginTop: 2 },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primaryContainer, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd, color: Colors.primary },
  card: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xxl,
    padding: Spacing.lg, marginBottom: Spacing.md,
    shadowColor: Colors.onSurface, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 16, elevation: 2,
  },
  cardTitle: {
    fontFamily: FontFamily.headline, fontSize: FontSize.titleLg,
    color: Colors.onSurface, marginBottom: Spacing.md,
  },
  budgetFooter: { marginTop: Spacing.sm, alignItems: 'flex-end' },
  budgetSaved: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  budgetSavedAmount: { fontFamily: FontFamily.bodyBold, color: Colors.primary },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: {
    flex: 1, backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    padding: Spacing.md, alignItems: 'center',
    shadowColor: Colors.onSurface, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  statValue: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm, color: Colors.primary },
  statLabel: { fontFamily: FontFamily.body, fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant, textAlign: 'center', marginTop: 2 },
  wellnessRow: { gap: Spacing.sm },
  wellnessItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  wellnessCount: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  todayMeal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  todayMealTime: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant, width: 120 },
  todayMealName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface, flex: 1, textAlign: 'right' },
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: `${Colors.secondaryContainer}60`, borderRadius: BorderRadius.xl,
    padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm,
  },
  tipEmoji: { fontSize: 20 },
  tipText: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.secondary, flex: 1, lineHeight: 20 },
});
