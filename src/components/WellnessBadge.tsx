import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WellnessType } from '../types';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../constants/typography';

const config: Record<WellnessType, { label: string; emoji: string; bg: string; text: string }> = {
  balanced: { label: 'Équilibré', emoji: '🥗', bg: Colors.secondaryContainer, text: Colors.onSecondaryContainer },
  quick: { label: 'Rapide', emoji: '⚡', bg: `${Colors.tertiary}22`, text: Colors.tertiary },
  indulgent: { label: 'Plaisir', emoji: '🍰', bg: `${Colors.error}18`, text: Colors.error },
};

interface Props {
  type: WellnessType;
  size?: 'sm' | 'md';
}

export const WellnessBadge: React.FC<Props> = ({ type, size = 'md' }) => {
  const c = config[type];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, size === 'sm' && styles.badgeSm]}>
      <Text style={[styles.emoji, size === 'sm' && styles.emojiSm]}>{c.emoji}</Text>
      <Text style={[styles.label, { color: c.text }, size === 'sm' && styles.labelSm]}>{c.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  emoji: {
    fontSize: 12,
  },
  emojiSm: {
    fontSize: 10,
  },
  label: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.labelMd,
  },
  labelSm: {
    fontSize: FontSize.labelSm,
  },
});
