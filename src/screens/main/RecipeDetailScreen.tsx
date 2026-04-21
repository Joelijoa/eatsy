import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Image, TouchableOpacity, Alert, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { EatsyButton } from '../../components/EatsyButton';
import { getRecipe, deleteRecipe, calculateRecipeCost } from '../../services/recipeService';
import { checkRecipeStock, deductRecipeFromPantry, displayQty, IngredientStockInfo } from '../../services/pantryService';
import { addShoppingItem } from '../../services/shoppingListService';
import { Recipe, WellnessType } from '../../types';
import { usePreferences } from '../../context/PreferencesContext';
import { useAuth } from '../../context/AuthContext';

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
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>('ingredients');
  const [stockInfo, setStockInfo] = useState<IngredientStockInfo[]>([]);
  const [deducting, setDeducting] = useState(false);
  const [addedToCart, setAddedToCart] = useState<Set<string>>(new Set());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    getRecipe(recipeId).then(setRecipe);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
    ]).start();
  }, [recipeId]);

  useEffect(() => {
    if (recipe && user) {
      checkRecipeStock(user.uid, recipe.ingredients).then(setStockInfo);
    }
  }, [recipe, user]);

  if (!recipe) return (
    <View style={styles.loading}>
      <Ionicons name="restaurant-outline" size={40} color={Colors.outlineVariant} />
      <Text style={styles.loadingText}>Chargement...</Text>
    </View>
  );

  const { totalCost, costPerServing } = calculateRecipeCost(recipe);
  const wConfig = WELLNESS_CONFIG[recipe.wellnessType];
  const totalTime = recipe.prepTime + recipe.cookTime;

  const handleDeduct = () => {
    if (!user || !recipe) return;
    const available = stockInfo.filter((s) => s.status !== 'missing').length;
    if (available === 0) {
      Alert.alert('Stock insuffisant', 'Aucun ingrédient trouvé dans votre garde-manger.');
      return;
    }
    Alert.alert(
      'Déduire du stock',
      `Déduire les ingrédients de "${recipe.name}" de votre garde-manger ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déduire', onPress: async () => {
            setDeducting(true);
            await deductRecipeFromPantry(user.uid, recipe.ingredients);
            const updated = await checkRecipeStock(user.uid, recipe.ingredients);
            setStockInfo(updated);
            setDeducting(false);
            Alert.alert('Stock mis à jour', 'Les ingrédients ont été déduits de votre garde-manger.');
          },
        },
      ],
    );
  };

  const handleAddToCart = async (ingName: string, quantity: number, unit: string, price: number) => {
    if (!user) return;
    await addShoppingItem(user.uid, { name: ingName, quantity, unit, price });
    setAddedToCart((prev) => new Set(prev).add(ingName));
  };

  const handleAddAllMissingToCart = async () => {
    if (!user || !recipe) return;
    const missing = stockInfo.filter((s) => s.status === 'missing' || s.status === 'partial');
    await Promise.all(
      missing.map((s) =>
        addShoppingItem(user.uid, {
          name: s.ingredient.name,
          quantity: s.ingredient.quantity,
          unit: s.ingredient.unit,
          price: s.ingredient.price,
        }),
      ),
    );
    setAddedToCart((prev) => {
      const next = new Set(prev);
      missing.forEach((s) => next.add(s.ingredient.name));
      return next;
    });
    Alert.alert('Ajouté aux courses', `${missing.length} ingrédient(s) ajouté(s) à votre liste de courses.`);
  };

  const handleDelete = () => {
    Alert.alert('Supprimer la recette', `Supprimer "${recipe.name}" définitivement ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => { await deleteRecipe(recipe.id); navigation.goBack(); } },
    ]);
  };

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        bounces={true}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* Hero photo */}
        <View style={styles.hero}>
          {recipe.imageUrl ? (
            <Image source={{ uri: recipe.imageUrl }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <View style={styles.heroPlaceholderDecor1} />
              <View style={styles.heroPlaceholderDecor2} />
              <View style={styles.heroPlaceholderIcon}>
                <Ionicons name="restaurant" size={64} color="rgba(255,255,255,0.9)" />
              </View>
            </View>
          )}

          {/* Top bar */}
          <View style={[styles.heroTopBar, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
            </TouchableOpacity>
            <View style={styles.heroTopRight}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('AddRecipe', { recipeId: recipe.id })}>
                <Ionicons name="pencil" size={18} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconBtn, styles.iconBtnDanger]} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Title card — overlaps hero bottom */}
        <View style={styles.titleCard}>
          <View style={styles.titleCardTop}>
            <View style={[styles.wellnessBadge, { backgroundColor: wConfig.bg }]}>
              <Ionicons name={wConfig.icon} size={12} color={wConfig.color} />
              <Text style={[styles.wellnessBadgeText, { color: wConfig.color }]}>{wConfig.label}</Text>
            </View>
            <Text style={styles.heroTitle}>{recipe.name}</Text>
            {recipe.description ? (
              <Text style={styles.heroDesc}>{recipe.description}</Text>
            ) : null}
          </View>
        </View>

        {/* Stats card */}
        <View style={styles.statsCard}>
          {[
            { icon: 'time-outline' as const,   label: 'Prép.',     value: `${recipe.prepTime} min`, color: Colors.primary },
            { icon: 'flame-outline' as const,  label: 'Cuisson',   value: `${recipe.cookTime} min`, color: Colors.tertiary },
            { icon: 'people-outline' as const, label: 'Portions',  value: `${recipe.servings}`,      color: Colors.secondary },
            { icon: 'wallet-outline' as const, label: 'Par pers.', value: formatCurrency(costPerServing), color: Colors.primary },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, i < 3 && styles.statCardBorder]}>
              <View style={[styles.statIcon, { backgroundColor: `${s.color}18` }]}>
                <Ionicons name={s.icon} size={16} color={s.color} />
              </View>
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
              {recipe.ingredients.map((ing, idx) => {
                const info = stockInfo.find((s) => s.ingredient.id === ing.id);
                const statusColor = info?.status === 'ok' ? Colors.primary : info?.status === 'partial' ? Colors.tertiary : Colors.outlineVariant;
                const statusIcon: keyof typeof Ionicons.glyphMap = info?.status === 'ok' ? 'checkmark-circle' : info?.status === 'partial' ? 'alert-circle' : 'ellipse-outline';
                return (
                  <View key={idx} style={styles.ingredientRow}>
                    <View style={styles.ingNumber}>
                      <Text style={styles.ingNumberText}>{idx + 1}</Text>
                    </View>
                    <View style={styles.ingInfo}>
                      <Text style={styles.ingName}>{ing.name}</Text>
                      <View style={styles.ingQtyRow}>
                        <Text style={styles.ingQty}>{ing.quantity} {ing.unit}</Text>
                        {info && (
                          <View style={styles.ingStockBadge}>
                            <Ionicons name={statusIcon} size={12} color={statusColor} />
                            <Text style={[styles.ingStockText, { color: statusColor }]}>
                              {info.status === 'ok'
                                ? displayQty(info.availableQty, info.availableUnit)
                                : info.status === 'partial'
                                ? `${displayQty(info.availableQty, info.availableUnit)} dispo`
                                : 'non en stock'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={styles.ingPrice}>{formatCurrency(ing.price * ing.quantity)}</Text>
                    {info && info.status !== 'ok' && (
                      <TouchableOpacity
                        style={[styles.cartBtn, addedToCart.has(ing.name) && styles.cartBtnDone]}
                        onPress={() => handleAddToCart(ing.name, ing.quantity, ing.unit, ing.price)}
                        disabled={addedToCart.has(ing.name)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons
                          name={addedToCart.has(ing.name) ? 'checkmark' : 'cart-outline'}
                          size={15}
                          color={addedToCart.has(ing.name) ? Colors.onPrimary : Colors.primary}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}

              {/* Stock summary banner */}
              {stockInfo.length > 0 && (
                <View style={styles.stockBanner}>
                  <View style={styles.stockBannerLeft}>
                    <Ionicons name="cube-outline" size={16} color={Colors.primary} />
                    <View>
                      <Text style={styles.stockBannerTitle}>Stock disponible</Text>
                      <Text style={styles.stockBannerSub}>
                        {stockInfo.filter((s) => s.status === 'ok').length} complets ·{' '}
                        {stockInfo.filter((s) => s.status === 'partial').length} partiels ·{' '}
                        {stockInfo.filter((s) => s.status === 'missing').length} manquants
                      </Text>
                    </View>
                  </View>
                  <View style={styles.stockBannerActions}>
                    {stockInfo.some((s) => s.status === 'missing' || s.status === 'partial') && (
                      <TouchableOpacity style={styles.cartAllBtn} onPress={handleAddAllMissingToCart}>
                        <Ionicons name="cart-outline" size={14} color={Colors.tertiary} />
                        <Text style={styles.cartAllBtnText}>Courses</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.deductBtn, deducting && { opacity: 0.5 }]}
                      onPress={handleDeduct}
                      disabled={deducting}
                    >
                      <Ionicons name="remove-circle-outline" size={14} color={Colors.primary} />
                      <Text style={styles.deductBtnText}>Déduire</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

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
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  loadingText: { fontFamily: FontFamily.body, color: Colors.onSurfaceVariant },

  hero: {
    height: 300, position: 'relative', overflow: 'hidden',
  },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: {
    width: '100%', height: '100%',
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  heroPlaceholderDecor1: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -60,
  },
  heroPlaceholderDecor2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)', bottom: -40, left: -40,
  },
  heroPlaceholderIcon: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  heroTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  heroTopRight: { flexDirection: 'row', gap: Spacing.xs },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  iconBtnDanger: { backgroundColor: 'rgba(255,255,255,0.92)' },

  titleCard: {
    marginHorizontal: Spacing.lg, marginTop: -28,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xxl, padding: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 5,
  },
  titleCardTop: { gap: Spacing.xs },
  wellnessBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 5,
    borderRadius: BorderRadius.full, alignSelf: 'flex-start',
  },
  wellnessBadgeText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelSm },
  heroTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineLg, color: Colors.onSurface, lineHeight: 30 },
  heroDesc: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant, lineHeight: 20 },

  statsCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg, marginTop: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xxl, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, gap: 6 },
  statCardBorder: { borderRightWidth: 1, borderRightColor: Colors.surfaceContainerHigh },
  statIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleSm, color: Colors.onSurface },
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
  ingQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 1 },
  ingQty: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant },
  ingStockBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ingStockText: { fontFamily: FontFamily.body, fontSize: 10 },
  ingPrice: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.primary },
  stockBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: `${Colors.primary}08`, borderRadius: BorderRadius.xl,
    padding: Spacing.sm, marginVertical: Spacing.sm,
  },
  stockBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flex: 1 },
  stockBannerTitle: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.onSurface },
  stockBannerSub: { fontFamily: FontFamily.body, fontSize: 10, color: Colors.onSurfaceVariant, marginTop: 1 },
  stockBannerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  cartAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${Colors.tertiary}15`, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  cartAllBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelSm, color: Colors.tertiary },
  deductBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${Colors.primary}15`, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  deductBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelSm, color: Colors.primary },
  cartBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: `${Colors.primary}15`, alignItems: 'center', justifyContent: 'center', marginLeft: 4,
  },
  cartBtnDone: { backgroundColor: Colors.primary },
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
