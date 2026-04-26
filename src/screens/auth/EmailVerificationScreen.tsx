import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, AppState, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { EMAIL_VERIFICATION_SETTINGS } from '../../utils/firebaseActionSettings';
import { useAuth } from '../../context/AuthContext';
import { useColors, usePreferences } from '../../context/PreferencesContext';
import { useAlert } from '../../context/AlertContext';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { EatsyButton } from '../../components/EatsyButton';

const RESEND_COOLDOWN = 60;

export const EmailVerificationScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const { t } = usePreferences();
  const { showAlert } = useAlert();
  const { user, reloadUser } = useAuth();
  const [cooldown, setCooldown] = useState(0);
  const [checking, setChecking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-check when app comes back to foreground (user may have clicked link in mail app)
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        await reloadUser();
      }
    });
    return () => sub.remove();
  }, [reloadUser]);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleResend = async () => {
    if (!auth.currentUser || cooldown > 0) return;
    try {
      await sendEmailVerification(auth.currentUser, EMAIL_VERIFICATION_SETTINGS);
      startCooldown();
      showAlert({ title: t('verif_sent_ok'), message: auth.currentUser.email ?? '' });
    } catch {
      showAlert({ title: t('common_error'), message: t('auth_error_too_many') });
    }
  };

  const handleCheckVerified = async () => {
    setChecking(true);
    await reloadUser();
    setChecking(false);
    if (!auth.currentUser?.emailVerified) {
      showAlert({ title: '', message: t('verif_check_failed') });
    }
  };

  const handleLogout = () => signOut(auth);

  const styles = createStyles(Colors);
  const resendLabel = cooldown > 0
    ? t('verif_resend_wait').replace('{s}', String(cooldown))
    : t('verif_resend');

  return (
    <View style={[styles.root, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.iconWrap}>
        <Ionicons name="mail-outline" size={44} color={Colors.primary} />
      </View>

      <Text style={styles.title}>{t('verif_title')}</Text>
      <Text style={styles.sub}>{t('verif_sub')}</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <View style={styles.actions}>
        <EatsyButton
          label={checking ? '' : t('verif_done')}
          onPress={handleCheckVerified}
          disabled={checking}
          style={styles.btn}
        />
        {checking && (
          <ActivityIndicator color={Colors.onPrimary} style={StyleSheet.absoluteFill} />
        )}

        <TouchableOpacity
          style={[styles.resendBtn, cooldown > 0 && styles.resendDisabled]}
          onPress={handleResend}
          disabled={cooldown > 0}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={16} color={cooldown > 0 ? Colors.outline : Colors.primary} />
          <Text style={[styles.resendText, cooldown > 0 && { color: Colors.outline }]}>
            {resendLabel}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t('verif_logout')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (C: ReturnType<typeof useColors>) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: `${C.primary}12`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontFamily: FontFamily.headlineBold,
    fontSize: FontSize.headlineLg,
    color: C.onSurface,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  sub: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.bodyMd,
    color: C.onSurfaceVariant,
    textAlign: 'center',
  },
  email: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.bodyMd,
    color: C.primary,
    marginTop: 4,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
  },
  btn: { position: 'relative' },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 15,
    borderRadius: BorderRadius.full,
    backgroundColor: `${C.primary}12`,
  },
  resendDisabled: {
    backgroundColor: C.surfaceContainerHigh,
  },
  resendText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.bodyMd,
    color: C.primary,
  },
  logoutRow: {
    marginTop: Spacing.xl,
  },
  logoutText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.bodyMd,
    color: C.onSurfaceVariant,
    textDecorationLine: 'underline',
  },
});
