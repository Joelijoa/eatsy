import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, FlatList, Alert,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { getOrCreateWeekPlan, updateMealSlot, getWeekStart } from '../../services/plannerService';
import { getRecipes } from '../../services/recipeService';
import { WeekPlan, Recipe, MealType, WellnessType } from '../../types';
import { WellnessBadge } from '../../components/WellnessBadge';
import { calculateRecipeCost } from '../../services/recipeService';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAY_KEYS: Array<keyof WeekPlan['days']> = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '☀️ Matin',
  lunch: '🌤 Midi',
  dinner: '🌙 Soir',
};

export const WeeklyPlannerScreen: React.FC = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ dayKey: keyof WeekPlan['days']; meal: MealType } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [wp, r] = await Promise.all([
        getOrCreateWeekPlan(user.uid, getWeekStart()),
        getRecipes(user.uid),
      ]);
      setPlan(wp);
      setRecipes(r);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openPicker = (dayKey: keyof WeekPlan['days'], meal: MealType) => {
    setPickerTarget({ dayKey, meal });
    setPickerVisible(true);
  };

  const assignRecipe = async (recipe: Recipe) => {
    if (!plan || !pickerTarget) return;
    const { totalCost } = calculateRecipeCost(recipe);
    const slot = {
      recipeId: recipe.id,
      recipeName: recipe.name,
      recipeImage: recipe.imageUrl,
      cost: totalCost / recipe.servings,
      wellnessType: recipe.wellnessType,
    };
    await updateMealSlot(plan.id, pickerTarget.dayKey, pickerTarget.meal, slot);
    setPlan((prev) => {
      if (!prev || !pickerTarget) return prev;
      return {
        ...prev,
        days: {
          ...prev.days,
          [pickerTarget.dayKey]: {
            ...prev.days[pickerTarget.dayKey],
            [pickerTarget.meal]: slot,
          },
        },
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
      return {
        ...prev,
        days: { ...prev.days, [dayKey]: { ...prev.days[dayKey], [meal]: empty } },
      };
    });
  };

  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const dayPlan = plan?.days[DAY_KEYS[selectedDay]];

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Planning semaine</Text>
        <Text style={styles.weekLabel}>
          Semaine du {getWeekStart()}
        </Text>
      </View>

      {/* Day tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabs}>
        {DAYS.map((day, idx) => (
          <TouchableOpacity
            key={day}
            style={[styles.dayTab, selectedDay === idx && styles.dayTabActive, idx === todayIdx && styles.dayTabToday]}
            onPress={() => setSelectedDay(idx)}
          >
            <Text style={[styles.dayTabText, selectedDay === idx && styles.dayTabTextActive]}>{day}</Text>
            {idx === todayIdx && <View style={styles.todayDot} />}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Meals */}
      <ScrollView style={styles.mealsScroll} showsVerticalScrollIndicator={false}>
        {(['breakfast', 'lunch', 'dinner'] as MealType[]).map((meal) => {
          const slot = dayPlan?.[meal];
          const hasRecipe = slot?.recipeId != null;
          return (
            <View key={meal} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealLabel}>{MEAL_LABELS[meal]}</Text>
                {hasRecipe && (
                  <TouchableOpacity onPress={() => clearSlot(DAY_KEYS[selectedDay], meal)}>
                    <Text style={styles.clearBtn}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {hasRecipe ? (
                <TouchableOpacity
                  style={styles.assignedMeal}
                  onPress={() => openPicker(DAY_KEYS[selectedDay], meal)}
                >
                  <View style={styles.assignedContent}>
                    <Text style={styles.assignedName}>{(slot as any).recipeName}</Text>
                    <View style={styles.assignedMeta}>
                      {(slot as any).wellnessType && (
                        <WellnessBadge type={(slot as any).wellnessType as WellnessType} size="sm" />
                      )}
                      {(slot as any).cost != null && (
                        <Text style={styles.assignedCost}>{((slot as any).cost as number).toFixed(2)}€/pers.</Text>
                      )}
                    </View>
                  </View>
                  <Text style={styles.editHint}>Modifier →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.emptySlot}
                  onPress={() => openPicker(DAY_KEYS[selectedDay], meal)}
                >
                  <Text style={styles.emptySlotPlus}>+</Text>
                  <Text style={styles.emptySlotText}>Ajouter un repas</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* Day summary */}
        {dayPlan && (
          <View style={styles.daySummary}>
            <Text style={styles.daySummaryTitle}>Coût du jour</Text>
            <Text style={styles.daySummaryAmount}>
              {(
                [dayPlan.breakfast, dayPlan.lunch, dayPlan.dinner]
                  .reduce((s, m) => s + ((m as any).cost ?? 0), 0)
              ).toFixed(2)}€
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Recipe picker modal */}
      <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choisir une recette</Text>
            {recipes.length === 0 ? (
              <Text style={styles.noRecipes}>Aucune recette disponible. Créez-en une !</Text>
            ) : (
              <FlatList
                data={recipes}
                keyExtractor={(r) => r.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.recipeItem} onPress={() => assignRecipe(item)}>
                    <View>
                      <Text style={styles.recipeItemName}>{item.name}</Text>
                      <Text style={styles.recipeItemMeta}>
                        {item.prepTime + item.cookTime}min · {item.servings} pers.
                      </Text>
                    </View>
                    <WellnessBadge type={item.wellnessType} size="sm" />
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
              />
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setPickerVisible(false)}>
              <Text style={styles.modalCloseText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.sm },
  title: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm, color: Colors.onSurface },
  weekLabel: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant, marginTop: 2 },
  dayTabs: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.xs },
  dayTab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', minWidth: 48,
  },
  dayTabActive: { backgroundColor: Colors.primary },
  dayTabToday: { borderWidth: 2, borderColor: Colors.primaryContainer },
  dayTabText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant },
  dayTabTextActive: { color: Colors.onPrimary },
  todayDot: {
    width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primaryContainer,
    marginTop: 2,
  },
  mealsScroll: { flex: 1, paddingHorizontal: Spacing.lg },
  mealCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xxl,
    padding: Spacing.lg, marginBottom: Spacing.md,
    shadowColor: Colors.onSurface, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  mealLabel: { fontFamily: FontFamily.headline, fontSize: FontSize.titleLg, color: Colors.onSurface },
  clearBtn: { color: Colors.outline, fontSize: 16, padding: 4 },
  assignedMeal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assignedContent: { flex: 1 },
  assignedName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface },
  assignedMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  assignedCost: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant },
  editHint: { fontFamily: FontFamily.body, fontSize: FontSize.labelSm, color: Colors.primary },
  emptySlot: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.xl,
    padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.outlineVariant,
    borderStyle: 'dashed',
  },
  emptySlotPlus: { fontSize: 20, color: Colors.primary, fontFamily: FontFamily.bodyBold },
  emptySlotText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  daySummary: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: `${Colors.secondaryContainer}60`, borderRadius: BorderRadius.xl,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  daySummaryTitle: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.bodyMd, color: Colors.secondary },
  daySummaryAmount: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd, color: Colors.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surfaceContainerLowest, borderTopLeftRadius: 28,
    borderTopRightRadius: 28, padding: Spacing.lg, maxHeight: '70%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: Colors.outlineVariant,
    borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md,
  },
  modalTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd, color: Colors.onSurface, marginBottom: Spacing.md },
  noRecipes: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', padding: Spacing.xl },
  recipeItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.md, borderBottomWidth: 0,
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xs, paddingHorizontal: Spacing.md,
  },
  recipeItemName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface },
  recipeItemMeta: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant, marginTop: 2 },
  modalClose: {
    marginTop: Spacing.md, backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.full, padding: Spacing.md, alignItems: 'center',
  },
  modalCloseText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
});
