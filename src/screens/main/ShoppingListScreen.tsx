import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity,
  Modal, TextInput, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import {
  getShoppingItems, addShoppingItem, toggleShoppingItem,
  deleteShoppingItem, clearCheckedItems,
} from '../../services/shoppingListService';
import { ShoppingItem } from '../../types';

const UNITS = ['pcs', 'kg', 'g', 'L', 'cl', 'ml', 'sachet', 'boîte', 'bouteille'];

export const ShoppingListScreen: React.FC = () => {
  const { user } = useAuth();
  const { t, formatCurrency } = usePreferences();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // form state
  const [formName, setFormName] = useState('');
  const [formQty, setFormQty] = useState('1');
  const [formUnit, setFormUnit] = useState('pcs');
  const [formPrice, setFormPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    if (!user) return;
    const data = await getShoppingItems(user.uid);
    setItems(data);
  }, [user]);

  useFocusEffect(useCallback(() => { loadItems(); }, [loadItems]));

  const onRefresh = async () => { setRefreshing(true); await loadItems(); setRefreshing(false); };

  const openModal = () => {
    setFormName(''); setFormQty('1'); setFormUnit('pcs'); setFormPrice('');
    setModalVisible(true);
  };

  const handleAdd = async () => {
    if (!user || !formName.trim()) return;
    setSaving(true);
    try {
      const newItem = await addShoppingItem(user.uid, {
        name: formName.trim(),
        quantity: parseFloat(formQty) || 1,
        unit: formUnit,
        price: parseFloat(formPrice) || 0,
      });
      setItems((prev) => [...prev, newItem]);
      setModalVisible(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: ShoppingItem) => {
    const updated = !item.checked;
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, checked: updated } : i));
    await toggleShoppingItem(item.id, updated);
  };

  const handleDelete = (item: ShoppingItem) => {
    Alert.alert(t('common_delete'), `"${item.name}" ?`, [
      { text: t('common_cancel'), style: 'cancel' },
      {
        text: t('common_delete'), style: 'destructive', onPress: async () => {
          setItems((prev) => prev.filter((i) => i.id !== item.id));
          await deleteShoppingItem(item.id);
        },
      },
    ]);
  };

  const handleClearChecked = () => {
    if (!user) return;
    Alert.alert(t('shopping_clear_checked'), `${checked.length} article(s) ?`, [
      { text: t('common_cancel'), style: 'cancel' },
      {
        text: t('common_delete'), style: 'destructive', onPress: async () => {
          setItems((prev) => prev.filter((i) => !i.checked));
          await clearCheckedItems(user.uid);
        },
      },
    ]);
  };

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);
  const totalCost = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
  const checkedCost = checked.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
  const progress = items.length > 0 ? checked.length / items.length : 0;

  const renderItem = (item: ShoppingItem, isLast: boolean) => (
    <View key={item.id}>
      <View style={[styles.itemRow, item.checked && styles.itemRowChecked]}>
        <TouchableOpacity style={styles.checkboxArea} onPress={() => handleToggle(item)}>
          <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
            {item.checked && <Ionicons name="checkmark" size={13} color={Colors.onPrimary} />}
          </View>
        </TouchableOpacity>

        <View style={styles.itemContent}>
          <Text style={[styles.itemName, item.checked && styles.itemNameChecked]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
        </View>

        {item.price > 0 && (
          <Text style={[styles.itemPrice, item.checked && styles.itemPriceFaded]}>
            {formatCurrency(item.price * item.quantity)}
          </Text>
        )}

        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={16} color={Colors.outlineVariant} />
        </TouchableOpacity>
      </View>
      {!isLast && <View style={styles.itemSep} />}
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('shopping_title')}</Text>
        <View style={styles.headerActions}>
          {checked.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClearChecked}>
              <Ionicons name="checkmark-done-outline" size={16} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.addBtn} onPress={openModal}>
            <Ionicons name="add" size={20} color={Colors.onPrimary} />
            <Text style={styles.addBtnText}>{t('common_add')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="cart-outline" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>{t('shopping_empty_title')}</Text>
          <Text style={styles.emptyDesc}>{t('shopping_empty_desc')}</Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={openModal}>
            <Ionicons name="add" size={18} color={Colors.onPrimary} />
            <Text style={styles.emptyAddBtnText}>{t('shopping_add_item')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <>
              {/* Summary card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryValue}>{items.length}</Text>
                  <Text style={styles.summaryLabel}>{t('shopping_articles')}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryStat}>
                  <Text style={[styles.summaryValue, { color: Colors.primary }]}>{checked.length}/{items.length}</Text>
                  <Text style={styles.summaryLabel}>{t('shopping_checked')}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryStat}>
                  <Text style={[styles.summaryValue, { color: Colors.primary }]}>{formatCurrency(totalCost)}</Text>
                  <Text style={styles.summaryLabel}>{t('shopping_total')}</Text>
                </View>
              </View>

              {/* Progress */}
              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
                <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
              </View>

              {/* To buy */}
              {unchecked.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('shopping_to_buy')} ({unchecked.length})</Text>
                  <View style={styles.itemsCard}>
                    {unchecked.map((item, idx) => renderItem(item, idx === unchecked.length - 1))}
                  </View>
                </View>
              )}

              {/* In cart */}
              {checked.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>{t('shopping_in_cart')} ({checked.length})</Text>
                    <TouchableOpacity onPress={handleClearChecked}>
                      <Text style={styles.clearText}>{t('shopping_clear_checked')}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.itemsCard, styles.itemsCardChecked]}>
                    {checked.map((item, idx) => renderItem(item, idx === checked.length - 1))}
                  </View>
                  {checkedCost > 0 && (
                    <View style={styles.subtotalRow}>
                      <Text style={styles.subtotalLabel}>{t('shopping_subtotal')}</Text>
                      <Text style={styles.subtotalAmount}>{formatCurrency(checkedCost)}</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={{ height: 100 }} />
            </>
          }
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        />
      )}

      {/* FAB */}
      {items.length > 0 && (
        <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 90 }]} onPress={openModal}>
          <Ionicons name="add" size={26} color={Colors.onPrimary} />
        </TouchableOpacity>
      )}

      {/* Add item modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('shopping_new_item')}</Text>

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('shopping_item_name')} *</Text>
              <TextInput
                style={styles.textInput}
                value={formName}
                onChangeText={setFormName}
                placeholder="Ex: Tomates cerises"
                placeholderTextColor={Colors.outline}
                autoFocus
              />
            </View>

            {/* Qty + Unit */}
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>{t('shopping_quantity')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={formQty}
                  onChangeText={setFormQty}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={Colors.outline}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>{t('shopping_unit')}</Text>
                <ScrollableUnits value={formUnit} onSelect={setFormUnit} />
              </View>
            </View>

            {/* Price */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('shopping_price_unit')} ({t('common_optional')})</Text>
              <TextInput
                style={styles.textInput}
                value={formPrice}
                onChangeText={setFormPrice}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={Colors.outline}
              />
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>{t('common_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, !formName.trim() && styles.modalSaveBtnDisabled]}
                onPress={handleAdd}
                disabled={saving || !formName.trim()}
              >
                <Ionicons name="add" size={18} color={Colors.onPrimary} />
                <Text style={styles.modalSaveText}>{t('shopping_add_item')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const ScrollableUnits: React.FC<{ value: string; onSelect: (u: string) => void }> = ({ value, onSelect }) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {UNITS.map((u) => (
          <TouchableOpacity
            key={u}
            style={[unitStyles.chip, value === u && unitStyles.chipActive]}
            onPress={() => onSelect(u)}
          >
            <Text style={[unitStyles.chipText, value === u && unitStyles.chipTextActive]}>{u}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const unitStyles = StyleSheet.create({
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceContainerHigh },
  chipActive: { backgroundColor: Colors.primary },
  chipText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant },
  chipTextActive: { color: Colors.onPrimary },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  title: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm, color: Colors.onSurface },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  clearBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.full,
  },
  addBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.onPrimary },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: `${Colors.primary}12`, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs,
  },
  emptyTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd, color: Colors.onSurface },
  emptyDesc: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm,
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: 13, borderRadius: BorderRadius.full,
  },
  emptyAddBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onPrimary },

  summaryCard: {
    flexDirection: 'row', backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    padding: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryValue: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineSm, color: Colors.onSurface },
  summaryLabel: { fontFamily: FontFamily.body, fontSize: 10, color: Colors.onSurfaceVariant, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: Colors.surfaceContainerHigh },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  progressTrack: { flex: 1, height: 5, backgroundColor: Colors.surfaceContainerHigh, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  progressPct: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant, width: 34, textAlign: 'right' },

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  sectionTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.titleLg, color: Colors.onSurface, marginBottom: Spacing.xs },
  clearText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.error },

  itemsCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  itemsCardChecked: { opacity: 0.85 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: Spacing.md },
  itemRowChecked: { opacity: 0.55 },
  checkboxArea: { marginRight: Spacing.sm },
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  itemContent: { flex: 1 },
  itemName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface },
  itemNameChecked: { textDecorationLine: 'line-through', color: Colors.onSurfaceVariant },
  itemQty: { fontFamily: FontFamily.body, fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant, marginTop: 1 },
  itemPrice: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.primary, marginRight: 6 },
  itemPriceFaded: { color: Colors.onSurfaceVariant },
  deleteBtn: { padding: 4 },
  itemSep: { height: 1, backgroundColor: Colors.surfaceContainerHigh, marginLeft: Spacing.md + 22 + Spacing.sm },

  subtotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: `${Colors.primary}08`, borderRadius: BorderRadius.xl,
  },
  subtotalLabel: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  subtotalAmount: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleMd, color: Colors.primary },

  fab: {
    position: 'absolute', right: Spacing.lg,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm,
  },
  modalHandle: {
    width: 36, height: 4, backgroundColor: Colors.outlineVariant,
    borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg,
  },
  modalTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd, color: Colors.onSurface, marginBottom: Spacing.lg },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant, marginBottom: 6 },
  textInput: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurface,
  },
  inputRow: { flexDirection: 'row', gap: Spacing.sm },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  modalCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center',
  },
  modalCancelText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  modalSaveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13, borderRadius: BorderRadius.full, backgroundColor: Colors.primary,
  },
  modalSaveBtnDisabled: { opacity: 0.45 },
  modalSaveText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onPrimary },
});
