import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity,
  Modal, TextInput, RefreshControl, Animated, Share,
} from 'react-native';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { usePreferences, useColors } from '../../context/PreferencesContext';
import { useAlert } from '../../context/AlertContext';
import {
  getShoppingItems, addShoppingItem, toggleShoppingItem,
  deleteShoppingItem, clearCheckedItems, generateShoppingItemsFromPlan,
} from '../../services/shoppingListService';
import { addOrMergePantryItem } from '../../services/pantryService';
import { getOrCreateWeekPlan, getWeekStart } from '../../services/plannerService';
import { ShoppingItem, WeekPlan } from '../../types';
import { HeaderActions } from '../../components/HeaderActions';

const UNITS = ['pcs', 'kg', 'g', 'L', 'cl', 'ml', 'sachet', 'boîte', 'bouteille'];

const getCategoryStyle = (name: string): { icon: keyof typeof Ionicons.glyphMap; color: string } => {
  const n = name.toLowerCase();
  if (/tomat|carott|salade|légum|oignon|ail|poivron|courgett|champignon|épinar|brocoli|pomme|poire|banane|raisin|orange|citron|fraise|framboise|kiwi|mangue|ananas|fruit|laitue|roquette|concomb|haricot|asperge|petits pois/.test(n))
    return { icon: 'leaf-outline', color: '#4CAF50' };
  if (/poulet|boeuf|porc|agneau|veau|viande|steak|escalope|sauciss|jambon|lard|bacon|canard|dinde|charcuterie|côtelette|rôti/.test(n))
    return { icon: 'restaurant-outline', color: '#FF6B35' };
  if (/saumon|thon|cabillaud|truite|crevette|moule|poisson|fruit de mer|sardine|dorade/.test(n))
    return { icon: 'water-outline', color: '#2196F3' };
  if (/lait|fromage|yaourt|beurre|crème|œuf|oeuf|gruyère|emmental|camembert|mozzarella|brie|gouda/.test(n))
    return { icon: 'egg-outline', color: '#FFC107' };
  if (/pain|baguette|croissant|brioche|gâteau|biscuit|viennoiser|fougasse|muffin/.test(n))
    return { icon: 'cafe-outline', color: '#795548' };
  if (/pâtes|riz|farine|semoule|quinoa|lentille|pois chiche|céréale|blé|boulgour/.test(n))
    return { icon: 'grid-outline', color: '#FF9800' };
  if (/eau|jus|soda|bière|vin|café|thé|boisson|sirop|limonade/.test(n))
    return { icon: 'wine-outline', color: '#9C27B0' };
  if (/huile|vinaigre|sauce|ketchup|mayo|moutarde|sel|poivre|épice|herbe|curry|cumin|paprika/.test(n))
    return { icon: 'flask-outline', color: '#607D8B' };
  if (/savon|shampoo|gel|dentifrice|hygiène|lessive|nettoyant|éponge|désinfect/.test(n))
    return { icon: 'sparkles-outline', color: '#00BCD4' };
  return { icon: 'bag-outline', color: '#9E9E9E' };
};

export const ShoppingListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { t, formatCurrency } = usePreferences();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const Colors = useColors();

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [generateModal, setGenerateModal] = useState(false);
  const [generateMerge, setGenerateMerge] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);

  const [formName, setFormName] = useState('');
  const [formQty, setFormQty] = useState('1');
  const [formUnit, setFormUnit] = useState('pcs');
  const [formPrice, setFormPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const progressAnim  = useRef(new Animated.Value(0)).current;
  const flatListRef   = useRef<React.ElementRef<typeof FlatList>>(null);

  useFocusEffect(useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []));

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

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);
  const totalCost = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
  const checkedCost = checked.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
  const progress = items.length > 0 ? checked.length / items.length : 0;
  const progressPct = Math.round(progress * 100);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

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
    if (updated && user) {
      showAlert({ title: t('shopping_add_to_stock_title'), message: `"${item.name}" (${item.quantity} ${item.unit})`, buttons: [
        { text: t('common_no'), style: 'cancel' },
        { text: t('shopping_add_to_stock_yes'), onPress: () => addOrMergePantryItem(user.uid, item.name, item.quantity, item.unit) },
      ]});
    }
  };

  const handleDelete = (item: ShoppingItem) => {
    showAlert({ title: t('common_delete'), message: `"${item.name}" ?`, buttons: [
      { text: t('common_cancel'), style: 'cancel' },
      {
        text: t('common_delete'), style: 'destructive', onPress: async () => {
          setItems((prev) => prev.filter((i) => i.id !== item.id));
          await deleteShoppingItem(item.id);
        },
      },
    ]});
  };

  const handleClearChecked = () => {
    if (!user) return;
    showAlert({ title: t('shopping_clear_checked'), message: `${checked.length} article(s) ?`, buttons: [
      { text: t('common_cancel'), style: 'cancel' },
      {
        text: t('common_delete'), style: 'destructive', onPress: async () => {
          setItems((prev) => prev.filter((i) => !i.checked));
          await clearCheckedItems(user.uid);
        },
      },
    ]});
  };

  const openGenerateModal = () => { setGenerateMerge(true); setGenerateModal(true); };

  const handleGenerate = async () => {
    if (!user || !weekPlan) return;
    setGenerating(true);
    try {
      const result = await generateShoppingItemsFromPlan(user.uid, weekPlan, generateMerge);
      setGenerateModal(false);
      await loadItems();
      if (result.noMeals) {
        showAlert({ title: t('shopping_generate_no_plan') });
      } else {
        showAlert({
          title: t('shopping_generate_title'),
          message: `${result.added} ${t('shopping_generate_done')}${result.inStock > 0 ? ` · ${result.inStock} ${t('shopping_generate_in_stock')}` : ''}`,
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    const lines: string[] = [t('shopping_title'), ''];
    if (unchecked.length > 0) {
      lines.push(`${t('shopping_to_buy')} (${unchecked.length} ${t('shopping_items')}):`);
      unchecked.forEach((i) => {
        const price = i.price > 0 ? ` — ${formatCurrency(i.price * i.quantity)}` : '';
        lines.push(`- ${i.name} — ${i.quantity} ${i.unit}${price}`);
      });
    }
    if (checked.length > 0) {
      if (unchecked.length > 0) lines.push('');
      lines.push(`${t('shopping_in_cart')} (${checked.length} ${t('shopping_items')}):`);
      checked.forEach((i) => lines.push(`- ${i.name} — ${i.quantity} ${i.unit}`));
    }
    if (totalCost > 0) {
      lines.push('');
      lines.push(`${t('shopping_total')}: ${formatCurrency(totalCost)}`);
    }
    lines.push(`${checked.length}/${items.length} ${t('shopping_items')} — ${progressPct}% ${t('shopping_done')}`);
    try {
      await Share.share({ message: lines.join('\n'), title: t('shopping_title') });
    } catch (_) {}
  };

  const styles = createStyles(Colors);
  const { opacity, translateY } = useScreenEntrance();
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const renderItem = (item: ShoppingItem, isLast: boolean) => {
    const { icon, color } = getCategoryStyle(item.name);
    const activeColor = item.checked ? Colors.outlineVariant : color;
    return (
      <View key={item.id}>
        <View style={[styles.itemRow, item.checked && styles.itemRowChecked]}>
          <View style={[styles.itemStripe, { backgroundColor: activeColor }]} />
          <View style={[styles.itemIconWrap, { backgroundColor: `${activeColor}18` }]}>
            <Ionicons name={icon} size={13} color={activeColor} />
          </View>
          <TouchableOpacity style={styles.checkboxArea} onPress={() => handleToggle(item)}>
            <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
              {item.checked && <Ionicons name="checkmark" size={12} color={Colors.onPrimary} />}
            </View>
          </TouchableOpacity>
          <View style={styles.itemContent}>
            <Text style={[styles.itemName, item.checked && styles.itemNameChecked]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
          </View>
          {item.price > 0 && (
            <View style={[styles.pricePill, item.checked && styles.pricePillFaded]}>
              <Text style={[styles.itemPrice, item.checked && styles.itemPriceFaded]}>
                {formatCurrency(item.price * item.quantity)}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={15} color={Colors.outlineVariant} />
          </TouchableOpacity>
        </View>
        {!isLast && <View style={styles.itemSep} />}
      </View>
    );
  };

  return (
    <Animated.View style={[styles.screen, { opacity, transform: [{ translateY }] }]}>

      {/* ── Header ── */}
      <View style={[styles.headerBand, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerDecor1} />
        <View style={styles.headerDecor2} />
        <View style={styles.headerMain}>
          <View>
            <Text style={styles.title}>{t('shopping_title')}</Text>
            <Text style={styles.headerSub}>
              {items.length > 0
                ? `${checked.length} / ${items.length} ${t('shopping_items')}`
                : t('shopping_empty_title')}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerBtn} onPress={openGenerateModal}>
              <Ionicons name="sparkles-outline" size={17} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
            {checked.length > 0 && (
              <TouchableOpacity style={styles.headerBtn} onPress={handleClearChecked}>
                <Ionicons name="checkmark-done-outline" size={16} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
            )}
            <HeaderActions navigation={navigation} />
          </View>
        </View>

        {items.length > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabelText}>{t('shopping_progress')}</Text>
              <Text style={styles.progressPctText}>{progressPct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
          </View>
        )}
      </View>

      {/* ── Floating summary strip ── */}
      {items.length > 0 && (
        <View style={styles.summaryStrip}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>{unchecked.length}</Text>
            <Text style={styles.summaryLabel}>{t('shopping_remaining_label')}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: Colors.secondary }]}>{checked.length}</Text>
            <Text style={styles.summaryLabel}>{t('shopping_in_cart_strip')}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: Colors.tertiary }]}>
              {totalCost > 0 ? formatCurrency(totalCost) : '—'}
            </Text>
            <Text style={styles.summaryLabel}>{t('shopping_total_strip')}</Text>
          </View>
        </View>
      )}

      {/* ── Content ── */}
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
          ref={flatListRef}
          data={[]}
          renderItem={null}
          style={{ flex: 1 }}
          ListHeaderComponent={
            <>
              <View style={{ height: Spacing.md }} />

              {/* To buy */}
              {unchecked.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionIconWrap}>
                      <Ionicons name="cart-outline" size={13} color={Colors.primary} />
                    </View>
                    <Text style={styles.sectionTitle}>{t('shopping_to_buy')}</Text>
                    <View style={styles.sectionBadge}>
                      <Text style={styles.sectionBadgeText}>{unchecked.length}</Text>
                    </View>
                  </View>
                  <View style={styles.itemsCard}>
                    {unchecked.map((item, idx) => renderItem(item, idx === unchecked.length - 1))}
                  </View>
                </View>
              )}

              {/* In cart */}
              {checked.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIconWrap, { backgroundColor: `${Colors.secondary}15` }]}>
                      <Ionicons name="checkmark-done-outline" size={13} color={Colors.secondary} />
                    </View>
                    <Text style={styles.sectionTitle}>{t('shopping_in_cart')}</Text>
                    <View style={[styles.sectionBadge, { backgroundColor: `${Colors.secondary}15` }]}>
                      <Text style={[styles.sectionBadgeText, { color: Colors.secondary }]}>{checked.length}</Text>
                    </View>
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

              <View style={{ height: 120 }} />
            </>
          }
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        />
      )}

      {/* ── FABs ── */}
      <View style={[styles.fabRow, { bottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={[styles.fab, styles.fabSecondary]} onPress={() => navigation.navigate('FoodScanner')}>
          <Ionicons name="barcode-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
        {items.length > 0 && (
          <TouchableOpacity style={[styles.fab, styles.fabSecondary]} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.fab} onPress={openModal}>
          <Ionicons name="add" size={26} color={Colors.onPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── Generate modal ── */}
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

      {/* ── Add item modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('shopping_new_item')}</Text>
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

const ScrollableUnits: React.FC<{ value: string; onSelect: (u: string) => void }> = ({ value, onSelect }) => (
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

const unitStyles = StyleSheet.create({
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceContainerHigh },
  chipActive: { backgroundColor: Colors.primary },
  chipText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant },
  chipTextActive: { color: Colors.onPrimary },
});

const createStyles = (C: typeof Colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.surface },

  // ── Header ──
  headerBand: {
    backgroundColor: C.primary,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg + 16,
    overflow: 'hidden',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerDecor1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -40,
  },
  headerDecor2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -30, left: 20,
  },
  headerMain: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  title: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm, color: '#fff' },
  headerSub: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  progressSection: { marginTop: Spacing.xs },
  progressLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
  },
  progressLabelText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelMd, color: 'rgba(255,255,255,0.7)' },
  progressPctText: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleMd, color: '#fff' },
  progressTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 4 },

  // ── Floating summary strip ──
  summaryStrip: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: -28,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: BorderRadius.xxl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    zIndex: 1,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg },
  summaryLabel: { fontFamily: FontFamily.body, fontSize: 10, color: C.onSurfaceVariant, textAlign: 'center' },
  summaryDivider: { width: 1, height: 28, backgroundColor: C.surfaceContainerHigh, alignSelf: 'center' },

  // ── Empty state ──
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
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: `${C.primary}14`, paddingHorizontal: Spacing.xl, paddingVertical: 13, borderRadius: BorderRadius.full,
  },
  emptyAddBtnSecondaryText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.primary },

  // ── Sections ──
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  sectionIconWrap: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: `${C.primary}15`, alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.titleLg, color: C.onSurface, flex: 1 },
  sectionBadge: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: BorderRadius.full, backgroundColor: `${C.primary}15`,
  },
  sectionBadgeText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelSm, color: C.primary },
  clearText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.error },

  // ── Items card ──
  itemsCard: {
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xl, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  itemsCardChecked: { opacity: 0.82 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingRight: Spacing.md },
  itemRowChecked: { opacity: 0.55 },
  itemStripe: { width: 3, alignSelf: 'stretch', borderRadius: 2, marginRight: Spacing.sm },
  itemIconWrap: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.xs,
  },
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
  pricePill: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.full, backgroundColor: `${C.primary}12`, marginRight: 6,
  },
  pricePillFaded: { backgroundColor: `${C.outlineVariant}20` },
  itemPrice: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.primary },
  itemPriceFaded: { color: C.onSurfaceVariant },
  deleteBtn: { padding: 4 },
  itemSep: {
    height: 1, backgroundColor: C.surfaceContainerHigh,
    marginLeft: 3 + Spacing.sm + 28 + Spacing.xs + 22 + Spacing.sm,
  },

  subtotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: `${C.primary}08`, borderRadius: BorderRadius.xl,
  },
  subtotalLabel: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant },
  subtotalAmount: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleMd, color: C.primary },

  // ── FABs ──
  fabRow: {
    position: 'absolute', right: Spacing.lg,
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'center',
  },
  fab: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  fabSecondary: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: C.surfaceContainerLowest,
    shadowColor: '#000', shadowOpacity: 0.1,
  },

  // ── Modals ──
  generateIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: `${C.primary}15`, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: Spacing.md,
  },
  generateDesc: {
    fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant,
    textAlign: 'center', lineHeight: 22, marginBottom: Spacing.lg,
  },
  generateToggle: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  toggleOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: BorderRadius.xl, backgroundColor: C.surfaceContainerHigh,
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
