import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../constants/typography';
import { Recipe } from '../types';
import { WellnessBadge } from './WellnessBadge';

interface Props {
  recipe: Recipe;
  onPress: () => void;
  compact?: boolean;
}

export const RecipeCard: React.FC<Props> = ({ recipe, onPress, compact = false }) => {
  const cost = recipe.totalCost ?? recipe.ingredients.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <TouchableOpacity style={[styles.card, compact && styles.cardCompact]} onPress={onPress} activeOpacity={0.85}>
      {recipe.imageUrl ? (
        <Image source={{ uri: recipe.imageUrl }} style={[styles.image, compact && styles.imageCompact]} />
      ) : (
        <View style={[styles.imagePlaceholder, compact && styles.imageCompact]}>
          <Text style={styles.imagePlaceholderEmoji}>🍽️</Text>
        </View>
      )}
      <View style={[styles.content, compact && styles.contentCompact]}>
        <Text style={styles.name} numberOfLines={compact ? 1 : 2}>{recipe.name}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>⏱ {recipe.prepTime + recipe.cookTime}min</Text>
          <Text style={styles.metaText}>👥 {recipe.servings}</Text>
          <Text style={styles.metaText}>💰 {cost.toFixed(2)}€</Text>
        </View>
        {!compact && <WellnessBadge type={recipe.wellnessType} />}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  cardCompact: {
    flexDirection: 'row',
    borderRadius: BorderRadius.xl,
  },
  image: {
    width: '100%',
    height: 180,
  },
  imageCompact: {
    width: 80,
    height: 80,
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderEmoji: {
    fontSize: 48,
  },
  content: {
    padding: Spacing.md,
  },
  contentCompact: {
    flex: 1,
    padding: Spacing.sm,
    justifyContent: 'center',
  },
  name: {
    fontFamily: FontFamily.headline,
    fontSize: FontSize.titleLg,
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  metaText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.labelMd,
    color: Colors.onSurfaceVariant,
  },
});
