import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors, usePreferences } from '../../context/PreferencesContext';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { getPantryItems } from '../../services/pantryService';
import { getRecipes } from '../../services/recipeService';
import { getOrCreateWeekPlan, getWeekStart } from '../../services/plannerService';
import { seedTestData } from '../../services/seedData';
import { Recipe, WeekPlan, DayPlan, WellnessType } from '../../types';
import { HeaderActions } from '../../components/HeaderActions';

const MEAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  breakfast: 'sunny-outline',
  lunch:     'partly-sunny-outline',
  dinner:    'moon-outline',
};

const MEAL_COLORS: Record<string, string> = {
  breakfast: '#D97706',
  lunch:     '#2563EB',
  dinner:    '#7C3AED',
};

const buildWellnessCfg = (C: ReturnType<typeof useColors>): Record<WellnessType, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> => ({
  balanced:  { color: C.primary,  bg: `${C.primary}18`,  icon: 'leaf-outline' },
  quick:     { color: C.tertiary, bg: `${C.tertiary}18`, icon: 'flash-outline' },
  indulgent: { color: C.error,    bg: `${C.error}14`,    icon: 'heart-outline' },
});

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const FR_DAYS   = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const EN_DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const FR_MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const EN_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const CARD_COUNT = 6;

type Props = { navigation: any };

export const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { t, formatCurrency, language } = usePreferences();
  const C = useColors();
  const WELLNESS_CFG = buildWellnessCfg(C);
  const insets = useSafeAreaInsets();

  const [recipes,      setRecipes]      = useState<Recipe[]>([]);
  const [weekPlan,     setWeekPlan]     = useState<WeekPlan | null>(null);
  const [pantryCount,  setPantryCount]  = useState(0);
  const [refreshing,   setRefreshing]   = useState(false);

  // ── Animations ──────────────────────────────────────────
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const headerY       = useRef(new Animated.Value(-16)).current;
  const cardAnims     = useRef(
    Array.from({ length: CARD_COUNT }, () => ({
      opacity:    new Animated.Value(0),
      translateY: new Animated.Value(28),
    }))
  ).current;
  const hasEntered = useRef(false);
  const scrollRef  = useRef<React.ElementRef<typeof ScrollView>>(null);

  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []));

  useFocusEffect(useCallback(() => {
    if (hasEntered.current) return;
    hasEntered.current = true;
    Animated.sequence([
      Animated.parallel([
        Animated.timing(screenOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(headerY,       { toValue: 0, useNativeDriver: true, damping: 26, stiffness: 280 }),
      ]),
      Animated.stagger(
        65,
        cardAnims.map(({ opacity, translateY }) =>
          Animated.parallel([
            Animated.timing(opacity,    { toValue: 1,  duration: 260, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0,  useNativeDriver: true, damping: 22, stiffness: 260 }),
          ])
        )
      ),
    ]).start();
  }, []));

  // ── Data ────────────────────────────────────────────────
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

  useFocusEffect(useCallback(() => { loadData(); }, [user]));
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  // ── Derived ─────────────────────────────────────────────
  const limit       = weekPlan?.weeklyBudgetLimit ?? 120;
  const dayKeys: Array<keyof WeekPlan['days']>  = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const mealKeys: Array<keyof DayPlan>           = ['breakfast','lunch','dinner'];

  const plannedSlots = weekPlan
    ? Object.values(weekPlan.days).flatMap((d) =>
        [d.breakfast, d.lunch, d.dinner].filter((m) => m.recipeId !== null)
      )
    : [];
  const weeklySpend = plannedSlots.reduce((s, m) => s + ((m as any).cost ?? 0), 0);
  const remaining   = Math.max(0, limit - weeklySpend);
  const pct         = limit > 0 ? Math.min(weeklySpend / limit, 1) : 0;
  const isOver      = weeklySpend > limit;

  const wellnessCounts: Record<WellnessType, number> = { balanced: 0, quick: 0, indulgent: 0 };
  plannedSlots.forEach((m) => { const ty = (m as any).wellnessType as WellnessType; if (ty) wellnessCounts[ty]++; });
  const totalMeals   = wellnessCounts.balanced + wellnessCounts.quick + wellnessCounts.indulgent;
  const wellnessTypes: WellnessType[] = ['balanced', 'quick', 'indulgent'];
  const evenShare    = Math.max(1, totalMeals) / 3;
  const varietyScore = totalMeals > 0
    ? Math.max(0, Math.round(100 - (wellnessTypes.map((w) => Math.abs(wellnessCounts[w] - evenShare)).reduce((s, d) => s + d, 0) / Math.max(1, totalMeals)) * 100))
    : 0;
  const daysWithMeals = dayKeys.filter((k) =>
    [weekPlan?.days[k]?.breakfast, weekPlan?.days[k]?.lunch, weekPlan?.days[k]?.dinner].some((m) => m?.recipeId)
  ).length;

  const todayIdx   = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const todayKey   = dayKeys[todayIdx];
  const dayTotal   = mealKeys.reduce((s, k) => s + (((weekPlan?.days[todayKey]?.[k]) as any)?.cost ?? 0), 0);
  const nowHour    = new Date().getHours();
  const nextMealIdx = nowHour < 10 ? 0 : nowHour < 14 ? 1 : 2;
  const nextSlot   = weekPlan?.days[todayKey]?.[mealKeys[nextMealIdx]] as any;
  const mealLabels = [t('meal_breakfast_full'), t('meal_lunch'), t('meal_dinner')];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('dashboard_greeting_morning');
    if (h < 18) return t('dashboard_greeting_afternoon');
    return t('dashboard_greeting_evening');
  };

  const formatDate = () => {
    const d    = new Date();
    const isFr = language === 'fr';
    const day  = (isFr ? FR_DAYS : EN_DAYS)[d.getDay()];
    const mon  = (isFr ? FR_MONTHS : EN_MONTHS)[d.getMonth()];
    return isFr
      ? `${day} ${d.getDate()} ${mon}`
      : `${day}, ${mon} ${d.getDate()}`;
  };

  const card = (idx: number) => ({
    opacity:   cardAnims[idx].opacity,
    transform: [{ translateY: cardAnims[idx].translateY }],
  });

  const styles = createStyles(C);

  return (
    <Animated.View style={[styles.screen, { opacity: screenOpacity }]}>

      {/* ── Hero Header ────────────────────────────────── */}
      <Animated.View style={[styles.header, { paddingTop: insets.top + 14 }, { transform: [{ translateY: headerY }] }]}>
        <View style={styles.blobTR} />
        <View style={styles.blobBL} />

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerGreeting}>{greeting()}</Text>
            <Text style={styles.headerName}>{user?.displayName?.split(' ')[0] ?? 'Chef'}</Text>
            <Text style={styles.headerDate}>{formatDate()}</Text>
          </View>
          <HeaderActions navigation={navigation} />
        </View>

        {/* Stats row inside header */}
        <View style={styles.headerStats}>
          <View style={styles.headerStat}>
            <Text style={styles.headerStatVal}>{plannedSlots.length}</Text>
            <Text style={styles.headerStatLbl}>{t('dashboard_meals_label')}</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStat}>
            <Text style={styles.headerStatVal}>{daysWithMeals}/7</Text>
            <Text style={styles.headerStatLbl}>{t('dashboard_this_week')}</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStat}>
            <Text style={styles.headerStatVal}>{recipes.length}</Text>
            <Text style={styles.headerStatLbl}>{t('dashboard_recipes_count')}</Text>
          </View>
        </View>
      </Animated.View>

      {/* ── Floating Next Meal Card (overlaps header) ── */}
      <Animated.View style={[styles.nextWrap, card(0)]}>
        <View style={styles.nextCard}>
          <View style={[styles.nextAccent, { backgroundColor: MEAL_COLORS[mealKeys[nextMealIdx] as string] }]} />
          <View style={styles.nextBody}>
            <Text style={styles.nextTag}>
              {t('dashboard_next_meal')} · {mealLabels[nextMealIdx]}
            </Text>
            <Text style={styles.nextName} numberOfLines={1}>
              {nextSlot?.recipeId ? nextSlot.recipeName : t('dashboard_nothing_planned')}
            </Text>
            {nextSlot?.recipeId && (
              <TouchableOpacity
                style={styles.cookBtn}
                onPress={() => navigation.navigate('CookingMode', { recipeId: nextSlot.recipeId })}
                activeOpacity={0.8}
              >
                <Text style={styles.cookBtnText}>Cuisiner</Text>
                <Ionicons name="arrow-forward" size={12} color={C.primary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.nextIconCircle, { backgroundColor: `${MEAL_COLORS[mealKeys[nextMealIdx] as string]}18` }]}>
            <Ionicons name={MEAL_ICONS[mealKeys[nextMealIdx] as string]} size={32} color={MEAL_COLORS[mealKeys[nextMealIdx] as string]} />
          </View>
        </View>
      </Animated.View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        contentContainerStyle={{ paddingBottom: 120 }}
      >

        {/* ── Quick Actions ───────────────────────────── */}
        <Animated.View style={[styles.section, card(1)]}>
          <View style={styles.quickRow}>
            {([
              { icon: 'calendar-outline',  label: t('tabs_planner'),  screen: 'WeeklyPlanner', accent: true },
              { icon: 'book-outline',       label: t('tabs_recipes'),  screen: 'Recipes' },
              { icon: 'cart-outline',       label: t('tabs_shopping'), screen: 'ShoppingList' },
              { icon: 'scan-outline',       label: 'Scanner',          screen: 'FoodScanner' },
            ] as Array<{ icon: string; label: string; screen: string; accent?: boolean }>).map((a) => (
              <TouchableOpacity
                key={a.screen}
                style={[styles.quickBtn, a.accent && { backgroundColor: C.primary }]}
                onPress={() => navigation.navigate(a.screen)}
                activeOpacity={0.78}
              >
                <Ionicons name={a.icon as any} size={17} color={a.accent ? C.onPrimary : C.primary} />
                <Text style={[styles.quickLabel, a.accent && { color: C.onPrimary }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* ── Budget Card ─────────────────────────────── */}
        <Animated.View style={[styles.section, card(2)]}>
          <View style={styles.budgetCard}>
            <View style={styles.budgetBlob} />

            <View style={styles.budgetTopRow}>
              <Text style={styles.budgetCaption}>{t('dashboard_weekly_spend').toUpperCase()}</Text>
              <View style={[styles.statusPill, isOver ? styles.statusOver : styles.statusOk]}>
                <Ionicons
                  name={isOver ? 'warning-outline' : 'checkmark-circle-outline'}
                  size={11}
                  color={isOver ? C.tertiary : C.secondary}
                />
                <Text style={[styles.statusText, isOver && { color: C.tertiary }]}>
                  {isOver ? 'Dépassé' : 'Dans les clous'}
                </Text>
              </View>
            </View>

            <View style={styles.budgetAmountRow}>
              <Text style={[styles.budgetAmount, isOver && { color: C.tertiary }]}>
                {formatCurrency(weeklySpend)}
              </Text>
              <Text style={styles.budgetCap}> / {formatCurrency(limit)}</Text>
            </View>

            <View style={styles.progressTrack}>
              <View style={[
                styles.progressFill,
                { width: `${pct * 100}%`, backgroundColor: isOver ? C.tertiary : C.primary },
              ]} />
            </View>

            <View style={styles.budgetSubRow}>
              <Text style={styles.budgetPct}>{Math.round(pct * 100)}% utilisé</Text>
              <Text style={styles.budgetRem}>
                {isOver
                  ? `+${formatCurrency(weeklySpend - limit)} de dépassement`
                  : `${formatCurrency(remaining)} restant`}
              </Text>
            </View>

            <View style={styles.budgetDivider} />

            <View style={styles.budgetStats}>
              {[
                { val: String(plannedSlots.length), lbl: t('dashboard_meals_label') },
                { val: formatCurrency(totalMeals > 0 ? weeklySpend / 7 : 0), lbl: t('dashboard_avg_day') },
                { val: String(recipes.length), lbl: t('dashboard_recipes_count') },
              ].map((s, i) => (
                <React.Fragment key={s.lbl}>
                  {i > 0 && <View style={styles.budgetStatSep} />}
                  <View style={styles.budgetStat}>
                    <Text style={styles.budgetStatVal}>{s.val}</Text>
                    <Text style={styles.budgetStatLbl}>{s.lbl}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* ── Today's Menu ────────────────────────────── */}
        <Animated.View style={[styles.section, card(3)]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dashboard_today_menu')}</Text>
            {dayTotal > 0 && (
              <View style={styles.dayCostPill}>
                <Ionicons name="wallet-outline" size={11} color={C.primary} />
                <Text style={styles.dayCostText}>{formatCurrency(dayTotal)}</Text>
              </View>
            )}
          </View>
          <View style={styles.todayCard}>
            {mealLabels.map((label, idx) => {
              const slot   = weekPlan?.days[todayKey]?.[mealKeys[idx]] as any;
              const filled = !!slot?.recipeId;
              const isNext = idx === nextMealIdx;
              const mc     = MEAL_COLORS[mealKeys[idx] as string];
              return (
                <View
                  key={label}
                  style={[
                    styles.mealRow,
                    idx < 2 && { borderBottomWidth: 1, borderBottomColor: C.surfaceContainerHigh },
                    isNext && { backgroundColor: `${mc}08` },
                  ]}
                >
                  <View style={[styles.mealIconWrap, { backgroundColor: isNext ? mc : `${mc}18` }]}>
                    <Ionicons name={MEAL_ICONS[mealKeys[idx] as string]} size={16} color={isNext ? '#fff' : mc} />
                  </View>
                  <View style={styles.mealBody}>
                    <Text style={[styles.mealLabel, { color: mc }]}>{label}</Text>
                    <Text style={[styles.mealName, !filled && { color: C.outlineVariant, fontFamily: FontFamily.body }]} numberOfLines={1}>
                      {filled ? slot.recipeName : t('dashboard_not_planned')}
                    </Text>
                  </View>
                  <View style={styles.mealRight}>
                    {filled && slot.cost > 0 && (
                      <Text style={styles.mealCost}>{formatCurrency(slot.cost)}</Text>
                    )}
                    {isNext && filled && (
                      <View style={[styles.nextBadge, { backgroundColor: mc }]}>
                        <Text style={styles.nextBadgeText}>{t('dashboard_next_badge')}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* ── Weekly Strip ────────────────────────────── */}
        <Animated.View style={[styles.section, card(4)]}>
          <Text style={[styles.sectionTitle, { marginBottom: Spacing.sm }]}>{t('dashboard_this_week')}</Text>
          <View style={styles.weekStrip}>
            {dayKeys.map((key, idx) => {
              const dp = weekPlan?.days[key];
              const cnt = dp ? [dp.breakfast, dp.lunch, dp.dinner].filter((m) => m.recipeId).length : 0;
              const isToday = idx === todayIdx;
              const today = new Date();
              const start = new Date(today);
              start.setDate(today.getDate() - todayIdx);
              const d = new Date(start);
              d.setDate(start.getDate() + idx);
              return (
                <View key={key} style={[styles.weekDay, isToday && { backgroundColor: C.primary }]}>
                  <Text style={[styles.weekLetter, isToday && { color: C.onPrimary }]}>{DAY_LETTERS[idx]}</Text>
                  <Text style={[styles.weekNum,    isToday && { color: C.onPrimary }]}>{d.getDate()}</Text>
                  <View style={styles.dotRow}>
                    {[0, 1, 2].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.dot,
                          i < cnt && { backgroundColor: isToday ? 'rgba(255,255,255,0.85)' : C.primary },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* ── Wellness + Pantry ───────────────────────── */}
        <Animated.View style={[styles.section, card(5)]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dashboard_wellness')}</Text>
            <View style={styles.varietyPill}>
              <Ionicons name="stats-chart-outline" size={11} color={C.primary} />
              <Text style={styles.varietyText}>{varietyScore}%</Text>
            </View>
          </View>

          <View style={styles.wellnessCard}>
            {wellnessTypes.map((type, idx) => {
              const cfg  = WELLNESS_CFG[type];
              const cnt  = wellnessCounts[type];
              const pctW = totalMeals > 0 ? cnt / totalMeals : 0;
              return (
                <View key={type} style={[styles.wellnessRow, idx < 2 && { borderBottomWidth: 1, borderBottomColor: C.surfaceContainerHigh }]}>
                  <View style={[styles.wellnessIcon, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon} size={14} color={cfg.color} />
                  </View>
                  <Text style={styles.wellnessLbl}>{t(`wellness_${type}`)}</Text>
                  <View style={styles.wellnessTrack}>
                    <View style={[styles.wellnessFill, { width: `${pctW * 100}%`, backgroundColor: cfg.color }]} />
                  </View>
                  <Text style={[styles.wellnessPct, { color: cfg.color }]}>{Math.round(pctW * 100)}%</Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity style={styles.pantryCard} onPress={() => navigation.navigate('Pantry')} activeOpacity={0.84}>
            <View style={styles.pantryLeft}>
              <View style={styles.pantryIconWrap}>
                <Ionicons name="basket-outline" size={20} color={C.primary} />
              </View>
              <View>
                <Text style={styles.pantryTitle}>{t('dashboard_pantry_title')}</Text>
                <Text style={styles.pantrySub}>
                  {pantryCount > 0 ? `${pantryCount} ${t('dashboard_pantry_count')}` : t('dashboard_pantry_empty')}
                </Text>
              </View>
            </View>
            <View style={styles.pantryRight}>
              {pantryCount > 0 && (
                <View style={styles.pantryCnt}><Text style={styles.pantryCntText}>{pantryCount}</Text></View>
              )}
              <Ionicons name="chevron-forward" size={16} color={C.outlineVariant} />
            </View>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </Animated.View>
  );
};

// ── Styles ────────────────────────────────────────────────
const createStyles = (C: ReturnType<typeof useColors>) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.surface },

  // Header
  header: {
    backgroundColor: C.primary,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  blobTR: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -80, right: -70,
  },
  blobBL: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -50, left: -40,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  headerGreeting: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.bodyMd, color: 'rgba(255,255,255,0.72)', marginBottom: 2 },
  headerName: { fontFamily: FontFamily.headlineBold, fontSize: 30, color: '#fff', letterSpacing: -0.5 },
  headerDate: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: 'rgba(255,255,255,0.55)', marginTop: 3 },

  headerStats: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.md,
  },
  headerStat: { flex: 1, alignItems: 'center' },
  headerStatVal: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineSm, color: '#fff' },
  headerStatLbl: { fontFamily: FontFamily.body, fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 1, textAlign: 'center' },
  headerStatDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Next meal card (floats out of header)
  nextWrap: { marginTop: -28, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  nextCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 8,
  },
  nextAccent: { width: 5, alignSelf: 'stretch' },
  nextBody: { flex: 1, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md },
  nextTag: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelSm, color: C.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  nextName: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineSm, color: C.onSurface, marginBottom: 6 },
  cookBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  cookBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.primary },
  nextIconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },

  // Quick actions
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  quickRow: { flexDirection: 'row', gap: Spacing.sm },
  quickBtn: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.sm + 3, borderRadius: BorderRadius.xl,
    backgroundColor: `${C.primary}12`, gap: 4,
  },
  quickLabel: { fontFamily: FontFamily.bodyBold, fontSize: 10, color: C.primary, textAlign: 'center' },

  // Budget card
  budgetCard: {
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xxl,
    padding: Spacing.lg, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 4,
  },
  budgetBlob: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: `${C.primary}06`, top: -60, right: -60,
  },
  budgetTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  budgetCaption: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelSm, color: C.onSurfaceVariant, letterSpacing: 0.8 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusOk: { backgroundColor: `${C.secondary}14` },
  statusOver: { backgroundColor: `${C.tertiary}14` },
  statusText: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: C.secondary },
  budgetAmountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: Spacing.md },
  budgetAmount: { fontFamily: FontFamily.headlineBold, fontSize: 38, color: C.onSurface, letterSpacing: -1 },
  budgetCap: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant },
  progressTrack: { height: 10, backgroundColor: C.surfaceContainerHigh, borderRadius: 5, overflow: 'hidden', marginBottom: Spacing.xs },
  progressFill: { height: '100%', borderRadius: 5 },
  budgetSubRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  budgetPct: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.onSurfaceVariant },
  budgetRem: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.onSurfaceVariant },
  budgetDivider: { height: 1, backgroundColor: C.surfaceContainerHigh, marginBottom: Spacing.md },
  budgetStats: { flexDirection: 'row', alignItems: 'center' },
  budgetStat: { flex: 1, alignItems: 'center' },
  budgetStatVal: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg, color: C.onSurface },
  budgetStatLbl: { fontFamily: FontFamily.body, fontSize: 10, color: C.onSurfaceVariant, marginTop: 1, textAlign: 'center' },
  budgetStatSep: { width: 1, height: 28, backgroundColor: C.surfaceContainerHigh },

  // Section headers
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.titleLg, color: C.onSurface },
  dayCostPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${C.primary}12`, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  dayCostText: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: C.primary },

  // Today's menu
  todayCard: {
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xl, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  mealRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: Spacing.md, gap: Spacing.sm },
  mealIconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  mealBody: { flex: 1 },
  mealLabel: { fontFamily: FontFamily.bodyMedium, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  mealName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  mealRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mealCost: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.onSurfaceVariant },
  nextBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3 },
  nextBadgeText: { fontFamily: FontFamily.bodyBold, fontSize: 10, color: '#fff' },

  // Weekly strip
  weekStrip: {
    flexDirection: 'row', backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xl, padding: Spacing.xs,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  weekDay: { flex: 1, alignItems: 'center', paddingVertical: Spacing.xs + 2, borderRadius: BorderRadius.lg },
  weekLetter: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: C.onSurfaceVariant, marginBottom: 1 },
  weekNum: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.onSurfaceVariant, marginBottom: 4 },
  dotRow: { flexDirection: 'column', gap: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.surfaceContainerHigh },

  // Wellness
  varietyPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${C.primary}12`, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  varietyText: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: C.primary },
  wellnessCard: {
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  wellnessRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12, gap: Spacing.sm },
  wellnessIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  wellnessLbl: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.onSurface, width: 72 },
  wellnessTrack: { flex: 1, height: 8, backgroundColor: C.surfaceContainerHigh, borderRadius: 4, overflow: 'hidden' },
  wellnessFill: { height: '100%', borderRadius: 4 },
  wellnessPct: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleMd, width: 36, textAlign: 'right' },

  // Pantry
  pantryCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xl, padding: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  pantryLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  pantryIconWrap: { width: 42, height: 42, borderRadius: 21, backgroundColor: `${C.primary}12`, alignItems: 'center', justifyContent: 'center' },
  pantryTitle: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  pantrySub: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.onSurfaceVariant, marginTop: 1 },
  pantryRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pantryCnt: { backgroundColor: C.primary, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  pantryCntText: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: C.onPrimary },
});
