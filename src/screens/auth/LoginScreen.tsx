import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useColors, usePreferences } from '../../context/PreferencesContext';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { EatsyButton } from '../../components/EatsyButton';
import { EatsyInput } from '../../components/EatsyInput';
import { loginUser } from '../../services/authService';
import { RootStackParamList } from '../../types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Login'> };

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const { t } = usePreferences();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = t('auth_email_required');
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = t('auth_email_invalid');
    if (!password) e.password = t('auth_password_required');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await loginUser(email, password);
    } catch {
      Alert.alert(t('login_error_title'), t('login_error_msg'));
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(Colors);

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: Colors.primary }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* ── Hero ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 36 }]}>
        <View style={styles.decor1} />
        <View style={styles.decor2} />
        <View style={styles.logoCircle}>
          <Image source={require('../../../assets/Icon2.0.png')} style={styles.logoImage} />
        </View>
        <Text style={styles.appName}>Eatsy</Text>
        <Text style={styles.tagline}>{t('login_tagline')}</Text>
      </View>

      {/* ── Form sheet ── */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>{t('login_title')}</Text>

        <EatsyInput
          label="Email"
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
          secureTextEntry={!showPassword}
          placeholder="••••••••"
          error={errors.password}
          rightIcon={
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.outline}
            />
          }
          onRightIconPress={() => setShowPassword((v) => !v)}
        />

        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotRow}>
          <Text style={styles.forgotText}>{t('login_forgot')}</Text>
        </TouchableOpacity>

        <EatsyButton label={t('login_title')} onPress={handleLogin} loading={loading} style={styles.loginBtn} />

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>{t('login_or')}</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity style={styles.registerBtn} onPress={() => navigation.navigate('Register')} activeOpacity={0.8}>
          <Text style={styles.registerBtnText}>{t('login_create_account')}</Text>
        </TouchableOpacity>
      </ScrollView>

    </KeyboardAvoidingView>
  );
};

const createStyles = (C: ReturnType<typeof useColors>) => StyleSheet.create({
  root: { flex: 1 },

  // ── Hero ──
  hero: {
    alignItems: 'center',
    paddingBottom: 52,
    overflow: 'hidden',
  },
  decor1: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -90, right: -70,
  },
  decor2: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -20, left: -50,
  },
  logoImage: { width: 68, height: 68, borderRadius: 22 },
  logoCircle: {
    width: 68, height: 68, borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 14, elevation: 8,
  },
  appName: {
    fontFamily: FontFamily.headlineBold, fontSize: 38,
    color: '#fff', letterSpacing: -1, marginBottom: 6,
  },
  tagline: {
    fontFamily: FontFamily.body, fontSize: FontSize.bodyMd,
    color: 'rgba(255,255,255,0.72)',
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
  sheetTitle: {
    fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineLg,
    color: C.onSurface, marginBottom: Spacing.lg,
  },

  forgotRow: { alignItems: 'flex-end', marginTop: -Spacing.xs, marginBottom: Spacing.lg },
  forgotText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.primary },

  loginBtn: { marginBottom: Spacing.lg },

  dividerRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, marginBottom: Spacing.lg,
  },
  divider: { flex: 1, height: 1, backgroundColor: C.surfaceContainerHigh },
  dividerText: {
    fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.onSurfaceVariant,
  },

  registerBtn: {
    paddingVertical: 15, borderRadius: BorderRadius.full,
    backgroundColor: `${C.primary}12`,
    alignItems: 'center', justifyContent: 'center',
  },
  registerBtnText: {
    fontFamily: FontFamily.bodyBold, fontSize: FontSize.titleLg, color: C.primary,
  },
});
