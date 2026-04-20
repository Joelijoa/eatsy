import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../constants/typography';

interface Props {
  spent: number;
  total: number;
  label?: string;
}

export const BudgetProgressBar: React.FC<Props> = ({ spent, total, label }) => {
  const pct = total > 0 ? Math.min(spent / total, 1) : 0;
  const isOver = spent > total;
  const barColor = isOver ? Colors.tertiary : pct > 0.8 ? Colors.tertiary : Colors.primary;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.row}>
        <Text style={[styles.amount, isOver && styles.amountOver]}>{spent.toFixed(2)}€</Text>
        <Text style={styles.total}> / {total.toFixed(2)}€</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
      </View>
      {isOver && (
        <Text style={styles.overBudget}>⚠️ Budget dépassé de {(spent - total).toFixed(2)}€</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
  },
  label: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.labelMd,
    color: Colors.onSurfaceVariant,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.xs,
  },
  amount: {
    fontFamily: FontFamily.headlineBold,
    fontSize: FontSize.headlineMd,
    color: Colors.onSurface,
  },
  amountOver: {
    color: Colors.tertiary,
  },
  total: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  track: {
    height: 8,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  overBudget: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.labelMd,
    color: Colors.tertiary,
    marginTop: 4,
  },
});
