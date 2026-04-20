import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, FlatList, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { getOrCreateWeekPlan, updateMealSlot, getWeekStart } from '../../services/plannerService';
import { getRecipes, calculateRecipeCost } from '../../services/recipeService';
import { WeekPlan, Recipe, MealType, WellnessType } from '../../types';

const DAY_KEYS: Array<keyof WeekPlan['days']> = [
  'monday','tuesday','wednesday','thursday','friday','saturday','sunday',
];
const MEAL_KEYS: MealType[] = ['breakfast', 'lunch', 'dinner'];

const WELLNESS_COLOR: Record<WellnessType, string> = {
  balanced: Colors.primary,
  quick: Colors.tertiary,
  indulgent: Colors.error,
};

export const WeeklyPlannerScreen: React.FC = () => {
  const { user } = useAuth();
  const { t, formatCurrency } = usePreferences();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedDay, setSelectedDay] = useState(
    new Date().getDay() === 0 ? 6 : new Date().getDay() - 1,
  );
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ dayKey: keyof WeekPlan['days']; meal: MealType } | null>(null);
  const [customName, setCustomName] = useState('');
  const [customWellness, setCustomWellness] = useState<WellnessType>('balanced');

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
    setPickerVisible(true);
  };

  const assignCustom = async () => {
    if (!plan || !pickerTarget || !customName.trim()) return;
    const slot = {
      recipeId: `custom_${Date.now()}`,
      recipeName: customName.trim(),
      cost: 0,
      wellnessType: customWellness,
    };
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
    const slot = {
      recipeId: recipe.id,
      recipeName: recipe.name,
      cost: totalCost / recipe.servings,
      wellnessType: recipe.wellnessType,
    };
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

  // Week dates
  const weekDates = (() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
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

  const DAY_LABELS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.headerBand, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerDecor} />
        <View style={styles.headerMain}>
          <View>
            <Text style={styles.title}>{t('planner_title')}</Text>
            <Text style={styles.subtitle}>{t('planner_week_of')} {getWeekStart()}</Text>
          </View>
          <View style={styles.weekSummaryPill}>
            <Ionicons name="restaurant-outline" size={13} color="#fff" />
            <Text style={styles.weekSummaryText}>
              {plan ? Object.values(plan.days).reduce((s, d) => s + MEAL_KEYS.filter((k) => (d[k] as any).recipeId).length, 0) : 0} {t('planner_meals_planned')}
            </Text>
          </View>
        </View>
      </View>

      {/* Day selector */}
      <View style={styles.dayRow}>
        {weekDates.map((date, idx) => {
          const isToday = idx === todayIdx;
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
                {DAY_LABELS_SHORT[idx]}
              </Text>
              <Text style={[styles.dayChipDate, isSelected && styles.dayChipTextActive]}>
                {date.getDate()}
              </Text>
              {isToday && !isSelected && <View style={styles.todayDot} />}
              {mealCount > 0 && (
                <View style={[styles.mealCountBadge, isSelected && styles.mealCountBadgeActive]}>
                  <Text style={[styles.mealCountText, isSelected && styles.mealCountTextActive]}>{mealCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Day header bar */}
      <View style={styles.dayHeaderBar}>
        <View style={styles.dayHeaderLeft}>
          <Text style={styles.dayHeaderName}>
            {['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'][selectedDay]}
          </Text>
          {selectedDay === todayIdx && (
            <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>Aujourd'hui</Text></View>
          )}
        </View>
        {dayTotal > 0 && (
          <View style={styles.dayCostChip}>
            <Ionicons name="wallet-outline" size={13} color={Colors.primary} />
            <Text style={styles.dayCostText}>{formatCurrency(dayTotal)}</Text>
          </View>
        )}
      </View>

      {/* Meals */}
      <ScrollView style={styles.mealsScroll} showsVerticalScrollIndicator={false}>
        {MEAL_KEYS.map((meal) => {
          const slot = dayPlan?.[meal] as any;
          const filled = !!slot?.recipeId;
          const wellnessColor = filled && slot.wellnessType ? WELLNESS_COLOR[slot.wellnessType as WellnessType] : Colors.outline;
          return (
            <View key={meal} style={styles.mealCard}>
              {filled && <View style={[styles.mealAccent, { backgroundColor: wellnessColor }]} />}
              <View style={styles.mealCardInner}>
                <View style={styles.mealCardHeader}>
                  <View style={[styles.mealIconCircle, filled && { backgroundColor: wellnessColor }]}>
                    <Ionicons name={getMealIcon(meal)} size={15} color={filled ? '#fff' : Colors.onSurfaceVariant} />
                  </View>
                  <Text style={styles.mealTypeLabel}>{getMealLabel(meal)}</Text>
                  {filled && (
                    <TouchableOpacity
                      onPress={() => clearSlot(DAY_KEYS[selectedDay], meal)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle-outline" size={18} color={Colors.outline} />
                    </TouchableOpacity>
                  )}
                </View>
                {filled ? (
                  <TouchableOpacity
                    style={styles.filledSlot}
                    onPress={() => openPicker(DAY_KEYS[selectedDay], meal)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.filledSlotContent}>
                      <Text style={styles.filledName}>{slot.recipeName}</Text>
                      {slot.cost > 0 && (
                        <Text style={styles.filledCost}>{formatCurrency(slot.cost)}{t('dashboard_per_person')}</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.outlineVariant} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.emptySlot}
                    onPress={() => openPicker(DAY_KEYS[selectedDay], meal)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.emptySlotIcon}>
                      <Ionicons name="add" size={16} color={Colors.primary} />
                    </View>
                    <Text style={styles.emptySlotText}>{t('planner_add_meal')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Meal picker modal */}
      <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('planner_add_meal')}</Text>

            {/* ── Free text entry ── */}
            <View style={styles.customSection}>
              <Text style={styles.customSectionLabel}>Saisir un repas libre</Text>
              <View style={styles.customInputRow}>
                <TextInput
                  style={styles.customInput}
                  value={customName}
                  onChangeText={setCustomName}
                  placeholder="Ex: Sandwich maison, Resto, Pizza…"
                  placeholderTextColor={Colors.outline}
                  returnKeyType="done"
                  onSubmitEditing={assignCustom}
                />
                <TouchableOpacity
                  style={[styles.customConfirmBtn, !customName.trim() && styles.customConfirmBtnDisabled]}
                  onPress={assignCustom}
                  disabled={!customName.trim()}
                >
                  <Ionicons name="checkmark" size={20} color={Colors.onPrimary} />
                </TouchableOpacity>
              </View>

              {/* Wellness type selector for custom meal */}
              <View style={styles.customWellnessRow}>
                {(['balanced', 'quick', 'indulgent'] as WellnessType[]).map((w) => {
                  const color = WELLNESS_COLOR[w];
                  const active = customWellness === w;
                  return (
                    <TouchableOpacity
                      key={w}
                      style={[styles.customWellnessChip, active && { backgroundColor: color, borderColor: color }]}
                      onPress={() => setCustomWellness(w)}
                    >
                      <Text style={[styles.customWellnessText, active && { color: '#fff' }]}>
                        {t(`wellness_${w}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Divider ── */}
            {recipes.length > 0 && (
              <View style={styles.orDivider}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>ou choisir une recette</Text>
                <View style={styles.orLine} />
              </View>
            )}

            {/* ── Recipe list ── */}
            {recipes.length > 0 && (
              <FlatList
                data={recipes}
                keyExtractor={(r) => r.id}
                showsVerticalScrollIndicator={false}
                style={styles.recipeList}
                ItemSeparatorComponent={() => <View style={styles.modalSep} />}
                renderItem={({ item }) => {
                  const wColor = WELLNESS_COLOR[item.wellnessType] ?? Colors.outline;
                  return (
                    <TouchableOpacity style={styles.recipePickerRow} onPress={() => assignRecipe(item)} activeOpacity={0.8}>
                      <View style={[styles.recipePickerWellness, { backgroundColor: wColor }]} />
                      <View style={styles.recipePickerContent}>
                        <Text style={styles.recipePickerName}>{item.name}</Text>
                        <View style={styles.recipePickerMeta}>
                          <Text style={styles.recipePickerMetaText}>{item.prepTime + item.cookTime} min</Text>
                          <Text style={styles.recipePickerMetaDot}>·</Text>
                          <Text style={styles.recipePickerMetaText}>{item.servings} {t('recipes_pers')}</Text>
                          <Text style={styles.recipePickerMetaDot}>·</Text>
                          <Text style={[styles.recipePickerMetaText, { color: wColor }]}>
                            {t(`wellness_${item.wellnessType}`)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.recipePickerCost}>
                        {formatCurrency((item.totalCost ?? 0) / (item.servings || 1))}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setPickerVisible(false)}>
              <Text style={styles.cancelText}>{t('common_cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  headerBand: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg + 16, overflow: 'hidden',
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  headerDecor: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -40,
  },
  headerMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm, color: '#fff' },
  subtitle: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  weekSummaryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 6, marginTop: 4,
  },
  weekSummaryText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelSm, color: '#fff' },

  dayRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.xs },
  dayChip: {
    flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surfaceContainerHigh, height: 74, justifyContent: 'center',
  },
  dayChipActive: { backgroundColor: Colors.primary },
  dayChipLetter: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: Colors.onSurfaceVariant },
  dayChipDate: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleMd, color: Colors.onSurface, marginVertical: 1 },
  dayChipTextActive: { color: Colors.onPrimary },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary, marginTop: 2 },
  mealCountBadge: {
    marginTop: 3, width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  mealCountBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)', borderColor: 'rgba(255,255,255,0.5)' },
  mealCountText: { fontFamily: FontFamily.bodyBold, fontSize: 10, color: Colors.onSurfaceVariant },
  mealCountTextActive: { color: Colors.onPrimary },

  dayHeaderBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs, marginBottom: 4,
  },
  dayHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  dayHeaderName: { fontFamily: FontFamily.headline, fontSize: FontSize.titleLg, color: Colors.onSurface },
  todayBadge: {
    backgroundColor: `${Colors.primary}12`, borderRadius: BorderRadius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  todayBadgeText: { fontFamily: FontFamily.bodyBold, fontSize: 10, color: Colors.primary },
  dayCostChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${Colors.primary}10`, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 5,
  },
  dayCostText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.primary },

  mealsScroll: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs },
  mealCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    marginBottom: Spacing.sm, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  mealAccent: { width: 4 },
  mealCardInner: { flex: 1, padding: Spacing.md },
  mealCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  mealIconCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center',
  },
  mealTypeLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface, flex: 1 },
  filledSlot: { flexDirection: 'row', alignItems: 'center' },
  filledSlotContent: { flex: 1 },
  filledName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface },
  filledCost: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant, marginTop: 2 },
  emptySlot: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.lg,
  },
  emptySlotIcon: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: `${Colors.primary}15`, alignItems: 'center', justifyContent: 'center',
  },
  emptySlotText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.bodyMd, color: Colors.primary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, maxHeight: '75%',
  },
  modalHandle: { width: 36, height: 4, backgroundColor: Colors.outlineVariant, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd, color: Colors.onSurface, marginBottom: Spacing.md },
  noRecipesWrap: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
  noRecipesText: { fontFamily: FontFamily.body, color: Colors.onSurfaceVariant, textAlign: 'center' },
  modalSep: { height: 1, backgroundColor: Colors.surfaceContainerHigh },
  recipePickerRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  recipePickerWellness: { width: 4, height: 40, borderRadius: 2 },
  recipePickerContent: { flex: 1 },
  recipePickerName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface },
  recipePickerMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  recipePickerMetaText: { fontFamily: FontFamily.body, fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant },
  recipePickerMetaDot: { color: Colors.outlineVariant, fontSize: 10 },
  recipePickerCost: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.bodyMd, color: Colors.primary },
  cancelBtn: { marginTop: Spacing.md, backgroundColor: Colors.surfaceContainerHigh, borderRadius: BorderRadius.full, padding: Spacing.md, alignItems: 'center' },
  cancelText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },

  // Custom meal entry
  customSection: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.xl,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  customSectionLabel: {
    fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd,
    color: Colors.onSurfaceVariant, marginBottom: Spacing.sm,
  },
  customInputRow: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' },
  customInput: {
    flex: 1, backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.md, paddingVertical: 11,
    fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurface,
  },
  customConfirmBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  customConfirmBtnDisabled: { backgroundColor: Colors.surfaceContainerHigh },
  customWellnessRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm },
  customWellnessChip: {
    flex: 1, alignItems: 'center', paddingVertical: 7,
    borderRadius: BorderRadius.full, borderWidth: 1.5,
    borderColor: Colors.outlineVariant, backgroundColor: 'transparent',
  },
  customWellnessText: {
    fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant,
  },

  // Or divider
  orDivider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginVertical: Spacing.sm },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.surfaceContainerHigh },
  orText: { fontFamily: FontFamily.body, fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant },

  recipeList: { maxHeight: 240 },
});
