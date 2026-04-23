import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { usePreferences , useColors } from '../../context/PreferencesContext';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';

type Props = { navigation: any };

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const { user } = useAuth();
  const { t } = usePreferences();

  const [pwdModal, setPwdModal] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdErrors, setPwdErrors] = useState<Record<string, string>>({});

  const styles = createStyles(Colors);

  const initials = user?.displayName
    ? user.displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'E';

  const memberSince = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
    : '—';

  const openPwdModal = () => {
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    setPwdErrors({}); setShowCurrent(false); setShowNew(false);
    setPwdModal(true);
  };

  const handleChangePassword = async () => {
    const errs: Record<string, string> = {};
    if (!currentPwd) errs.current = 'Mot de passe actuel requis';
    if (!newPwd) errs.new = 'Nouveau mot de passe requis';
    else if (newPwd.length < 6) errs.new = 'Au moins 6 caractères';
    if (newPwd !== confirmPwd) errs.confirm = 'Les mots de passe ne correspondent pas';
    if (Object.keys(errs).length) { setPwdErrors(errs); return; }

    if (!user?.email) return;
    setPwdLoading(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPwd);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPwd);
      setPwdModal(false);
      Alert.alert('Succès', 'Votre mot de passe a été modifié.');
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPwdErrors({ current: 'Mot de passe actuel incorrect' });
      } else {
        Alert.alert('Erreur', err.message ?? 'Impossible de modifier le mot de passe');
      }
    } finally {
      setPwdLoading(false);
    }
  };

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

        {/* Security */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sécurité</Text>
          <TouchableOpacity style={styles.actionRow} onPress={openPwdModal}>
            <View style={[styles.actionIcon, { backgroundColor: `${Colors.primary}12` }]}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionLabel}>Modifier le mot de passe</Text>
              <Text style={styles.actionSub}>Mettre à jour votre mot de passe</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.outlineVariant} />
          </TouchableOpacity>
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

      {/* Change password modal */}
      <Modal visible={pwdModal} animationType="slide" transparent onRequestClose={() => setPwdModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, { backgroundColor: `${Colors.primary}12` }]}>
                <Ionicons name="lock-closed-outline" size={22} color={Colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Modifier le mot de passe</Text>
            </View>

            {/* Current password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mot de passe actuel</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }, pwdErrors.current && styles.inputError]}
                  value={currentPwd}
                  onChangeText={(v) => { setCurrentPwd(v); setPwdErrors((e) => ({ ...e, current: '' })); }}
                  secureTextEntry={!showCurrent}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.outline}
                  autoFocus
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowCurrent((v) => !v)}>
                  <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.outline} />
                </TouchableOpacity>
              </View>
              {pwdErrors.current ? <Text style={styles.errorText}>{pwdErrors.current}</Text> : null}
            </View>

            {/* New password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nouveau mot de passe</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }, pwdErrors.new && styles.inputError]}
                  value={newPwd}
                  onChangeText={(v) => { setNewPwd(v); setPwdErrors((e) => ({ ...e, new: '', confirm: '' })); }}
                  secureTextEntry={!showNew}
                  placeholder="Min. 6 caractères"
                  placeholderTextColor={Colors.outline}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew((v) => !v)}>
                  <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.outline} />
                </TouchableOpacity>
              </View>
              {pwdErrors.new ? <Text style={styles.errorText}>{pwdErrors.new}</Text> : null}
            </View>

            {/* Confirm password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirmer le nouveau mot de passe</Text>
              <TextInput
                style={[styles.textInput, pwdErrors.confirm && styles.inputError]}
                value={confirmPwd}
                onChangeText={(v) => { setConfirmPwd(v); setPwdErrors((e) => ({ ...e, confirm: '' })); }}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={Colors.outline}
              />
              {pwdErrors.confirm ? <Text style={styles.errorText}>{pwdErrors.confirm}</Text> : null}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPwdModal(false)} disabled={pwdLoading}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword} disabled={pwdLoading}>
                {pwdLoading
                  ? <ActivityIndicator size="small" color={Colors.onPrimary} />
                  : <><Ionicons name="checkmark" size={18} color={Colors.onPrimary} /><Text style={styles.saveBtnText}>Enregistrer</Text></>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (C: typeof Colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.surface },

  headerBand: {
    backgroundColor: C.primary,
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
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  cardTitle: {
    fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleMd,
    color: C.onSurface, marginBottom: Spacing.md,
  },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 6 },
  infoIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: `${C.primary}10`, alignItems: 'center', justifyContent: 'center',
  },
  infoText: { flex: 1 },
  infoLabel: {
    fontFamily: FontFamily.body, fontSize: FontSize.labelMd,
    color: C.onSurfaceVariant,
  },
  infoValue: {
    fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd,
    color: C.onSurface, marginTop: 1,
  },
  sep: { height: 1, backgroundColor: C.surfaceContainerHigh, marginVertical: 4 },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 10 },
  actionIcon: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: {
    flex: 1, fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface,
  },
  actionSub: {
    fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.onSurfaceVariant, marginTop: 1,
  },

  /* Password modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.surfaceContainerLowest,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm,
  },
  modalHandle: {
    width: 36, height: 4, backgroundColor: C.outlineVariant,
    borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  modalIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd, color: C.onSurface },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.onSurfaceVariant, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  textInput: {
    backgroundColor: C.surfaceContainerLow, borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurface,
  },
  inputError: { borderWidth: 1.5, borderColor: C.error },
  eyeBtn: { padding: 6 },
  errorText: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.error, marginTop: 4 },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: BorderRadius.full,
    backgroundColor: C.surfaceContainerHigh, alignItems: 'center',
  },
  cancelBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant },
  saveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13, borderRadius: BorderRadius.full, backgroundColor: C.primary,
  },
  saveBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onPrimary },
});
