import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput, Modal,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { RecipeCard } from '../../components/RecipeCard';
import { useAuth } from '../../context/AuthContext';
import { getRecipes, getCategories } from '../../services/recipeService';
import { Recipe, Category, WellnessType } from '../../types';

type Props = { navigation: any };

export const RecipesScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeWellness, setActiveWellness] = useState<WellnessType | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getRecipes(user.uid), getCategories(user.uid)]).then(([r, c]) => {
      setRecipes(r);
      setCategories(c);
    });
  }, [user]);

  const filtered = recipes.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory ? r.categoryId === activeCategory : true;
    const matchWell = activeWellness ? r.wellnessType === activeWellness : true;
    return matchSearch && matchCat && matchWell;
  });

  const WELLNESS_FILTERS: Array<{ value: WellnessType; label: string; emoji: string }> = [
    { value: 'balanced', label: 'Équilibré', emoji: '🥗' },
    { value: 'quick', label: 'Rapide', emoji: '⚡' },
    { value: 'indulgent', label: 'Plaisir', emoji: '🍰' },
  ];

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mes recettes</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddRecipe', {})}
        >
          <Text style={styles.addBtnText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher une recette..."
          placeholderTextColor={Colors.outline}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearSearch}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category chips */}
      <View>
        <FlatList
          data={[{ id: null, name: 'Tout' } as any, ...categories]}
          keyExtractor={(c) => c.id ?? 'all'}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, activeCategory === item.id && styles.chipActive]}
              onPress={() => setActiveCategory(item.id)}
            >
              <Text style={[styles.chipText, activeCategory === item.id && styles.chipTextActive]}>
                {item.icon ? `${item.icon} ` : ''}{item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Wellness filters */}
      <View style={styles.wellnessFilters}>
        {WELLNESS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.wellnessChip, activeWellness === f.value && styles.wellnessChipActive]}
            onPress={() => setActiveWellness(activeWellness === f.value ? null : f.value)}
          >
            <Text style={styles.wellnessChipText}>{f.emoji} {f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recipe list */}
      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item}
            onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyTitle}>Aucune recette</Text>
            <Text style={styles.emptyDesc}>
              {search ? 'Aucun résultat pour cette recherche.' : 'Créez votre première recette !'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md,
  },
  title: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm, color: Colors.onSurface },
  addBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  addBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onPrimary },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.lg, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm,
  },
  searchIcon: { fontSize: 16, marginRight: Spacing.xs },
  searchInput: {
    flex: 1, paddingVertical: 12, fontFamily: FontFamily.body,
    fontSize: FontSize.bodyMd, color: Colors.onSurface,
  },
  clearSearch: { color: Colors.outline, fontSize: 14, padding: 4 },
  chips: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs, gap: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    backgroundColor: Colors.surfaceContainerHigh, borderRadius: BorderRadius.full,
  },
  chipActive: { backgroundColor: Colors.secondary },
  chipText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant },
  chipTextActive: { color: Colors.onPrimary },
  wellnessFilters: {
    flexDirection: 'row', gap: Spacing.xs, paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  wellnessChip: {
    flex: 1, paddingVertical: 6, paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.full, alignItems: 'center',
  },
  wellnessChipActive: { backgroundColor: Colors.secondaryContainer },
  wellnessChipText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelSm, color: Colors.onSurface },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.headlineMd, color: Colors.onSurface },
  emptyDesc: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' },
});
