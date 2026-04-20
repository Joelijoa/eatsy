import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { getRecipes, getCategories } from '../../services/recipeService';
import { Recipe, Category, WellnessType } from '../../types';

const WELLNESS: Array<{ value: WellnessType; label: string }> = [
  { value: 'balanced', label: 'Équilibré' },
  { value: 'quick',    label: 'Rapide' },
  { value: 'indulgent',label: 'Plaisir' },
];

const WELLNESS_COLOR: Record<WellnessType, string> = {
  balanced: Colors.primary,
  quick:    Colors.tertiary,
  indulgent:Colors.error,
};

type Props = { navigation: any };

export const RecipesScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeWellness, setActiveWellness] = useState<WellnessType | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      Promise.all([getRecipes(user.uid), getCategories(user.uid)]).then(([r, c]) => {
        setRecipes(r);
        setCategories(c);
      });
    }, [user])
  );

  const filtered = recipes.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory ? r.categoryId === activeCategory : true;
    const matchWell = activeWellness ? r.wellnessType === activeWellness : true;
    return matchSearch && matchCat && matchWell;
  });

  const renderRecipe = ({ item }: { item: Recipe }) => {
    const cost = item.totalCost ?? 0;
    const perServing = item.servings > 0 ? cost / item.servings : 0;
    return (
      <TouchableOpacity
        style={styles.recipeCard}
        onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.recipeCardContent}>
          <View style={styles.recipeInfo}>
            <Text style={styles.recipeName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.recipeMeta}>
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={12} color={Colors.onSurfaceVariant} />
                <Text style={styles.metaText}>{item.prepTime + item.cookTime} min</Text>
              </View>
              <View style={styles.metaChip}>
                <Ionicons name="people-outline" size={12} color={Colors.onSurfaceVariant} />
                <Text style={styles.metaText}>{item.servings} pers.</Text>
              </View>
              <View style={styles.metaChip}>
                <Ionicons name="wallet-outline" size={12} color={Colors.onSurfaceVariant} />
                <Text style={styles.metaText}>{perServing.toFixed(2)} €/pers.</Text>
              </View>
            </View>
          </View>
          <View style={styles.recipeRight}>
            <View style={[styles.wellnessDot, { backgroundColor: WELLNESS_COLOR[item.wellnessType] }]} />
            <Ionicons name="chevron-forward" size={16} color={Colors.outlineVariant} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const noFilter = !activeCategory && !activeWellness && !search;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Recettes</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddRecipe', {})}>
          <Ionicons name="add" size={20} color={Colors.onPrimary} />
          <Text style={styles.addBtnText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.outline} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher..."
          placeholderTextColor={Colors.outline}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.outline} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <TouchableOpacity
          style={[styles.chip, noFilter && styles.chipActive]}
          onPress={() => { setActiveCategory(null); setActiveWellness(null); setSearch(''); }}
        >
          <Text style={[styles.chipText, noFilter && styles.chipTextActive]}>Tout</Text>
        </TouchableOpacity>
        {categories.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.chip, activeCategory === c.id && styles.chipActive]}
            onPress={() => setActiveCategory(activeCategory === c.id ? null : c.id)}
          >
            <Text style={[styles.chipText, activeCategory === c.id && styles.chipTextActive]}>{c.name}</Text>
          </TouchableOpacity>
        ))}
        {WELLNESS.map((w) => (
          <TouchableOpacity
            key={w.value}
            style={[styles.chip, activeWellness === w.value && styles.chipActive, styles.wellnessChip, { borderLeftColor: WELLNESS_COLOR[w.value] }]}
            onPress={() => setActiveWellness(activeWellness === w.value ? null : w.value)}
          >
            <Text style={[styles.chipText, activeWellness === w.value && styles.chipTextActive]}>{w.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Count */}
      <Text style={styles.count}>{filtered.length} recette{filtered.length !== 1 ? 's' : ''}</Text>

      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        renderItem={renderRecipe}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="restaurant-outline" size={48} color={Colors.outlineVariant} />
            <Text style={styles.emptyTitle}>Aucune recette</Text>
            <Text style={styles.emptyDesc}>{search ? 'Aucun résultat.' : 'Créez votre première recette.'}</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB scanner */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('FoodScanner')}>
        <Ionicons name="barcode-outline" size={22} color={Colors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md,
  },
  title: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm, color: Colors.onSurface },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.full,
  },
  addBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.onPrimary },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.lg, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1, paddingVertical: 11, fontFamily: FontFamily.body,
    fontSize: FontSize.bodyMd, color: Colors.onSurface,
  },
  filterRow: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    backgroundColor: Colors.surfaceContainerHigh, borderRadius: BorderRadius.full,
  },
  wellnessChip: { borderLeftWidth: 3 },
  chipActive: { backgroundColor: Colors.primary },
  chipText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant },
  chipTextActive: { color: Colors.onPrimary },
  count: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant, paddingHorizontal: Spacing.lg, marginBottom: Spacing.xs },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },
  recipeCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  recipeCardContent: { flexDirection: 'row', alignItems: 'center' },
  recipeInfo: { flex: 1 },
  recipeName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface, marginBottom: 4 },
  recipeMeta: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontFamily: FontFamily.body, fontSize: 11, color: Colors.onSurfaceVariant },
  recipeRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  wellnessDot: { width: 8, height: 8, borderRadius: 4 },
  separator: { height: 1, backgroundColor: Colors.surfaceContainerHigh },
  empty: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.headlineSm, color: Colors.onSurface },
  emptyDesc: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  fab: {
    position: 'absolute', bottom: 24, right: Spacing.lg,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
});
