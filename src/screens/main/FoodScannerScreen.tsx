import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
  TextInput, ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useColors, usePreferences } from '../../context/PreferencesContext';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { addShoppingItem } from '../../services/shoppingListService';
import { addOrMergePantryItem } from '../../services/pantryService';

type Props = { navigation: any };

interface ProductInfo {
  name: string;
  brand?: string;
  energy?: string;
  proteins?: string;
  carbs?: string;
  fat?: string;
  nutriscore?: string;
  barcode: string;
}

const UNITS = ['pcs', 'g', 'kg', 'ml', 'L', 'cl', 'sachet', 'boîte'];

const NUTRISCORE_COLORS: Record<string, string> = {
  A: '#038141', B: '#85BB2F', C: '#FECB02', D: '#EE8100', E: '#E63E11',
};

export const FoodScannerScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const { t } = usePreferences();
  const styles = createStyles(Colors);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [saving, setSaving] = useState<'cart' | 'stock' | null>(null);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  const handleBarcode = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${data}.json`);
      const json = await res.json();
      if (json.status === 1) {
        const p = json.product;
        setProduct({
          barcode: data,
          name: p.product_name ?? t('scanner_unknown'),
          brand: p.brands,
          energy: p.nutriments?.['energy-kcal_100g'] ? `${p.nutriments['energy-kcal_100g']} kcal` : undefined,
          proteins: p.nutriments?.proteins_100g ? `${p.nutriments.proteins_100g}g` : undefined,
          carbs: p.nutriments?.carbohydrates_100g ? `${p.nutriments.carbohydrates_100g}g` : undefined,
          fat: p.nutriments?.fat_100g ? `${p.nutriments.fat_100g}g` : undefined,
          nutriscore: p.nutriscore_grade?.toUpperCase(),
        });
        setQty('1');
        setUnit('pcs');
      } else {
        Alert.alert(t('scanner_product_not_found'), `${t('scanner_barcode_label')} : ${data}`, [
          { text: t('scanner_rescan'), onPress: () => setScanned(false) },
          { text: t('scanner_close'), onPress: () => navigation.goBack() },
        ]);
      }
    } catch {
      Alert.alert(t('scanner_network_error'), t('scanner_network_error_msg'));
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user || !product) return;
    setSaving('cart');
    await addShoppingItem(user.uid, { name: product.name, quantity: parseFloat(qty) || 1, unit, price: 0 });
    setSaving(null);
    Alert.alert(t('scanner_added_to_cart'), `"${product.name}" ${t('scanner_added_to_cart_msg')}`, [
      { text: t('scanner_scan_another'), onPress: () => { setScanned(false); setProduct(null); } },
      { text: t('scanner_close'), onPress: () => navigation.goBack() },
    ]);
  };

  const handleAddToStock = async () => {
    if (!user || !product) return;
    setSaving('stock');
    await addOrMergePantryItem(user.uid, product.name, parseFloat(qty) || 1, unit);
    setSaving(null);
    Alert.alert(t('scanner_added_to_stock'), `"${product.name}" ${t('scanner_added_to_stock_msg')}`, [
      { text: t('scanner_scan_another'), onPress: () => { setScanned(false); setProduct(null); } },
      { text: t('scanner_close'), onPress: () => navigation.goBack() },
    ]);
  };

  if (!permission) return <View style={styles.screen}><ActivityIndicator color={Colors.primary} /></View>;
  if (!permission.granted) return (
    <View style={[styles.screen, styles.center]}>
      <Ionicons name="camera-outline" size={48} color={Colors.primary} />
      <Text style={styles.permText}>{t('scanner_permission')}</Text>
      <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
        <Text style={styles.permBtnText}>{t('scanner_allow')}</Text>
      </TouchableOpacity>
    </View>
  );

  /* ── Camera view ── */
  if (!product) {
    return (
      <View style={styles.screen}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'qr', 'upc_a'] }}
          onBarcodeScanned={scanned ? undefined : handleBarcode}
        />
        <View style={styles.overlay}>
          {/* Top bar */}
          <View style={[styles.overlayTopBar, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.overlayTitle}>{t('scanner_camera_title')}</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Scan frame */}
          <View style={styles.scanFrameWrap}>
            <View style={styles.scanFrame}>
              {/* Corner brackets */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            {loading
              ? <ActivityIndicator size="large" color="#fff" style={styles.scanHint} />
              : <Text style={styles.scanHint}>EAN-8 · EAN-13 · QR</Text>}
          </View>
        </View>
      </View>
    );
  }

  /* ── Result view ── */
  const nutriRows = [
    { label: t('scanner_energy'),   value: product.energy,   icon: 'flash-outline'   as const, color: Colors.tertiary },
    { label: t('scanner_proteins'), value: product.proteins, icon: 'barbell-outline' as const, color: Colors.primary },
    { label: t('scanner_carbs'),    value: product.carbs,    icon: 'leaf-outline'    as const, color: Colors.secondary },
    { label: t('scanner_fat'),      value: product.fat,      icon: 'water-outline'   as const, color: '#60a5fa' },
  ].filter((r) => r.value);

  return (
    <View style={styles.screen}>

      {/* Green header */}
      <View style={[styles.headerBand, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerDecor} />
        <View style={styles.headerDecor2} />
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={2}>{product.name}</Text>
            {product.brand ? <Text style={styles.headerBrand}>{product.brand}</Text> : null}
          </View>
          {product.nutriscore ? (
            <View style={[styles.nutriscoreBadge, { backgroundColor: NUTRISCORE_COLORS[product.nutriscore] ?? Colors.outline }]}>
              <Text style={styles.nutriscoreText}>{product.nutriscore}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Nutrition card */}
        {nutriRows.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t('scanner_nutrition')}</Text>
            {nutriRows.map((row) => (
              <View key={row.label} style={styles.nutriRow}>
                <View style={[styles.nutriIcon, { backgroundColor: `${row.color}18` }]}>
                  <Ionicons name={row.icon} size={14} color={row.color} />
                </View>
                <Text style={styles.nutriLabel}>{row.label}</Text>
                <Text style={styles.nutriValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Qty + unit */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('scanner_quantity')}</Text>
          <View style={styles.qtyRow}>
            <TextInput
              style={styles.qtyField}
              value={qty}
              onChangeText={setQty}
              keyboardType="numeric"
              selectTextOnFocus
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitRow}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitChip, unit === u && styles.unitChipActive]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.unitChipText, unit === u && styles.unitChipTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Barcode ref */}
        <View style={styles.barcodeRow}>
          <Ionicons name="barcode-outline" size={14} color={Colors.outlineVariant} />
          <Text style={styles.barcodeText}>{product.barcode}</Text>
        </View>

        <TouchableOpacity style={styles.rescanRow} onPress={() => { setScanned(false); setProduct(null); }}>
          <Ionicons name="scan-outline" size={16} color={Colors.primary} />
          <Text style={styles.rescanText}>{t('scanner_rescan_product')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Fixed action buttons */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnOutline]}
          onPress={handleAddToCart}
          disabled={saving !== null}
        >
          {saving === 'cart'
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : <Ionicons name="cart-outline" size={20} color={Colors.primary} />}
          <Text style={[styles.actionBtnText, { color: Colors.primary }]}>{t('scanner_cart_btn')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnFill]}
          onPress={handleAddToStock}
          disabled={saving !== null}
        >
          {saving === 'stock'
            ? <ActivityIndicator size="small" color={Colors.onPrimary} />
            : <Ionicons name="cube-outline" size={20} color={Colors.onPrimary} />}
          <Text style={[styles.actionBtnText, { color: Colors.onPrimary }]}>{t('scanner_stock_btn')}</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
};

const createStyles = (C: typeof Colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.surface },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.md },

  /* Camera */
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayTopBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg,
  },
  overlayTitle: {
    fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg, color: '#fff',
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  scanFrameWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  scanFrame: {
    width: 270, height: 175,
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute', width: 24, height: 24,
    borderColor: C.inversePrimary, borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  scanHint: { marginTop: Spacing.lg, fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelMd, color: 'rgba(255,255,255,0.7)' },

  barcodeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginBottom: Spacing.sm,
  },
  barcodeText: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.outlineVariant },

  /* Header */
  headerBand: {
    backgroundColor: C.primary, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg + 16,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden',
  },
  headerDecor: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -30,
  },
  headerDecor2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -30, left: -20,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd, color: '#fff', lineHeight: 26 },
  headerBrand: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  nutriscoreBadge: {
    width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  nutriscoreText: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg, color: '#fff' },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.lg },

  /* Cards */
  card: {
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xxl,
    padding: Spacing.lg, marginBottom: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardLabel: {
    fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.onSurfaceVariant,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: Spacing.sm,
  },

  /* Nutrition */
  nutriRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  nutriIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  nutriLabel: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant, flex: 1 },
  nutriValue: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.bodyMd, color: C.onSurface },

  /* Qty */
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  qtyField: {
    width: 64, height: 44, backgroundColor: C.surfaceContainerHigh, borderRadius: BorderRadius.lg,
    fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg, color: C.onSurface,
    textAlign: 'center',
  },
  unitRow: { gap: Spacing.xs, alignItems: 'center' },
  unitChip: {
    height: 34, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.full,
    backgroundColor: C.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center',
  },
  unitChipActive: { backgroundColor: C.primary },
  unitChipText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelMd, color: C.onSurfaceVariant },
  unitChipTextActive: { color: C.onPrimary },

  rescanRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: Spacing.sm,
  },
  rescanText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.primary },

  /* Fixed actions */
  actions: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md,
    backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: C.surfaceContainerHigh,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: BorderRadius.xl,
  },
  actionBtnOutline: {
    backgroundColor: C.surfaceContainerLowest,
    borderWidth: 1.5, borderColor: C.primary,
  },
  actionBtnFill: { backgroundColor: C.primary },
  actionBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd },

  /* Permissions */
  permText: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant, textAlign: 'center' },
  permBtn: { backgroundColor: C.primary, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.xl, paddingVertical: 13 },
  permBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onPrimary },
});
