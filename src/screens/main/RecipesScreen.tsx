import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView, Image, Animated } from 'react-native';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { usePreferences , useColors } from '../../context/PreferencesContext';
import { getRecipes, getCategories } from '../../services/recipeService';
import { Recipe, Category, WellnessType } from '../../types';
import { HeaderActions } from '../../components/HeaderActions';


const WELLNESS_ICON: Record<WellnessType, keyof typeof Ionicons.glyphMap> = {
  balanced: 'leaf-outline',
  quick:    'flash-outline',
  indulgent:'heart-outline',
};

type Props = { navigation: any };

export const RecipesScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { t, formatCurrency } = usePreferences();
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const WELLNESS_COLOR: Record<WellnessType, string> = {
    balanced: Colors.primary,
    quick:    Colors.tertiary,
    indulgent: Colors.error,
  };
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeWellness, setActiveWellness] = useState<WellnessType | null>(null);

  const flatListRef = useRef<React.ElementRef<typeof FlatList>>(null);
  useFocusEffect(useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []));

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      Promise.all([getRecipes(user.uid), getCategories(user.uid)]).then(([r, c]) => {
        setRecipes(r);
        setCategories(c);
      });
    }, [user]),
  );

  const wellnessTypes: WellnessType[] = ['balanced', 'quick', 'indulgent'];

  const filtered = recipes.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory ? r.categoryId === activeCategory : true;
    const matchWell = activeWellness ? r.wellnessType === activeWellness : true;
    return matchSearch && matchCat && matchWell;
  });

  const noFilter = !activeCategory && !activeWellness && !search;

  const renderRecipe = ({ item }: { item: Recipe }) => {
    const cost = item.totalCost ?? 0;
    const perServing = item.servings > 0 ? cost / item.servings : 0;
    const wColor = WELLNESS_COLOR[item.wellnessType];
    const wIcon = WELLNESS_ICON[item.wellnessType];
    const totalTime = item.prepTime + item.cookTime;

    return (
      <TouchableOpacity
        style={styles.recipeCard}
        onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
        activeOpacity={0.82}
      >
        {/* Thumbnail */}
        <View style={styles.thumbnailWrap}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnailPlaceholder, { backgroundColor: `${wColor}18` }]}>
              <Ionicons name={wIcon} size={22} color={wColor} />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={styles.recipeName} numberOfLines={1}>{item.name}</Text>

          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={11} color={Colors.onSurfaceVariant} />
              <Text style={styles.metaText}>{totalTime} {t('recipes_min')}</Text>
            </View>
            <View style={styles.metaDot} />
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={11} color={Colors.onSurfaceVariant} />
              <Text style={styles.metaText}>{item.servings} {t('recipes_pers')}</Text>
            </View>
            {perServing > 0 && (
              <>
                <View style={styles.metaDot} />
                <View style={styles.metaItem}>
                  <Ionicons name="wallet-outline" size={11} color={Colors.onSurfaceVariant} />
                  <Text style={styles.metaText}>{formatCurrency(perServing)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={Colors.outlineVariant} style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  const styles = createStyles(Colors);
  const { opacity, translateY } = useScreenEntrance();

  return (
    <Animated.View style={[styles.screen, { opacity, transform: [{ translateY }] }]}>
      {/* Header */}
      <View style={[styles.headerBand, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerDecor} />
        <View style={styles.headerDecor2} />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{t('recipes_title')}</Text>
            <Text style={styles.headerSub}>
              {filtered.length} {filtered.length !== 1 ? t('recipes_count_many') : t('recipes_count_one')}
            </Text>
          </View>
          <HeaderActions navigation={navigation} />
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.outline} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t('recipes_search')}
          placeholderTextColor={Colors.outline}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.outline} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow} style={{ flexGrow: 0 }}>
        <TouchableOpacity
          style={[styles.chip, noFilter && styles.chipActive]}
          onPress={() => { setActiveCategory(null); setActiveWellness(null); setSearch(''); }}
        >
          <Text style={[styles.chipText, noFilter && styles.chipTextActive]}>{t('common_all')}</Text>
        </TouchableOpacity>

        {wellnessTypes.map((w) => {
          const active = activeWellness === w;
          return (
            <TouchableOpacity
              key={w}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setActiveWellness(active ? null : w)}
            >
              <View style={[styles.wellnessDot, { backgroundColor: active ? 'rgba(255,255,255,0.7)' : WELLNESS_COLOR[w] }]} />
              <Ionicons name={WELLNESS_ICON[w]} size={12} color={active ? Colors.onPrimary : WELLNESS_COLOR[w]} />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(`wellness_${w}`)}</Text>
            </TouchableOpacity>
          );
        })}

        {categories.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.chip, activeCategory === c.id && styles.chipActive]}
            onPress={() => setActiveCategory(activeCategory === c.id ? null : c.id)}
          >
            <Text style={[styles.chipText, activeCategory === c.id && styles.chipTextActive]}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        ref={flatListRef}
        data={filtered}
        keyExtractor={(r) => r.id}
        renderItem={renderRecipe}
        style={styles.flatList}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="restaurant-outline" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>{t('recipes_none')}</Text>
            <Text style={styles.emptyDesc}>{search ? t('recipes_no_results') : t('recipes_create_first')}</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 16, right: Spacing.lg }]}
        onPress={() => navigation.navigate('AddRecipe', {})}
      >
        <Ionicons name="add" size={26} color={Colors.onPrimary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (C: typeof Colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.surface },
  headerBand: {
    backgroundColor: C.primary, paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg + 16, overflow: 'hidden',
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  headerDecor: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -80, right: -50,
  },
  headerDecor2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -30, left: -30,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm, color: '#fff' },
  headerSub: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: C.surfaceContainerLow, borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.lg, paddingHorizontal: Spacing.md,
    marginTop: -28,
  },
  searchInput: {
    flex: 1, paddingVertical: 11, fontFamily: FontFamily.body,
    fontSize: FontSize.bodyMd, color: C.onSurface,
  },
  filterRow: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs, paddingBottom: Spacing.xs, gap: Spacing.xs },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.md, height: 34,
    backgroundColor: C.surfaceContainerHigh, borderRadius: BorderRadius.full,
  },
  wellnessDot: { width: 7, height: 7, borderRadius: 3.5 },
  chipActive: { backgroundColor: C.primary },
  chipText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelMd, color: C.onSurfaceVariant },
  chipTextActive: { color: C.onPrimary },
  flatList: { flex: 1 },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 140 },

  recipeCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xl, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  thumbnailWrap: { width: 68, height: 68, margin: Spacing.sm, borderRadius: BorderRadius.lg, overflow: 'hidden', flexShrink: 0 },
  thumbnail: { width: '100%', height: '100%' },
  thumbnailPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.lg },
  cardContent: { flex: 1, paddingVertical: Spacing.sm + 2, paddingRight: 4 },
  recipeName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface, marginBottom: 5 },
  cardMeta: { flexDirection: 'row', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  metaText: { fontFamily: FontFamily.body, fontSize: 11, color: C.onSurfaceVariant },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.outlineVariant, marginHorizontal: 4 },
  chevron: { marginRight: Spacing.sm },

  empty: { alignItems: 'center', paddingTop: Spacing.xl, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  emptyIconWrap: { width: 70, height: 70, borderRadius: 35, backgroundColor: `${C.primary}12`, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.headlineSm, color: C.onSurface },
  emptyDesc: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant },
  fab: {
    position: 'absolute', width: 54, height: 54, borderRadius: 27,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
});
