import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { EatsyInput } from '../../components/EatsyInput';
import { EatsyButton } from '../../components/EatsyButton';
import { useAuth } from '../../context/AuthContext';
import { addRecipe, updateRecipe, getRecipe, getCategories } from '../../services/recipeService';
import { Recipe, Ingredient, Category, WellnessType } from '../../types';
import { usePreferences , useColors } from '../../context/PreferencesContext';

const WELLNESS_ICONS: Record<WellnessType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  balanced:  { icon: 'leaf-outline',  color: Colors.primary,  bg: `${Colors.primary}15` },
  quick:     { icon: 'flash-outline', color: Colors.tertiary, bg: `${Colors.tertiary}18` },
  indulgent: { icon: 'heart-outline', color: Colors.error,    bg: `${Colors.error}15` },
};

const emptyIngredient = (): Ingredient => ({
  id: Math.random().toString(36).substr(2, 9),
  name: '', quantity: 1, unit: 'g', price: 0,
});

type Props = { navigation: any; route: any };

export const AddRecipeScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { formatCurrency, currencySymbol, t } = usePreferences();
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const recipeId = route.params?.recipeId;
  const isEdit = !!recipeId;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('15');
  const [cookTime, setCookTime] = useState('30');
  const [servings, setServings] = useState('4');
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [ingredients, setIngredients] = useState<Ingredient[]>([emptyIngredient()]);
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [wellnessType, setWellnessType] = useState<WellnessType>('balanced');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
    ]).start();
    if (user) getCategories(user.uid).then(setCategories);
    if (isEdit) {
      getRecipe(recipeId).then((r) => {
        if (!r) return;
        setName(r.name);
        setDescription(r.description ?? '');
        setPrepTime(String(r.prepTime));
        setCookTime(String(r.cookTime));
        setServings(String(r.servings));
        setImageUri(r.imageUrl);
        setIngredients(r.ingredients.length ? r.ingredients : [emptyIngredient()]);
        setInstructions(r.instructions.length ? r.instructions : ['']);
        setWellnessType(r.wellnessType);
        setCategoryId(r.categoryId);
      });
    }
  }, [user, recipeId]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [4, 3], quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: any) => {
    setIngredients((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i));
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length === 1) return;
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  };

  const updateInstruction = (idx: number, value: string) => {
    setInstructions((prev) => prev.map((s, i) => i === idx ? value : s));
  };

  const removeInstruction = (idx: number) => {
    if (instructions.length === 1) return;
    setInstructions((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalCost = ingredients.reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0);

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) return Alert.alert(t('common_name_required'), t('add_recipe_name_required_msg'));
    if (ingredients.some((i) => !i.name.trim())) return Alert.alert(t('add_recipe_incomplete_title'), t('add_recipe_incomplete_msg'));

    setLoading(true);
    try {
      const data: Omit<Recipe, 'id'> = {
        name: name.trim(),
        description: description.trim(),
        imageUrl: imageUri,
        prepTime: parseInt(prepTime) || 0,
        cookTime: parseInt(cookTime) || 0,
        servings: parseInt(servings) || 1,
        categoryId,
        ingredients: ingredients.filter((i) => i.name.trim()),
        instructions: instructions.filter((s) => s.trim()),
        wellnessType,
        userId: user.uid,
        createdAt: new Date(),
        totalCost,
        costPerServing: totalCost / (parseInt(servings) || 1),
      };

      if (isEdit) {
        await updateRecipe(recipeId, data);
      } else {
        await addRecipe(data);
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert(t('common_error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(Colors);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.screen}>
        {/* Header */}
        <View style={[styles.headerBand, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerDecor} />
          <View style={styles.headerDecor2} />
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{isEdit ? t('add_recipe_title_edit') : t('add_recipe_title_new')}</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >

          {/* Image picker */}
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.85}>
            {imageUri ? (
              <>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <View style={styles.imageOverlay}>
                  <View style={styles.imageEditBadge}>
                    <Ionicons name="camera" size={16} color="#fff" />
                    <Text style={styles.imageEditText}>{t('add_recipe_change_photo')}</Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.imagePlaceholder}>
                <View style={styles.imagePlaceholderIcon}>
                  <Ionicons name="camera-outline" size={28} color={Colors.primary} />
                </View>
                <Text style={styles.imagePlaceholderText}>{t('add_recipe_add_photo')}</Text>
                <Text style={styles.imagePlaceholderSub}>{t('add_recipe_photo_hint')}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* General info */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.cardTitle}>{t('add_recipe_general')}</Text>
            </View>

            <EatsyInput label={t('add_recipe_name_label')} value={name} onChangeText={setName} placeholder={t('add_recipe_name_placeholder')} />
            <EatsyInput label={t('add_recipe_desc_label')} value={description} onChangeText={setDescription} placeholder={t('add_recipe_desc_placeholder')} multiline numberOfLines={2} />

            <View style={styles.row}>
              <View style={styles.half}>
                <EatsyInput label="Préparation (min)" value={prepTime} onChangeText={setPrepTime} keyboardType="numeric" placeholder="15" />
              </View>
              <View style={styles.half}>
                <EatsyInput label="Cuisson (min)" value={cookTime} onChangeText={setCookTime} keyboardType="numeric" placeholder="30" />
              </View>
            </View>
            <EatsyInput label="Nombre de personnes" value={servings} onChangeText={setServings} keyboardType="numeric" placeholder="4" />
          </View>

          {/* Wellness type */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="heart-circle-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Type de repas</Text>
            </View>

            <View style={styles.wellnessRow}>
              {WELLNESS_OPTIONS.map((w) => {
                const active = wellnessType === w.value;
                return (
                  <TouchableOpacity
                    key={w.value}
                    style={[styles.wellnessOption, { backgroundColor: active ? w.bg : Colors.surfaceContainerLow }, active && { borderColor: w.color }]}
                    onPress={() => setWellnessType(w.value)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.wellnessIconWrap, { backgroundColor: active ? w.color : Colors.surfaceContainerHigh }]}>
                      <Ionicons name={w.icon} size={18} color={active ? '#fff' : Colors.onSurfaceVariant} />
                    </View>
                    <Text style={[styles.wellnessLabel, active && { color: w.color, fontFamily: FontFamily.bodyBold }]}>{w.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Category */}
          {categories.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <Ionicons name="grid-outline" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.cardTitle}>Catégorie</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                <TouchableOpacity
                  style={[styles.catChip, !categoryId && styles.catChipActive]}
                  onPress={() => setCategoryId('')}
                >
                  <Text style={[styles.catChipText, !categoryId && styles.catChipTextActive]}>Toutes</Text>
                </TouchableOpacity>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.catChip, categoryId === c.id && styles.catChipActive]}
                    onPress={() => setCategoryId(c.id)}
                  >
                    <Text style={[styles.catChipText, categoryId === c.id && styles.catChipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Ingredients */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="basket-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Ingrédients</Text>
              <View style={styles.cardHeaderRight}>
                <Ionicons name="pricetag-outline" size={14} color={Colors.primary} />
                <Text style={styles.totalCostText}>{formatCurrency(totalCost)}</Text>
              </View>
            </View>

            {ingredients.map((ing, idx) => (
              <View key={ing.id} style={styles.ingredientBlock}>
                <View style={styles.ingredientBlockHeader}>
                  <View style={styles.ingIndex}>
                    <Text style={styles.ingIndexText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.ingLabel}>Ingrédient {idx + 1}</Text>
                  <TouchableOpacity
                    style={styles.removeIconBtn}
                    onPress={() => removeIngredient(ing.id)}
                    disabled={ingredients.length === 1}
                  >
                    <Ionicons name="trash-outline" size={16} color={ingredients.length === 1 ? Colors.outlineVariant : Colors.error} />
                  </TouchableOpacity>
                </View>
                <EatsyInput
                  label="Nom"
                  value={ing.name}
                  onChangeText={(v) => updateIngredient(ing.id, 'name', v)}
                  placeholder="Ex: Farine"
                />
                <View style={styles.row}>
                  <View style={styles.third}>
                    <EatsyInput label="Quantité" value={String(ing.quantity)} onChangeText={(v) => updateIngredient(ing.id, 'quantity', parseFloat(v) || 0)} keyboardType="numeric" placeholder="100" />
                  </View>
                  <View style={styles.third}>
                    <EatsyInput label="Unité" value={ing.unit} onChangeText={(v) => updateIngredient(ing.id, 'unit', v)} placeholder="g" />
                  </View>
                  <View style={styles.third}>
                    <EatsyInput label={`Prix (${currencySymbol})`} value={String(ing.price)} onChangeText={(v) => updateIngredient(ing.id, 'price', parseFloat(v) || 0)} keyboardType="numeric" placeholder="0.50" />
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addRowBtn}
              onPress={() => setIngredients((prev) => [...prev, emptyIngredient()])}
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.addRowBtnText}>Ajouter un ingrédient</Text>
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="list-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Instructions</Text>
            </View>

            {instructions.map((step, idx) => (
              <View key={idx} style={styles.stepRow}>
                <View style={styles.stepLeft}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{idx + 1}</Text>
                  </View>
                  {idx < instructions.length - 1 && <View style={styles.stepConnector} />}
                  <TouchableOpacity
                    style={styles.stepRemoveBtn}
                    onPress={() => removeInstruction(idx)}
                    disabled={instructions.length === 1}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={instructions.length === 1 ? Colors.outlineVariant : Colors.outline} />
                  </TouchableOpacity>
                </View>
                <View style={styles.stepRight}>
                  <EatsyInput
                    label=""
                    value={step}
                    onChangeText={(v) => updateInstruction(idx, v)}
                    placeholder={`Décrivez l'étape ${idx + 1}...`}
                    multiline
                  />
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addRowBtn}
              onPress={() => setInstructions((prev) => [...prev, ''])}
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.addRowBtnText}>Ajouter une étape</Text>
            </TouchableOpacity>
          </View>

          {/* Save */}
          <View style={styles.saveSection}>
            <EatsyButton
              label={isEdit ? 'Enregistrer les modifications' : 'Créer la recette'}
              onPress={handleSave}
              loading={loading}
            />
          </View>
        </Animated.ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const createStyles = (C: typeof Colors) => StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: C.surface },
  headerBand: {
    backgroundColor: C.primary, paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md + 16, overflow: 'hidden',
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  headerDecor: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -70, right: -40,
  },
  headerDecor2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -30, left: -20,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg, color: '#fff' },

  imagePicker: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    borderRadius: BorderRadius.xxl, overflow: 'hidden', height: 180,
  },
  imagePreview: { width: '100%', height: '100%' },
  imageOverlay: {
    position: 'absolute', inset: 0 as any,
    backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  imageEditBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  imageEditText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: '#fff' },
  imagePlaceholder: {
    flex: 1, backgroundColor: C.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: C.outlineVariant, borderStyle: 'dashed',
    borderRadius: BorderRadius.xxl,
  },
  imagePlaceholderIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: `${C.primary}12`, alignItems: 'center', justifyContent: 'center',
  },
  imagePlaceholderText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  imagePlaceholderSub: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.onSurfaceVariant },

  card: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.md },
  cardHeaderIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: `${C.primary}12`, alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleMd, color: C.onSurface, flex: 1 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  totalCostText: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleMd, color: C.primary },

  row: { flexDirection: 'row', gap: Spacing.sm },
  half: { flex: 1 },
  third: { flex: 1 },

  wellnessRow: { flexDirection: 'row', gap: Spacing.sm },
  wellnessOption: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: 4,
    borderRadius: BorderRadius.xl, borderWidth: 1.5, borderColor: 'transparent', gap: 6,
  },
  wellnessIconWrap: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  wellnessLabel: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelSm, color: C.onSurfaceVariant, textAlign: 'center' },

  categoryRow: { flexDirection: 'row', gap: Spacing.xs, paddingBottom: 4 },
  catChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 7,
    backgroundColor: C.surfaceContainerHigh, borderRadius: BorderRadius.full,
  },
  catChipActive: { backgroundColor: C.primary },
  catChipText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelMd, color: C.onSurfaceVariant },
  catChipTextActive: { color: C.onPrimary },

  ingredientBlock: {
    backgroundColor: C.surfaceContainerLow, borderRadius: BorderRadius.xl,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  ingredientBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 6 },
  ingIndex: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  ingIndexText: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: C.onPrimary },
  ingLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.onSurface, flex: 1 },
  removeIconBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center',
  },

  addRowBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.xl,
    borderWidth: 1.5, borderColor: C.outlineVariant, borderStyle: 'dashed',
    marginTop: Spacing.xs,
  },
  addRowBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.primary },

  stepRow: { flexDirection: 'row', marginBottom: 4 },
  stepLeft: { alignItems: 'center', width: 36, paddingTop: 10 },
  stepNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  stepNumText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.onPrimary },
  stepConnector: { width: 2, flex: 1, backgroundColor: C.surfaceContainerHigh, marginTop: 4 },
  stepRight: { flex: 1 },
  stepRemoveBtn: { marginTop: 4 },

  saveSection: { paddingHorizontal: Spacing.lg, marginTop: Spacing.xs },
});
