import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, TextInput, ActivityIndicator, Animated,
} from 'react-native';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { signOut, updatePassword, updateProfile, sendEmailVerification, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { usePreferences, useColors } from '../../context/PreferencesContext';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';

type Props = { navigation: any };

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const { user } = useAuth();
  const { t } = usePreferences();
  const { opacity, translateY } = useScreenEntrance();

  const [pwdModal, setPwdModal]       = useState(false);
  const [currentPwd, setCurrentPwd]   = useState('');
  const [newPwd, setNewPwd]           = useState('');
  const [confirmPwd, setConfirmPwd]   = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [pwdLoading, setPwdLoading]   = useState(false);
  const [pwdErrors, setPwdErrors]     = useState<Record<string, string>>({});

  const [editModal, setEditModal]     = useState(false);
  const [editName, setEditName]       = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [verifSent, setVerifSent]     = useState(false);
  const [isVerifiedLocal, setIsVerifiedLocal] = useState(user?.emailVerified ?? false);
  const [refreshingVerif, setRefreshingVerif] = useState(false);

  // Reload auth user on focus to pick up email verification done outside the app
  useFocusEffect(useCallback(() => {
    auth.currentUser?.reload().then(() => {
      setIsVerifiedLocal(auth.currentUser?.emailVerified ?? false);
    });
  }, []));

  const initials = user?.displayName
    ? user.displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'E';

  const memberSince = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
    : '—';


  const openEditModal = () => {
    setEditName(user?.displayName ?? '');
    setEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!user || !editName.trim()) return;
    setEditLoading(true);
    try {
      await updateProfile(user, { displayName: editName.trim() });
      setEditModal(false);
    } catch (err: any) {
      Alert.alert('Erreur', err.message ?? 'Impossible de modifier le profil');
    } finally {
      setEditLoading(false);
    }
  };

  const handleSendVerification = async () => {
    if (!user || verifSent) return;
    try {
      await sendEmailVerification(user);
      setVerifSent(true);
      Alert.alert('Email envoyé', `Un lien de vérification a été envoyé à ${user.email}. Cliquez sur le lien puis revenez ici.`);
    } catch (err: any) {
      if ((err as any).code === 'auth/too-many-requests') {
        Alert.alert('Trop de tentatives', 'Attendez quelques minutes avant de renvoyer un email.');
      } else {
        Alert.alert('Erreur', err.message ?? 'Impossible d\'envoyer l\'email de vérification');
      }
    }
  };

  const handleCheckVerification = async () => {
    if (!user) return;
    setRefreshingVerif(true);
    try {
      await auth.currentUser?.reload();
      const verified = auth.currentUser?.emailVerified ?? false;
      setIsVerifiedLocal(verified);
      if (verified) {
        setVerifSent(false);
        Alert.alert('Email vérifié ✓', 'Votre adresse e-mail a bien été vérifiée.');
      } else {
        Alert.alert('Pas encore vérifié', 'Cliquez sur le lien dans l\'email de vérification puis réessayez.');
      }
    } finally {
      setRefreshingVerif(false);
    }
  };

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
          <Text style={styles.headerTitle}>Profil</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.profileBlock}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={styles.profileName}>{user?.displayName ?? 'Chef'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>
      </View>

      {/* ── Floating strip ── */}
      <View style={styles.strip}>
        <View style={styles.stripItem}>
          <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
          <View style={styles.stripTexts}>
            <Text style={styles.stripValue}>{memberSince}</Text>
            <Text style={styles.stripLabel}>membre depuis</Text>
          </View>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Ionicons
            name={isVerifiedLocal ? 'shield-checkmark-outline' : 'shield-outline'}
            size={14}
            color={isVerifiedLocal ? Colors.secondary : Colors.tertiary}
          />
          <View style={styles.stripTexts}>
            <Text style={[styles.stripValue, { color: isVerifiedLocal ? Colors.secondary : Colors.tertiary }]}>
              {isVerifiedLocal ? 'Vérifié' : 'Non vérifié'}
            </Text>
            <Text style={styles.stripLabel}>statut email</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >

        {/* ── Informations ── */}
        <View style={styles.groupLabel}>
          <Ionicons name="person-outline" size={13} color={Colors.onSurfaceVariant} />
          <Text style={styles.groupLabelText}>INFORMATIONS DU COMPTE</Text>
        </View>
        <View style={styles.card}>
          {[
            { icon: 'person-circle-outline' as const, label: 'Nom affiché',    value: user?.displayName ?? '—' },
            { icon: 'mail-outline'          as const, label: 'Adresse e-mail', value: user?.email ?? '—' },
          ].map((row, idx) => (
            <View key={row.label} style={[styles.infoRow, idx > 0 && styles.rowBorder]}>
              <View style={styles.infoIconWrap}>
                <Ionicons name={row.icon} size={17} color={Colors.primary} />
              </View>
              <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            </View>
          ))}
          <View style={styles.rowBorder} />
          <TouchableOpacity style={styles.actionRow} onPress={openEditModal} activeOpacity={0.78}>
            <View style={[styles.actionIconWrap, { backgroundColor: `${Colors.primary}14` }]}>
              <Ionicons name="create-outline" size={17} color={Colors.primary} />
            </View>
            <View style={styles.actionBody}>
              <Text style={styles.actionLabel}>Modifier le profil</Text>
              <Text style={styles.actionSub}>Changer votre nom affiché</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.outlineVariant} />
          </TouchableOpacity>
        </View>

        {/* ── Sécurité ── */}
        <View style={styles.groupLabel}>
          <Ionicons name="lock-closed-outline" size={13} color={Colors.onSurfaceVariant} />
          <Text style={styles.groupLabelText}>SÉCURITÉ</Text>
        </View>
        <View style={styles.card}>
          <TouchableOpacity style={styles.actionRow} onPress={openPwdModal} activeOpacity={0.78}>
            <View style={[styles.actionIconWrap, { backgroundColor: `${Colors.primary}14` }]}>
              <Ionicons name="lock-closed-outline" size={17} color={Colors.primary} />
            </View>
            <View style={styles.actionBody}>
              <Text style={styles.actionLabel}>Modifier le mot de passe</Text>
              <Text style={styles.actionSub}>Mettre à jour vos identifiants</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.outlineVariant} />
          </TouchableOpacity>
          {!isVerifiedLocal && (
            <>
              <View style={styles.rowBorder} />
              <TouchableOpacity
                style={styles.actionRow}
                onPress={handleSendVerification}
                disabled={verifSent}
                activeOpacity={0.78}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: `${Colors.tertiary}14` }]}>
                  <Ionicons name="mail-unread-outline" size={17} color={Colors.tertiary} />
                </View>
                <View style={styles.actionBody}>
                  <Text style={[styles.actionLabel, { color: Colors.tertiary }]}>Vérifier l'adresse e-mail</Text>
                  <Text style={styles.actionSub}>
                    {verifSent ? 'Email envoyé — vérifiez votre boîte' : 'Un lien sera envoyé à votre adresse'}
                  </Text>
                </View>
                {verifSent
                  ? <Ionicons name="checkmark-circle" size={18} color={Colors.secondary} />
                  : <Ionicons name="chevron-forward" size={16} color={Colors.tertiary} style={{ opacity: 0.6 }} />
                }
              </TouchableOpacity>
              {verifSent && (
                <>
                  <View style={styles.rowBorder} />
                  <TouchableOpacity
                    style={styles.actionRow}
                    onPress={handleCheckVerification}
                    disabled={refreshingVerif}
                    activeOpacity={0.78}
                  >
                    <View style={[styles.actionIconWrap, { backgroundColor: `${Colors.secondary}14` }]}>
                      {refreshingVerif
                        ? <ActivityIndicator size="small" color={Colors.secondary} />
                        : <Ionicons name="refresh-outline" size={17} color={Colors.secondary} />
                      }
                    </View>
                    <View style={styles.actionBody}>
                      <Text style={[styles.actionLabel, { color: Colors.secondary }]}>J'ai vérifié mon email</Text>
                      <Text style={styles.actionSub}>Appuyez ici après avoir cliqué sur le lien</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>

        {/* ── Actions ── */}
        <View style={styles.groupLabel}>
          <Ionicons name="grid-outline" size={13} color={Colors.onSurfaceVariant} />
          <Text style={styles.groupLabelText}>ACTIONS</Text>
        </View>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => { navigation.goBack(); navigation.navigate('Settings'); }}
            activeOpacity={0.78}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: `${Colors.primary}14` }]}>
              <Ionicons name="settings-outline" size={17} color={Colors.primary} />
            </View>
            <Text style={styles.actionLabelSimple}>Paramètres</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.outlineVariant} />
          </TouchableOpacity>
          <View style={styles.rowBorder} />
          <TouchableOpacity style={styles.actionRow} onPress={handleLogout} activeOpacity={0.78}>
            <View style={[styles.actionIconWrap, { backgroundColor: `${Colors.error}12` }]}>
              <Ionicons name="log-out-outline" size={17} color={Colors.error} />
            </View>
            <Text style={[styles.actionLabelSimple, { color: Colors.error }]}>{t('settings_logout')}</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.error} style={{ opacity: 0.4 }} />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── Modifier le profil ── */}
      <Modal visible={editModal} animationType="slide" transparent onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalIconWrap}>
              <Ionicons name="person-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Modifier le profil</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom affiché</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Votre nom"
                placeholderTextColor={Colors.outline}
                autoFocus
                autoCapitalize="words"
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(false)} disabled={editLoading}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, !editName.trim() && { opacity: 0.45 }]}
                onPress={handleSaveProfile}
                disabled={editLoading || !editName.trim()}
              >
                {editLoading
                  ? <ActivityIndicator size="small" color={Colors.onPrimary} />
                  : <><Ionicons name="checkmark" size={18} color={Colors.onPrimary} /><Text style={styles.saveBtnText}>Enregistrer</Text></>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modifier le mot de passe ── */}
      <Modal visible={pwdModal} animationType="slide" transparent onRequestClose={() => setPwdModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalIconWrap}>
              <Ionicons name="lock-closed-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Modifier le mot de passe</Text>

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
  avatarText: { fontFamily: FontFamily.headlineBold, fontSize: 26, color: '#fff', letterSpacing: 1 },
  profileName: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineSm, color: '#fff' },
  profileEmail: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: 'rgba(255,255,255,0.7)' },

  // ── Floating strip ──
  strip: {
    flexDirection: 'row', marginHorizontal: Spacing.lg, marginTop: -24,
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xxl,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
    zIndex: 1,
  },
  stripItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  stripTexts: { gap: 1 },
  stripValue: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  stripLabel: { fontFamily: FontFamily.body, fontSize: 10, color: C.onSurfaceVariant },
  stripDivider: { width: 1, height: 32, backgroundColor: C.surfaceContainerHigh, alignSelf: 'center', marginHorizontal: Spacing.sm },

  // ── Scroll ──
  scroll: { paddingTop: Spacing.lg },

  // ── Group label ──
  groupLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.lg + 4, marginBottom: 6, marginTop: 4,
  },
  groupLabelText: { fontFamily: FontFamily.bodyBold, fontSize: 10, color: C.onSurfaceVariant, letterSpacing: 1 },

  // ── Card ──
  card: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xxl,
    paddingHorizontal: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.surfaceContainerHigh },

  // ── Info rows ──
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 14 },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: `${C.primary}12`, alignItems: 'center', justifyContent: 'center',
  },
  infoTexts: { flex: 1 },
  infoLabel: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.onSurfaceVariant },
  infoValue: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface, marginTop: 1 },

  // ── Action rows ──
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 14 },
  actionIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actionBody: { flex: 1 },
  actionLabel: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },
  actionSub: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.onSurfaceVariant, marginTop: 1 },
  actionLabelSimple: { flex: 1, fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurface },

  // ── Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.surfaceContainerLowest,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm,
  },
  modalHandle: { width: 36, height: 4, backgroundColor: C.outlineVariant, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  modalIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: `${C.primary}15`, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: Spacing.sm,
  },
  modalTitle: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.headlineMd, color: C.onSurface, textAlign: 'center', marginBottom: Spacing.lg },
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
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: BorderRadius.full, backgroundColor: C.surfaceContainerHigh, alignItems: 'center' },
  cancelBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant },
  saveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: BorderRadius.full, backgroundColor: C.primary },
  saveBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onPrimary },
});
