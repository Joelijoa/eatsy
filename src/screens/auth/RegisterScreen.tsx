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
import { registerUser } from '../../services/authService';
import { resolveAuthError } from '../../utils/authErrors';
import { getPasswordStrength, isPasswordAcceptable } from '../../utils/passwordStrength';
import { RootStackParamList } from '../../types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Register'> };

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const { t } = usePreferences();
  const { showAlert } = useAlert();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const strength = getPasswordStrength(password);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t('common_name_required');
    if (!email.trim()) e.email = t('auth_email_required');
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = t('auth_email_invalid');
    if (!password) e.password = t('auth_password_required');
    else if (password.length < 8) e.password = t('auth_password_min');
    else if (!isPasswordAcceptable(password)) e.password = t('auth_password_too_weak');
    if (password !== confirm) e.confirm = t('auth_passwords_mismatch');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await registerUser(email, password, name);
    } catch (err: any) {
      showAlert({ title: t('common_error'), message: resolveAuthError(err, 'register_failed', t) });
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
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>{t('register_title')}</Text>
          <Text style={styles.heroSub}>{t('register_sub')}</Text>
        </View>
      </View>

      {/* ── Form sheet ── */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sheetHandle} />

        <EatsyInput
          label={t('register_name_label')}
          value={name}
          onChangeText={setName}
          placeholder={t('register_name_placeholder')}
          error={errors.name}
          autoCapitalize="words"
        />
        <EatsyInput
          label={t('register_email_label')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder={t('forgot_email_placeholder')}
          error={errors.email}
        />
        <EatsyInput
          label={t('register_pwd_label')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPwd}
          placeholder={t('register_pwd_placeholder')}
          error={errors.password}
          rightIcon={<Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.outline} />}
          onRightIconPress={() => setShowPwd((v) => !v)}
        />
        {password.length > 0 && (
          <View style={styles.strengthRow}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.strengthBar,
                  i <= strength.score && {
                    backgroundColor:
                      strength.level === 'strong' ? '#16a34a' :
                      strength.level === 'fair'   ? '#f59e0b' : '#ef4444',
                  },
                ]}
              />
            ))}
            <Text style={[
              styles.strengthLabel,
              { color: strength.level === 'strong' ? '#16a34a' : strength.level === 'fair' ? '#f59e0b' : '#ef4444' },
            ]}>
              {t(`auth_pwd_${strength.level}`)}
            </Text>
          </View>
        )}

        <EatsyInput
          label={t('register_confirm_label')}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry={!showConfirm}
          placeholder="••••••••"
          error={errors.confirm}
          rightIcon={<Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.outline} />}
          onRightIconPress={() => setShowConfirm((v) => !v)}
        />

        <EatsyButton label={t('register_btn')} onPress={handleRegister} loading={loading} style={styles.registerBtn} />

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>{t('login_or')}</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.8}>
          <Text style={styles.loginBtnText}>{t('register_login_link')}</Text>
        </TouchableOpacity>
      </ScrollView>

    </KeyboardAvoidingView>
  );
};

const createStyles = (C: ReturnType<typeof useColors>) => StyleSheet.create({
  root: { flex: 1 },

  // ── Hero ──
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
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
  heroText: {},
  heroTitle: {
    fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm,
    color: '#fff', letterSpacing: -0.5,
  },
  heroSub: {
    fontFamily: FontFamily.body, fontSize: FontSize.bodyMd,
    color: 'rgba(255,255,255,0.72)', marginTop: 4,
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
    alignSelf: 'center', marginBottom: Spacing.lg,
  },

  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.surfaceContainerHigh,
  },
  strengthLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.labelSm,
    minWidth: 42,
    textAlign: 'right',
  },

  registerBtn: { marginBottom: Spacing.lg, marginTop: Spacing.xs },

  dividerRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, marginBottom: Spacing.lg,
  },
  divider: { flex: 1, height: 1, backgroundColor: C.surfaceContainerHigh },
  dividerText: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.onSurfaceVariant },

  loginBtn: {
    paddingVertical: 15, borderRadius: BorderRadius.full,
    backgroundColor: `${C.primary}12`,
    alignItems: 'center', justifyContent: 'center',
  },
  loginBtnText: {
    fontFamily: FontFamily.bodyBold, fontSize: FontSize.titleLg, color: C.primary,
  },
});
