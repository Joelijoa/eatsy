import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';

type Props = { navigation: any };

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = usePreferences();

  const initials = user?.displayName
    ? user.displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'E';

  const memberSince = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
    : '—';

  const handleLogout = () => {
    Alert.alert(t('settings_logout'), t('settings_logout_confirm'), [
      { text: t('common_cancel'), style: 'cancel' },
      { text: t('settings_logout'), style: 'destructive', onPress: () => signOut(auth) },
    ]);
  };

  const InfoRow: React.FC<{ icon: keyof typeof Ionicons.glyphMap; label: string; value: string }> = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      {/* Green header band */}
      <View style={[styles.headerBand, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerDecor} />
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profil</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.displayName}>{user?.displayName ?? 'Chef'}</Text>
          <Text style={styles.emailSubtitle}>{user?.email}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingTop: Spacing.lg }}
      >
        {/* Account info card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informations du compte</Text>
          <InfoRow
            icon="person-outline"
            label="Nom affiché"
            value={user?.displayName ?? '—'}
          />
          <View style={styles.sep} />
          <InfoRow
            icon="mail-outline"
            label="Adresse e-mail"
            value={user?.email ?? '—'}
          />
          <View style={styles.sep} />
          <InfoRow
            icon="calendar-outline"
            label="Membre depuis"
            value={memberSince}
          />
          <View style={styles.sep} />
          <InfoRow
            icon="shield-checkmark-outline"
            label="Statut"
            value={user?.emailVerified ? 'Email vérifié' : 'Email non vérifié'}
          />
        </View>

        {/* Actions */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => { navigation.goBack(); navigation.navigate('Settings'); }}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${Colors.primary}12` }]}>
              <Ionicons name="settings-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Paramètres</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.outlineVariant} />
          </TouchableOpacity>
          <View style={styles.sep} />
          <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
            <View style={[styles.actionIcon, { backgroundColor: `${Colors.error}12` }]}>
              <Ionicons name="log-out-outline" size={18} color={Colors.error} />
            </View>
            <Text style={[styles.actionLabel, { color: Colors.error }]}>{t('settings_logout')}</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.outlineVariant} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },

  headerBand: {
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    paddingBottom: Spacing.xl + 8,
    overflow: 'hidden',
  },
  headerDecor: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -100, right: -80,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg,
    color: '#fff',
  },

  avatarWrap: { alignItems: 'center', gap: 6 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.45)',
    marginBottom: 4,
  },
  avatarText: {
    fontFamily: FontFamily.headlineBold, fontSize: 28,
    color: '#fff', letterSpacing: 1,
  },
  displayName: {
    fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg,
    color: '#fff',
  },
  emailSubtitle: {
    fontFamily: FontFamily.body, fontSize: FontSize.bodyMd,
    color: 'rgba(255,255,255,0.75)',
  },

  card: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  cardTitle: {
    fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleMd,
    color: Colors.onSurface, marginBottom: Spacing.md,
  },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 6 },
  infoIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: `${Colors.primary}10`, alignItems: 'center', justifyContent: 'center',
  },
  infoText: { flex: 1 },
  infoLabel: {
    fontFamily: FontFamily.body, fontSize: FontSize.labelMd,
    color: Colors.onSurfaceVariant,
  },
  infoValue: {
    fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd,
    color: Colors.onSurface, marginTop: 1,
  },
  sep: { height: 1, backgroundColor: Colors.surfaceContainerHigh, marginVertical: 4 },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 10 },
  actionIcon: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: {
    flex: 1, fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onSurface,
  },
});
