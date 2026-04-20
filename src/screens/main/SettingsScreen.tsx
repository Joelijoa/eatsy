import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { usePreferences, Language, Currency } from '../../context/PreferencesContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';

type Props = { navigation: any };

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, language, currency, setLanguage, setCurrency } = usePreferences();

  const handleLogout = () => {
    Alert.alert(t('settings_logout'), t('settings_logout_confirm'), [
      { text: t('common_cancel'), style: 'cancel' },
      { text: t('settings_logout'), style: 'destructive', onPress: () => signOut(auth) },
    ]);
  };

  const LANG_OPTIONS: Array<{ value: Language; label: string; flag: string }> = [
    { value: 'fr', label: t('settings_french'), flag: '🇫🇷' },
    { value: 'en', label: t('settings_english'), flag: '🇬🇧' },
  ];

  const CURRENCY_OPTIONS: Array<{ value: Currency; label: string }> = [
    { value: 'EUR', label: t('settings_eur') },
    { value: 'MAD', label: t('settings_mad') },
  ];

  return (
    <View style={styles.screen}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('settings_title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>

        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{user?.displayName?.[0]?.toUpperCase() ?? 'E'}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.displayName ?? 'Chef'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Language */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionCardIcon}>
              <Ionicons name="language-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.sectionCardTitle}>{t('settings_language')}</Text>
          </View>
          <View style={styles.optionsRow}>
            {LANG_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionBtn, language === opt.value && styles.optionBtnActive]}
                onPress={() => setLanguage(opt.value)}
              >
                <Text style={styles.optionFlag}>{opt.flag}</Text>
                <Text style={[styles.optionLabel, language === opt.value && styles.optionLabelActive]}>
                  {opt.label}
                </Text>
                {language === opt.value && (
                  <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Currency */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionCardIcon}>
              <Ionicons name="wallet-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.sectionCardTitle}>{t('settings_currency')}</Text>
          </View>
          {CURRENCY_OPTIONS.map((opt, idx) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.currencyRow, idx < CURRENCY_OPTIONS.length - 1 && styles.currencyRowBorder]}
              onPress={() => setCurrency(opt.value)}
            >
              <View style={styles.currencyLeft}>
                <View style={[styles.currencySymbolWrap, currency === opt.value && styles.currencySymbolWrapActive]}>
                  <Text style={[styles.currencySymbol, currency === opt.value && styles.currencySymbolActive]}>
                    {opt.value === 'EUR' ? '€' : 'د.م'}
                  </Text>
                </View>
                <Text style={styles.currencyLabel}>{opt.label}</Text>
              </View>
              <View style={[styles.radioOuter, currency === opt.value && styles.radioOuterActive]}>
                {currency === opt.value && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Account */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionCardIcon}>
              <Ionicons name="person-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.sectionCardTitle}>{t('settings_account')}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={Colors.error} />
            <Text style={styles.logoutText}>{t('settings_logout')}</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={styles.version}>Eatsy v1.0.0</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center',
  },
  topBarTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg, color: Colors.onSurface },

  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xxl, padding: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  userAvatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd, color: Colors.onPrimary },
  userInfo: { flex: 1 },
  userName: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg, color: Colors.onSurface },
  userEmail: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant, marginTop: 2 },

  sectionCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xxl, padding: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  sectionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.md },
  sectionCardIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: `${Colors.primary}12`, alignItems: 'center', justifyContent: 'center',
  },
  sectionCardTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleMd, color: Colors.onSurface },

  optionsRow: { flexDirection: 'row', gap: Spacing.sm },
  optionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surfaceContainerLow, borderWidth: 1.5, borderColor: 'transparent',
  },
  optionBtnActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}08` },
  optionFlag: { fontSize: 18 },
  optionLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  optionLabelActive: { color: Colors.primary },

  currencyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14,
  },
  currencyRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerHigh },
  currencyLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  currencySymbolWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center',
  },
  currencySymbolWrapActive: { backgroundColor: `${Colors.primary}15` },
  currencySymbol: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  currencySymbolActive: { color: Colors.primary },
  currencyLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: Colors.outlineVariant, alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: Colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  logoutText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.error },

  version: {
    fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant,
    textAlign: 'center', marginTop: Spacing.sm,
  },
});
