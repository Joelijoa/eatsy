import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, FlatList, TextInput, Animated,
} from 'react-native';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { usePreferences, useColors } from '../../context/PreferencesContext';
import { getOrCreateWeekPlan, updateMealSlot, getWeekStart } from '../../services/plannerService';
import { getRecipes, calculateRecipeCost } from '../../services/recipeService';
import { WeekPlan, Recipe, MealType, WellnessType } from '../../types';
import { HeaderActions } from '../../components/HeaderActions';

const DAY_KEYS: Array<keyof WeekPlan['days']> = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];
const MEAL_KEYS: MealType[] = ['breakfast', 'lunch', 'dinner'];


const DAY_KEYS_SHORT = [
  'planner_day_short_mon', 'planner_day_short_tue', 'planner_day_short_wed',
  'planner_day_short_thu', 'planner_day_short_fri', 'planner_day_short_sat', 'planner_day_short_sun',
];
const DAY_FULL_KEYS = [
  'planner_day_mon', 'planner_day_tue', 'planner_day_wed',
  'planner_day_thu', 'planner_day_fri', 'planner_day_sat', 'planner_day_sun',
];

export const WeeklyPlannerScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { t, formatCurrency } = usePreferences();
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const WELLNESS_COLOR: Record<WellnessType, string> = {
    balanced: Colors.primary,
    quick:    Colors.tertiary,
    indulgent: Colors.error,
  };

  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedDay, setSelectedDay] = useState(
    new Date().getDay() === 0 ? 6 : new Date().getDay() - 1,
  );
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ dayKey: keyof WeekPlan['days']; meal: MealType } | null>(null);
  const [customName, setCustomName] = useState('');
  const [customWellness, setCustomWellness] = useState<WellnessType>('balanced');
  const [recipeSearch, setRecipeSearch] = useState('');

  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []));

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    if (!user) return;
    const [wp, r] = await Promise.all([
      getOrCreateWeekPlan(user.uid, getWeekStart()),
      getRecipes(user.uid),
    ]);
    setPlan(wp);
    setRecipes(r);
  };

  const openPicker = (dayKey: keyof WeekPlan['days'], meal: MealType) => {
    setPickerTarget({ dayKey, meal });
    setCustomName('');
    setCustomWellness('balanced');
    setRecipeSearch('');
    setPickerVisible(true);
  };

  const assignCustom = async () => {
    if (!plan || !pickerTarget || !customName.trim()) return;
    const slot = { recipeId: `custom_${Date.now()}`, recipeName: customName.trim(), cost: 0, wellnessType: customWellness };
    await updateMealSlot(plan.id, pickerTarget.dayKey, pickerTarget.meal, slot);
    setPlan((prev) => {
      if (!prev || !pickerTarget) return prev;
      return { ...prev, days: { ...prev.days, [pickerTarget.dayKey]: { ...prev.days[pickerTarget.dayKey], [pickerTarget.meal]: slot } } };
    });
    setPickerVisible(false);
  };

  const assignRecipe = async (recipe: Recipe) => {
    if (!plan || !pickerTarget) return;
    const { totalCost } = calculateRecipeCost(recipe);
    const slot = { recipeId: recipe.id, recipeName: recipe.name, cost: totalCost / recipe.servings, wellnessType: recipe.wellnessType };
    await updateMealSlot(plan.id, pickerTarget.dayKey, pickerTarget.meal, slot);
    setPlan((prev) => {
      if (!prev || !pickerTarget) return prev;
      return { ...prev, days: { ...prev.days, [pickerTarget.dayKey]: { ...prev.days[pickerTarget.dayKey], [pickerTarget.meal]: slot } } };
    });
    setPickerVisible(false);
  };

  const clearSlot = async (dayKey: keyof WeekPlan['days'], meal: MealType) => {
    if (!plan) return;
    const empty = { recipeId: null };
    await updateMealSlot(plan.id, dayKey, meal, empty);
    setPlan((prev) => {
      if (!prev) return prev;
      return { ...prev, days: { ...prev.days, [dayKey]: { ...prev.days[dayKey], [meal]: empty } } };
    });
  };

  const dayPlan = plan?.days[DAY_KEYS[selectedDay]];
  const dayTotal = dayPlan ? MEAL_KEYS.reduce((s, k) => s + ((dayPlan[k] as any).cost ?? 0), 0) : 0;
  const totalMealsPlanned = plan
    ? Object.values(plan.days).reduce((s, d) => s + MEAL_KEYS.filter((k) => (d[k] as any).recipeId).length, 0)
    : 0;
  const weekCost = plan
    ? Object.values(plan.days).reduce((s, d) => s + MEAL_KEYS.reduce((ms, k) => ms + ((d[k] as any).cost ?? 0), 0), 0)
    : 0;

  const weekDates = (() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d;
    });
  })();

  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  const getMealLabel = (meal: MealType) => {
    if (meal === 'breakfast') return t('meal_breakfast_full');
    if (meal === 'lunch') return t('meal_lunch');
    return t('meal_dinner');
  };
  const getMealIcon = (meal: MealType): keyof typeof Ionicons.glyphMap => {
    if (meal === 'breakfast') return 'sunny-outline';
    if (meal === 'lunch') return 'partly-sunny-outline';
    return 'moon-outline';
  };

  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(recipeSearch.toLowerCase()),
  );

  const styles = createStyles(Colors);
  const { opacity, translateY } = useScreenEntrance();

  return (
    <Animated.View style={[styles.screen, { opacity, transform: [{ translateY }] }]}>

      {/* ── Header ── */}
      <View style={[styles.headerBand, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerDecor1} />
        <View style={styles.headerDecor2} />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{t('planner_title')}</Text>
            <Text style={styles.subtitle}>{t('planner_week_of')} {getWeekStart()}</Text>
          </View>
          <View style={styles.headerRight}>
            <HeaderActions navigation={navigation} />
            <View style={styles.weekPill}>
              <Ionicons name="restaurant-outline" size={12} color="#fff" />
              <Text style={styles.weekPillText}>{totalMealsPlanned} {t('planner_meals_planned')}</Text>
            </View>
            {weekCost > 0 && (
              <View style={[styles.weekPill, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Ionicons name="wallet-outline" size={12} color="#fff" />
                <Text style={styles.weekPillText}>{formatCurrency(weekCost)}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── Floating day strip ── */}
      <View style={styles.dayStrip}>
        {weekDates.map((date, idx) => {
          const isToday    = idx === todayIdx;
          const isSelected = idx === selectedDay;
          const dayPlanData = plan?.days[DAY_KEYS[idx]];
          const mealCount = dayPlanData ? MEAL_KEYS.filter((k) => (dayPlanData[k] as any).recipeId).length : 0;
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.dayChip, isSelected && styles.dayChipActive]}
              onPress={() => setSelectedDay(idx)}
              activeOpacity={0.8}
            >
              <Text style={[styles.dayChipLetter, isSelected && styles.dayChipTextActive]}>
                {t(DAY_KEYS_SHORT[idx])}
              </Text>
              <Text style={[styles.dayChipDate, isSelected && styles.dayChipTextActive]}>
                {date.getDate()}
              </Text>
              {isToday && !isSelected && <View style={styles.todayDot} />}
              {mealCount > 0 && (
                <View style={[styles.mealBadge, isSelected && styles.mealBadgeActive]}>
                  <Text style={[styles.mealBadgeText, isSelected && styles.mealBadgeTextActive]}>
                    {mealCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Day header ── */}
      <View style={styles.dayHeader}>
        <View style={styles.dayHeaderLeft}>
          <Text style={styles.dayHeaderName}>{t(DAY_FULL_KEYS[selectedDay])}</Text>
          {selectedDay === todayIdx && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>{t('planner_today')}</Text>
            </View>
          )}
        </View>
        {dayTotal > 0 && (
          <View style={styles.dayCostChip}>
            <Ionicons name="wallet-outline" size={12} color={Colors.primary} />
            <Text style={styles.dayCostText}>{formatCurrency(dayTotal)}</Text>
          </View>
        )}
      </View>

      {/* ── Meal cards ── */}
      <ScrollView ref={scrollRef} style={styles.mealsScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.mealsContent}>
        {MEAL_KEYS.map((meal) => {
          const slot = dayPlan?.[meal] as any;
          const filled = !!slot?.recipeId;
          const wColor = filled && slot.wellnessType ? WELLNESS_COLOR[slot.wellnessType as WellnessType] : Colors.outline;

          return (
            <View key={meal} style={styles.mealCard}>
              {filled && <View style={[styles.mealAccent, { backgroundColor: wColor }]} />}
              <View style={styles.mealCardInner}>
                {/* Meal type row */}
                <View style={styles.mealTypeRow}>
                  <View style={[styles.mealIconCircle, filled && { backgroundColor: wColor }]}>
                    <Ionicons name={getMealIcon(meal)} size={14} color={filled ? '#fff' : Colors.onSurfaceVariant} />
                  </View>
                  <Text style={styles.mealTypeLabel}>{getMealLabel(meal)}</Text>
                  {filled && (
                    <TouchableOpacity
                      onPress={() => clearSlot(DAY_KEYS[selectedDay], meal)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle-outline" size={18} color={Colors.outlineVariant} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Slot content */}
                {filled ? (
                  <TouchableOpacity
                    style={styles.filledSlot}
                    onPress={() => openPicker(DAY_KEYS[selectedDay], meal)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.filledWellnessDot, { backgroundColor: wColor }]} />
                    <View style={styles.filledSlotContent}>
                      <Text style={styles.filledName}>{slot.recipeName}</Text>
                      {slot.cost > 0 && (
                        <Text style={styles.filledCost}>
                          {formatCurrency(slot.cost)}{t('dashboard_per_person')}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={15} color={Colors.outlineVariant} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.emptySlot}
                    onPress={() => openPicker(DAY_KEYS[selectedDay], meal)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.emptySlotIcon}>
                      <Ionicons name="add" size={15} color={Colors.primary} />
                    </View>
                    <Text style={styles.emptySlotText}>{t('planner_add_meal')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ── Meal picker modal ── */}
      <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('planner_add_meal')}</Text>

            {/* Free text entry */}
            <View style={styles.customSection}>
              <Text style={styles.customLabel}>{t('planner_custom_meal')}</Text>
              <View style={styles.customRow}>
                <TextInput
                  style={styles.customInput}
                  value={customName}
                  onChangeText={setCustomName}
                  placeholder="Ex: Sandwich maison, Resto…"
                  placeholderTextColor={Colors.outline}
                  returnKeyType="done"
                  onSubmitEditing={assignCustom}
                />
                <TouchableOpacity
                  style={[styles.customConfirm, !customName.trim() && styles.customConfirmDisabled]}
                  onPress={assignCustom}
                  disabled={!customName.trim()}
                >
                  <Ionicons name="checkmark" size={20} color={Colors.onPrimary} />
                </TouchableOpacity>
              </View>
              <View style={styles.wellnessRow}>
                {(['balanced', 'quick', 'indulgent'] as WellnessType[]).map((w) => {
                  const color = WELLNESS_COLOR[w];
                  const active = customWellness === w;
                  return (
                    <TouchableOpacity
                      key={w}
                      style={[styles.wellnessChip, active && { backgroundColor: color, borderColor: color }]}
                      onPress={() => setCustomWellness(w)}
                    >
                      <Text style={[styles.wellnessChipText, active && { color: '#fff' }]}>
                        {t(`wellness_${w}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Divider + recipe search */}
            {recipes.length > 0 && (
              <>
                <View style={styles.orDivider}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>{t('planner_or_recipe')}</Text>
                  <View style={styles.orLine} />
                </View>
                <View style={styles.searchBar}>
                  <Ionicons name="search-outline" size={15} color={Colors.outline} />
                  <TextInput
                    style={styles.searchInput}
                    value={recipeSearch}
                    onChangeText={setRecipeSearch}
                    placeholder={t('planner_search_recipe')}
                    placeholderTextColor={Colors.outline}
                  />
                  {recipeSearch ? (
                    <TouchableOpacity onPress={() => setRecipeSearch('')}>
                      <Ionicons name="close-circle" size={15} color={Colors.outline} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <FlatList
                  data={filteredRecipes}
                  keyExtractor={(r) => r.id}
                  showsVerticalScrollIndicator={false}
                  style={styles.recipeList}
                  ItemSeparatorComponent={() => <View style={styles.sep} />}
                  renderItem={({ item }) => {
                    const wColor = WELLNESS_COLOR[item.wellnessType] ?? Colors.outline;
                    return (
                      <TouchableOpacity style={styles.recipeRow} onPress={() => assignRecipe(item)} activeOpacity={0.8}>
                        <View style={[styles.recipeAccent, { backgroundColor: wColor }]} />
                        <View style={styles.recipeContent}>
                          <Text style={styles.recipeName}>{item.name}</Text>
                          <View style={styles.recipeMeta}>
                            <Text style={styles.recipeMetaText}>{item.prepTime + item.cookTime} min</Text>
                            <Text style={styles.recipeMetaDot}>·</Text>
                            <Text style={styles.recipeMetaText}>{item.servings} {t('recipes_pers')}</Text>
                            <Text style={styles.recipeMetaDot}>·</Text>
                            <Text style={[styles.recipeMetaText, { color: wColor }]}>
                              {t(`wellness_${item.wellnessType}`)}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.recipeCost}>
                          {formatCurrency((item.totalCost ?? 0) / (item.servings || 1))}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </>
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setPickerVisible(false)}>
              <Text style={styles.cancelText}>{t('common_cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </Animated.View>
  );
};

const createStyles = (C: typeof Colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.surface },

  // ── Header ──
  headerBand: {
    backgroundColor: C.primary,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg + 12,
    overflow: 'hidden',
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  headerDecor1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -80, right: -50,
  },
  headerDecor2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -40, left: -20,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm, color: '#fff' },
  subtitle: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  headerRight: { alignItems: 'flex-end', gap: 6 },
  weekPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  weekPillText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelSm, color: '#fff' },

  // ── Floating day strip ──
  dayStrip: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: -20,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: BorderRadius.xxl,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    gap: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
    zIndex: 1,
  },
  dayChip: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl, gap: 2,
  },
  dayChipActive: { backgroundColor: C.primary },
  dayChipLetter: { fontFamily: FontFamily.bodyBold, fontSize: 10, color: C.onSurfaceVariant },
  dayChipDate: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleMd, color: C.onSurface },
  dayChipTextActive: { color: C.onPrimary },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.primary },
  mealBadge: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: `${C.primary}18`,
    alignItems: 'center', justifyContent: 'center',
  },
  mealBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  mealBadgeText: { fontFamily: FontFamily.bodyBold, fontSize: 9, color: C.primary },
  mealBadgeTextActive: { color: '#fff' },

  // ── Day header ──
  dayHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xs,
  },
  dayHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  dayHeaderName: { fontFamily: FontFamily.headline, fontSize: FontSize.titleLg, color: C.onSurface },
  todayBadge: {
    backgroundColor: `${C.primary}12`, borderRadius: BorderRadius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  todayBadgeText: { fontFamily: FontFamily.bodyBold, fontSize: 10, color: C.primary },
  dayCostChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${C.primary}10`, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 5,
  },
  dayCostText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.primary },

  // ── Meal cards ──
  mealsScroll: { flex: 1 },
  mealsContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs, paddingBottom: 120 },
  mealCard: {
    flexDirection: 'row',
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.sm, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  mealAccent: { width: 4 },
  mealCardInner: { flex: 1, padding: Spacing.md },
  mealTypeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  mealIconCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center',
  },
  mealTypeLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface, flex: 1 },

  filledSlot: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  filledWellnessDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  filledSlotContent: { flex: 1 },
  filledName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  filledCost: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.onSurfaceVariant, marginTop: 2 },

  emptySlot: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingVertical: 10, paddingHorizontal: Spacing.sm,
    backgroundColor: C.surfaceContainerLow, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: `${C.primary}20`, borderStyle: 'dashed',
  },
  emptySlotIcon: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: `${C.primary}15`, alignItems: 'center', justifyContent: 'center',
  },
  emptySlotText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.bodyMd, color: C.primary },

  // ── Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.surfaceContainerLowest,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, maxHeight: '78%',
  },
  modalHandle: {
    width: 36, height: 4, backgroundColor: C.outlineVariant,
    borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg,
  },
  modalTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd, color: C.onSurface, marginBottom: Spacing.md },

  customSection: {
    backgroundColor: C.surfaceContainerLow, borderRadius: BorderRadius.xl,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  customLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.onSurfaceVariant, marginBottom: Spacing.sm },
  customRow: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' },
  customInput: {
    flex: 1, backgroundColor: C.surfaceContainerLowest,
    borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.md, paddingVertical: 11,
    fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurface,
  },
  customConfirm: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },
  customConfirmDisabled: { backgroundColor: C.surfaceContainerHigh },
  wellnessRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm },
  wellnessChip: {
    flex: 1, alignItems: 'center', paddingVertical: 7,
    borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: C.outlineVariant,
  },
  wellnessChipText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelSm, color: C.onSurfaceVariant },

  orDivider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginVertical: Spacing.sm },
  orLine: { flex: 1, height: 1, backgroundColor: C.surfaceContainerHigh },
  orText: { fontFamily: FontFamily.body, fontSize: FontSize.labelSm, color: C.onSurfaceVariant },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: C.surfaceContainerLow, borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.sm, marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1, paddingVertical: 9,
    fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurface,
  },
  recipeList: { maxHeight: 220 },
  sep: { height: 1, backgroundColor: C.surfaceContainerHigh },
  recipeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.sm },
  recipeAccent: { width: 4, height: 38, borderRadius: 2 },
  recipeContent: { flex: 1 },
  recipeName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  recipeMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  recipeMetaText: { fontFamily: FontFamily.body, fontSize: FontSize.labelSm, color: C.onSurfaceVariant },
  recipeMetaDot: { color: C.outlineVariant, fontSize: 10 },
  recipeCost: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.bodyMd, color: C.primary },

  cancelBtn: {
    marginTop: Spacing.md, backgroundColor: C.surfaceContainerHigh,
    borderRadius: BorderRadius.full, padding: Spacing.md, alignItems: 'center',
  },
  cancelText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant },
});
