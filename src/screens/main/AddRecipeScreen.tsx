import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { EatsyInput } from '../../components/EatsyInput';
import { EatsyButton } from '../../components/EatsyButton';
import { useAuth } from '../../context/AuthContext';
import { addRecipe, updateRecipe, getRecipe, getCategories } from '../../services/recipeService';
import { Recipe, Ingredient, Category, WellnessType } from '../../types';

type Props = { navigation: any; route: any };

const WELLNESS_OPTIONS: Array<{ value: WellnessType; label: string; emoji: string }> = [
  { value: 'balanced', label: 'Équilibré', emoji: '🥗' },
  { value: 'quick', label: 'Rapide', emoji: '⚡' },
  { value: 'indulgent', label: 'Plaisir', emoji: '🍰' },
];

const emptyIngredient = (): Ingredient => ({
  id: Math.random().toString(36).substr(2, 9),
  name: '', quantity: 1, unit: 'g', price: 0,
});

export const AddRecipeScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const recipeId = route.params?.recipeId;
  const isEdit = !!recipeId;

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
    if (!name.trim()) return Alert.alert('Nom requis');
    if (ingredients.some((i) => !i.name.trim())) return Alert.alert('Tous les ingrédients doivent avoir un nom');

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
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.screen} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{isEdit ? 'Modifier' : 'Nouvelle recette'}</Text>
        </View>

        <View style={styles.section}>
          {/* Image picker */}
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {imageUri ? (
              <Text style={styles.imagePickerHint}>📷 Photo sélectionnée ✓</Text>
            ) : (
              <Text style={styles.imagePickerHint}>📷 Ajouter une photo</Text>
            )}
          </TouchableOpacity>

          <EatsyInput label="Nom de la recette" value={name} onChangeText={setName} placeholder="Ex: Poulet rôti aux herbes" />
          <EatsyInput label="Description" value={description} onChangeText={setDescription} placeholder="Courte description..." multiline numberOfLines={2} />

          <View style={styles.row}>
            <View style={styles.half}>
              <EatsyInput label="Prép. (min)" value={prepTime} onChangeText={setPrepTime} keyboardType="numeric" placeholder="15" />
            </View>
            <View style={styles.half}>
              <EatsyInput label="Cuisson (min)" value={cookTime} onChangeText={setCookTime} keyboardType="numeric" placeholder="30" />
            </View>
          </View>
          <EatsyInput label="Nombre de personnes" value={servings} onChangeText={setServings} keyboardType="numeric" placeholder="4" />
        </View>

        {/* Wellness type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Type de repas</Text>
          <View style={styles.wellnessRow}>
            {WELLNESS_OPTIONS.map((w) => (
              <TouchableOpacity
                key={w.value}
                style={[styles.wellnessOption, wellnessType === w.value && styles.wellnessOptionActive]}
                onPress={() => setWellnessType(w.value)}
              >
                <Text style={styles.wellnessEmoji}>{w.emoji}</Text>
                <Text style={[styles.wellnessLabel, wellnessType === w.value && styles.wellnessLabelActive]}>{w.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ingrédients</Text>
            <Text style={styles.totalCost}>Total: {totalCost.toFixed(2)}€</Text>
          </View>

          {ingredients.map((ing, idx) => (
            <View key={ing.id} style={styles.ingredientCard}>
              <View style={styles.ingRow}>
                <EatsyInput
                  label="Ingrédient"
                  value={ing.name}
                  onChangeText={(v) => updateIngredient(ing.id, 'name', v)}
                  placeholder="Ex: Farine"
                  style={styles.ingNameInput}
                />
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeIngredient(ing.id)}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.row}>
                <View style={styles.third}>
                  <EatsyInput label="Qté" value={String(ing.quantity)} onChangeText={(v) => updateIngredient(ing.id, 'quantity', parseFloat(v) || 0)} keyboardType="numeric" placeholder="100" />
                </View>
                <View style={styles.third}>
                  <EatsyInput label="Unité" value={ing.unit} onChangeText={(v) => updateIngredient(ing.id, 'unit', v)} placeholder="g" />
                </View>
                <View style={styles.third}>
                  <EatsyInput label="Prix (€)" value={String(ing.price)} onChangeText={(v) => updateIngredient(ing.id, 'price', parseFloat(v) || 0)} keyboardType="numeric" placeholder="0.50" />
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addItemBtn}
            onPress={() => setIngredients((prev) => [...prev, emptyIngredient()])}
          >
            <Text style={styles.addItemBtnText}>+ Ajouter un ingrédient</Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>

          {instructions.map((step, idx) => (
            <View key={idx} style={styles.stepCard}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{idx + 1}</Text>
              </View>
              <View style={styles.stepInputWrapper}>
                <EatsyInput
                  label=""
                  value={step}
                  onChangeText={(v) => updateInstruction(idx, v)}
                  placeholder={`Étape ${idx + 1}...`}
                  multiline
                />
              </View>
              <TouchableOpacity onPress={() => removeInstruction(idx)} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addItemBtn}
            onPress={() => setInstructions((prev) => [...prev, ''])}
          >
            <Text style={styles.addItemBtnText}>+ Ajouter une étape</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.saveSection}>
          <EatsyButton label={isEdit ? 'Enregistrer les modifications' : 'Créer la recette'} onPress={handleSave} loading={loading} />
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  backText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.primary },
  title: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm, color: Colors.onSurface, flex: 1 },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.titleLg, color: Colors.onSurface, marginBottom: Spacing.sm },
  totalCost: { fontFamily: FontFamily.headline, fontSize: FontSize.titleLg, color: Colors.primary },
  imagePicker: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.outlineVariant, borderStyle: 'dashed',
  },
  imagePickerHint: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  row: { flexDirection: 'row', gap: Spacing.sm },
  half: { flex: 1 },
  third: { flex: 1 },
  wellnessRow: { flexDirection: 'row', gap: Spacing.sm },
  wellnessOption: {
    flex: 1, alignItems: 'center', padding: Spacing.md,
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.xl,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  wellnessOptionActive: { backgroundColor: Colors.secondaryContainer, borderColor: Colors.secondary },
  wellnessEmoji: { fontSize: 24 },
  wellnessLabel: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant, marginTop: 4 },
  wellnessLabelActive: { color: Colors.onSecondaryContainer, fontFamily: FontFamily.bodyBold },
  ingredientCard: { backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.sm },
  ingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs },
  ingNameInput: { flex: 1 },
  removeBtn: { paddingTop: 28, paddingLeft: Spacing.xs },
  removeBtnText: { color: Colors.outline, fontSize: 14 },
  addItemBtn: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.xl,
    padding: Spacing.md, alignItems: 'center', borderWidth: 1.5,
    borderColor: Colors.outlineVariant, borderStyle: 'dashed',
  },
  addItemBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.primary },
  stepCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.xs },
  stepNumber: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 28, flexShrink: 0,
  },
  stepNumberText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onPrimary },
  stepInputWrapper: { flex: 1 },
  saveSection: { paddingHorizontal: Spacing.lg, marginTop: Spacing.sm },
});
