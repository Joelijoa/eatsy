import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import {
  getPantryItems, addOrMergePantryItem,
  updatePantryQuantity, deletePantryItem, displayQty,
} from '../../services/pantryService';
import { PantryItem } from '../../types';

const UNITS = ['g', 'kg', 'ml', 'cl', 'L', 'pcs', 'sachet', 'boîte', 'bouteille', 'tranche'];

type Props = { navigation: any };

export const PantryScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { t } = usePreferences();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<PantryItem[]>([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<PantryItem | null>(null);

  // form
  const [formName, setFormName] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formUnit, setFormUnit] = useState('g');
  const [saving, setSaving] = useState(false);

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

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  const renderItem = ({ item, index }: { item: PantryItem; index: number }) => (
    <View style={[styles.itemRow, index < filtered.length - 1 && styles.itemRowBorder]}>
      <View style={styles.itemIconWrap}>
        <Ionicons name="cube-outline" size={18} color={Colors.primary} />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemQty}>{displayQty(item.quantity, item.unit)}</Text>
      </View>
      <TouchableOpacity style={styles.itemEditBtn} onPress={() => openEdit(item)}>
        <Ionicons name="create-outline" size={18} color={Colors.onSurfaceVariant} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.itemDeleteBtn} onPress={() => handleDelete(item)}>
        <Ionicons name="trash-outline" size={16} color={Colors.outlineVariant} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.headerBand, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerDecor} />
        <View style={styles.headerMain}>
          <View>
            <Text style={styles.headerTitle}>Garde-manger</Text>
            <Text style={styles.headerSub}>
              {items.filter((i) => i.quantity > 0).length} disponibles · {items.filter((i) => i.quantity <= 0).length} épuisés
            </Text>
          </View>
          <TouchableOpacity style={styles.addHeaderBtn} onPress={openAdd}>
            <Ionicons name="add" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      {items.length > 0 && (
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
      )}

      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="basket-outline" size={44} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>
            {search ? 'Aucun résultat' : 'Garde-manger vide'}
          </Text>
          <Text style={styles.emptyDesc}>
            {search
              ? `Aucun ingrédient correspondant à "${search}".`
              : 'Ajoutez vos ingrédients disponibles pour suivre votre stock.'}
          </Text>
          {!search && (
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
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: `${Colors.primary}14` }]}>
                <Ionicons name="cube-outline" size={18} color={Colors.primary} />
                <Text style={[styles.summaryValue, { color: Colors.primary }]}>{items.length}</Text>
                <Text style={styles.summaryLabel}>ingrédients</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: `${Colors.secondary}18` }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.secondary} />
                <Text style={[styles.summaryValue, { color: Colors.secondary }]}>
                  {items.filter((i) => i.quantity > 0).length}
                </Text>
                <Text style={styles.summaryLabel}>disponibles</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: `${Colors.tertiary}14` }]}>
                <Ionicons name="warning-outline" size={18} color={Colors.tertiary} />
                <Text style={[styles.summaryValue, { color: Colors.tertiary }]}>
                  {items.filter((i) => i.quantity <= 0).length}
                </Text>
                <Text style={styles.summaryLabel}>épuisés</Text>
              </View>
            </View>
          }
        />
      )}

      {/* FAB */}
      {filtered.length > 0 && (
        <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 24 }]} onPress={openAdd}>
          <Ionicons name="add" size={26} color={Colors.onPrimary} />
        </TouchableOpacity>
      )}

      {/* Add / Edit modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
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

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
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
              <View style={[styles.inputGroup, { flex: 1 }]}>
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
            </View>

            {/* Hint when editing */}
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
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  headerBand: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg + 16, overflow: 'hidden',
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  headerDecor: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -70, right: -30,
  },
  headerMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm, color: '#fff' },
  headerSub: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  addHeaderBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.lg, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurface },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },

  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  summaryCard: {
    flex: 1, alignItems: 'center', gap: 3,
    borderRadius: BorderRadius.xl, padding: Spacing.md,
  },
  summaryValue: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg, color: Colors.onSurface },
  summaryLabel: { fontFamily: FontFamily.body, fontSize: 10, color: Colors.onSurfaceVariant, textAlign: 'center' },

  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 13, backgroundColor: Colors.surfaceContainerLowest,
  },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerHigh },
  itemIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${Colors.primary}12`, alignItems: 'center', justifyContent: 'center' },
  itemContent: { flex: 1 },
  itemName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface },
  itemQty: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.primary, marginTop: 1 },
  itemEditBtn: { padding: 6 },
  itemDeleteBtn: { padding: 6 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: `${Colors.primary}12`, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  emptyTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd, color: Colors.onSurface },
  emptyDesc: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm, backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: 13, borderRadius: BorderRadius.full },
  emptyAddBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onPrimary },

  fab: { position: 'absolute', right: Spacing.lg, width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surfaceContainerLowest, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  modalHandle: { width: 36, height: 4, backgroundColor: Colors.outlineVariant, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd, color: Colors.onSurface, marginBottom: Spacing.lg },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant, marginBottom: 6 },
  textInput: { backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.md, paddingVertical: 12, fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurface },
  inputRow: { flexDirection: 'row', gap: Spacing.sm },
  unitChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceContainerHigh },
  unitChipActive: { backgroundColor: Colors.primary },
  unitChipText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant },
  unitChipTextActive: { color: Colors.onPrimary },
  editHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.md, backgroundColor: `${Colors.primary}08`, borderRadius: BorderRadius.lg, padding: Spacing.sm },
  editHintText: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  modalCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center' },
  modalCancelText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  modalSaveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: BorderRadius.full, backgroundColor: Colors.primary },
  modalSaveBtnDisabled: { opacity: 0.4 },
  modalSaveText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onPrimary },
});
