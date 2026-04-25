import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useColors, usePreferences } from '../context/PreferencesContext';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../constants/typography';

type Props = { onUnlock: () => void };

export const LockScreen: React.FC<Props> = ({ onUnlock }) => {
  const C = useColors();
  const { t } = usePreferences();
  const insets = useSafeAreaInsets();
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subKey, setSubKey] = useState<'lock_sub_face' | 'lock_sub_finger' | 'lock_sub_default'>('lock_sub_default');

  useEffect(() => {
    LocalAuthentication.supportedAuthenticationTypesAsync().then((types) => {
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setSubKey('lock_sub_face');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setSubKey('lock_sub_finger');
      }
    });
    authenticate();
  }, []);

  const authenticate = async () => {
    setAuthenticating(true);
    setError(null);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('lock_prompt'),
        fallbackLabel: t('lock_fallback'),
        disableDeviceFallback: false,
        cancelLabel: t('common_cancel'),
      });
      if (result.success) {
        onUnlock();
      } else {
        setError(t('lock_cancelled'));
      }
    } catch {
      setError(t('lock_error'));
    } finally {
      setAuthenticating(false);
    }
  };

  const styles = createStyles(C);

  return (
    <View style={[styles.root, { backgroundColor: C.primary }]}>
      <View style={styles.decor1} />
      <View style={styles.decor2} />

      {/* Logo */}
      <View style={[styles.top, { paddingTop: insets.top + 52 }]}>
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/icon2.0.png')} style={styles.logoImage} />
        </View>
        <Text style={styles.appName}>Eatsy</Text>
      </View>

      {/* Sheet */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.handle} />

        <View style={styles.lockIconWrap}>
          <Ionicons name="lock-closed" size={34} color={C.primary} />
        </View>

        <Text style={styles.title}>{t('lock_title')}</Text>
        <Text style={styles.sub}>{t(subKey)}</Text>

        {error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={14} color={C.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.btn}
          onPress={authenticate}
          disabled={authenticating}
          activeOpacity={0.8}
        >
          {authenticating ? (
            <ActivityIndicator color={C.onPrimary} size="small" />
          ) : (
            <>
              <Ionicons name="finger-print" size={20} color={C.onPrimary} />
              <Text style={styles.btnText}>{t('lock_unlock')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (C: ReturnType<typeof useColors>) => StyleSheet.create({
  root: { flex: 1 },

  decor1: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -80, right: -60,
  },
  decor2: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.05)', top: 180, left: -50,
  },

  top: {
    alignItems: 'center',
    paddingBottom: 52,
    paddingHorizontal: Spacing.lg,
  },
  logoWrap: {
    width: 62, height: 62, borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 6,
    overflow: 'hidden',
  },
  logoImage: { width: 62, height: 62 },
  appName: {
    fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm,
    color: '#fff', letterSpacing: -0.5,
  },

  sheet: {
    flex: 1,
    backgroundColor: C.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -28,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.outlineVariant,
    marginBottom: Spacing.xl,
  },

  lockIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: `${C.primary}12`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineLg,
    color: C.onSurface, marginBottom: Spacing.sm,
  },
  sub: {
    fontFamily: FontFamily.body, fontSize: FontSize.bodyMd,
    color: C.onSurfaceVariant, textAlign: 'center',
    lineHeight: 22, marginBottom: Spacing.xl,
  },

  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.error,
  },

  btn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: C.primary, borderRadius: BorderRadius.full,
    paddingVertical: 15, paddingHorizontal: Spacing.xxl,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  btnText: {
    fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onPrimary,
  },
});
