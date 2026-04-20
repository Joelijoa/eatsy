import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, TextInput,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { BudgetProgressBar } from '../../components/BudgetProgressBar';
import { useAuth } from '../../context/AuthContext';
import { getOrCreateWeekPlan, getWeekStart } from '../../services/plannerService';
import { WeekPlan, WellnessType } from '../../types';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const DAY_LABELS: Record<string, string> = {
  monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi',
  thursday: 'Jeudi', friday: 'Vendredi', saturday: 'Samedi', sunday: 'Dimanche',
};
const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Petit-déj.', lunch: 'Déjeuner', dinner: 'Dîner',
};

export const BudgetScreen: React.FC = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  const loadData = async () => {
    if (!user) return;
    const wp = await getOrCreateWeekPlan(user.uid, getWeekStart());
    setPlan(wp);
    setBudgetInput(String(wp.weeklyBudgetLimit ?? 150));
  };

  useEffect(() => { loadData(); }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const saveBudget = async () => {
    if (!plan) return;
    const newBudget = parseFloat(budgetInput) || 150;
    await updateDoc(doc(db, 'weekPlans', plan.id), { weeklyBudgetLimit: newBudget });
    setPlan({ ...plan, weeklyBudgetLimit: newBudget });
    setEditingBudget(false);
  };

  if (!plan) return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>Chargement...</Text>
    </View>
  );

  const limit = plan.weeklyBudgetLimit ?? 150;

  const dayTotals = Object.entries(plan.days).map(([dayKey, dayPlan]) => {
    const meals = [dayPlan.breakfast, dayPlan.lunch, dayPlan.dinner];
    const total = meals.reduce((s, m) => s + ((m as any).cost ?? 0), 0);
    const mealDetails = meals.map((m, idx) => ({
      label: MEAL_LABELS[['breakfast', 'lunch', 'dinner'][idx]],
      cost: (m as any).cost ?? 0,
      name: (m as any).recipeName,
      wellnessType: (m as any).wellnessType as WellnessType | undefined,
    }));
    return { dayKey, label: DAY_LABELS[dayKey], total, mealDetails };
  });

  const weeklyTotal = dayTotals.reduce((s, d) => s + d.total, 0);
  const avgPerDay = weeklyTotal / 7;
  const avgPerMeal = weeklyTotal / Math.max(1, dayTotals.flatMap((d) => d.mealDetails).filter((m) => m.cost > 0).length);

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Gestion du budget</Text>
        <Text style={styles.weekLabel}>Semaine du {getWeekStart()}</Text>
      </View>

      {/* Weekly budget card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <Text style={styles.heroLabel}>Budget hebdomadaire</Text>
          <TouchableOpacity onPress={() => setEditingBudget(!editingBudget)}>
            <Text style={styles.editBtn}>{editingBudget ? 'Annuler' : '✏️ Modifier'}</Text>
          </TouchableOpacity>
        </View>

        {editingBudget ? (
          <View style={styles.editBudgetRow}>
            <TextInput
              style={styles.budgetInput}
              value={budgetInput}
              onChangeText={setBudgetInput}
              keyboardType="numeric"
              placeholder="150"
            />
            <Text style={styles.budgetCurrency}>€</Text>
            <TouchableOpacity style={styles.saveBudgetBtn} onPress={saveBudget}>
              <Text style={styles.saveBudgetText}>OK</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.heroAmount}>{weeklyTotal.toFixed(2)}€ / {limit.toFixed(0)}€</Text>
        )}

        <BudgetProgressBar spent={weeklyTotal} total={limit} />
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{avgPerDay.toFixed(2)}€</Text>
          <Text style={styles.statLabel}>Moy. / jour</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{avgPerMeal.toFixed(2)}€</Text>
          <Text style={styles.statLabel}>Moy. / repas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, weeklyTotal <= limit ? styles.statValueGreen : styles.statValueOrange]}>
            {weeklyTotal <= limit ? '✅' : '⚠️'} {Math.abs(limit - weeklyTotal).toFixed(2)}€
          </Text>
          <Text style={styles.statLabel}>{weeklyTotal <= limit ? 'Restant' : 'Dépassement'}</Text>
        </View>
      </View>

      {/* Day breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Répartition par jour</Text>
        {dayTotals.map(({ dayKey, label, total, mealDetails }) => (
          <View key={dayKey} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{label}</Text>
              <Text style={[styles.dayTotal, total > 0 && styles.dayTotalActive]}>{total.toFixed(2)}€</Text>
            </View>
            {mealDetails.filter((m) => m.cost > 0).map((m, idx) => (
              <View key={idx} style={styles.mealLine}>
                <Text style={styles.mealLineLabel}>{m.label}</Text>
                <Text style={styles.mealLineName} numberOfLines={1}>{m.name}</Text>
                <Text style={styles.mealLineCost}>{m.cost.toFixed(2)}€</Text>
              </View>
            ))}
            {total === 0 && (
              <Text style={styles.noPlan}>Aucun repas planifié</Text>
            )}
          </View>
        ))}
      </View>

      {/* Savings tip */}
      <View style={styles.tipCard}>
        <Text style={styles.tipEmoji}>💡</Text>
        <Text style={styles.tipText}>
          {weeklyTotal <= limit
            ? `Bravo ! Vous économisez ${(limit - weeklyTotal).toFixed(2)}€ cette semaine.`
            : `Astuce : remplacez 1 repas plaisir par un repas équilibré pour économiser ~5€.`}
        </Text>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: FontFamily.body, color: Colors.onSurfaceVariant },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  title: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm, color: Colors.onSurface },
  weekLabel: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant, marginTop: 2 },
  heroCard: {
    marginHorizontal: Spacing.lg, backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xxl, padding: Spacing.lg, marginBottom: Spacing.md,
    shadowColor: Colors.onSurface, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06, shadowRadius: 24, elevation: 4,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  heroLabel: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  editBtn: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.primary },
  heroAmount: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displayLg, color: Colors.onSurface, marginBottom: Spacing.sm },
  editBudgetRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  budgetInput: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md, paddingVertical: 8, fontFamily: FontFamily.headlineBold,
    fontSize: FontSize.headlineLg, color: Colors.onSurface, width: 120,
  },
  budgetCurrency: { fontFamily: FontFamily.headline, fontSize: FontSize.headlineLg, color: Colors.onSurface },
  saveBudgetBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.lg, paddingVertical: 8 },
  saveBudgetText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onPrimary },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  statCard: {
    flex: 1, backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    padding: Spacing.md, alignItems: 'center',
    shadowColor: Colors.onSurface, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  statValue: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg, color: Colors.onSurface, textAlign: 'center' },
  statValueGreen: { color: Colors.primary },
  statValueOrange: { color: Colors.tertiary },
  statLabel: { fontFamily: FontFamily.body, fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant, textAlign: 'center', marginTop: 2 },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.titleLg, color: Colors.onSurface, marginBottom: Spacing.sm },
  dayCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    padding: Spacing.md, marginBottom: Spacing.xs,
    shadowColor: Colors.onSurface, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  dayLabel: { fontFamily: FontFamily.headline, fontSize: FontSize.titleMd, color: Colors.onSurface },
  dayTotal: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  dayTotalActive: { fontFamily: FontFamily.bodyBold, color: Colors.primary },
  mealLine: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  mealLineLabel: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant, width: 70 },
  mealLineName: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.onSurface, flex: 1 },
  mealLineCost: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.primary },
  noPlan: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.outlineVariant, fontStyle: 'italic' },
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: Spacing.lg,
    backgroundColor: `${Colors.secondaryContainer}60`, borderRadius: BorderRadius.xl,
    padding: Spacing.md, gap: Spacing.sm,
  },
  tipEmoji: { fontSize: 20 },
  tipText: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.secondary, flex: 1, lineHeight: 20 },
});
