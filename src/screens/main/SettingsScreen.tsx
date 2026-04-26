import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Animated } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { usePreferences, Language, Currency, useColors } from '../../context/PreferencesContext';
import { useAlert } from '../../context/AlertContext';
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
  const { showAlert } = useAlert();
  const [helpExpanded, setHelpExpanded]   = useState(false);
  const [expandedFaq, setExpandedFaq]     = useState<number | null>(null);
  const [termsExpanded, setTermsExpanded] = useState(false);
  const [notifSettings, setNotifSettings] = useState<MealNotificationSettings | null>(null);
  const [biometricEnabled, setBiometricEnabled]   = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel]         = useState(t('settings_biometric_default'));
  const { opacity, translateY } = useScreenEntrance();

  useEffect(() => {
    loadNotificationSettings().then(setNotifSettings);
    // Check biometric hardware
    Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]).then(([hasHW, enrolled, types]) => {
      const available = hasHW && enrolled;
      setBiometricAvailable(available);
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricLabel(t('settings_biometric_face'));
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricLabel(t('settings_biometric_fingerprint'));
      } else {
        setBiometricLabel(t('settings_biometric_pin'));
      }
    });
    AsyncStorage.getItem('eatsy_biometric_lock').then(v => setBiometricEnabled(v === 'true')).catch(() => {});
  }, []);

  const toggleBiometric = async (value: boolean) => {
    if (value) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('settings_biometric_confirm'),
        fallbackLabel: t('settings_biometric_pin'),
        disableDeviceFallback: false,
      });
      if (!result.success) return;
    }
    setBiometricEnabled(value);
    await AsyncStorage.setItem('eatsy_biometric_lock', value ? 'true' : 'false').catch(() => {});
  };

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
        showAlert({ title: t('settings_notifications_permission') });
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

  const FAQ_ITEMS = [
    { q: t('settings_faq_q1'), a: t('settings_faq_a1') },
    { q: t('settings_faq_q2'), a: t('settings_faq_a2') },
    { q: t('settings_faq_q3'), a: t('settings_faq_a3') },
    { q: t('settings_faq_q4'), a: t('settings_faq_a4') },
    { q: t('settings_faq_q5'), a: t('settings_faq_a5') },
    { q: t('settings_faq_q6'), a: t('settings_faq_a6') },
  ];

  const HELP_ITEMS = [
    { title: t('help_planner_title'), desc: t('help_planner_desc'), icon: 'calendar-outline' as const },
    { title: t('help_recipes_title'), desc: t('help_recipes_desc'), icon: 'book-outline' as const },
    { title: t('help_shopping_title'), desc: t('help_shopping_desc'), icon: 'cart-outline' as const },
    { title: t('help_budget_title'), desc: t('help_budget_desc'), icon: 'wallet-outline' as const },
    { title: t('help_pantry_title'), desc: t('help_pantry_desc'), icon: 'cube-outline' as const },
  ];

  const handleLogout = () => {
    showAlert({ title: t('settings_logout'), message: t('settings_logout_confirm'), buttons: [
      { text: t('common_cancel'), style: 'cancel' },
      { text: t('settings_logout'), style: 'destructive', onPress: () => signOut(auth) },
    ]});
  };

  const LANG_OPTIONS: Array<{ value: Language; label: string; flag: string }> = [
    { value: 'fr', label: t('settings_french'), flag: '🇫🇷' },
    { value: 'en', label: t('settings_english'), flag: '🇬🇧' },
  ];

  const CURRENCY_OPTIONS: Array<{ value: Currency; label: string; symbol: string }> = [
    { value: 'EUR', label: t('settings_eur'), symbol: '€' },
    { value: 'MAD', label: t('settings_mad'), symbol: 'د.م' },
  ];

  const styles = createStyles(Colors);

  return (
    <Animated.View style={[styles.screen, { opacity, transform: [{ translateY }] }]}>

      {/* ── Header ── */}
      <View style={[styles.headerBand, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerDecor1} />
        <View style={styles.headerDecor2} />

        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('settings_title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.profileBlock}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.displayName?.[0]?.toUpperCase() ?? 'E'}</Text>
            </View>
          </View>
          <Text style={styles.profileName}>{user?.displayName ?? t('common_chef')}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >

        {/* ── Langue ── */}
        <View style={styles.groupLabel}>
          <Ionicons name="language-outline" size={13} color={Colors.onSurfaceVariant} />
          <Text style={styles.groupLabelText}>{t('settings_language').toUpperCase()}</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.optionsRow}>
            {LANG_OPTIONS.map((opt) => {
              const active = language === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.langBtn, active && styles.langBtnActive]}
                  onPress={() => { setLanguage(opt.value); savePrefsToFirestore({ language: opt.value }); }}
                  activeOpacity={0.78}
                >
                  <Text style={styles.langFlag}>{opt.flag}</Text>
                  <Text style={[styles.langLabel, active && styles.langLabelActive]}>{opt.label}</Text>
                  {active && <Ionicons name="checkmark-circle" size={15} color={Colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Devise ── */}
        <View style={styles.groupLabel}>
          <Ionicons name="cash-outline" size={13} color={Colors.onSurfaceVariant} />
          <Text style={styles.groupLabelText}>{t('settings_currency').toUpperCase()}</Text>
        </View>
        <View style={styles.card}>
          {CURRENCY_OPTIONS.map((opt, idx) => {
            const active = currency === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.row, idx < CURRENCY_OPTIONS.length - 1 && styles.rowBorder]}
                onPress={() => { setCurrency(opt.value); savePrefsToFirestore({ currency: opt.value }); }}
                activeOpacity={0.78}
              >
                <View style={[styles.symbolBadge, active && styles.symbolBadgeActive]}>
                  <Text style={[styles.symbolText, active && styles.symbolTextActive]}>{opt.symbol}</Text>
                </View>
                <Text style={styles.rowLabel}>{opt.label}</Text>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Apparence ── */}
        <View style={styles.groupLabel}>
          <Ionicons name="color-palette-outline" size={13} color={Colors.onSurfaceVariant} />
          <Text style={styles.groupLabelText}>{t('settings_appearance').toUpperCase()}</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={[styles.switchIcon, { backgroundColor: darkMode ? `${Colors.secondary}18` : `${Colors.tertiary}18` }]}>
              <Ionicons
                name={darkMode ? 'moon' : 'sunny-outline'}
                size={18}
                color={darkMode ? Colors.secondary : Colors.tertiary}
              />
            </View>
            <View style={styles.switchBody}>
              <Text style={styles.switchLabel}>{t('settings_darkmode')}</Text>
              <Text style={styles.switchSub}>{t('settings_darkmode_sub')}</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={(v) => { setDarkMode(v); savePrefsToFirestore({ darkMode: v }); }}
              trackColor={{ false: Colors.surfaceContainerHigh, true: Colors.primary }}
              thumbColor={darkMode ? Colors.onPrimary : Colors.surface}
            />
          </View>
        </View>

        {/* ── Notifications ── */}
        {notifSettings !== null && (
          <>
            <View style={styles.groupLabel}>
              <Ionicons name="notifications-outline" size={13} color={Colors.onSurfaceVariant} />
              <Text style={styles.groupLabelText}>{t('settings_notifications').toUpperCase()}</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.switchRow}>
                <View style={[styles.switchIcon, { backgroundColor: notifSettings.enabled ? `${Colors.primary}15` : `${Colors.onSurfaceVariant}10` }]}>
                  <Ionicons
                    name="alarm-outline"
                    size={18}
                    color={notifSettings.enabled ? Colors.primary : Colors.onSurfaceVariant}
                  />
                </View>
                <View style={styles.switchBody}>
                  <Text style={styles.switchLabel}>{t('settings_notifications')}</Text>
                  <Text style={styles.switchSub}>{t('settings_notifications_sub')}</Text>
                </View>
                <Switch
                  value={notifSettings.enabled}
                  onValueChange={toggleNotifications}
                  trackColor={{ false: Colors.surfaceContainerHigh, true: Colors.primary }}
                  thumbColor={notifSettings.enabled ? Colors.onPrimary : Colors.surface}
                />
              </View>
              {notifSettings.enabled && (
                <View style={styles.notifBlock}>
                  {[
                    { labelKey: 'settings_notifications_breakfast', icon: 'sunny-outline' as const, hour: notifSettings.breakfastHour, min: notifSettings.breakfastMinute },
                    { labelKey: 'settings_notifications_lunch',     icon: 'partly-sunny-outline' as const, hour: notifSettings.lunchHour, min: notifSettings.lunchMinute },
                    { labelKey: 'settings_notifications_dinner',    icon: 'moon-outline' as const, hour: notifSettings.dinnerHour, min: notifSettings.dinnerMinute },
                  ].map((m, idx) => (
                    <View key={idx} style={[styles.notifRow, idx < 2 && styles.rowBorder]}>
                      <Ionicons name={m.icon} size={14} color={Colors.onSurfaceVariant} />
                      <Text style={styles.notifLabel}>{t(m.labelKey)}</Text>
                      <View style={styles.timePill}>
                        <Text style={styles.timePillText}>
                          {String(m.hour).padStart(2, '0')}:{String(m.min).padStart(2, '0')}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        {/* ── Sécurité ── */}
        <View style={styles.groupLabel}>
          <Ionicons name="shield-checkmark-outline" size={13} color={Colors.onSurfaceVariant} />
          <Text style={styles.groupLabelText}>{t('settings_security')}</Text>
        </View>
        <View style={styles.card}>
          <View style={[styles.switchRow, !biometricAvailable && { opacity: 0.45 }]}>
            <View style={[styles.switchIcon, { backgroundColor: `${Colors.primary}15` }]}>
              <Ionicons name="finger-print" size={18} color={Colors.primary} />
            </View>
            <View style={styles.switchBody}>
              <Text style={styles.switchLabel}>{t('settings_biometric_lock').replace('{type}', biometricLabel)}</Text>
              <Text style={styles.switchSub}>
                {biometricAvailable ? t('settings_biometric_sub_on') : t('settings_biometric_sub_off')}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={toggleBiometric}
              disabled={!biometricAvailable}
              trackColor={{ false: Colors.surfaceContainerHigh, true: Colors.primary }}
              thumbColor={biometricEnabled ? Colors.onPrimary : Colors.surface}
            />
          </View>
        </View>

        {/* ── Aide ── */}
        <View style={styles.groupLabel}>
          <Ionicons name="help-circle-outline" size={13} color={Colors.onSurfaceVariant} />
          <Text style={styles.groupLabelText}>{t('settings_help').toUpperCase()}</Text>
        </View>
        <View style={styles.card}>
          <TouchableOpacity style={styles.helpToggle} onPress={() => setHelpExpanded(!helpExpanded)} activeOpacity={0.78}>
            <Text style={styles.helpToggleText}>{helpExpanded ? t('settings_help_hide') : t('settings_help_show')}</Text>
            <Ionicons name={helpExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
          {helpExpanded && (
            <View style={styles.helpList}>
              {HELP_ITEMS.map((item, idx) => (
                <View key={idx} style={[styles.helpItem, idx < HELP_ITEMS.length - 1 && styles.rowBorder]}>
                  <View style={styles.helpIconWrap}>
                    <Ionicons name={item.icon} size={15} color={Colors.primary} />
                  </View>
                  <View style={styles.helpBody}>
                    <Text style={styles.helpTitle}>{item.title}</Text>
                    <Text style={styles.helpDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── FAQ ── */}
        <View style={styles.groupLabel}>
          <Ionicons name="chatbubble-ellipses-outline" size={13} color={Colors.onSurfaceVariant} />
          <Text style={styles.groupLabelText}>FAQ</Text>
        </View>
        <View style={styles.card}>
          {FAQ_ITEMS.map((item, idx) => {
            const open = expandedFaq === idx;
            return (
              <View key={idx} style={idx < FAQ_ITEMS.length - 1 && styles.rowBorder}>
                <TouchableOpacity
                  style={styles.faqRow}
                  onPress={() => setExpandedFaq(open ? null : idx)}
                  activeOpacity={0.78}
                >
                  <View style={[styles.faqBullet, open && { backgroundColor: Colors.primary }]}>
                    <Text style={[styles.faqBulletText, open && { color: Colors.onPrimary }]}>
                      {idx + 1}
                    </Text>
                  </View>
                  <Text style={[styles.faqQuestion, open && { color: Colors.primary }]} numberOfLines={open ? undefined : 2}>
                    {item.q}
                  </Text>
                  <Ionicons
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={15}
                    color={open ? Colors.primary : Colors.outlineVariant}
                  />
                </TouchableOpacity>
                {open && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.faqAnswerText}>{item.a}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ── Conditions d'utilisation ── */}
        <View style={styles.groupLabel}>
          <Ionicons name="document-text-outline" size={13} color={Colors.onSurfaceVariant} />
          <Text style={styles.groupLabelText}>{t('settings_data_section')}</Text>
        </View>
        <View style={styles.card}>
          <TouchableOpacity style={styles.helpToggle} onPress={() => setTermsExpanded(!termsExpanded)} activeOpacity={0.78}>
            <Text style={styles.helpToggleText}>
              {termsExpanded ? t('settings_terms_hide') : t('settings_terms_show')}
            </Text>
            <Ionicons name={termsExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
          {termsExpanded && (
            <View style={styles.termsBlock}>
              {[
                { icon: 'server-outline' as const, title: t('settings_terms_t1'), body: t('settings_terms_b1') },
                { icon: 'cloud-outline'  as const, title: t('settings_terms_t2'), body: t('settings_terms_b2') },
                { icon: 'people-outline' as const, title: t('settings_terms_t3'), body: t('settings_terms_b3') },
                { icon: 'trash-outline'  as const, title: t('settings_terms_t4'), body: t('settings_terms_b4') },
                { icon: 'refresh-outline' as const, title: t('settings_terms_t5'), body: t('settings_terms_b5') },
              ].map((section, idx, arr) => (
                <View key={idx} style={[styles.termsSection, idx < arr.length - 1 && styles.rowBorder]}>
                  <View style={styles.termsIconWrap}>
                    <Ionicons name={section.icon} size={15} color={Colors.primary} />
                  </View>
                  <View style={styles.termsBody}>
                    <Text style={styles.termsTitle}>{section.title}</Text>
                    <Text style={styles.termsText}>{section.body}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Compte ── */}
        <View style={styles.groupLabel}>
          <Ionicons name="person-outline" size={13} color={Colors.onSurfaceVariant} />
          <Text style={styles.groupLabelText}>{t('settings_account').toUpperCase()}</Text>
        </View>
        <View style={styles.card}>
          <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.78}>
            <View style={styles.logoutIconWrap}>
              <Ionicons name="log-out-outline" size={18} color={Colors.error} />
            </View>
            <Text style={styles.logoutText}>{t('settings_logout')}</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.error} style={{ opacity: 0.5 }} />
          </TouchableOpacity>
        </View>

        {/* ── À propos ── */}
        <View style={styles.groupLabel}>
          <Ionicons name="information-circle-outline" size={13} color={Colors.onSurfaceVariant} />
          <Text style={styles.groupLabelText}>{t('settings_copyright').toUpperCase()}</Text>
        </View>
        <View style={styles.card}>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowLabel}>{t('settings_version')}</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>1.0.0</Text>
            </View>
          </View>
          <View style={styles.aboutBlock}>
            <Text style={styles.copyrightText}>{t('settings_copyright_text')}</Text>
            <Text style={styles.copyrightSub}>Fait avec ❤️ pour les cuisiniers malins.</Text>
          </View>
        </View>

      </ScrollView>
    </Animated.View>
  );
};

const createStyles = (C: typeof Colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.surface },

  // ── Header ──
  headerBand: {
    backgroundColor: C.primary, paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl + 8, overflow: 'hidden',
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
  },
  headerDecor1: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -90, right: -70,
  },
  headerDecor2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.04)', bottom: -30, left: -30,
  },
  headerTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg, color: '#fff' },

  profileBlock: { alignItems: 'center', gap: 6 },
  avatarRing: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: FontFamily.headlineBold, fontSize: 26, color: '#fff' },
  profileName: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineSm, color: '#fff' },
  profileEmail: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: 'rgba(255,255,255,0.7)' },

  // ── Scroll ──
  scroll: { paddingTop: Spacing.lg },

  // ── Group label ──
  groupLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.lg + 4, marginBottom: 6, marginTop: 4,
  },
  groupLabelText: {
    fontFamily: FontFamily.bodyBold, fontSize: 10,
    color: C.onSurfaceVariant, letterSpacing: 1,
  },

  // ── Card ──
  card: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xxl,
    paddingHorizontal: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },

  // ── Row ──
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: Spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.surfaceContainerHigh },
  rowLabel: { flex: 1, fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },

  // ── Language ──
  optionsRow: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.sm },
  langBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13, borderRadius: BorderRadius.xl,
    backgroundColor: C.surfaceContainerLow, borderWidth: 1.5, borderColor: 'transparent',
  },
  langBtnActive: { borderColor: C.primary, backgroundColor: `${C.primary}08` },
  langFlag: { fontSize: 18 },
  langLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant },
  langLabelActive: { color: C.primary },

  // ── Currency ──
  symbolBadge: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center',
  },
  symbolBadgeActive: { backgroundColor: `${C.primary}15` },
  symbolText: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant },
  symbolTextActive: { color: C.primary },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: C.outlineVariant, alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: C.primary },
  radioDot: { width: 11, height: 11, borderRadius: 5.5, backgroundColor: C.primary },

  // ── Switch row ──
  switchRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm,
  },
  switchIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  switchBody: { flex: 1 },
  switchLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  switchSub: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.onSurfaceVariant, marginTop: 1 },

  // ── Notifications ──
  notifBlock: {
    marginTop: Spacing.xs, backgroundColor: C.surfaceContainerLow,
    borderRadius: BorderRadius.xl, overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  notifRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 11, paddingHorizontal: Spacing.md,
  },
  notifLabel: { flex: 1, fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  timePill: {
    backgroundColor: `${C.primary}15`, paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  timePillText: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.labelMd, color: C.primary },

  // ── Help ──
  helpToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  helpToggleText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  helpList: { paddingBottom: Spacing.xs },
  helpItem: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.sm + 2 },
  helpIconWrap: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: `${C.primary}12`, alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  helpBody: { flex: 1 },
  helpTitle: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  helpDesc: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.onSurfaceVariant, marginTop: 2, lineHeight: 18 },

  // ── Logout ──
  logoutRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  logoutIconWrap: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: `${C.error}12`, alignItems: 'center', justifyContent: 'center',
  },
  logoutText: { flex: 1, fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.error },

  // ── FAQ ──
  faqRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  faqBullet: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  faqBulletText: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: C.onSurfaceVariant },
  faqQuestion: { flex: 1, fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  faqAnswer: {
    paddingHorizontal: Spacing.sm, paddingBottom: Spacing.md,
    paddingLeft: 22 + Spacing.sm,
  },
  faqAnswerText: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant, lineHeight: 22 },

  // ── Terms ──
  termsBlock: { paddingBottom: Spacing.sm },
  termsSection: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.md },
  termsIconWrap: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: `${C.primary}12`, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 2,
  },
  termsBody: { flex: 1 },
  termsTitle: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface, marginBottom: 4 },
  termsText: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.onSurfaceVariant, lineHeight: 20 },

  // ── Version / About ──
  versionBadge: {
    backgroundColor: `${C.primary}12`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full,
  },
  versionText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.primary },
  aboutBlock: { paddingVertical: Spacing.md, gap: 4 },
  copyrightText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  copyrightSub: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.onSurfaceVariant },
});
