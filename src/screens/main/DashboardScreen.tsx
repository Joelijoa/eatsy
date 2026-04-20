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
import { usePreferences } from '../../context/PreferencesContext';
import { getPantryItems } from '../../services/pantryService';
import { getRecipes } from '../../services/recipeService';
import { getOrCreateWeekPlan, getWeekStart } from '../../services/plannerService';
import { seedTestData } from '../../services/seedData';
import { Recipe, WeekPlan, DayPlan, WellnessType } from '../../types';

const MEAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  breakfast: 'sunny-outline',
  lunch: 'partly-sunny-outline',
  dinner: 'moon-outline',
};

const WELLNESS_CONFIG: Record<WellnessType, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  balanced:  { color: Colors.primary,  bg: `${Colors.secondaryContainer}90`, icon: 'leaf-outline' },
  quick:     { color: Colors.tertiary, bg: `${Colors.tertiary}22`,            icon: 'flash-outline' },
  indulgent: { color: Colors.error,    bg: `${Colors.error}18`,               icon: 'heart-outline' },
};

type Props = { navigation: any };

export const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { t, formatCurrency } = usePreferences();
  const insets = useSafeAreaInsets();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);
  const [pantryCount, setPantryCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      await seedTestData(user.uid);
      const [r, wp, pantry] = await Promise.all([
        getRecipes(user.uid),
        getOrCreateWeekPlan(user.uid, getWeekStart()),
        getPantryItems(user.uid),
      ]);
      setRecipes(r);
      setWeekPlan(wp);
      setPantryCount(pantry.length);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); }, [user]);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const limit = weekPlan?.weeklyBudgetLimit ?? 120;
  const dayKeys: Array<keyof WeekPlan['days']> = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const mealKeys: Array<keyof DayPlan> = ['breakfast', 'lunch', 'dinner'];
  const mealKeyIds: Array<keyof DayPlan> = ['breakfast', 'lunch', 'dinner'];

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
    const ty = (m as any).wellnessType as WellnessType;
    if (ty) wellnessCounts[ty]++;
  });

  const totalMeals = wellnessCounts.balanced + wellnessCounts.quick + wellnessCounts.indulgent;
  const wellnessTypes: WellnessType[] = ['balanced', 'quick', 'indulgent'];

  // Variety score: 0–100 based on how spread the wellness types are
  const maxPossible = Math.max(1, totalMeals);
  const evenShare = maxPossible / 3;
  const deviations = wellnessTypes.map((w) => Math.abs(wellnessCounts[w] - evenShare));
  const varietyScore = totalMeals > 0
    ? Math.max(0, Math.round(100 - (deviations.reduce((s, d) => s + d, 0) / maxPossible) * 100))
    : 0;

  // Days with at least one meal
  const daysWithMeals = dayKeys.filter((k) =>
    [weekPlan?.days[k]?.breakfast, weekPlan?.days[k]?.lunch, weekPlan?.days[k]?.dinner].some((m) => m?.recipeId)
  ).length;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('dashboard_greeting_morning');
    if (h < 18) return t('dashboard_greeting_afternoon');
    return t('dashboard_greeting_evening');
  };

  const todayKey = dayKeys[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const dayTotal = mealKeys.reduce((s, k) => {
    const slot = weekPlan?.days[todayKey]?.[k] as any;
    return s + (slot?.cost ?? 0);
  }, 0);

  const now = new Date().getHours();
  const nextMealIdx = now < 10 ? 0 : now < 14 ? 1 : 2;
  const nextSlot = weekPlan?.days[todayKey]?.[mealKeyIds[nextMealIdx]] as any;

  const mealLabels = [t('meal_breakfast_full'), t('meal_lunch'), t('meal_dinner')];

  return (
    <View style={styles.screen}>
      <View style={[styles.headerBg, { height: 240 + insets.top }]}>
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
          <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        </View>

        {/* Next meal */}
        <View style={styles.nextMealCard}>
          <View style={styles.nextMealLeft}>
            <Text style={styles.nextMealTag}>{t('dashboard_next_meal')}</Text>
            <Text style={styles.nextMealName} numberOfLines={1}>
              {nextSlot?.recipeId ? nextSlot.recipeName : t('dashboard_nothing_planned')}
            </Text>
            <Text style={styles.nextMealLabel}>{mealLabels[nextMealIdx]}</Text>
          </View>
          <View style={styles.nextMealIcon}>
            <Ionicons name={MEAL_ICONS[mealKeyIds[nextMealIdx]]} size={32} color="rgba(255,255,255,0.9)" />
          </View>
        </View>

        {/* Budget card */}
        <View style={styles.budgetCard}>
          <View style={styles.budgetTop}>
            <View>
              <Text style={styles.budgetLabel}>{t('dashboard_weekly_spend')}</Text>
              <View style={styles.budgetAmountRow}>
                <Text style={[styles.budgetAmount, isOver && styles.budgetAmountOver]}>
                  {formatCurrency(weeklySpend)}
                </Text>
                <Text style={styles.budgetLimit}> / {formatCurrency(limit)}</Text>
              </View>
            </View>
            <View style={[styles.budgetBadge, isOver ? styles.budgetBadgeOver : styles.budgetBadgeOk]}>
              <Ionicons name={isOver ? 'warning-outline' : 'checkmark-circle-outline'} size={14} color={isOver ? Colors.tertiary : Colors.primary} />
              <Text style={[styles.budgetBadgeText, isOver && styles.budgetBadgeTextOver]}>
                {isOver ? `+${formatCurrency(weeklySpend - limit)}` : `−${formatCurrency(remaining)}`}
              </Text>
            </View>
          </View>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: isOver ? Colors.tertiary : Colors.primary }]} />
          </View>

          <View style={styles.budgetStats}>
            <View style={styles.budgetStat}>
              <Text style={styles.budgetStatValue}>{plannedSlots.length}</Text>
              <Text style={styles.budgetStatLabel}>{t('dashboard_meals_label')}</Text>
            </View>
            <View style={styles.budgetStatDivider} />
            <View style={styles.budgetStat}>
              <Text style={styles.budgetStatValue}>{formatCurrency(weeklySpend / 7)}</Text>
              <Text style={styles.budgetStatLabel}>{t('dashboard_avg_day')}</Text>
            </View>
            <View style={styles.budgetStatDivider} />
            <View style={styles.budgetStat}>
              <Text style={styles.budgetStatValue}>{recipes.length}</Text>
              <Text style={styles.budgetStatLabel}>{t('dashboard_recipes_count')}</Text>
            </View>
          </View>
        </View>

        {/* Today's menu */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dashboard_today_menu')}</Text>
            {dayTotal > 0 && (
              <View style={styles.dayCostPill}>
                <Ionicons name="wallet-outline" size={12} color={Colors.primary} />
                <Text style={styles.dayCostText}>{formatCurrency(dayTotal)}</Text>
              </View>
            )}
          </View>

          <View style={styles.todayCard}>
            {mealLabels.map((label, idx) => {
              const slot = weekPlan?.days[todayKey]?.[mealKeyIds[idx]] as any;
              const filled = !!slot?.recipeId;
              const isNext = idx === nextMealIdx;
              return (
                <View key={label} style={[styles.mealRow, idx < 2 && styles.mealRowBorder, isNext && styles.mealRowHighlight]}>
                  <View style={[styles.mealIconWrap, isNext && styles.mealIconWrapActive]}>
                    <Ionicons name={MEAL_ICONS[mealKeyIds[idx]]} size={16} color={isNext ? Colors.onPrimary : Colors.onSurfaceVariant} />
                  </View>
                  <View style={styles.mealContent}>
                    <Text style={[styles.mealLabel, isNext && styles.mealLabelActive]}>{label}</Text>
                    <Text style={[styles.mealName, !filled && styles.mealNameEmpty]} numberOfLines={1}>
                      {filled ? slot.recipeName : t('dashboard_not_planned')}
                    </Text>
                  </View>
                  {filled && slot.cost > 0 && <Text style={styles.mealCost}>{formatCurrency(slot.cost)}</Text>}
                  {isNext && filled && (
                    <View style={styles.nextBadge}><Text style={styles.nextBadgeText}>{t('dashboard_next_badge')}</Text></View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Wellness balance — redesigned */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dashboard_wellness')}</Text>
            <View style={styles.varietyScorePill}>
              <Ionicons name="stats-chart-outline" size={12} color={Colors.primary} />
              <Text style={styles.varietyScoreText}>{varietyScore}%</Text>
            </View>
          </View>

          {/* Stats row above bars */}
          <View style={styles.wellnessStatsRow}>
            <View style={styles.wellnessStatBox}>
              <Ionicons name="restaurant-outline" size={18} color={Colors.primary} />
              <Text style={styles.wellnessStatValue}>{totalMeals}</Text>
              <Text style={styles.wellnessStatLabel}>{t('dashboard_total_planned')}</Text>
            </View>
            <View style={styles.wellnessStatDivider} />
            <View style={styles.wellnessStatBox}>
              <Ionicons name="shuffle-outline" size={18} color={Colors.primary} />
              <Text style={styles.wellnessStatValue}>{varietyScore}%</Text>
              <Text style={styles.wellnessStatLabel}>{t('dashboard_variety_score')}</Text>
            </View>
            <View style={styles.wellnessStatDivider} />
            <View style={styles.wellnessStatBox}>
              <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
              <Text style={styles.wellnessStatValue}>{daysWithMeals}/7</Text>
              <Text style={styles.wellnessStatLabel}>{t('dashboard_this_week')}</Text>
            </View>
          </View>

          {/* Wellness bars */}
          <View style={styles.wellnessBarsCard}>
            {wellnessTypes.map((type, idx) => {
              const cfg = WELLNESS_CONFIG[type];
              const count = wellnessCounts[type];
              const pctW = totalMeals > 0 ? count / totalMeals : 0;
              const label = t(`wellness_${type}`);
              return (
                <View key={type} style={[styles.wellnessBarRow, idx < 2 && styles.wellnessBarRowBorder]}>
                  <View style={styles.wellnessBarLeft}>
                    <View style={[styles.wellnessBarIcon, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={cfg.icon} size={14} color={cfg.color} />
                    </View>
                    <Text style={styles.wellnessBarLabel}>{label}</Text>
                  </View>
                  <View style={styles.wellnessBarCenter}>
                    <View style={styles.wellnessBarTrack}>
                      <View style={[styles.wellnessBarFill, { width: `${pctW * 100}%`, backgroundColor: cfg.color }]} />
                    </View>
                  </View>
                  <View style={styles.wellnessBarRight}>
                    <Text style={[styles.wellnessBarPct, { color: cfg.color }]}>{Math.round(pctW * 100)}%</Text>
                    <Text style={styles.wellnessBarCount}>{count} {t('dashboard_meals')}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Weekly strip */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard_this_week')}</Text>
          <View style={styles.weekStrip}>
            {dayKeys.map((key, idx) => {
              const dayPlan = weekPlan?.days[key];
              const mealsCount = dayPlan
                ? [dayPlan.breakfast, dayPlan.lunch, dayPlan.dinner].filter((m) => m.recipeId).length
                : 0;
              const isToday = idx === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
              const dayNum = (() => {
                const today = new Date();
                const weekStartDate = new Date(today);
                weekStartDate.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
                const d = new Date(weekStartDate);
                d.setDate(weekStartDate.getDate() + idx);
                return d.getDate();
              })();
              return (
                <View key={key} style={[styles.weekDay, isToday && styles.weekDayActive]}>
                  <Text style={[styles.weekDayLabel, isToday && styles.weekDayLabelActive]}>
                    {['L','M','M','J','V','S','D'][idx]}
                  </Text>
                  <Text style={[styles.weekDayNum, isToday && styles.weekDayNumActive]}>{dayNum}</Text>
                  <View style={styles.weekDayDots}>
                    {[0,1,2].map((i) => (
                      <View key={i} style={[styles.dot, i < mealsCount && (isToday ? styles.dotFilledActive : styles.dotFilled)]} />
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Pantry shortcut */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.pantryCard} onPress={() => navigation.navigate('Pantry')} activeOpacity={0.85}>
            <View style={styles.pantryLeft}>
              <View style={styles.pantryIconWrap}>
                <Ionicons name="basket-outline" size={22} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.pantryTitle}>Garde-manger</Text>
                <Text style={styles.pantrySub}>
                  {pantryCount > 0 ? `${pantryCount} ingrédient${pantryCount > 1 ? 's' : ''} en stock` : 'Gérez votre stock'}
                </Text>
              </View>
            </View>
            <View style={styles.pantryRight}>
              {pantryCount > 0 && (
                <View style={styles.pantryCountBadge}>
                  <Text style={styles.pantryCountText}>{pantryCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={Colors.outlineVariant} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Tip */}
        <View style={styles.section}>
          <View style={styles.tipCard}>
            <View style={styles.tipIconWrap}>
              <Ionicons name="bulb-outline" size={20} color={Colors.secondary} />
            </View>
            <Text style={styles.tipText}>
              {isOver ? t('dashboard_tip_over') : t('dashboard_tip_ok')}
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
  headerBg: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: Colors.primary, borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  blob1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: Colors.primaryContainer, opacity: 0.35, top: -60, right: -40 },
  blob2: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: Colors.secondaryContainer, opacity: 0.25, bottom: 10, left: -30 },
  blob3: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.primaryFixed, opacity: 0.2, top: 40, left: 80 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
  },
  greeting: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: 'rgba(255,255,255,0.75)' },
  userName: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineLg, color: '#fff', marginTop: 2 },
  settingsBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },

  nextMealCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  nextMealLeft: { flex: 1 },
  nextMealTag: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelSm, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  nextMealName: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg, color: '#fff' },
  nextMealLabel: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  nextMealIcon: { marginLeft: Spacing.md },

  budgetCard: {
    marginHorizontal: Spacing.lg, marginTop: Spacing.sm, marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xxl, padding: Spacing.lg,
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
  progressBar: { height: 6, backgroundColor: Colors.surfaceContainerHigh, borderRadius: 3, overflow: 'hidden', marginBottom: Spacing.lg },
  progressFill: { height: '100%', borderRadius: 3 },
  budgetStats: { flexDirection: 'row', alignItems: 'center' },
  budgetStat: { flex: 1, alignItems: 'center' },
  budgetStatValue: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg, color: Colors.onSurface },
  budgetStatLabel: { fontFamily: FontFamily.body, fontSize: 10, color: Colors.onSurfaceVariant, marginTop: 1 },
  budgetStatDivider: { width: 1, height: 28, backgroundColor: Colors.surfaceContainerHigh },

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.titleLg, color: Colors.onSurface },
  dayCostPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${Colors.primary}12`, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  dayCostText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.primary },

  todayCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  mealRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: Spacing.md, gap: Spacing.sm },
  mealRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerHigh },
  mealRowHighlight: { backgroundColor: `${Colors.primary}07` },
  mealIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  mealIconWrapActive: { backgroundColor: Colors.primary },
  mealContent: { flex: 1 },
  mealLabel: { fontFamily: FontFamily.body, fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5 },
  mealLabelActive: { color: Colors.primary },
  mealName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface, marginTop: 1 },
  mealNameEmpty: { color: Colors.outlineVariant, fontFamily: FontFamily.body },
  mealCost: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.primary },
  nextBadge: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3, marginLeft: Spacing.xs },
  nextBadgeText: { fontFamily: FontFamily.bodyBold, fontSize: 10, color: Colors.onPrimary },

  // Wellness — new
  varietyScorePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${Colors.primary}12`, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  varietyScoreText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.primary },

  wellnessStatsRow: {
    flexDirection: 'row', backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    padding: Spacing.md, marginBottom: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  wellnessStatBox: { flex: 1, alignItems: 'center', gap: 3 },
  wellnessStatValue: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleMd, color: Colors.onSurface },
  wellnessStatLabel: { fontFamily: FontFamily.body, fontSize: 10, color: Colors.onSurfaceVariant, textAlign: 'center' },
  wellnessStatDivider: { width: 1, backgroundColor: Colors.surfaceContainerHigh },

  wellnessBarsCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  wellnessBarRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 13, gap: Spacing.sm },
  wellnessBarRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerHigh },
  wellnessBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 90 },
  wellnessBarIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  wellnessBarLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.onSurface },
  wellnessBarCenter: { flex: 1 },
  wellnessBarTrack: { height: 8, backgroundColor: Colors.surfaceContainerHigh, borderRadius: 4, overflow: 'hidden' },
  wellnessBarFill: { height: '100%', borderRadius: 4 },
  wellnessBarRight: { alignItems: 'flex-end', width: 60 },
  wellnessBarPct: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleMd },
  wellnessBarCount: { fontFamily: FontFamily.body, fontSize: 10, color: Colors.onSurfaceVariant, marginTop: 1 },

  // Week strip
  weekStrip: {
    flexDirection: 'row', backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl, padding: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  weekDay: { flex: 1, alignItems: 'center', paddingVertical: Spacing.xs, borderRadius: BorderRadius.lg },
  weekDayActive: { backgroundColor: Colors.primary },
  weekDayLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant, marginBottom: 1 },
  weekDayLabelActive: { color: Colors.onPrimary },
  weekDayNum: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: Colors.onSurfaceVariant, marginBottom: 3 },
  weekDayNumActive: { color: Colors.onPrimary },
  weekDayDots: { flexDirection: 'column', gap: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.surfaceContainerHigh },
  dotFilled: { backgroundColor: Colors.outline },
  dotFilledActive: { backgroundColor: Colors.onPrimary },

  pantryCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  pantryLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  pantryIconWrap: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: `${Colors.primary}12`, alignItems: 'center', justifyContent: 'center',
  },
  pantryTitle: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface },
  pantrySub: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant, marginTop: 1 },
  pantryRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pantryCountBadge: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  pantryCountText: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: Colors.onPrimary },
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: `${Colors.secondaryContainer}50`, borderRadius: BorderRadius.xl, padding: Spacing.md,
  },
  tipIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: `${Colors.secondary}15`, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  tipText: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.secondary, flex: 1, lineHeight: 20 },
});
