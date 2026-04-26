import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useColors, usePreferences } from '../../context/PreferencesContext';
import { useAlert } from '../../context/AlertContext';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { EatsyButton } from '../../components/EatsyButton';
import { EatsyInput } from '../../components/EatsyInput';
import { resetPassword } from '../../services/authService';
import { RootStackParamList } from '../../types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'> };

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const { t } = usePreferences();
  const { showAlert } = useAlert();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) return showAlert({ title: t('auth_email_required') });
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: any) {
      showAlert({ title: t('common_error'), message: err.message ?? t('forgot_failed') });
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(Colors);

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: Colors.primary }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* ── Hero ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <View style={styles.decor1} />
        <View style={styles.decor2} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
        <View style={styles.heroIconWrap}>
          <Ionicons name="lock-open-outline" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.heroTitle}>{t('forgot_title')}</Text>
        <Text style={styles.heroSub}>{t('forgot_sub')}</Text>
      </View>

      {/* ── Sheet ── */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sheetHandle} />

        {sent ? (
          /* ── Success state ── */
          <View style={styles.successBlock}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.successTitle}>{t('forgot_success_title')}</Text>
            <Text style={styles.successDesc}>{t('forgot_success_desc')}</Text>
            <EatsyButton
              label={t('forgot_back_to_login')}
              onPress={() => navigation.navigate('Login')}
              style={styles.actionBtn}
            />
          </View>
        ) : (
          /* ── Form ── */
          <>
            <EatsyInput
              label={t('forgot_email_label')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder={t('forgot_email_placeholder')}
            />
            <EatsyButton
              label={t('forgot_send_btn')}
              onPress={handleReset}
              loading={loading}
              style={styles.actionBtn}
            />
            <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
              <Text style={styles.backLinkText}>{t('forgot_back_link')}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

    </KeyboardAvoidingView>
  );
};

const createStyles = (C: ReturnType<typeof useColors>) => StyleSheet.create({
  root: { flex: 1 },

  // ── Hero ──
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 52,
    overflow: 'hidden',
  },
  decor1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -70, right: -60,
  },
  decor2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -20, left: -30,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  heroIconWrap: {
    width: 68, height: 68, borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 6,
  },
  heroTitle: {
    fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm,
    color: '#fff', letterSpacing: -0.5, marginBottom: 6,
  },
  heroSub: {
    fontFamily: FontFamily.body, fontSize: FontSize.bodyMd,
    color: 'rgba(255,255,255,0.72)', lineHeight: 22,
  },

  // ── Sheet ──
  sheet: {
    flex: 1,
    backgroundColor: C.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -28,
  },
  sheetContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.outlineVariant,
    alignSelf: 'center', marginBottom: Spacing.xl,
  },

  actionBtn: { marginTop: Spacing.xs, marginBottom: Spacing.lg },
  backLink: { alignItems: 'center' },
  backLinkText: {
    fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.primary,
  },

  // ── Success ──
  successBlock: { alignItems: 'center', paddingTop: Spacing.lg },
  successIconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: `${C.primary}12`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineLg,
    color: C.onSurface, marginBottom: Spacing.sm,
  },
  successDesc: {
    fontFamily: FontFamily.body, fontSize: FontSize.bodyMd,
    color: C.onSurfaceVariant, textAlign: 'center',
    lineHeight: 22, marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
});
