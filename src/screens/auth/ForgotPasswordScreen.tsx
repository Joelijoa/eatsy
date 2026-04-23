import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { useColors } from '../../context/PreferencesContext';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { EatsyButton } from '../../components/EatsyButton';
import { EatsyInput } from '../../components/EatsyInput';
import { resetPassword } from '../../services/authService';
import { RootStackParamList } from '../../types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'> };

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const Colors = useColors();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) return Alert.alert('Email requis');
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: any) {
      Alert.alert('Erreur', err.message ?? 'Échec de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(Colors);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <View style={styles.icon}>
          <Text style={styles.iconText}>🔑</Text>
        </View>

        <Text style={styles.title}>Mot de passe oublié ?</Text>
        <Text style={styles.desc}>
          Saisissez votre email et nous vous enverrons un lien de réinitialisation.
        </Text>

        {sent ? (
          <View style={styles.successCard}>
            <Text style={styles.successEmoji}>✅</Text>
            <Text style={styles.successTitle}>Email envoyé !</Text>
            <Text style={styles.successDesc}>Vérifiez votre boîte mail et suivez les instructions.</Text>
            <EatsyButton label="Retour à la connexion" onPress={() => navigation.navigate('Login')} style={styles.btn} />
          </View>
        ) : (
          <View style={styles.card}>
            <EatsyInput
              label="Adresse e-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="votre@email.com"
            />
            <EatsyButton label="Envoyer le lien" onPress={handleReset} loading={loading} style={styles.btn} />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const createStyles = (C: typeof Colors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.surface },
  container: { flex: 1, padding: Spacing.lg, paddingTop: Spacing.xl },
  backBtn: { marginBottom: Spacing.xl },
  backText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.primary },
  icon: {
    width: 80, height: 80, borderRadius: BorderRadius.xl,
    backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  iconText: { fontSize: 36 },
  title: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm, color: C.onSurface, marginBottom: Spacing.sm },
  desc: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant, lineHeight: 22, marginBottom: Spacing.xl },
  card: {
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xxl,
    padding: Spacing.xl, shadowColor: C.onSurface, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06, shadowRadius: 24, elevation: 3,
  },
  successCard: {
    backgroundColor: C.surfaceContainerLowest, borderRadius: BorderRadius.xxl,
    padding: Spacing.xl, alignItems: 'center',
    shadowColor: C.onSurface, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06, shadowRadius: 24, elevation: 3,
  },
  successEmoji: { fontSize: 48, marginBottom: Spacing.md },
  successTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.headlineMd, color: C.onSurface, marginBottom: Spacing.xs },
  successDesc: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: C.onSurfaceVariant, textAlign: 'center', marginBottom: Spacing.xl },
  btn: { marginTop: Spacing.sm },
});
