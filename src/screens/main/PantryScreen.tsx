import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ScrollView, Animated,
} from 'react-native';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { usePreferences, useColors } from '../../context/PreferencesContext';
import { HeaderActions } from '../../components/HeaderActions';
import {
  getPantryItems, addOrMergePantryItem,
  updatePantryQuantity, deletePantryItem, displayQty,
} from '../../services/pantryService';
import { PantryItem } from '../../types';

const UNITS = ['g', 'kg', 'ml', 'cl', 'L', 'pcs', 'sachet', 'boîte', 'bouteille', 'tranche'];

type FilterType = 'all' | 'available' | 'empty';

function getCategoryStyle(name: string): { icon: keyof typeof Ionicons.glyphMap; color: string } {
  const n = name.toLowerCase();
  if (/bœuf|boeuf|poulet|porc|agneau|viande|saumon|thon|crevette|poisson|lardons?/.test(n))
    return { icon: 'restaurant-outline', color: '#EF4444' };
  if (/lait|yaourt|fromage|crème|creme|beurre|œuf|oeuf/.test(n))
    return { icon: 'egg-outline', color: '#F59E0B' };
  if (/tomate|carotte|oignon|ail|courgette|salade|poivron|épinard|champignon|légume|brocoli/.test(n))
    return { icon: 'leaf-outline', color: '#22C55E' };
  if (/pomme|banane|orange|citron|fraise|mangue|kiwi|raisin|fruit/.test(n))
    return { icon: 'nutrition-outline', color: '#F97316' };
  if (/farine|riz|pâte|pasta|pain|céréale|semoule|avoine|quinoa|maïs/.test(n))
    return { icon: 'layers-outline', color: '#A78BFA' };
  if (/huile|vinaigre|sauce|ketchup|moutarde|mayonnaise|sirop/.test(n))
    return { icon: 'water-outline', color: '#0EA5E9' };
  if (/sucre|sel|poivre|épice|herbe|persil|basilic|cumin|cannelle|curcuma|paprika/.test(n))
    return { icon: 'sparkles-outline', color: '#EC4899' };
  if (/café|thé|jus|eau|soda|bière|vin|lait/.test(n))
    return { icon: 'cafe-outline', color: '#8B5CF6' };
  return { icon: 'cube-outline', color: '#6B7280' };
}

type Props = { navigation: any };

export const PantryScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { t } = usePreferences();
  const insets = useSafeAreaInsets();
  const Colors = useColors();

  const [items, setItems]           = useState<PantryItem[]>([]);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState<FilterType>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editItem, setEditItem]     = useState<PantryItem | null>(null);
  const [formName, setFormName]     = useState('');
  const [formQty, setFormQty]       = useState('');
  const [formUnit, setFormUnit]     = useState('g');
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setItems(await getPantryItems(user.uid));
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAdd = () => {
    setEditItem(null);
    setFormName(''); setFormQty(''); setFormUnit('g');
    setModalVisible(true);
  };

  const openEdit = (item: PantryItem) => {
    setEditItem(item);
    setFormName(item.name);
    setFormQty(String(item.quantity));
    setFormUnit(item.unit);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!user || !formName.trim() || !formQty) return;
    setSaving(true);
    try {
      const qty = parseFloat(formQty) || 0;
      if (editItem) {
        await updatePantryQuantity(editItem.id, qty);
        setItems((prev) => prev.map((i) => i.id === editItem.id ? { ...i, quantity: qty, unit: formUnit } : i));
      } else {
        await addOrMergePantryItem(user.uid, formName.trim(), qty, formUnit);
        await load();
      }
      setModalVisible(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: PantryItem) => {
    Alert.alert(t('common_delete'), `"${item.name}" ?`, [
      { text: t('common_cancel'), style: 'cancel' },
      {
        text: t('common_delete'), style: 'destructive', onPress: async () => {
          setItems((prev) => prev.filter((i) => i.id !== item.id));
          await deletePantryItem(item.id);
        },
      },
    ]);
  };

  const availableCount = items.filter((i) => i.quantity > 0).length;
  const emptyCount     = items.filter((i) => i.quantity <= 0).length;

  const filtered = items.filter((i) => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'available' ? i.quantity > 0 :
      filter === 'empty'     ? i.quantity <= 0 : true;
    return matchSearch && matchFilter;
  });

  const styles = createStyles(Colors);
  const { opacity, translateY } = useScreenEntrance();

  const renderItem = ({ item }: { item: PantryItem }) => {
    const { icon, color } = getCategoryStyle(item.name);
    const isEmpty = item.quantity <= 0;
    const cardColor = isEmpty ? Colors.tertiary : color;
    return (
      <View style={[styles.itemCard, isEmpty && styles.itemCardEmpty]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `${cardColor}10` }]} />
        <View style={[styles.itemIconWrap, { backgroundColor: `${cardColor}28` }]}>
          <Ionicons name={icon} size={20} color={cardColor} />
        </View>
        <View style={styles.itemContent}>
          <Text style={[styles.itemName, isEmpty && { color: Colors.onSurfaceVariant }]}>{item.name}</Text>
          <View style={[styles.qtyPill, { backgroundColor: `${cardColor}22` }]}>
            <Text style={[styles.qtyPillText, { color: cardColor }]}>
              {isEmpty ? 'Épuisé' : displayQty(item.quantity, item.unit)}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
          <Ionicons name="create-outline" size={18} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={16} color={Colors.outlineVariant} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Animated.View style={[styles.screen, { opacity, transform: [{ translateY }] }]}>

      {/* Header */}
      <View style={[styles.headerBand, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerDecor1} />
        <View style={styles.headerDecor2} />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Garde-manger</Text>
            <Text style={styles.headerSub}>{items.length} ingrédient{items.length !== 1 ? 's' : ''} au total</Text>
          </View>
          <HeaderActions navigation={navigation} />
        </View>
      </View>

      {/* Floating summary strip */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: Colors.primary }]}>{items.length}</Text>
          <Text style={styles.summaryLabel}>total</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: Colors.secondary }]}>{availableCount}</Text>
          <Text style={styles.summaryLabel}>disponibles</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: emptyCount > 0 ? Colors.tertiary : Colors.onSurfaceVariant }]}>
            {emptyCount}
          </Text>
          <Text style={styles.summaryLabel}>épuisés</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={Colors.outline} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un ingrédient…"
          placeholderTextColor={Colors.outline}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.outline} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {([
          { key: 'all',       label: 'Tout',        count: items.length },
          { key: 'available', label: 'Disponibles', count: availableCount },
          { key: 'empty',     label: 'Épuisés',     count: emptyCount },
        ] as { key: FilterType; label: string; count: number }[]).map(({ key, label, count }) => (
          <TouchableOpacity
            key={key}
            style={[styles.chip, filter === key && styles.chipActive]}
            onPress={() => setFilter(key)}
          >
            <Text style={[styles.chipText, filter === key && styles.chipTextActive]}>{label}</Text>
            <View style={[styles.chipBadge, filter === key && styles.chipBadgeActive]}>
              <Text style={[styles.chipBadgeText, filter === key && styles.chipBadgeTextActive]}>{count}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="basket-outline" size={44} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>
            {search ? 'Aucun résultat' : filter !== 'all' ? 'Aucun ingrédient ici' : 'Garde-manger vide'}
          </Text>
          <Text style={styles.emptyDesc}>
            {search
              ? `Aucun ingrédient correspondant à "${search}".`
              : filter !== 'all'
              ? 'Changez le filtre pour voir vos ingrédients.'
              : 'Ajoutez vos ingrédients disponibles pour suivre votre stock.'}
          </Text>
          {!search && filter === 'all' && (
            <TouchableOpacity style={styles.emptyAddBtn} onPress={openAdd}>
              <Ionicons name="add" size={18} color={Colors.onPrimary} />
              <Text style={styles.emptyAddBtnText}>Ajouter un ingrédient</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.xs }} />}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 16 }]} onPress={openAdd}>
        <Ionicons name="add" size={26} color={Colors.onPrimary} />
      </TouchableOpacity>

      {/* Add / Edit modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalIconWrap}>
              <Ionicons name="basket-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>
              {editItem ? `Modifier "${editItem.name}"` : 'Ajouter au stock'}
            </Text>

            {!editItem && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ingrédient *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="Ex: Bœuf, Farine, Lait…"
                  placeholderTextColor={Colors.outline}
                  autoFocus
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Quantité *</Text>
              <TextInput
                style={styles.textInput}
                value={formQty}
                onChangeText={setFormQty}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.outline}
                autoFocus={!!editItem}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Unité</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {UNITS.map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitChip, formUnit === u && styles.unitChipActive]}
                      onPress={() => setFormUnit(u)}
                    >
                      <Text style={[styles.unitChipText, formUnit === u && styles.unitChipTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {editItem && (
              <View style={styles.editHint}>
                <Ionicons name="information-circle-outline" size={14} color={Colors.onSurfaceVariant} />
                <Text style={styles.editHintText}>
                  Stock actuel : {displayQty(editItem.quantity, editItem.unit)}
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>{t('common_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, (!formQty || (!editItem && !formName.trim())) && styles.modalSaveBtnDisabled]}
                onPress={handleSave}
                disabled={saving || !formQty || (!editItem && !formName.trim())}
              >
                <Ionicons name={editItem ? 'checkmark' : 'add'} size={18} color={Colors.onPrimary} />
                <Text style={styles.modalSaveText}>{editItem ? 'Mettre à jour' : 'Ajouter'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const createStyles = (C: typeof Colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.surface },

  // ── Header ──
  headerBand: {
    backgroundColor: C.primary, paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg + 16, overflow: 'hidden',
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  headerDecor1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -50,
  },
  headerDecor2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.04)', bottom: -40, left: -20,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm, color: '#fff' },
  headerSub: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  // ── Summary strip ──
  summaryStrip: {
    flexDirection: 'row', marginHorizontal: Spacing.lg, marginTop: -28,
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xxl,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
    zIndex: 1,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg },
  summaryLabel: { fontFamily: FontFamily.body, fontSize: 10, color: C.onSurfaceVariant, textAlign: 'center' },
  summaryDivider: { width: 1, height: 28, backgroundColor: C.surfaceContainerHigh, alignSelf: 'center' },

  // ── Search ──
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: C.surfaceContainerLow, borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.lg, paddingHorizontal: Spacing.md,
    marginTop: Spacing.md, marginBottom: Spacing.xs,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurface },

  // ── Filters ──
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xs, gap: Spacing.xs },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.md, height: 34,
    backgroundColor: C.surfaceContainerHigh, borderRadius: BorderRadius.full,
  },
  chipActive: { backgroundColor: C.primary },
  chipText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelMd, color: C.onSurfaceVariant },
  chipTextActive: { color: C.onPrimary },
  chipBadge: {
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.full,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  chipBadgeActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  chipBadgeText: { fontFamily: FontFamily.bodyBold, fontSize: 10, color: C.onSurfaceVariant },
  chipBadgeTextActive: { color: C.onPrimary },

  // ── List ──
  list: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs, paddingBottom: 100 },

  // ── Item card ──
  itemCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: BorderRadius.xl, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  itemCardEmpty: { opacity: 0.65 },
  itemIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    margin: Spacing.sm,
  },
  itemContent: { flex: 1, paddingVertical: Spacing.sm, paddingLeft: Spacing.sm, gap: 3 },
  itemName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  qtyPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  qtyPillText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelSm },
  actionBtn: { padding: Spacing.sm },

  // ── Empty ──
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: `${C.primary}12`, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  emptyTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd, color: C.onSurface },
  emptyDesc: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm, backgroundColor: C.primary, paddingHorizontal: Spacing.xl, paddingVertical: 13, borderRadius: BorderRadius.full },
  emptyAddBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onPrimary },

  // ── FAB ──
  fab: {
    position: 'absolute', right: Spacing.lg,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },

  // ── Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.surfaceContainerLowest,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm,
  },
  modalHandle: { width: 36, height: 4, backgroundColor: C.outlineVariant, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  modalIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: `${C.primary}15`, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: Spacing.sm,
  },
  modalTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd, color: C.onSurface, textAlign: 'center', marginBottom: Spacing.lg },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.onSurfaceVariant, marginBottom: 6 },
  textInput: { backgroundColor: C.surfaceContainerLow, borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.md, paddingVertical: 12, fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurface },
  unitChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: BorderRadius.full, backgroundColor: C.surfaceContainerHigh },
  unitChipActive: { backgroundColor: C.primary },
  unitChipText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelSm, color: C.onSurfaceVariant },
  unitChipTextActive: { color: C.onPrimary },
  editHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.md, backgroundColor: `${C.primary}08`, borderRadius: BorderRadius.lg, padding: Spacing.sm },
  editHintText: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.onSurfaceVariant },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  modalCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: BorderRadius.full, backgroundColor: C.surfaceContainerHigh, alignItems: 'center' },
  modalCancelText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant },
  modalSaveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: BorderRadius.full, backgroundColor: C.primary },
  modalSaveBtnDisabled: { opacity: 0.4 },
  modalSaveText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onPrimary },
});
