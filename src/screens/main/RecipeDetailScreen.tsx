import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Image, TouchableOpacity, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { EatsyButton } from '../../components/EatsyButton';
import { getRecipe, deleteRecipe, calculateRecipeCost } from '../../services/recipeService';
import { Recipe, WellnessType } from '../../types';
import { usePreferences } from '../../context/PreferencesContext';

const WELLNESS_CONFIG: Record<WellnessType, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  balanced:  { label: 'Équilibré', color: Colors.primary,  bg: `${Colors.secondaryContainer}90`, icon: 'leaf-outline' },
  quick:     { label: 'Rapide',    color: Colors.tertiary, bg: `${Colors.tertiary}22`,            icon: 'flash-outline' },
  indulgent: { label: 'Plaisir',   color: Colors.error,    bg: `${Colors.error}18`,               icon: 'heart-outline' },
};

type Props = { navigation: any; route: any };

export const RecipeDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { recipeId } = route.params;
  const insets = useSafeAreaInsets();
  const { formatCurrency } = usePreferences();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>('ingredients');

  useEffect(() => { getRecipe(recipeId).then(setRecipe); }, [recipeId]);

  if (!recipe) return (
    <View style={styles.loading}>
      <Ionicons name="restaurant-outline" size={40} color={Colors.outlineVariant} />
      <Text style={styles.loadingText}>Chargement...</Text>
    </View>
  );

  const { totalCost, costPerServing } = calculateRecipeCost(recipe);
  const wConfig = WELLNESS_CONFIG[recipe.wellnessType];
  const totalTime = recipe.prepTime + recipe.cookTime;

  const handleDelete = () => {
    Alert.alert('Supprimer la recette', `Supprimer "${recipe.name}" définitivement ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => { await deleteRecipe(recipe.id); navigation.goBack(); } },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={true}>
        {/* Hero */}
        <View style={styles.hero}>
          {recipe.imageUrl ? (
            <Image source={{ uri: recipe.imageUrl }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <View style={styles.heroPlaceholderIcon}>
                <Ionicons name="restaurant" size={56} color={Colors.primaryContainer} />
              </View>
            </View>
          )}
          {/* Gradient overlay */}
          <View style={styles.heroOverlay} />

          {/* Top bar */}
          <View style={[styles.heroTopBar, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroTopRight}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('AddRecipe', { recipeId: recipe.id })}>
                <Ionicons name="pencil" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconBtn, styles.iconBtnDanger]} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero content */}
          <View style={styles.heroContent}>
            <View style={[styles.wellnessBadge, { backgroundColor: wConfig.bg }]}>
              <Ionicons name={wConfig.icon} size={12} color={wConfig.color} />
              <Text style={[styles.wellnessBadgeText, { color: wConfig.color }]}>{wConfig.label}</Text>
            </View>
            <Text style={styles.heroTitle}>{recipe.name}</Text>
            {recipe.description ? (
              <Text style={styles.heroDesc} numberOfLines={2}>{recipe.description}</Text>
            ) : null}
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          {[
            { icon: 'time-outline' as const,   label: 'Préparation', value: `${recipe.prepTime} min` },
            { icon: 'flame-outline' as const,  label: 'Cuisson',     value: `${recipe.cookTime} min` },
            { icon: 'people-outline' as const, label: 'Personnes',   value: `${recipe.servings}` },
            { icon: 'wallet-outline' as const, label: 'Par pers.',   value: formatCurrency(costPerServing) },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Ionicons name={s.icon} size={18} color={Colors.primary} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Cost banner */}
        <View style={styles.costBanner}>
          <View style={styles.costLeft}>
            <Ionicons name="pricetag-outline" size={18} color={Colors.primary} />
            <View>
              <Text style={styles.costLabel}>Coût total de la recette</Text>
              <Text style={styles.costSub}>{recipe.servings} portions · {totalTime} min</Text>
            </View>
          </View>
          <Text style={styles.costAmount}>{formatCurrency(totalCost)}</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'ingredients' && styles.tabBtnActive]}
            onPress={() => setActiveTab('ingredients')}
          >
            <Ionicons name="list-outline" size={16} color={activeTab === 'ingredients' ? Colors.onPrimary : Colors.onSurfaceVariant} />
            <Text style={[styles.tabBtnText, activeTab === 'ingredients' && styles.tabBtnTextActive]}>
              Ingrédients ({recipe.ingredients.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'instructions' && styles.tabBtnActive]}
            onPress={() => setActiveTab('instructions')}
          >
            <Ionicons name="document-text-outline" size={16} color={activeTab === 'instructions' ? Colors.onPrimary : Colors.onSurfaceVariant} />
            <Text style={[styles.tabBtnText, activeTab === 'instructions' && styles.tabBtnTextActive]}>
              Instructions ({recipe.instructions.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab content */}
        <View style={styles.tabContent}>
          {activeTab === 'ingredients' ? (
            <>
              {recipe.ingredients.map((ing, idx) => (
                <View key={idx} style={styles.ingredientRow}>
                  <View style={styles.ingNumber}>
                    <Text style={styles.ingNumberText}>{idx + 1}</Text>
                  </View>
                  <View style={styles.ingInfo}>
                    <Text style={styles.ingName}>{ing.name}</Text>
                    <Text style={styles.ingQty}>{ing.quantity} {ing.unit}</Text>
                  </View>
                  <Text style={styles.ingPrice}>{formatCurrency(ing.price * ing.quantity)}</Text>
                </View>
              ))}
              <View style={styles.ingredientTotal}>
                <Text style={styles.ingredientTotalLabel}>Total ingrédients</Text>
                <Text style={styles.ingredientTotalValue}>{formatCurrency(totalCost)}</Text>
              </View>
            </>
          ) : (
            recipe.instructions.map((step, idx) => (
              <View key={idx} style={styles.stepRow}>
                <View style={styles.stepLeft}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{idx + 1}</Text>
                  </View>
                  {idx < recipe.instructions.length - 1 && <View style={styles.stepLine} />}
                </View>
                <View style={[styles.stepCard, idx === recipe.instructions.length - 1 && { marginBottom: 0 }]}>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* CTA */}
        <View style={styles.ctaSection}>
          <EatsyButton
            label="Démarrer la cuisine"
            onPress={() => navigation.navigate('CookingMode', { recipeId: recipe.id })}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  loadingText: { fontFamily: FontFamily.body, color: Colors.onSurfaceVariant },

  hero: { height: 300, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: {
    width: '100%', height: '100%',
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  heroPlaceholderIcon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  heroOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  heroTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  heroTopRight: { flexDirection: 'row', gap: Spacing.xs },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  iconBtnDanger: { backgroundColor: 'rgba(255,255,255,0.15)' },
  heroContent: {
    position: 'absolute', bottom: Spacing.lg, left: Spacing.lg, right: Spacing.lg,
  },
  wellnessBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: BorderRadius.full, alignSelf: 'flex-start', marginBottom: Spacing.xs,
  },
  wellnessBadgeText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelSm },
  heroTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineLg, color: '#fff', marginBottom: 4 },
  heroDesc: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: 'rgba(255,255,255,0.8)' },

  statsRow: {
    flexDirection: 'row', marginHorizontal: Spacing.lg, marginTop: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, gap: 3 },
  statValue: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleMd, color: Colors.onSurface },
  statLabel: { fontFamily: FontFamily.body, fontSize: 10, color: Colors.onSurfaceVariant, textAlign: 'center' },

  costBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: Spacing.lg, marginTop: Spacing.sm,
    backgroundColor: `${Colors.primary}10`, borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },
  costLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  costLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface },
  costSub: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant, marginTop: 1 },
  costAmount: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd, color: Colors.primary },

  tabsRow: {
    flexDirection: 'row', margin: Spacing.lg,
    backgroundColor: Colors.surfaceContainerHigh, borderRadius: BorderRadius.full, padding: 4, gap: 4,
  },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: BorderRadius.full },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant },
  tabBtnTextActive: { color: Colors.onPrimary },

  tabContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },

  ingredientRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerHigh,
  },
  ingNumber: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center',
  },
  ingNumberText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant },
  ingInfo: { flex: 1 },
  ingName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface },
  ingQty: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant, marginTop: 1 },
  ingPrice: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.primary },
  ingredientTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.sm, paddingTop: Spacing.sm,
    borderTopWidth: 1.5, borderTopColor: Colors.outlineVariant,
  },
  ingredientTotalLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface },
  ingredientTotalValue: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineSm, color: Colors.primary },

  stepRow: { flexDirection: 'row', marginBottom: 0 },
  stepLeft: { alignItems: 'center', width: 40, paddingTop: 4 },
  stepNumber: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  stepNumberText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.onPrimary },
  stepLine: { width: 2, flex: 1, backgroundColor: Colors.surfaceContainerHigh, marginTop: 4, marginBottom: 0 },
  stepCard: {
    flex: 1, backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    padding: Spacing.md, marginLeft: Spacing.sm, marginBottom: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  stepText: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurface, lineHeight: 22 },

  ctaSection: { paddingHorizontal: Spacing.lg, marginTop: Spacing.md },
});
