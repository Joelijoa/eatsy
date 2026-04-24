import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, TextInput, Animated, Modal,
} from 'react-native';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { usePreferences, useColors } from '../../context/PreferencesContext';
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

const getWeeklyTotalFromPlan = (wp: WeekPlan) =>
  Object.values(wp.days)
    .flatMap((d) => [d.breakfast, d.lunch, d.dinner])
    .reduce((s, m) => s + ((m as any).cost ?? 0), 0);

const CHART_H = 100;

export const BudgetScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { formatCurrency, currencySymbol, t } = usePreferences();
  const insets = useSafeAreaInsets();
  const Colors = useColors();

  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [pastPlans, setPastPlans] = useState<WeekPlan[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  const progressAnim = useRef(new Animated.Value(0)).current;
  const { opacity, translateY } = useScreenEntrance();

  const loadData = useCallback(async () => {
    if (!user) return;
    const [wp, past] = await Promise.all([
      getOrCreateWeekPlan(user.uid, getWeekStart()),
      getPastWeekPlans(user.uid, 4),
    ]);
    setPlan(wp);
    setPastPlans(past);
    setBudgetInput(String(wp.weeklyBudgetLimit ?? 120));
  }, [user]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const saveBudget = async () => {
    if (!plan) return;
    const newBudget = parseFloat(budgetInput) || 120;
    await updateDoc(doc(db, 'weekPlans', plan.id), { weeklyBudgetLimit: newBudget });
    setPlan({ ...plan, weeklyBudgetLimit: newBudget });
    setEditModal(false);
  };

  // Derived values — safe to compute before null check using optional chaining
  const limit = plan?.weeklyBudgetLimit ?? 120;
  const DAY_KEYS_ORDERED = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

  const dayTotals = plan
    ? DAY_KEYS_ORDERED.map((dayKey) => {
        const dayPlan = plan.days[dayKey];
        const mealKeys = ['breakfast', 'lunch', 'dinner'] as const;
        const meals = mealKeys.map((k) => dayPlan[k]);
        const total = meals.reduce((s, m) => s + ((m as any).cost ?? 0), 0);
        const mealDetails = meals
          .map((m, idx) => ({
            label: t(MEAL_LABEL_KEYS[mealKeys[idx]]),
            cost: (m as any).cost ?? 0,
            name: (m as any).recipeName as string | undefined,
          }))
          .filter((m) => m.cost > 0);
        return { dayKey, label: t(DAY_LABEL_KEYS[dayKey] ?? dayKey), total, mealDetails };
      })
    : [];

  const weeklyTotal = dayTotals.reduce((s, d) => s + d.total, 0);
  const pct = limit > 0 ? Math.min(weeklyTotal / limit, 1) : 0;
  const isOver = weeklyTotal > limit;
  const overAmount = weeklyTotal - limit;
  const remaining = Math.max(0, limit - weeklyTotal);
  const avgPerDay = weeklyTotal / 7;
  const progressPct = Math.round(pct * 100);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: pct,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const styles = createStyles(Colors);
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  if (!plan) {
    return (
      <View style={styles.loading}>
        <Ionicons name="wallet-outline" size={36} color={Colors.outlineVariant} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  // Chart data: up to 3 past weeks (oldest→newest) + current week
  const chartAllWeeks = [
    ...pastPlans.slice(0, 3).reverse().map((p) => ({
      key: p.weekStart,
      total: getWeeklyTotalFromPlan(p),
      limitW: p.weeklyBudgetLimit ?? limit,
      weekStart: p.weekStart,
      isCurrent: false,
    })),
    { key: 'current', total: weeklyTotal, limitW: limit, weekStart: getWeekStart(), isCurrent: true },
  ];
  const maxVal = Math.max(limit * 1.15, ...chartAllWeeks.map((w) => w.total), 0.01);
  const chartBars = chartAllWeeks.map((w) => {
    const over = w.total > w.limitW;
    const parts = w.weekStart.split('-');
    return {
      ...w,
      height: w.total > 0 ? Math.max((w.total / maxVal) * CHART_H, 4) : 0,
      color: over ? Colors.tertiary : w.isCurrent ? Colors.primary : `${Colors.primary}88`,
      over,
      label: w.isCurrent ? 'Cette\nsem.' : `${parts[2]}/${parts[1]}`,
    };
  });

  return (
    <Animated.View style={[styles.screen, { opacity, transform: [{ translateY }] }]}>

      {/* ── Header ── */}
      <View style={[styles.headerBand, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerDecor1} />
        <View style={styles.headerDecor2} />

        <View style={styles.headerMain}>
          <View>
            <Text style={styles.title}>{t('budget_title')}</Text>
            <Text style={styles.headerSub}>Semaine du {getWeekStart()}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => setEditModal(true)}>
              <Ionicons name="pencil-outline" size={16} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
            <HeaderActions navigation={navigation} />
          </View>
        </View>

        <View style={styles.headerAmountRow}>
          <Text style={[styles.headerBigAmount, isOver && styles.headerBigAmountOver]}>
            {formatCurrency(weeklyTotal)}
          </Text>
          <Text style={styles.headerAmountLimit}>/ {formatCurrency(limit)}</Text>
        </View>

        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabelText}>
            {isOver
              ? `Dépassement de ${formatCurrency(overAmount)}`
              : 'Progression budgétaire'}
          </Text>
          <Text style={[styles.progressPctText, isOver && styles.progressPctOver]}>
            {progressPct}%
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressWidth,
                backgroundColor: isOver ? 'rgba(255,100,100,0.9)' : pct > 0.8 ? 'rgba(255,200,80,0.9)' : 'rgba(255,255,255,0.88)',
              },
            ]}
          />
        </View>
      </View>

      {/* ── Floating summary strip ── */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: isOver ? Colors.error : Colors.secondary }]}>
            {isOver ? `+${formatCurrency(overAmount)}` : formatCurrency(remaining)}
          </Text>
          <Text style={styles.summaryLabel}>{isOver ? 'dépassement' : 'restant'}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: Colors.primary }]}>
            {formatCurrency(avgPerDay)}
          </Text>
          <Text style={styles.summaryLabel}>moy. / jour</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: Colors.onSurfaceVariant }]}>
            {formatCurrency(limit)}
          </Text>
          <Text style={styles.summaryLabel}>limite fixée</Text>
        </View>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={{ height: Spacing.md }} />

        {/* Day breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Par jour</Text>
          {dayTotals.map(({ dayKey, label, total, mealDetails }) => {
            const dayPct = weeklyTotal > 0 ? total / weeklyTotal : 0;
            return (
              <View key={dayKey} style={[styles.dayCard, total > 0 && styles.dayCardActive]}>
                <View style={styles.dayHeader}>
                  <View style={styles.dayLabelRow}>
                    <Text style={styles.dayLabel}>{label}</Text>
                    {total > 0 && (
                      <View style={styles.dayBadge}>
                        <Text style={styles.dayBadgeText}>{Math.round(dayPct * 100)}%</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.dayTotal, total > 0 && styles.dayTotalActive]}>
                    {total > 0 ? formatCurrency(total) : '—'}
                  </Text>
                </View>
                {total > 0 && (
                  <View style={styles.dayBarTrack}>
                    <View style={[styles.dayBarFill, { width: `${dayPct * 100}%` as any }]} />
                  </View>
                )}
                {mealDetails.map((m, idx) => (
                  <View key={idx} style={styles.mealLine}>
                    <View style={styles.mealDot} />
                    <Text style={styles.mealLineLabel}>{m.label}</Text>
                    <Text style={styles.mealLineName} numberOfLines={1}>{m.name ?? '—'}</Text>
                    <Text style={styles.mealLineCost}>{formatCurrency(m.cost)}</Text>
                  </View>
                ))}
                {mealDetails.length === 0 && (
                  <Text style={styles.noPlan}>Aucun repas planifié</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Chart: Évolution des dépenses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Évolution des dépenses</Text>
          {pastPlans.length === 0 ? (
            <View style={styles.historyEmpty}>
              <Ionicons name="time-outline" size={22} color={Colors.outlineVariant} />
              <Text style={styles.historyEmptyText}>{t('budget_no_history')}</Text>
            </View>
          ) : (
            <View style={styles.chartCard}>
              <View style={{ position: 'relative' }}>
                {/* Bars */}
                <View style={styles.barsRow}>
                  {chartBars.map((bar) => (
                    <View key={bar.key} style={styles.barCol}>
                      {bar.total > 0 && (
                        <Text style={styles.barAmount} numberOfLines={1}>
                          {formatCurrency(bar.total)}
                        </Text>
                      )}
                      <View
                        style={[
                          styles.barFill,
                          { height: bar.height, backgroundColor: bar.color },
                          bar.isCurrent && styles.barFillCurrent,
                        ]}
                      />
                    </View>
                  ))}
                </View>

                {/* Budget limit line */}
                <View
                  pointerEvents="none"
                  style={[styles.limitLine, { bottom: 22 + (limit / maxVal) * CHART_H }]}
                >
                  <View style={styles.limitLineDash} />
                  <Text style={styles.limitLineLabel}>{formatCurrency(limit)}</Text>
                  <View style={styles.limitLineDash} />
                </View>

                {/* Labels */}
                <View style={styles.labelsRow}>
                  {chartBars.map((bar) => (
                    <Text
                      key={bar.key}
                      style={[styles.barLabel, bar.isCurrent && styles.barLabelCurrent]}
                    >
                      {bar.label}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Edit budget modal ── */}
      <Modal visible={editModal} animationType="slide" transparent onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalIconWrap}>
              <Ionicons name="wallet-outline" size={26} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Budget hebdomadaire</Text>
            <Text style={styles.modalDesc}>
              Définissez votre limite de dépenses pour la semaine.
            </Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Limite ({currencySymbol})</Text>
              <TextInput
                style={styles.textInput}
                value={budgetInput}
                onChangeText={setBudgetInput}
                keyboardType="numeric"
                selectTextOnFocus
                autoFocus
                placeholder="120"
                placeholderTextColor={Colors.outline}
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditModal(false)}>
                <Text style={styles.modalCancelText}>{t('common_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveBudget}>
                <Ionicons name="checkmark" size={18} color={Colors.onPrimary} />
                <Text style={styles.modalSaveText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const createStyles = (C: typeof Colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.surface },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  loadingText: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant },

  // ── Header ──
  headerBand: {
    backgroundColor: C.primary, paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg + 16, overflow: 'hidden',
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  headerDecor1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -70, right: -50,
  },
  headerDecor2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -30, left: 20,
  },
  headerMain: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  title: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm, color: '#fff' },
  headerSub: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  headerAmountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: Spacing.sm },
  headerBigAmount: { fontFamily: FontFamily.headlineBold, fontSize: 38, color: '#fff', letterSpacing: -1 },
  headerBigAmountOver: { color: 'rgba(255,210,210,1)' },
  headerAmountLimit: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: 'rgba(255,255,255,0.65)' },
  progressLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
  },
  progressLabelText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelMd, color: 'rgba(255,255,255,0.7)' },
  progressPctText: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleMd, color: '#fff' },
  progressPctOver: { color: 'rgba(255,210,210,1)' },
  progressTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  // ── Summary strip ──
  summaryStrip: {
    flexDirection: 'row', marginHorizontal: Spacing.lg, marginTop: -28,
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xxl,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
    zIndex: 1,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg },
  summaryLabel: { fontFamily: FontFamily.body, fontSize: 10, color: C.onSurfaceVariant, textAlign: 'center' },
  summaryDivider: { width: 1, height: 28, backgroundColor: C.surfaceContainerHigh, alignSelf: 'center' },

  // ── Sections ──
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.titleLg, color: C.onSurface, marginBottom: Spacing.sm },

  // ── Day cards ──
  dayCard: {
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    padding: Spacing.md, marginBottom: Spacing.xs,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
    borderLeftWidth: 3, borderLeftColor: 'transparent',
  },
  dayCardActive: { borderLeftColor: C.primary },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dayLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  dayLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  dayBadge: {
    backgroundColor: `${C.primary}15`, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  dayBadgeText: { fontFamily: FontFamily.bodyBold, fontSize: 10, color: C.primary },
  dayTotal: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant },
  dayTotalActive: { fontFamily: FontFamily.bodyBold, color: C.primary },
  dayBarTrack: {
    height: 3, backgroundColor: C.surfaceContainerHigh, borderRadius: 2,
    marginBottom: Spacing.xs, overflow: 'hidden',
  },
  dayBarFill: { height: '100%', backgroundColor: C.primary, borderRadius: 2 },
  mealLine: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2, gap: 4 },
  mealDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.outlineVariant },
  mealLineLabel: {
    fontFamily: FontFamily.body, fontSize: FontSize.labelMd,
    color: C.onSurfaceVariant, width: 38,
  },
  mealLineName: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.onSurface, flex: 1 },
  mealLineCost: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.primary },
  noPlan: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.outlineVariant, fontStyle: 'italic' },

  // ── Chart ──
  historyEmpty: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xl,
  },
  historyEmptyText: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.outlineVariant },
  chartCard: {
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  barsRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    height: CHART_H + 20,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 4 },
  barFill: { width: '55%', borderRadius: 5 },
  barFillCurrent: { width: '68%' },
  barAmount: {
    fontFamily: FontFamily.body, fontSize: 9, color: C.onSurfaceVariant,
    marginBottom: 3, textAlign: 'center',
  },
  limitLine: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  limitLineDash: { flex: 1, height: 1, backgroundColor: `${C.outline}45` },
  limitLineLabel: {
    fontFamily: FontFamily.body, fontSize: 9, color: C.onSurfaceVariant,
  },
  labelsRow: { flexDirection: 'row', marginTop: 6 },
  barLabel: {
    flex: 1, fontFamily: FontFamily.body, fontSize: 10,
    color: C.onSurfaceVariant, textAlign: 'center',
  },
  barLabelCurrent: { fontFamily: FontFamily.bodyBold, color: C.primary },

  // ── Edit modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.surfaceContainerLowest,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm,
  },
  modalHandle: {
    width: 36, height: 4, backgroundColor: C.outlineVariant,
    borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg,
  },
  modalIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: `${C.primary}15`, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: Spacing.md,
  },
  modalTitle: {
    fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd,
    color: C.onSurface, textAlign: 'center', marginBottom: 6,
  },
  modalDesc: {
    fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant,
    textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 22,
  },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.onSurfaceVariant, marginBottom: 6 },
  textInput: {
    backgroundColor: C.surfaceContainerLow, borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd,
    color: C.onSurface, textAlign: 'center',
  },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  modalCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: BorderRadius.full,
    backgroundColor: C.surfaceContainerHigh, alignItems: 'center',
  },
  modalCancelText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant },
  modalSaveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13, borderRadius: BorderRadius.full, backgroundColor: C.primary,
  },
  modalSaveText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onPrimary },
});
