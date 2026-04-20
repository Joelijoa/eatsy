import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { getOrCreateWeekPlan, generateShoppingList, getWeekStart } from '../../services/plannerService';
import { getRecipes } from '../../services/recipeService';
import { db } from '../../services/firebase';
import { ShoppingList, ShoppingItem } from '../../types';

export const ShoppingListScreen: React.FC = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const loadList = async () => {
    if (!user) return;
    const q = query(collection(db, 'shoppingLists'), where('userId', '==', user.uid), where('weekStart', '==', getWeekStart()));
    const snap = await getDocs(q);
    if (!snap.empty) setList({ ...snap.docs[0].data(), id: snap.docs[0].id } as ShoppingList);
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
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => { loadList(); }, [user]);

  const onRefresh = async () => { setRefreshing(true); await loadList(); setRefreshing(false); };

  const toggleItem = async (itemId: string) => {
    if (!list || !user) return;
    const updated = list.items.map((i) => i.id === itemId ? { ...i, checked: !i.checked } : i);
    setList({ ...list, items: updated });
    const q = query(collection(db, 'shoppingLists'), where('userId', '==', user.uid), where('weekStart', '==', list.weekStart));
    const snap = await getDocs(q);
    if (!snap.empty) await updateDoc(snap.docs[0].ref, { items: updated });
  };

  const unchecked = list?.items.filter((i) => !i.checked) ?? [];
  const checked = list?.items.filter((i) => i.checked) ?? [];
  const checkedCost = checked.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Liste de courses</Text>
        <TouchableOpacity style={styles.regenBtn} onPress={generateList} disabled={generating}>
          {generating
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : <><Ionicons name="refresh" size={16} color={Colors.primary} /><Text style={styles.regenText}>Générer</Text></>
          }
        </TouchableOpacity>
      </View>

      {!list ? (
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={56} color={Colors.outlineVariant} />
          <Text style={styles.emptyTitle}>Aucune liste</Text>
          <Text style={styles.emptyDesc}>Planifiez vos repas puis générez votre liste automatiquement.</Text>
          <TouchableOpacity style={styles.generateBtn} onPress={generateList} disabled={generating}>
            {generating
              ? <ActivityIndicator color={Colors.onPrimary} />
              : <Text style={styles.generateBtnText}>Générer la liste</Text>
            }
          </TouchableOpacity>
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
              <Text style={[styles.summaryValue, styles.summaryGreen]}>{checked.length}/{list.items.length}</Text>
              <Text style={styles.summaryLabel}>Cochés</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, styles.summaryGreen]}>{list.totalCost.toFixed(2)} €</Text>
              <Text style={styles.summaryLabel}>Estimé</Text>
            </View>
          </View>

          {/* Progress bar */}
          {list.items.length > 0 && (
            <View style={styles.listProgress}>
              <View style={styles.listProgressTrack}>
                <View style={[styles.listProgressFill, { width: `${(checked.length / list.items.length) * 100}%` }]} />
              </View>
              <Text style={styles.listProgressText}>{Math.round((checked.length / list.items.length) * 100)}%</Text>
            </View>
          )}

          {/* Items to buy */}
          {unchecked.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>À acheter ({unchecked.length})</Text>
              <View style={styles.itemsCard}>
                {unchecked.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    <TouchableOpacity style={styles.itemRow} onPress={() => toggleItem(item.id)}>
                      <View style={styles.checkbox} />
                      <View style={styles.itemContent}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
                      </View>
                      <Text style={styles.itemPrice}>{(item.price * item.quantity).toFixed(2)} €</Text>
                    </TouchableOpacity>
                    {idx < unchecked.length - 1 && <View style={styles.itemSep} />}
                  </React.Fragment>
                ))}
              </View>
            </View>
          )}

          {/* Checked */}
          {checked.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dans le panier ({checked.length})</Text>
              <View style={styles.itemsCard}>
                {checked.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    <TouchableOpacity style={[styles.itemRow, styles.itemRowChecked]} onPress={() => toggleItem(item.id)}>
                      <View style={styles.checkboxChecked}>
                        <Ionicons name="checkmark" size={12} color={Colors.onPrimary} />
                      </View>
                      <View style={styles.itemContent}>
                        <Text style={[styles.itemName, styles.itemNameChecked]}>{item.name}</Text>
                        <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
                      </View>
                      <Text style={[styles.itemPrice, styles.itemPriceChecked]}>{(item.price * item.quantity).toFixed(2)} €</Text>
                    </TouchableOpacity>
                    {idx < checked.length - 1 && <View style={styles.itemSep} />}
                  </React.Fragment>
                ))}
              </View>
              <View style={styles.subTotal}>
                <Text style={styles.subTotalLabel}>Sous-total panier</Text>
                <Text style={styles.subTotalAmount}>{checkedCost.toFixed(2)} €</Text>
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
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md,
  },
  title: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm, color: Colors.onSurface },
  regenBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  regenText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.primary },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.headlineMd, color: Colors.onSurface },
  emptyDesc: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 20 },
  generateBtn: {
    marginTop: Spacing.sm, backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full, paddingHorizontal: Spacing.xl, paddingVertical: 14,
  },
  generateBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onPrimary },
  summaryCard: {
    flexDirection: 'row', backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    padding: Spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineSm, color: Colors.onSurface },
  summaryGreen: { color: Colors.primary },
  summaryLabel: { fontFamily: FontFamily.body, fontSize: 10, color: Colors.onSurfaceVariant, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: Colors.surfaceContainerHigh },
  listProgress: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  listProgressTrack: { flex: 1, height: 4, backgroundColor: Colors.surfaceContainerHigh, borderRadius: 2, overflow: 'hidden' },
  listProgressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  listProgressText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant, width: 32, textAlign: 'right' },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.titleLg, color: Colors.onSurface, marginBottom: Spacing.xs },
  itemsCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  itemRowChecked: { opacity: 0.55 },
  checkbox: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
  },
  checkboxChecked: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  itemContent: { flex: 1 },
  itemName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface },
  itemNameChecked: { textDecorationLine: 'line-through' },
  itemQty: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant, marginTop: 1 },
  itemPrice: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.primary },
  itemPriceChecked: { color: Colors.onSurfaceVariant },
  itemSep: { height: 1, backgroundColor: Colors.surfaceContainerHigh, marginLeft: Spacing.md + 22 + Spacing.md },
  subTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: `${Colors.primary}08`, borderRadius: BorderRadius.xl,
  },
  subTotalLabel: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  subTotalAmount: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.bodyMd, color: Colors.primary },
});
