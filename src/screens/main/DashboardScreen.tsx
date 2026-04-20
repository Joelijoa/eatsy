import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { getRecipes } from '../../services/recipeService';
import { getOrCreateWeekPlan, getWeekStart } from '../../services/plannerService';
import { seedTestData } from '../../services/seedData';
import { Recipe, WeekPlan, DayPlan, WellnessType } from '../../types';

const MEAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Petit-déjeuner': 'sunny-outline',
  'Déjeuner':       'partly-sunny-outline',
  'Dîner':          'moon-outline',
};

const WELLNESS_CONFIG: Record<WellnessType, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  balanced:  { label: 'Équilibré',  color: Colors.primary,  bg: `${Colors.secondaryContainer}90`, icon: 'leaf-outline' },
  quick:     { label: 'Rapide',     color: Colors.tertiary, bg: `${Colors.tertiary}22`,            icon: 'flash-outline' },
  indulgent: { label: 'Plaisir',    color: Colors.error,    bg: `${Colors.error}18`,               icon: 'heart-outline' },
};

export const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      await seedTestData(user.uid);
      const [r, wp] = await Promise.all([
        getRecipes(user.uid),
        getOrCreateWeekPlan(user.uid, getWeekStart()),
      ]);
      setRecipes(r);
      setWeekPlan(wp);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const limit = weekPlan?.weeklyBudgetLimit ?? 120;
  const plannedSlots = weekPlan
    ? Object.values(weekPlan.days).flatMap((d) =>
        [d.breakfast, d.lunch, d.dinner].filter((m) => m.recipeId !== null)
      )
    : [];
  const weeklySpend = plannedSlots.reduce((s, m) => s + ((m as any).cost ?? 0), 0);
  const remaining = Math.max(0, limit - weeklySpend);
  const pct = limit > 0 ? Math.min(weeklySpend / limit, 1) : 0;
  const isOver = weeklySpend > limit;

  const wellnessCounts: Record<WellnessType, number> = { balanced: 0, quick: 0, indulgent: 0 };
  plannedSlots.forEach((m) => {
    const t = (m as any).wellnessType as WellnessType;
    if (t) wellnessCounts[t]++;
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const dayKeys: Array<keyof WeekPlan['days']> = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const todayKey = dayKeys[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const mealKeys: Array<keyof DayPlan> = ['breakfast', 'lunch', 'dinner'];
  const mealLabels = ['Petit-déjeuner', 'Déjeuner', 'Dîner'];

  const dayTotal = mealKeys.reduce((s, k) => {
    const slot = weekPlan?.days[todayKey]?.[k] as any;
    return s + (slot?.cost ?? 0);
  }, 0);

  // Next meal to eat
  const now = new Date().getHours();
  const nextMealIdx = now < 10 ? 0 : now < 14 ? 1 : 2;
  const nextSlot = weekPlan?.days[todayKey]?.[mealKeys[nextMealIdx]] as any;

  return (
    <View style={styles.screen}>
      {/* Decorative header background */}
      <View style={[styles.headerBg, { height: 220 + insets.top }]}>
        <View style={styles.blob1} />
        <View style={styles.blob2} />
        <View style={styles.blob3} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.onPrimary} />}
        contentContainerStyle={{ paddingTop: insets.top }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.userName}>{user?.displayName?.split(' ')[0] ?? 'Chef'}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.displayName?.[0]?.toUpperCase() ?? 'E'}</Text>
          </View>
        </View>

        {/* Next meal highlight */}
        <View style={styles.nextMealCard}>
          <View style={styles.nextMealLeft}>
            <Text style={styles.nextMealTag}>Prochain repas</Text>
            <Text style={styles.nextMealName} numberOfLines={1}>
              {nextSlot?.recipeId ? nextSlot.recipeName : 'Rien de planifié'}
            </Text>
            <Text style={styles.nextMealLabel}>{mealLabels[nextMealIdx]}</Text>
          </View>
          <View style={styles.nextMealIcon}>
            <Ionicons name={MEAL_ICONS[mealLabels[nextMealIdx]]} size={32} color="rgba(255,255,255,0.9)" />
          </View>
        </View>

        {/* Budget card — elevated, dark */}
        <View style={styles.budgetCard}>
          <View style={styles.budgetTop}>
            <View>
              <Text style={styles.budgetLabel}>Dépenses semaine</Text>
              <View style={styles.budgetAmountRow}>
                <Text style={[styles.budgetAmount, isOver && styles.budgetAmountOver]}>
                  {weeklySpend.toFixed(2)} €
                </Text>
                <Text style={styles.budgetLimit}> / {limit} €</Text>
              </View>
            </View>
            <View style={[styles.budgetBadge, isOver ? styles.budgetBadgeOver : styles.budgetBadgeOk]}>
              <Ionicons name={isOver ? 'warning-outline' : 'checkmark-circle-outline'} size={14} color={isOver ? Colors.tertiary : Colors.primary} />
              <Text style={[styles.budgetBadgeText, isOver && styles.budgetBadgeTextOver]}>
                {isOver ? `+${(weeklySpend - limit).toFixed(0)} €` : `−${remaining.toFixed(0)} €`}
              </Text>
            </View>
          </View>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {
              width: `${pct * 100}%`,
              backgroundColor: isOver ? Colors.tertiary : Colors.primary,
            }]} />
          </View>

          {/* Mini stats under bar */}
          <View style={styles.budgetStats}>
            <View style={styles.budgetStat}>
              <Text style={styles.budgetStatValue}>{plannedSlots.length}</Text>
              <Text style={styles.budgetStatLabel}>repas</Text>
            </View>
            <View style={styles.budgetStatDivider} />
            <View style={styles.budgetStat}>
              <Text style={styles.budgetStatValue}>{(weeklySpend / 7).toFixed(2)} €</Text>
              <Text style={styles.budgetStatLabel}>moy./jour</Text>
            </View>
            <View style={styles.budgetStatDivider} />
            <View style={styles.budgetStat}>
              <Text style={styles.budgetStatValue}>{recipes.length}</Text>
              <Text style={styles.budgetStatLabel}>recettes</Text>
            </View>
          </View>
        </View>

        {/* Today's menu */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Menu du jour</Text>
            {dayTotal > 0 && (
              <View style={styles.dayCostPill}>
                <Ionicons name="wallet-outline" size={12} color={Colors.primary} />
                <Text style={styles.dayCostText}>{dayTotal.toFixed(2)} €</Text>
              </View>
            )}
          </View>

          <View style={styles.todayCard}>
            {mealLabels.map((label, idx) => {
              const slot = weekPlan?.days[todayKey]?.[mealKeys[idx]] as any;
              const filled = !!slot?.recipeId;
              const isNext = idx === nextMealIdx;
              return (
                <View key={label} style={[styles.mealRow, idx < 2 && styles.mealRowBorder, isNext && styles.mealRowHighlight]}>
                  <View style={[styles.mealIconWrap, isNext && styles.mealIconWrapActive]}>
                    <Ionicons name={MEAL_ICONS[label]} size={16} color={isNext ? Colors.onPrimary : Colors.onSurfaceVariant} />
                  </View>
                  <View style={styles.mealContent}>
                    <Text style={[styles.mealLabel, isNext && styles.mealLabelActive]}>{label}</Text>
                    <Text style={[styles.mealName, !filled && styles.mealNameEmpty]} numberOfLines={1}>
                      {filled ? slot.recipeName : 'Non planifié'}
                    </Text>
                  </View>
                  {filled && slot.cost > 0 && (
                    <Text style={styles.mealCost}>{slot.cost.toFixed(2)} €</Text>
                  )}
                  {isNext && filled && (
                    <View style={styles.nextBadge}>
                      <Text style={styles.nextBadgeText}>Suivant</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Wellness breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Équilibre alimentaire</Text>
          <View style={styles.wellnessRow}>
            {(Object.entries(wellnessCounts) as [WellnessType, number][]).map(([type, count]) => {
              const cfg = WELLNESS_CONFIG[type];
              const pct = plannedSlots.length > 0 ? Math.round((count / plannedSlots.length) * 100) : 0;
              return (
                <View key={type} style={[styles.wellnessCard, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                  <Text style={[styles.wellnessPct, { color: cfg.color }]}>{pct}%</Text>
                  <Text style={[styles.wellnessType, { color: cfg.color }]}>{cfg.label}</Text>
                  <Text style={[styles.wellnessCount, { color: cfg.color }]}>{count} repas</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Weekly overview strip */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cette semaine</Text>
          <View style={styles.weekStrip}>
            {dayKeys.map((key, idx) => {
              const dayPlan = weekPlan?.days[key];
              const mealsCount = dayPlan
                ? [dayPlan.breakfast, dayPlan.lunch, dayPlan.dinner].filter((m) => m.recipeId).length
                : 0;
              const isToday = idx === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
              return (
                <View key={key} style={[styles.weekDay, isToday && styles.weekDayActive]}>
                  <Text style={[styles.weekDayLabel, isToday && styles.weekDayLabelActive]}>
                    {['L','M','M','J','V','S','D'][idx]}
                  </Text>
                  <View style={styles.weekDayDots}>
                    {[0,1,2].map((i) => (
                      <View key={i} style={[styles.dot, i < mealsCount && styles.dotFilled, isToday && i < mealsCount && styles.dotFilledActive]} />
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Quick tips */}
        <View style={styles.section}>
          <View style={styles.tipCard}>
            <View style={styles.tipIconWrap}>
              <Ionicons name="bulb-outline" size={20} color={Colors.secondary} />
            </View>
            <Text style={styles.tipText}>
              {isOver
                ? `Budget dépassé de ${(weeklySpend - limit).toFixed(2)} €. Remplacez un repas par une soupe économique.`
                : `Il vous reste ${remaining.toFixed(2)} € pour ${7 - plannedSlots.length / 3} jours.`}
            </Text>
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },

  // Decorative background
  headerBg: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: Colors.primary, borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: Colors.primaryContainer, opacity: 0.35, top: -60, right: -40,
  },
  blob2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: Colors.secondaryContainer, opacity: 0.25, bottom: 10, left: -30,
  },
  blob3: {
    position: 'absolute', width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.primaryFixed, opacity: 0.2, top: 40, left: 80,
  },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
  },
  greeting: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: 'rgba(255,255,255,0.75)' },
  userName: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineLg, color: '#fff', marginTop: 2 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg, color: '#fff' },

  // Next meal banner
  nextMealCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  nextMealLeft: { flex: 1 },
  nextMealTag: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelSm, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  nextMealName: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg, color: '#fff' },
  nextMealLabel: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  nextMealIcon: { marginLeft: Spacing.md },

  // Budget card
  budgetCard: {
    marginHorizontal: Spacing.lg, marginTop: Spacing.sm, marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 5,
  },
  budgetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  budgetLabel: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant, marginBottom: 4 },
  budgetAmountRow: { flexDirection: 'row', alignItems: 'baseline' },
  budgetAmount: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displayMd, color: Colors.onSurface, letterSpacing: -0.5 },
  budgetAmountOver: { color: Colors.tertiary },
  budgetLimit: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  budgetBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: BorderRadius.full,
  },
  budgetBadgeOk: { backgroundColor: `${Colors.primary}12` },
  budgetBadgeOver: { backgroundColor: `${Colors.tertiary}15` },
  budgetBadgeText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.primary },
  budgetBadgeTextOver: { color: Colors.tertiary },
  progressBar: {
    height: 6, backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 3, overflow: 'hidden', marginBottom: Spacing.lg,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  budgetStats: { flexDirection: 'row', alignItems: 'center' },
  budgetStat: { flex: 1, alignItems: 'center' },
  budgetStatValue: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg, color: Colors.onSurface },
  budgetStatLabel: { fontFamily: FontFamily.body, fontSize: 10, color: Colors.onSurfaceVariant, marginTop: 1 },
  budgetStatDivider: { width: 1, height: 28, backgroundColor: Colors.surfaceContainerHigh },

  // Sections
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.titleLg, color: Colors.onSurface },
  dayCostPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${Colors.primary}12`, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
  },
  dayCostText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.primary },

  // Today card
  todayCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  mealRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: Spacing.md, gap: Spacing.sm,
  },
  mealRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerHigh },
  mealRowHighlight: { backgroundColor: `${Colors.primary}07` },
  mealIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center',
  },
  mealIconWrapActive: { backgroundColor: Colors.primary },
  mealContent: { flex: 1 },
  mealLabel: { fontFamily: FontFamily.body, fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5 },
  mealLabelActive: { color: Colors.primary },
  mealName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface, marginTop: 1 },
  mealNameEmpty: { color: Colors.outlineVariant, fontFamily: FontFamily.body },
  mealCost: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.primary },
  nextBadge: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.full,
    paddingHorizontal: 8, paddingVertical: 3, marginLeft: Spacing.xs,
  },
  nextBadgeText: { fontFamily: FontFamily.bodyBold, fontSize: 10, color: Colors.onPrimary },

  // Wellness
  wellnessRow: { flexDirection: 'row', gap: Spacing.sm },
  wellnessCard: {
    flex: 1, borderRadius: BorderRadius.xl, padding: Spacing.md,
    alignItems: 'center', gap: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  wellnessPct: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd, marginTop: 2 },
  wellnessType: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelSm },
  wellnessCount: { fontFamily: FontFamily.body, fontSize: 10 },

  // Week strip
  weekStrip: {
    flexDirection: 'row', backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl, padding: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  weekDay: { flex: 1, alignItems: 'center', paddingVertical: Spacing.xs, borderRadius: BorderRadius.lg },
  weekDayActive: { backgroundColor: Colors.primary },
  weekDayLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant, marginBottom: 4 },
  weekDayLabelActive: { color: Colors.onPrimary },
  weekDayDots: { flexDirection: 'column', gap: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.surfaceContainerHigh },
  dotFilled: { backgroundColor: Colors.outline },
  dotFilledActive: { backgroundColor: Colors.onPrimary },

  // Tip
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: `${Colors.secondaryContainer}50`,
    borderRadius: BorderRadius.xl, padding: Spacing.md,
  },
  tipIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: `${Colors.secondary}15`, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  tipText: {
    fontFamily: FontFamily.body, fontSize: FontSize.bodyMd,
    color: Colors.secondary, flex: 1, lineHeight: 20,
  },
});
