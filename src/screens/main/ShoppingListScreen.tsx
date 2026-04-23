import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity,
  Modal, TextInput, RefreshControl, Alert, Animated,
} from 'react-native';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { usePreferences , useColors } from '../../context/PreferencesContext';
import {
  getShoppingItems, addShoppingItem, toggleShoppingItem,
  deleteShoppingItem, clearCheckedItems, generateShoppingItemsFromPlan,
} from '../../services/shoppingListService';
import { addOrMergePantryItem } from '../../services/pantryService';
import { getOrCreateWeekPlan, getWeekStart } from '../../services/plannerService';
import { ShoppingItem, WeekPlan } from '../../types';
import { HeaderActions } from '../../components/HeaderActions';

const UNITS = ['pcs', 'kg', 'g', 'L', 'cl', 'ml', 'sachet', 'boîte', 'bouteille'];

export const ShoppingListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { t, formatCurrency } = usePreferences();
  const insets = useSafeAreaInsets();
  const Colors = useColors();

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [generateModal, setGenerateModal] = useState(false);
  const [generateMerge, setGenerateMerge] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);

  // form state
  const [formName, setFormName] = useState('');
  const [formQty, setFormQty] = useState('1');
  const [formUnit, setFormUnit] = useState('pcs');
  const [formPrice, setFormPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    if (!user) return;
    const [data, wp] = await Promise.all([
      getShoppingItems(user.uid),
      getOrCreateWeekPlan(user.uid, getWeekStart()),
    ]);
    setItems(data);
    setWeekPlan(wp);
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

    // When checking an item, offer to add to pantry
    if (updated && user) {
      Alert.alert(
        'Ajouter au stock ?',
        `Ajouter "${item.name}" (${item.quantity} ${item.unit}) à votre garde-manger ?`,
        [
          { text: 'Non', style: 'cancel' },
          {
            text: 'Ajouter au stock', onPress: () =>
              addOrMergePantryItem(user.uid, item.name, item.quantity, item.unit),
          },
        ],
      );
    }
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

  const openGenerateModal = () => {
    setGenerateMerge(true);
    setGenerateModal(true);
  };

  const handleGenerate = async () => {
    if (!user || !weekPlan) return;
    setGenerating(true);
    try {
      const result = await generateShoppingItemsFromPlan(user.uid, weekPlan, generateMerge);
      setGenerateModal(false);
      await loadItems();
      if (result.noMeals) {
        Alert.alert('', t('shopping_generate_no_plan'));
      } else {
        Alert.alert(
          t('shopping_generate_title'),
          `${result.added} ${t('shopping_generate_done')}${result.inStock > 0 ? ` · ${result.inStock} ${t('shopping_generate_in_stock')}` : ''}`,
        );
      }
    } finally {
      setGenerating(false);
    }
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

  const styles = createStyles(Colors);
  const { opacity, translateY } = useScreenEntrance();

  return (
    <Animated.View style={[styles.screen, { opacity, transform: [{ translateY }] }]}>
      {/* Header */}
      <View style={[styles.headerBand, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerDecor} />
        <View style={styles.headerMain}>
          <View>
            <Text style={styles.title}>{t('shopping_title')}</Text>
            <Text style={styles.headerSub}>
              {checked.length}/{items.length} {t('shopping_checked').toLowerCase()}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.generateBtn} onPress={openGenerateModal}>
              <Ionicons name="sparkles-outline" size={17} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
            {checked.length > 0 && (
              <TouchableOpacity style={styles.clearBtn} onPress={handleClearChecked}>
                <Ionicons name="checkmark-done-outline" size={16} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
            )}
            <HeaderActions navigation={navigation} />
          </View>
        </View>
        {items.length > 0 && (
          <View style={styles.headerProgress}>
            <View style={[styles.headerProgressFill, { width: `${progress * 100}%` }]} />
          </View>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="cart-outline" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>{t('shopping_empty_title')}</Text>
          <Text style={styles.emptyDesc}>{t('shopping_empty_desc')}</Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={openGenerateModal}>
            <Ionicons name="sparkles-outline" size={18} color={Colors.onPrimary} />
            <Text style={styles.emptyAddBtnText}>{t('shopping_generate')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.emptyAddBtnSecondary} onPress={openModal}>
            <Ionicons name="add" size={18} color={Colors.primary} />
            <Text style={styles.emptyAddBtnSecondaryText}>{t('shopping_add_item')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <>
              {/* Summary cards */}
              <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { backgroundColor: `${Colors.primary}14` }]}>
                  <Ionicons name="list-outline" size={18} color={Colors.primary} />
                  <Text style={[styles.summaryValue, { color: Colors.primary }]}>{items.length}</Text>
                  <Text style={styles.summaryLabel}>{t('shopping_articles')}</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: `${Colors.secondary}18` }]}>
                  <Ionicons name="checkmark-done-outline" size={18} color={Colors.secondary} />
                  <Text style={[styles.summaryValue, { color: Colors.secondary }]}>{checked.length}/{items.length}</Text>
                  <Text style={styles.summaryLabel}>{t('shopping_checked')}</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: `${Colors.tertiary}14` }]}>
                  <Ionicons name="cash-outline" size={18} color={Colors.tertiary} />
                  <Text style={[styles.summaryValue, { color: Colors.tertiary }]}>{formatCurrency(totalCost)}</Text>
                  <Text style={styles.summaryLabel}>{t('shopping_total')}</Text>
                </View>
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

      {/* Generate modal */}
      <Modal visible={generateModal} animationType="slide" transparent onRequestClose={() => setGenerateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.generateIconWrap}>
              <Ionicons name="sparkles" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>{t('shopping_generate_title')}</Text>
            <Text style={styles.generateDesc}>{t('shopping_generate_desc')}</Text>

            <View style={styles.generateToggle}>
              <TouchableOpacity
                style={[styles.toggleOption, generateMerge && styles.toggleOptionActive]}
                onPress={() => setGenerateMerge(true)}
              >
                <Ionicons name="git-merge-outline" size={16} color={generateMerge ? Colors.onPrimary : Colors.onSurfaceVariant} />
                <Text style={[styles.toggleOptionText, generateMerge && styles.toggleOptionTextActive]}>
                  {t('shopping_generate_merge')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleOption, !generateMerge && styles.toggleOptionActive]}
                onPress={() => setGenerateMerge(false)}
              >
                <Ionicons name="refresh-outline" size={16} color={!generateMerge ? Colors.onPrimary : Colors.onSurfaceVariant} />
                <Text style={[styles.toggleOptionText, !generateMerge && styles.toggleOptionTextActive]}>
                  {t('shopping_generate_replace')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setGenerateModal(false)}>
                <Text style={styles.modalCancelText}>{t('common_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, generating && styles.modalSaveBtnDisabled]}
                onPress={handleGenerate}
                disabled={generating}
              >
                <Ionicons name="sparkles-outline" size={18} color={Colors.onPrimary} />
                <Text style={styles.modalSaveText}>
                  {generating ? t('common_loading') : t('shopping_generate_btn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    </Animated.View>
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

const createStyles = (C: typeof Colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.surface },
  headerBand: {
    backgroundColor: C.primary, paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg + 16, overflow: 'hidden',
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  headerDecor: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -50, right: -30,
  },
  headerMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  title: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm, color: '#fff' },
  headerSub: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  generateBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  clearBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center',
  },
  headerProgress: { height: 5, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' },
  headerProgressFill: { height: '100%', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 3 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: `${C.primary}12`, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs,
  },
  emptyTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd, color: C.onSurface },
  emptyDesc: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm,
    backgroundColor: C.primary, paddingHorizontal: Spacing.xl, paddingVertical: 13, borderRadius: BorderRadius.full,
  },
  emptyAddBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onPrimary },
  emptyAddBtnSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.xs,
    backgroundColor: `${C.primary}14`, paddingHorizontal: Spacing.xl, paddingVertical: 13, borderRadius: BorderRadius.full,
  },
  emptyAddBtnSecondaryText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.primary },

  summaryRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  summaryCard: {
    flex: 1, alignItems: 'center', gap: 3,
    borderRadius: BorderRadius.xl, padding: Spacing.md,
  },
  summaryValue: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg, color: C.onSurface },
  summaryLabel: { fontFamily: FontFamily.body, fontSize: 10, color: C.onSurfaceVariant, textAlign: 'center' },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  progressTrack: { flex: 1, height: 5, backgroundColor: C.surfaceContainerHigh, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.primary, borderRadius: 3 },
  progressPct: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelSm, color: C.onSurfaceVariant, width: 34, textAlign: 'right' },

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  sectionTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.titleLg, color: C.onSurface, marginBottom: Spacing.xs },
  clearText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.error },

  itemsCard: {
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xl, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  itemsCardChecked: { opacity: 0.85 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: Spacing.md },
  itemRowChecked: { opacity: 0.55 },
  checkboxArea: { marginRight: Spacing.sm },
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: C.outlineVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: C.primary, borderColor: C.primary },
  itemContent: { flex: 1 },
  itemName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  itemNameChecked: { textDecorationLine: 'line-through', color: C.onSurfaceVariant },
  itemQty: { fontFamily: FontFamily.body, fontSize: FontSize.labelSm, color: C.onSurfaceVariant, marginTop: 1 },
  itemPrice: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.primary, marginRight: 6 },
  itemPriceFaded: { color: C.onSurfaceVariant },
  deleteBtn: { padding: 4 },
  itemSep: { height: 1, backgroundColor: C.surfaceContainerHigh, marginLeft: Spacing.md + 22 + Spacing.sm },

  subtotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: `${C.primary}08`, borderRadius: BorderRadius.xl,
  },
  subtotalLabel: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant },
  subtotalAmount: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleMd, color: C.primary },

  fab: {
    position: 'absolute', right: Spacing.lg,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },

  generateIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: `${C.primary}15`, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: Spacing.md,
  },
  generateDesc: {
    fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant,
    textAlign: 'center', lineHeight: 22, marginBottom: Spacing.lg,
  },
  generateToggle: {
    flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg,
  },
  toggleOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: BorderRadius.xl,
    backgroundColor: C.surfaceContainerHigh,
  },
  toggleOptionActive: { backgroundColor: C.primary },
  toggleOptionText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.onSurfaceVariant },
  toggleOptionTextActive: { color: C.onPrimary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.surfaceContainerLowest,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm,
  },
  modalHandle: {
    width: 36, height: 4, backgroundColor: C.outlineVariant,
    borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg,
  },
  modalTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd, color: C.onSurface, marginBottom: Spacing.lg },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.onSurfaceVariant, marginBottom: 6 },
  textInput: {
    backgroundColor: C.surfaceContainerLow, borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurface,
  },
  inputRow: { flexDirection: 'row', gap: Spacing.sm },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  modalCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: BorderRadius.full,
    backgroundColor: C.surfaceContainerHigh, alignItems: 'center',
  },
  modalCancelText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant },
  modalSaveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13, borderRadius: BorderRadius.full, backgroundColor: C.primary,
  },
  modalSaveBtnDisabled: { opacity: 0.45 },
  modalSaveText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onPrimary },
});
