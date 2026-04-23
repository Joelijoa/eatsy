import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { usePreferences, Language, Currency , useColors } from '../../context/PreferencesContext';
import { signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import {
  loadNotificationSettings, saveNotificationSettings, scheduleMealNotifications,
  cancelMealNotifications, MealNotificationSettings,
} from '../../services/notificationService';

type Props = { navigation: any };

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const { user } = useAuth();
  const { t, language, currency, darkMode, setLanguage, setCurrency, setDarkMode } = usePreferences();
  const [helpExpanded, setHelpExpanded] = useState(false);
  const [notifSettings, setNotifSettings] = useState<MealNotificationSettings | null>(null);

  useEffect(() => {
    loadNotificationSettings().then(setNotifSettings);
  }, []);

  const toggleNotifications = async (enabled: boolean) => {
    if (!notifSettings) return;
    const updated = { ...notifSettings, enabled };
    setNotifSettings(updated);
    await saveNotificationSettings(updated);
    if (enabled) {
      const granted = await import('../../services/notificationService').then(
        (m) => m.requestNotificationPermission(),
      );
      if (!granted) {
        Alert.alert('', t('settings_notifications_permission'));
        const reverted = { ...updated, enabled: false };
        setNotifSettings(reverted);
        await saveNotificationSettings(reverted);
        return;
      }
      await scheduleMealNotifications(updated, {
        breakfast: t('settings_notifications_breakfast'),
        lunch: t('settings_notifications_lunch'),
        dinner: t('settings_notifications_dinner'),
      });
    } else {
      await cancelMealNotifications();
    }
  };

  const savePrefsToFirestore = async (patch: object) => {
    if (!user) return;
    try { await setDoc(doc(db, 'users', user.uid), { preferences: patch }, { merge: true }); } catch {}
  };

  const HELP_ITEMS = [
    { title: t('help_planner_title'), desc: t('help_planner_desc'), icon: 'calendar-outline' as const },
    { title: t('help_recipes_title'), desc: t('help_recipes_desc'), icon: 'book-outline' as const },
    { title: t('help_shopping_title'), desc: t('help_shopping_desc'), icon: 'cart-outline' as const },
    { title: t('help_budget_title'), desc: t('help_budget_desc'), icon: 'wallet-outline' as const },
    { title: t('help_pantry_title'), desc: t('help_pantry_desc'), icon: 'cube-outline' as const },
  ];

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

  const styles = createStyles(Colors);

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
                onPress={() => { setLanguage(opt.value); savePrefsToFirestore({ language: opt.value }); }}
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
              onPress={() => { setCurrency(opt.value); savePrefsToFirestore({ currency: opt.value }); }}
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

        {/* Appearance — Dark mode */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionCardIcon}>
              <Ionicons name="moon-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.sectionCardTitle}>{t('settings_appearance')}</Text>
          </View>
          <View style={styles.darkModeRow}>
            <View style={styles.darkModeLeft}>
              <Ionicons name={darkMode ? 'moon' : 'sunny-outline'} size={20} color={darkMode ? Colors.secondary : Colors.tertiary} />
              <View>
                <Text style={styles.darkModeLabel}>{t('settings_darkmode')}</Text>
                <Text style={styles.darkModeSub}>{t('settings_darkmode_sub')}</Text>
              </View>
            </View>
            <Switch
              value={darkMode}
              onValueChange={(v) => { setDarkMode(v); savePrefsToFirestore({ darkMode: v }); }}
              trackColor={{ false: Colors.surfaceContainerHigh, true: Colors.primary }}
              thumbColor={darkMode ? Colors.onPrimary : Colors.surface}
            />
          </View>
        </View>

        {/* Notifications */}
        {notifSettings !== null && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <View style={styles.sectionCardIcon}>
                <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.sectionCardTitle}>{t('settings_notifications')}</Text>
            </View>
            <View style={styles.darkModeRow}>
              <View style={styles.darkModeLeft}>
                <Ionicons name="alarm-outline" size={20} color={notifSettings.enabled ? Colors.primary : Colors.onSurfaceVariant} />
                <View>
                  <Text style={styles.darkModeLabel}>{t('settings_notifications')}</Text>
                  <Text style={styles.darkModeSub}>{t('settings_notifications_sub')}</Text>
                </View>
              </View>
              <Switch
                value={notifSettings.enabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: Colors.surfaceContainerHigh, true: Colors.primary }}
                thumbColor={notifSettings.enabled ? Colors.onPrimary : Colors.surface}
              />
            </View>
            {notifSettings.enabled && (
              <View style={styles.notifTimes}>
                {[
                  { labelKey: 'settings_notifications_breakfast', hour: notifSettings.breakfastHour, min: notifSettings.breakfastMinute },
                  { labelKey: 'settings_notifications_lunch', hour: notifSettings.lunchHour, min: notifSettings.lunchMinute },
                  { labelKey: 'settings_notifications_dinner', hour: notifSettings.dinnerHour, min: notifSettings.dinnerMinute },
                ].map((m, idx) => (
                  <View key={idx} style={[styles.notifTimeRow, idx < 2 && styles.notifTimeRowBorder]}>
                    <Text style={styles.notifTimeLabel}>{t(m.labelKey)}</Text>
                    <Text style={styles.notifTimeValue}>
                      {String(m.hour).padStart(2, '0')}:{String(m.min).padStart(2, '0')}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Help */}
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.sectionCardHeader} onPress={() => setHelpExpanded(!helpExpanded)}>
            <View style={styles.sectionCardIcon}>
              <Ionicons name="help-circle-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={[styles.sectionCardTitle, { flex: 1 }]}>{t('settings_help')}</Text>
            <Ionicons name={helpExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.outlineVariant} />
          </TouchableOpacity>
          {helpExpanded && (
            <View style={styles.helpList}>
              {HELP_ITEMS.map((item, idx) => (
                <View key={idx} style={[styles.helpItem, idx < HELP_ITEMS.length - 1 && styles.helpItemBorder]}>
                  <View style={styles.helpIcon}>
                    <Ionicons name={item.icon} size={16} color={Colors.primary} />
                  </View>
                  <View style={styles.helpText}>
                    <Text style={styles.helpTitle}>{item.title}</Text>
                    <Text style={styles.helpDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
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

        {/* About / Copyright */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionCardIcon}>
              <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.sectionCardTitle}>{t('settings_copyright')}</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>{t('settings_version')}</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          <View style={styles.sep} />
          <Text style={styles.copyrightText}>{t('settings_copyright_text')}</Text>
          <Text style={styles.copyrightSub}>Fait avec ❤️ pour les cuisiniers malins.</Text>
        </View>

        <View style={{ height: 8 }} />
      </ScrollView>
    </View>
  );
};

const createStyles = (C: typeof Colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.surface },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center',
  },
  topBarTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg, color: C.onSurface },

  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xxl, padding: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  userAvatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd, color: C.onPrimary },
  userInfo: { flex: 1 },
  userName: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg, color: C.onSurface },
  userEmail: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant, marginTop: 2 },

  sectionCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xxl, padding: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  sectionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.md },
  sectionCardIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: `${C.primary}12`, alignItems: 'center', justifyContent: 'center',
  },
  sectionCardTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleMd, color: C.onSurface },

  optionsRow: { flexDirection: 'row', gap: Spacing.sm },
  optionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.xl,
    backgroundColor: C.surfaceContainerLow, borderWidth: 1.5, borderColor: 'transparent',
  },
  optionBtnActive: { borderColor: C.primary, backgroundColor: `${C.primary}08` },
  optionFlag: { fontSize: 18 },
  optionLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant },
  optionLabelActive: { color: C.primary },

  currencyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14,
  },
  currencyRowBorder: { borderBottomWidth: 1, borderBottomColor: C.surfaceContainerHigh },
  currencyLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  currencySymbolWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center',
  },
  currencySymbolWrapActive: { backgroundColor: `${C.primary}15` },
  currencySymbol: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant },
  currencySymbolActive: { color: C.primary },
  currencyLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: C.outlineVariant, alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: C.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  logoutText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.error },

  darkModeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  darkModeLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  darkModeLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  darkModeSub: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.onSurfaceVariant, marginTop: 1 },

  notifTimes: {
    marginTop: Spacing.sm, backgroundColor: C.surfaceContainerLow,
    borderRadius: BorderRadius.xl, overflow: 'hidden',
  },
  notifTimeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, paddingHorizontal: Spacing.md },
  notifTimeRowBorder: { borderBottomWidth: 1, borderBottomColor: C.surfaceContainerHigh },
  notifTimeLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  notifTimeValue: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.bodyMd, color: C.primary },

  helpList: { marginTop: Spacing.xs },
  helpItem: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.sm },
  helpItemBorder: { borderBottomWidth: 1, borderBottomColor: C.surfaceContainerHigh },
  helpIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: `${C.primary}10`, alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  helpText: { flex: 1 },
  helpTitle: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  helpDesc: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.onSurfaceVariant, marginTop: 2, lineHeight: 18 },

  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  aboutLabel: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant },
  aboutValue: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  sep: { height: 1, backgroundColor: C.surfaceContainerHigh, marginVertical: 4 },
  copyrightText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface, paddingVertical: 4 },
  copyrightSub: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.onSurfaceVariant, marginTop: 2 },
});
