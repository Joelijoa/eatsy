import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Image, TouchableOpacity, Alert,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { WellnessBadge } from '../../components/WellnessBadge';
import { EatsyButton } from '../../components/EatsyButton';
import { getRecipe, deleteRecipe, calculateRecipeCost } from '../../services/recipeService';
import { Recipe } from '../../types';

type Props = { navigation: any; route: any };

export const RecipeDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { recipeId } = route.params;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>('ingredients');

  useEffect(() => {
    getRecipe(recipeId).then(setRecipe);
  }, [recipeId]);

  if (!recipe) return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>Chargement...</Text>
    </View>
  );

  const { totalCost, costPerServing } = calculateRecipeCost(recipe);

  const handleDelete = () => {
    Alert.alert('Supprimer', `Supprimer "${recipe.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          await deleteRecipe(recipe.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        <View style={styles.heroContainer}>
          {recipe.imageUrl ? (
            <Image source={{ uri: recipe.imageUrl }} style={styles.hero} />
          ) : (
            <View style={[styles.hero, styles.heroPlaceholder]}>
              <Text style={styles.heroEmoji}>🍽️</Text>
            </View>
          )}
          <View style={styles.heroGradient} />
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{recipe.name}</Text>
            <WellnessBadge type={recipe.wellnessType} />
          </View>
        </View>

        {/* Meta chips */}
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipEmoji}>⏱</Text>
            <Text style={styles.metaChipValue}>{recipe.prepTime}min</Text>
            <Text style={styles.metaChipLabel}>Prép.</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipEmoji}>🔥</Text>
            <Text style={styles.metaChipValue}>{recipe.cookTime}min</Text>
            <Text style={styles.metaChipLabel}>Cuisson</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipEmoji}>👥</Text>
            <Text style={styles.metaChipValue}>{recipe.servings}</Text>
            <Text style={styles.metaChipLabel}>Pers.</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipEmoji}>💰</Text>
            <Text style={styles.metaChipValue}>{costPerServing.toFixed(2)}€</Text>
            <Text style={styles.metaChipLabel}>/pers.</Text>
          </View>
        </View>

        {/* Cost card */}
        <View style={styles.costCard}>
          <Text style={styles.costLabel}>Coût total</Text>
          <Text style={styles.costValue}>{totalCost.toFixed(2)}€</Text>
          <Text style={styles.costPerServing}>soit {costPerServing.toFixed(2)}€ / personne</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ingredients' && styles.tabActive]}
            onPress={() => setActiveTab('ingredients')}
          >
            <Text style={[styles.tabText, activeTab === 'ingredients' && styles.tabTextActive]}>
              🥬 Ingrédients ({recipe.ingredients.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'instructions' && styles.tabActive]}
            onPress={() => setActiveTab('instructions')}
          >
            <Text style={[styles.tabText, activeTab === 'instructions' && styles.tabTextActive]}>
              📋 Instructions ({recipe.instructions.length})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabContent}>
          {activeTab === 'ingredients' ? (
            recipe.ingredients.map((ing, idx) => (
              <View key={idx} style={styles.ingredientRow}>
                <View style={styles.ingredientLeft}>
                  <Text style={styles.ingredientName}>{ing.name}</Text>
                  <Text style={styles.ingredientQty}>{ing.quantity} {ing.unit}</Text>
                </View>
                <Text style={styles.ingredientPrice}>{(ing.price * ing.quantity).toFixed(2)}€</Text>
              </View>
            ))
          ) : (
            recipe.instructions.map((step, idx) => (
              <View key={idx} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{idx + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <EatsyButton
            label="🍳 Mode cuisine"
            onPress={() => navigation.navigate('CookingMode', { recipeId: recipe.id })}
            style={styles.cookBtn}
          />
          <View style={styles.secondaryActions}>
            <EatsyButton
              label="✏️ Modifier"
              variant="secondary"
              onPress={() => navigation.navigate('AddRecipe', { recipeId: recipe.id })}
              style={styles.halfBtn}
            />
            <EatsyButton
              label="🗑️ Supprimer"
              variant="ghost"
              onPress={handleDelete}
              style={styles.halfBtn}
            />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: FontFamily.body, color: Colors.onSurfaceVariant },
  heroContainer: { height: 280, position: 'relative' },
  hero: { width: '100%', height: '100%' },
  heroPlaceholder: { backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 64 },
  heroGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backBtn: {
    position: 'absolute', top: 48, left: Spacing.lg,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: 20 },
  heroContent: { position: 'absolute', bottom: Spacing.lg, left: Spacing.lg, right: Spacing.lg },
  heroTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineLg, color: '#fff', marginBottom: Spacing.xs },
  metaRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  metaChip: {
    flex: 1, backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    padding: Spacing.sm, alignItems: 'center',
    shadowColor: Colors.onSurface, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  metaChipEmoji: { fontSize: 20 },
  metaChipValue: { fontFamily: FontFamily.headline, fontSize: FontSize.titleMd, color: Colors.onSurface, marginTop: 2 },
  metaChipLabel: { fontFamily: FontFamily.body, fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant },
  costCard: {
    marginHorizontal: Spacing.lg, backgroundColor: `${Colors.secondaryContainer}70`,
    borderRadius: BorderRadius.xl, padding: Spacing.md, flexDirection: 'row',
    alignItems: 'center', marginBottom: Spacing.md,
  },
  costLabel: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.bodyMd, color: Colors.secondary, flex: 1 },
  costValue: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd, color: Colors.primary },
  costPerServing: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant, marginLeft: Spacing.xs },
  tabs: {
    flexDirection: 'row', marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surfaceContainerHigh, borderRadius: BorderRadius.full, padding: 4,
    marginBottom: Spacing.md,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: BorderRadius.full, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.surfaceContainerLowest, shadowColor: Colors.onSurface, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  tabText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant },
  tabTextActive: { fontFamily: FontFamily.bodyBold, color: Colors.primary },
  tabContent: { paddingHorizontal: Spacing.lg },
  ingredientRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.xl,
    padding: Spacing.md, marginBottom: Spacing.xs,
  },
  ingredientLeft: { flex: 1 },
  ingredientName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface },
  ingredientQty: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant, marginTop: 2 },
  ingredientPrice: { fontFamily: FontFamily.headline, fontSize: FontSize.titleMd, color: Colors.primary },
  stepRow: {
    flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md, alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepNumberText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onPrimary },
  stepText: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurface, flex: 1, lineHeight: 22 },
  actions: { paddingHorizontal: Spacing.lg, marginTop: Spacing.md },
  cookBtn: { marginBottom: Spacing.sm },
  secondaryActions: { flexDirection: 'row', gap: Spacing.sm },
  halfBtn: { flex: 1 },
});
