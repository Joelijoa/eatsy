import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { getOrCreateWeekPlan, updateMealSlot, getWeekStart } from '../../services/plannerService';
import { getRecipes, calculateRecipeCost } from '../../services/recipeService';
import { WeekPlan, Recipe, MealType } from '../../types';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAY_KEYS: Array<keyof WeekPlan['days']> = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];
const MEAL_KEYS: MealType[] = ['breakfast', 'lunch', 'dinner'];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
};
const MEAL_ICONS: Record<MealType, keyof typeof Ionicons.glyphMap> = {
  breakfast: 'sunny-outline',
  lunch: 'partly-sunny-outline',
  dinner: 'moon-outline',
};

export const WeeklyPlannerScreen: React.FC = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedDay, setSelectedDay] = useState(
    new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  );
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ dayKey: keyof WeekPlan['days']; meal: MealType } | null>(null);

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
      return {
        ...prev,
        days: { ...prev.days, [pickerTarget.dayKey]: { ...prev.days[pickerTarget.dayKey], [pickerTarget.meal]: slot } },
      };
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
  const dayTotal = dayPlan
    ? MEAL_KEYS.reduce((s, k) => s + ((dayPlan[k] as any).cost ?? 0), 0)
    : 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Planning</Text>
        <Text style={styles.subtitle}>Semaine du {getWeekStart()}</Text>
      </View>

      {/* Day selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
        {DAYS.map((day, idx) => {
          const isToday = idx === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
          const dayPlanned = plan?.days[DAY_KEYS[idx]];
          const hasMeals = dayPlanned && MEAL_KEYS.some((k) => (dayPlanned[k] as any).recipeId);
          return (
            <TouchableOpacity
              key={day}
              style={[styles.dayChip, selectedDay === idx && styles.dayChipActive]}
              onPress={() => setSelectedDay(idx)}
            >
              <Text style={[styles.dayChipText, selectedDay === idx && styles.dayChipTextActive]}>{day}</Text>
              {isToday && <View style={[styles.todayDot, selectedDay === idx && styles.todayDotActive]} />}
              {hasMeals && selectedDay !== idx && <View style={styles.plannedDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Day cost banner */}
      {dayTotal > 0 && (
        <View style={styles.dayCostBanner}>
          <Ionicons name="wallet-outline" size={14} color={Colors.primary} />
          <Text style={styles.dayCostText}>Coût du jour : <Text style={styles.dayCostAmount}>{dayTotal.toFixed(2)} €</Text></Text>
        </View>
      )}

      {/* Meals */}
      <ScrollView style={styles.mealsScroll} showsVerticalScrollIndicator={false}>
        {MEAL_KEYS.map((meal, idx) => {
          const slot = dayPlan?.[meal] as any;
          const filled = !!slot?.recipeId;
          return (
            <View key={meal} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <View style={styles.mealLabelRow}>
                  <Ionicons name={MEAL_ICONS[meal]} size={16} color={Colors.onSurfaceVariant} />
                  <Text style={styles.mealLabel}>{MEAL_LABELS[meal]}</Text>
                </View>
                {filled && (
                  <TouchableOpacity onPress={() => clearSlot(DAY_KEYS[selectedDay], meal)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={18} color={Colors.outline} />
                  </TouchableOpacity>
                )}
              </View>

              {filled ? (
                <TouchableOpacity style={styles.filledSlot} onPress={() => { setPickerTarget({ dayKey: DAY_KEYS[selectedDay], meal }); setPickerVisible(true); }}>
                  <View style={styles.filledContent}>
                    <Text style={styles.filledName}>{slot.recipeName}</Text>
                    <View style={styles.filledMeta}>
                      {slot.cost > 0 && <Text style={styles.filledCost}>{slot.cost.toFixed(2)} €/pers.</Text>}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.outline} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.emptySlot}
                  onPress={() => { setPickerTarget({ dayKey: DAY_KEYS[selectedDay], meal }); setPickerVisible(true); }}
                >
                  <Ionicons name="add" size={18} color={Colors.primary} />
                  <Text style={styles.emptySlotText}>Ajouter un repas</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Recipe picker */}
      <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choisir une recette</Text>
            {recipes.length === 0 ? (
              <Text style={styles.noRecipes}>Aucune recette disponible.</Text>
            ) : (
              <FlatList
                data={recipes}
                keyExtractor={(r) => r.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.recipeItem} onPress={() => assignRecipe(item)}>
                    <View style={styles.recipeItemContent}>
                      <Text style={styles.recipeItemName}>{item.name}</Text>
                      <Text style={styles.recipeItemMeta}>{item.prepTime + item.cookTime} min · {item.servings} pers.</Text>
                    </View>
                    <Text style={styles.recipeItemCost}>
                      {(item.totalCost ?? 0 / item.servings).toFixed(2)} €
                    </Text>
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setPickerVisible(false)}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm, color: Colors.onSurface },
  subtitle: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant, marginTop: 2 },
  dayRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.xs },
  dayChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', minWidth: 44,
  },
  dayChipActive: { backgroundColor: Colors.primary },
  dayChipText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant },
  dayChipTextActive: { color: Colors.onPrimary },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary, marginTop: 2 },
  todayDotActive: { backgroundColor: Colors.primaryFixed },
  plannedDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.secondary, marginTop: 2 },
  dayCostBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.xs,
    backgroundColor: `${Colors.primary}10`, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  dayCostText: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant },
  dayCostAmount: { fontFamily: FontFamily.bodyBold, color: Colors.primary },
  mealsScroll: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs },
  mealCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    padding: Spacing.md, marginBottom: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  mealLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  mealLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface },
  filledSlot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filledContent: { flex: 1 },
  filledName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface },
  filledMeta: { flexDirection: 'row', gap: Spacing.sm, marginTop: 2 },
  filledCost: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.primary },
  emptySlot: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.lg,
  },
  emptySlotText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.bodyMd, color: Colors.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.lg, maxHeight: '70%',
  },
  modalHandle: {
    width: 36, height: 4, backgroundColor: Colors.outlineVariant,
    borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md,
  },
  modalTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd, color: Colors.onSurface, marginBottom: Spacing.md },
  noRecipes: { fontFamily: FontFamily.body, color: Colors.onSurfaceVariant, textAlign: 'center', padding: Spacing.xl },
  recipeItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md },
  recipeItemContent: { flex: 1 },
  recipeItemName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface },
  recipeItemMeta: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant, marginTop: 2 },
  recipeItemCost: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.primary },
  separator: { height: 1, backgroundColor: Colors.surfaceContainerHigh },
  cancelBtn: { marginTop: Spacing.md, backgroundColor: Colors.surfaceContainerHigh, borderRadius: BorderRadius.full, padding: Spacing.md, alignItems: 'center' },
  cancelText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
});
