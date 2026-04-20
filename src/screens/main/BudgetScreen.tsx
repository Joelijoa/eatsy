import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { getOrCreateWeekPlan, getWeekStart } from '../../services/plannerService';
import { WeekPlan } from '../../types';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const DAY_LABELS: Record<string, string> = {
  monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi',
  thursday: 'Jeudi', friday: 'Vendredi', saturday: 'Samedi', sunday: 'Dimanche',
};
const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Matin', lunch: 'Midi', dinner: 'Soir',
};

export const BudgetScreen: React.FC = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  const loadData = async () => {
    if (!user) return;
    const wp = await getOrCreateWeekPlan(user.uid, getWeekStart());
    setPlan(wp);
    setBudgetInput(String(wp.weeklyBudgetLimit ?? 120));
  };

  useEffect(() => { loadData(); }, [user]);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const saveBudget = async () => {
    if (!plan) return;
    const newBudget = parseFloat(budgetInput) || 120;
    await updateDoc(doc(db, 'weekPlans', plan.id), { weeklyBudgetLimit: newBudget });
    setPlan({ ...plan, weeklyBudgetLimit: newBudget });
    setEditingBudget(false);
  };

  if (!plan) return <View style={styles.loading}><Text style={styles.loadingText}>Chargement...</Text></View>;

  const limit = plan.weeklyBudgetLimit ?? 120;

  const dayTotals = Object.entries(plan.days).map(([dayKey, dayPlan]) => {
    const meals = [dayPlan.breakfast, dayPlan.lunch, dayPlan.dinner];
    const total = meals.reduce((s, m) => s + ((m as any).cost ?? 0), 0);
    const mealDetails = meals.map((m, idx) => ({
      label: MEAL_LABELS[['breakfast', 'lunch', 'dinner'][idx]],
      cost: (m as any).cost ?? 0,
      name: (m as any).recipeName,
    })).filter((m) => m.cost > 0);
    return { dayKey, label: DAY_LABELS[dayKey], total, mealDetails };
  });

  const weeklyTotal = dayTotals.reduce((s, d) => s + d.total, 0);
  const pct = limit > 0 ? Math.min(weeklyTotal / limit, 1) : 0;
  const isOver = weeklyTotal > limit;
  const barColor = isOver ? Colors.tertiary : pct > 0.8 ? Colors.tertiary : Colors.primary;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Budget</Text>
          <Text style={styles.subtitle}>Semaine du {getWeekStart()}</Text>
        </View>

        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>Total semaine</Text>
              <Text style={[styles.heroAmount, isOver && styles.heroAmountOver]}>
                {weeklyTotal.toFixed(2)} €
              </Text>
            </View>
            <View style={styles.heroRight}>
              <TouchableOpacity style={styles.editLimitBtn} onPress={() => setEditingBudget(!editingBudget)}>
                <Ionicons name={editingBudget ? 'close' : 'pencil'} size={16} color={Colors.primary} />
                <Text style={styles.editLimitText}>{editingBudget ? 'Annuler' : 'Limite'}</Text>
              </TouchableOpacity>
              {editingBudget ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={styles.budgetInput}
                    value={budgetInput}
                    onChangeText={setBudgetInput}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                  <Text style={styles.budgetCurrency}>€</Text>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveBudget}>
                    <Text style={styles.saveBtnText}>OK</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.limitLabel}>/ {limit.toFixed(0)} € max</Text>
              )}
            </View>
          </View>

          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
            </View>
            <Text style={[styles.progressPct, isOver && { color: Colors.tertiary }]}>{Math.round(pct * 100)}%</Text>
          </View>

          {isOver && (
            <View style={styles.overBudgetBadge}>
              <Ionicons name="warning-outline" size={14} color={Colors.tertiary} />
              <Text style={styles.overBudgetText}>Dépassement de {(weeklyTotal - limit).toFixed(2)} €</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Moy./jour', value: `${(weeklyTotal / 7).toFixed(2)} €` },
            { label: 'Restant', value: `${Math.max(0, limit - weeklyTotal).toFixed(2)} €`, highlight: !isOver },
            { label: 'Économies', value: isOver ? '—' : `${(limit - weeklyTotal).toFixed(2)} €`, highlight: !isOver },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={[styles.statValue, s.highlight && styles.statValueGreen]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Day breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Par jour</Text>
          {dayTotals.map(({ dayKey, label, total, mealDetails }) => (
            <View key={dayKey} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{label}</Text>
                <Text style={[styles.dayTotal, total > 0 && styles.dayTotalActive]}>
                  {total > 0 ? `${total.toFixed(2)} €` : '—'}
                </Text>
              </View>
              {mealDetails.map((m, idx) => (
                <View key={idx} style={styles.mealLine}>
                  <Text style={styles.mealLineLabel}>{m.label}</Text>
                  <Text style={styles.mealLineName} numberOfLines={1}>{m.name}</Text>
                  <Text style={styles.mealLineCost}>{m.cost.toFixed(2)} €</Text>
                </View>
              ))}
              {mealDetails.length === 0 && (
                <Text style={styles.noPlan}>Aucun repas planifié</Text>
              )}
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: FontFamily.body, color: Colors.onSurfaceVariant },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md },
  title: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm, color: Colors.onSurface },
  subtitle: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant, marginTop: 2 },
  heroCard: {
    marginHorizontal: Spacing.lg, backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xxl, padding: Spacing.lg, marginBottom: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  heroLabel: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant, marginBottom: 4 },
  heroAmount: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displayMd, color: Colors.onSurface, letterSpacing: -0.5 },
  heroAmountOver: { color: Colors.tertiary },
  heroRight: { alignItems: 'flex-end', gap: 4 },
  editLimitBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editLimitText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.primary },
  limitLabel: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  budgetInput: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm, paddingVertical: 4, fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.bodyMd, color: Colors.onSurface, width: 70, textAlign: 'right',
  },
  budgetCurrency: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  saveBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.onPrimary },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  progressTrack: { flex: 1, height: 6, backgroundColor: Colors.surfaceContainerHigh, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressPct: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant, width: 36, textAlign: 'right' },
  overBudgetBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: Spacing.sm, backgroundColor: `${Colors.tertiary}15`,
    borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4, alignSelf: 'flex-start',
  },
  overBudgetText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.tertiary },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  statCard: {
    flex: 1, backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    padding: Spacing.md, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  statValue: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg, color: Colors.onSurface, textAlign: 'center' },
  statValueGreen: { color: Colors.primary },
  statLabel: { fontFamily: FontFamily.body, fontSize: 10, color: Colors.onSurfaceVariant, marginTop: 2, textAlign: 'center' },
  section: { paddingHorizontal: Spacing.lg },
  sectionTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.titleLg, color: Colors.onSurface, marginBottom: Spacing.sm },
  dayCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    padding: Spacing.md, marginBottom: Spacing.xs,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  dayLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface },
  dayTotal: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  dayTotalActive: { fontFamily: FontFamily.bodyBold, color: Colors.primary },
  mealLine: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  mealLineLabel: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant, width: 40 },
  mealLineName: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.onSurface, flex: 1, marginHorizontal: Spacing.xs },
  mealLineCost: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.primary },
  noPlan: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.outlineVariant, fontStyle: 'italic' },
});
