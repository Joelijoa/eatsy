import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, TextInput, Animated } from 'react-native';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { usePreferences , useColors } from '../../context/PreferencesContext';
import { getOrCreateWeekPlan, getPastWeekPlans, getWeekStart } from '../../services/plannerService';
import { WeekPlan } from '../../types';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { HeaderActions } from '../../components/HeaderActions';

const DAY_LABEL_KEYS: Record<string, string> = {
  monday: 'planner_day_mon', tuesday: 'planner_day_tue', wednesday: 'planner_day_wed',
  thursday: 'planner_day_thu', friday: 'planner_day_fri', saturday: 'planner_day_sat', sunday: 'planner_day_sun',
};
const MEAL_LABEL_KEYS: Record<string, string> = {
  breakfast: 'meal_breakfast_full', lunch: 'meal_lunch', dinner: 'meal_dinner',
};

export const BudgetScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { formatCurrency, currencySymbol, t } = usePreferences();
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = createStyles(Colors);
  const { opacity, translateY } = useScreenEntrance();
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [pastPlans, setPastPlans] = useState<WeekPlan[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  const loadData = async () => {
    if (!user) return;
    const [wp, past] = await Promise.all([
      getOrCreateWeekPlan(user.uid, getWeekStart()),
      getPastWeekPlans(user.uid, 4),
    ]);
    setPlan(wp);
    setPastPlans(past);
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
      label: t(MEAL_LABEL_KEYS[['breakfast', 'lunch', 'dinner'][idx]]),
      cost: (m as any).cost ?? 0,
      name: (m as any).recipeName,
    })).filter((m) => m.cost > 0);
    return { dayKey, label: t(DAY_LABEL_KEYS[dayKey] ?? dayKey), total, mealDetails };
  });

  const weeklyTotal = dayTotals.reduce((s, d) => s + d.total, 0);
  const pct = limit > 0 ? Math.min(weeklyTotal / limit, 1) : 0;
  const isOver = weeklyTotal > limit;
  const barColor = isOver ? Colors.tertiary : pct > 0.8 ? Colors.tertiary : Colors.primary;

  return (
    <Animated.View style={[styles.screen, { opacity, transform: [{ translateY }] }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Green header */}
        <View style={[styles.headerBand, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerDecor} />
          <View style={styles.headerMain}>
            <View>
              <Text style={styles.title}>Budget</Text>
              <Text style={styles.subtitle}>Semaine du {getWeekStart()}</Text>
            </View>
            <HeaderActions navigation={navigation} />
          </View>
        </View>

        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>Total semaine</Text>
              <Text style={[styles.heroAmount, isOver && styles.heroAmountOver]}>
                {formatCurrency(weeklyTotal)}
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
                  <Text style={styles.budgetCurrency}>{currencySymbol}</Text>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveBudget}>
                    <Text style={styles.saveBtnText}>OK</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.limitLabel}>/ {formatCurrency(limit)} max</Text>
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
              <Text style={styles.overBudgetText}>Dépassement de {formatCurrency(weeklyTotal - limit)}</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Moy./jour', value: formatCurrency(weeklyTotal / 7), icon: 'stats-chart-outline' as const, bg: `${Colors.primary}14`, color: Colors.primary },
            { label: 'Restant', value: formatCurrency(Math.max(0, limit - weeklyTotal)), icon: 'wallet-outline' as const, bg: `${Colors.secondary}18`, color: Colors.secondary },
            { label: 'Économies', value: isOver ? '—' : formatCurrency(limit - weeklyTotal), icon: 'trending-down-outline' as const, bg: `${Colors.tertiary}14`, color: isOver ? Colors.onSurfaceVariant : Colors.tertiary },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: s.bg }]}>
              <Ionicons name={s.icon} size={18} color={s.color} />
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Day breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Par jour</Text>
          {dayTotals.map(({ dayKey, label, total, mealDetails }) => (
            <View key={dayKey} style={[styles.dayCard, total > 0 && styles.dayCardActive]}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{label}</Text>
                <Text style={[styles.dayTotal, total > 0 && styles.dayTotalActive]}>
                  {total > 0 ? formatCurrency(total) : '—'}
                </Text>
              </View>
              {mealDetails.map((m, idx) => (
                <View key={idx} style={styles.mealLine}>
                  <Text style={styles.mealLineLabel}>{m.label}</Text>
                  <Text style={styles.mealLineName} numberOfLines={1}>{m.name}</Text>
                  <Text style={styles.mealLineCost}>{formatCurrency(m.cost)}</Text>
                </View>
              ))}
              {mealDetails.length === 0 && (
                <Text style={styles.noPlan}>Aucun repas planifié</Text>
              )}
            </View>
          ))}
        </View>

        {/* History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historique</Text>
          {pastPlans.length === 0 ? (
            <View style={styles.historyEmpty}>
              <Ionicons name="time-outline" size={22} color={Colors.outlineVariant} />
              <Text style={styles.historyEmptyText}>Aucun historique disponible</Text>
            </View>
          ) : (
            pastPlans.map((past) => {
              const pastTotal = Object.values(past.days).flatMap((d) =>
                [d.breakfast, d.lunch, d.dinner].map((m) => (m as any).cost ?? 0)
              ).reduce((s, v) => s + v, 0);
              const pastLimit = past.weeklyBudgetLimit ?? 120;
              const pastPct = pastLimit > 0 ? Math.min(pastTotal / pastLimit, 1) : 0;
              const pastOver = pastTotal > pastLimit;
              const [, month, day] = past.weekStart.split('-');
              return (
                <View key={past.id} style={styles.historyCard}>
                  <View style={styles.historyRow}>
                    <Text style={styles.historyWeek}>{`${day}/${month}`}</Text>
                    <View style={styles.historyRight}>
                      <Text style={[styles.historyAmount, pastOver && { color: Colors.tertiary }]}>
                        {formatCurrency(pastTotal)}
                      </Text>
                      <Text style={styles.historyLimit}>/ {formatCurrency(pastLimit)}</Text>
                    </View>
                  </View>
                  <View style={styles.historyBar}>
                    <View style={[
                      styles.historyBarFill,
                      { width: `${pastPct * 100}%` as any, backgroundColor: pastOver ? Colors.tertiary : Colors.primary }
                    ]} />
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </Animated.View>
  );
};

const createStyles = (C: typeof Colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.surface },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: FontFamily.body, color: C.onSurfaceVariant },
  headerBand: {
    backgroundColor: C.primary, paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg + 16, overflow: 'hidden',
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  headerDecor: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -30,
  },
  headerMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  headerRight: { alignItems: 'flex-end', gap: 8 },
  title: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm, color: '#fff' },
  subtitle: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  headerAmountWrap: { alignItems: 'flex-end' },
  headerAmount: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineLg, color: '#fff' },
  headerAmountSub: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  headerProgress: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' },
  headerProgressFill: { height: '100%', borderRadius: 3 },
  heroCard: {
    marginHorizontal: Spacing.lg, backgroundColor: C.surfaceContainerLowest,
    borderRadius: BorderRadius.xxl, padding: Spacing.lg, marginBottom: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  heroLabel: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant, marginBottom: 4 },
  heroAmount: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displayMd, color: C.onSurface, letterSpacing: -0.5 },
  heroAmountOver: { color: C.tertiary },
  heroRight: { alignItems: 'flex-end', gap: 4 },
  editLimitBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editLimitText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.primary },
  limitLabel: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  budgetInput: {
    backgroundColor: C.surfaceContainerLow, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm, paddingVertical: 4, fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.bodyMd, color: C.onSurface, width: 70, textAlign: 'right',
  },
  budgetCurrency: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant },
  saveBtn: { backgroundColor: C.primary, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  saveBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.onPrimary },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  progressTrack: { flex: 1, height: 6, backgroundColor: C.surfaceContainerHigh, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressPct: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.onSurfaceVariant, width: 36, textAlign: 'right' },
  overBudgetBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: Spacing.sm, backgroundColor: `${C.tertiary}15`,
    borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4, alignSelf: 'flex-start',
  },
  overBudgetText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.tertiary },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  statCard: {
    flex: 1, borderRadius: BorderRadius.xl,
    padding: Spacing.md, alignItems: 'center', gap: 3,
  },
  statValue: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg, color: C.onSurface, textAlign: 'center' },
  statValueGreen: { color: C.primary },
  statLabel: { fontFamily: FontFamily.body, fontSize: 10, color: C.onSurfaceVariant, marginTop: 2, textAlign: 'center' },
  section: { paddingHorizontal: Spacing.lg },
  sectionTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.titleLg, color: C.onSurface, marginBottom: Spacing.sm },
  dayCard: {
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    padding: Spacing.md, marginBottom: Spacing.xs,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
    borderLeftWidth: 3, borderLeftColor: 'transparent',
  },
  dayCardActive: { borderLeftColor: C.primary },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  dayLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  dayTotal: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant },
  dayTotalActive: { fontFamily: FontFamily.bodyBold, color: C.primary },
  mealLine: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  mealLineLabel: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.onSurfaceVariant, width: 40 },
  mealLineName: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.onSurface, flex: 1, marginHorizontal: Spacing.xs },
  mealLineCost: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.primary },
  noPlan: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.outlineVariant, fontStyle: 'italic' },

  historyEmpty: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xl },
  historyEmptyText: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.outlineVariant },
  historyCard: {
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    padding: Spacing.md, marginBottom: Spacing.xs,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  historyWeek: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  historyRight: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  historyAmount: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleMd, color: C.primary },
  historyLimit: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.onSurfaceVariant },
  historyBar: { height: 5, backgroundColor: C.surfaceContainerHigh, borderRadius: 3, overflow: 'hidden' },
  historyBarFill: { height: '100%', borderRadius: 3 },
});
