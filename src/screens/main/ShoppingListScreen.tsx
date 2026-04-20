import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { getOrCreateWeekPlan, generateShoppingList, getWeekStart } from '../../services/plannerService';
import { getRecipes } from '../../services/recipeService';
import { ShoppingList, ShoppingItem } from '../../types';
import { EatsyButton } from '../../components/EatsyButton';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export const ShoppingListScreen: React.FC = () => {
  const { user } = useAuth();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const loadList = async () => {
    if (!user) return;
    try {
      const weekStart = getWeekStart();
      const q = query(
        collection(db, 'shoppingLists'),
        where('userId', '==', user.uid),
        where('weekStart', '==', weekStart)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        setList({ ...d.data(), id: d.id } as ShoppingList);
      }
    } catch (e) { console.error(e); }
  };

  const generateList = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const [wp, recipes] = await Promise.all([
        getOrCreateWeekPlan(user.uid, getWeekStart()),
        getRecipes(user.uid),
      ]);
      const recipeMap = Object.fromEntries(recipes.map((r) => [r.id, r]));
      const newList = await generateShoppingList(user.uid, wp, recipeMap);
      setList(newList);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => { loadList(); }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadList();
    setRefreshing(false);
  };

  const toggleItem = async (itemId: string) => {
    if (!list) return;
    const updated = list.items.map((i) =>
      i.id === itemId ? { ...i, checked: !i.checked } : i
    );
    setList({ ...list, items: updated });
    const q = query(collection(db, 'shoppingLists'), where('userId', '==', user?.uid ?? ''), where('weekStart', '==', list.weekStart));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await updateDoc(snap.docs[0].ref, { items: updated });
    }
  };

  const unchecked = list?.items.filter((i) => !i.checked) ?? [];
  const checked = list?.items.filter((i) => i.checked) ?? [];
  const checkedCost = checked.reduce((s, i) => s + i.price * i.quantity, 0);

  const groupedUnchecked = unchecked.reduce((acc, item) => {
    const key = item.recipeName ?? 'Autres';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Liste de courses</Text>
        <Text style={styles.weekLabel}>Semaine du {getWeekStart()}</Text>
      </View>

      {!list ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>Aucune liste générée</Text>
          <Text style={styles.emptyDesc}>Planifiez votre semaine puis générez votre liste de courses automatiquement.</Text>
          <EatsyButton label="Générer la liste" onPress={generateList} loading={generating} style={styles.generateBtn} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {/* Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{list.items.length}</Text>
              <Text style={styles.summaryLabel}>Articles</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{checked.length}</Text>
              <Text style={styles.summaryLabel}>Cochés</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, styles.summaryValueGreen]}>{list.totalCost.toFixed(2)}€</Text>
              <Text style={styles.summaryLabel}>Total estimé</Text>
            </View>
          </View>

          {/* Regenerate */}
          <View style={styles.regenRow}>
            <EatsyButton label="🔄 Régénérer" variant="secondary" onPress={generateList} loading={generating} style={styles.regenBtn} />
          </View>

          {/* To buy */}
          {Object.entries(groupedUnchecked).map(([group, items]) => (
            <View key={group} style={styles.group}>
              <Text style={styles.groupTitle}>{group}</Text>
              {items.map((item) => (
                <TouchableOpacity key={item.id} style={styles.itemRow} onPress={() => toggleItem(item.id)}>
                  <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                    {item.checked && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
                  </View>
                  <Text style={styles.itemPrice}>{(item.price * item.quantity).toFixed(2)}€</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Checked items */}
          {checked.length > 0 && (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>✅ Dans le panier</Text>
              {checked.map((item) => (
                <TouchableOpacity key={item.id} style={[styles.itemRow, styles.itemRowChecked]} onPress={() => toggleItem(item.id)}>
                  <View style={[styles.checkbox, styles.checkboxChecked]}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={[styles.itemName, styles.itemNameChecked]}>{item.name}</Text>
                    <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
                  </View>
                  <Text style={styles.itemPrice}>{(item.price * item.quantity).toFixed(2)}€</Text>
                </TouchableOpacity>
              ))}
              <View style={styles.checkedTotal}>
                <Text style={styles.checkedTotalText}>Sous-total panier</Text>
                <Text style={styles.checkedTotalAmount}>{checkedCost.toFixed(2)}€</Text>
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  title: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm, color: Colors.onSurface },
  weekLabel: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant, marginTop: 2 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyEmoji: { fontSize: 64, marginBottom: Spacing.md },
  emptyTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.headlineMd, color: Colors.onSurface, textAlign: 'center' },
  emptyDesc: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', marginTop: Spacing.xs, marginBottom: Spacing.xl, lineHeight: 20 },
  generateBtn: { width: '100%' },
  summaryCard: {
    flexDirection: 'row', backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xxl, marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.lg, shadowColor: Colors.onSurface, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineLg, color: Colors.onSurface },
  summaryValueGreen: { color: Colors.primary },
  summaryLabel: { fontFamily: FontFamily.body, fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: Colors.outlineVariant, marginHorizontal: Spacing.sm },
  regenRow: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  regenBtn: { height: 44 },
  group: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  groupTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.titleLg, color: Colors.onSurface, marginBottom: Spacing.xs },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.xs,
    shadowColor: Colors.onSurface, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1, gap: Spacing.md,
  },
  itemRowChecked: { opacity: 0.6 },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    borderColor: Colors.outlineVariant, alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: '#fff', fontSize: 12, fontFamily: FontFamily.bodyBold },
  itemContent: { flex: 1 },
  itemName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface },
  itemNameChecked: { textDecorationLine: 'line-through', color: Colors.onSurfaceVariant },
  itemQty: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant, marginTop: 2 },
  itemPrice: { fontFamily: FontFamily.headline, fontSize: FontSize.titleMd, color: Colors.primary },
  checkedTotal: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: `${Colors.secondaryContainer}60`, borderRadius: BorderRadius.xl,
    padding: Spacing.md, marginTop: Spacing.xs,
  },
  checkedTotalText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.bodyMd, color: Colors.secondary },
  checkedTotalAmount: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.bodyMd, color: Colors.primary },
});
