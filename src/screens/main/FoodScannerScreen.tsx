import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';

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

export const FoodScannerScreen: React.FC<Props> = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductInfo | null>(null);

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
          name: p.product_name ?? 'Produit inconnu',
          brand: p.brands,
          energy: p.nutriments?.['energy-kcal_100g'] ? `${p.nutriments['energy-kcal_100g']} kcal/100g` : undefined,
          proteins: p.nutriments?.proteins_100g ? `${p.nutriments.proteins_100g}g` : undefined,
          carbs: p.nutriments?.carbohydrates_100g ? `${p.nutriments.carbohydrates_100g}g` : undefined,
          fat: p.nutriments?.fat_100g ? `${p.nutriments.fat_100g}g` : undefined,
          nutriscore: p.nutriscore_grade?.toUpperCase(),
        });
      } else {
        Alert.alert('Produit non trouvé', `Code-barres : ${data}`, [
          { text: 'Rescanner', onPress: () => setScanned(false) },
          { text: 'Fermer', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de récupérer les informations produit.');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const NUTRISCORE_COLORS: Record<string, string> = {
    A: '#038141', B: '#85BB2F', C: '#FECB02', D: '#EE8100', E: '#E63E11',
  };

  if (!permission) return <View style={styles.screen}><ActivityIndicator color={Colors.primary} /></View>;
  if (!permission.granted) return (
    <View style={styles.screen}>
      <Text style={styles.permText}>Autorisation caméra requise</Text>
      <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
        <Text style={styles.permBtnText}>Autoriser</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.screen}>
      {!product ? (
        <View style={styles.cameraWrapper}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'qr', 'upc_a'] }}
            onBarcodeScanned={scanned ? undefined : handleBarcode}
          >
            <View style={styles.overlay}>
              <TouchableOpacity style={styles.closeOverlay} onPress={() => navigation.goBack()}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
              <View style={styles.scanFrame} />
              {loading ? (
                <ActivityIndicator size="large" color={Colors.inversePrimary} style={styles.scanLoader} />
              ) : (
                <Text style={styles.scanHint}>Pointez vers un code-barres</Text>
              )}
            </View>
          </CameraView>
        </View>
      ) : (
        <View style={styles.resultContainer}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>

          <Text style={styles.resultTitle}>{product.name}</Text>
          {product.brand && <Text style={styles.brand}>{product.brand}</Text>}

          {product.nutriscore && (
            <View style={[styles.nutriscore, { backgroundColor: NUTRISCORE_COLORS[product.nutriscore] ?? Colors.outline }]}>
              <Text style={styles.nutriscoreText}>Nutri-Score {product.nutriscore}</Text>
            </View>
          )}

          <View style={styles.nutriTable}>
            {[
              { label: 'Énergie', value: product.energy },
              { label: 'Protéines', value: product.proteins },
              { label: 'Glucides', value: product.carbs },
              { label: 'Lipides', value: product.fat },
            ].filter((r) => r.value).map((row) => (
              <View key={row.label} style={styles.nutriRow}>
                <Text style={styles.nutriLabel}>{row.label}</Text>
                <Text style={styles.nutriValue}>{row.value}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.barcode}>Code : {product.barcode}</Text>

          <TouchableOpacity style={styles.rescanBtn} onPress={() => { setScanned(false); setProduct(null); }}>
            <Text style={styles.rescanText}>📷 Scanner un autre produit</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  cameraWrapper: { flex: 1 },
  camera: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  closeOverlay: {
    position: 'absolute', top: 52, right: Spacing.lg,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 16 },
  scanFrame: {
    width: 260, height: 180, borderWidth: 2, borderColor: Colors.inversePrimary,
    borderRadius: BorderRadius.xl, backgroundColor: 'transparent',
    shadowColor: Colors.inversePrimary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 12,
  },
  scanLoader: { position: 'absolute', bottom: 80 },
  scanHint: { position: 'absolute', bottom: 80, fontFamily: FontFamily.bodyMedium, fontSize: FontSize.bodyMd, color: '#fff' },
  resultContainer: { flex: 1, padding: Spacing.lg },
  backBtn: { marginBottom: Spacing.lg },
  backText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.primary },
  resultTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineLg, color: Colors.onSurface, marginBottom: 4 },
  brand: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant, marginBottom: Spacing.md },
  nutriscore: {
    alignSelf: 'flex-start', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 6, marginBottom: Spacing.lg,
  },
  nutriscoreText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: '#fff' },
  nutriTable: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    overflow: 'hidden', marginBottom: Spacing.md,
  },
  nutriRow: {
    flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.md,
    borderBottomWidth: 0, backgroundColor: Colors.surfaceContainerLow, marginBottom: 2,
  },
  nutriLabel: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  nutriValue: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface },
  barcode: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.outline, marginBottom: Spacing.xl },
  rescanBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.full,
    padding: Spacing.md, alignItems: 'center',
  },
  rescanText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onPrimary },
  permText: { fontFamily: FontFamily.body, color: Colors.onSurface, textAlign: 'center', marginBottom: Spacing.md },
  permBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xl, paddingVertical: 12,
  },
  permBtnText: { fontFamily: FontFamily.bodyBold, color: Colors.onPrimary },
});
