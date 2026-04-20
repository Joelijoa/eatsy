import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { EatsyButton } from '../../components/EatsyButton';
import { EatsyInput } from '../../components/EatsyInput';
import { registerUser } from '../../services/authService';
import { RootStackParamList } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
};

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nom requis';
    if (!email.trim()) e.email = 'Email requis';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email invalide';
    if (!password) e.password = 'Mot de passe requis';
    else if (password.length < 6) e.password = 'Au moins 6 caractères';
    if (password !== confirm) e.confirm = 'Les mots de passe ne correspondent pas';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await registerUser(email, password, name);
      navigation.replace('MainTabs');
    } catch (err: any) {
      Alert.alert('Erreur', err.message ?? 'Inscription échouée');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.blobTopRight} />

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Rejoignez la table curatée.</Text>
        </View>

        <View style={styles.card}>
          <EatsyInput label="Nom complet" value={name} onChangeText={setName} placeholder="Marie Dupont" error={errors.name} autoCapitalize="words" />
          <EatsyInput label="Adresse e-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="marie@example.com" error={errors.email} />
          <EatsyInput label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry placeholder="Min. 6 caractères" error={errors.password} />
          <EatsyInput label="Confirmer le mot de passe" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="••••••••" error={errors.confirm} />

          <EatsyButton label="Créer mon compte" onPress={handleRegister} loading={loading} style={styles.btn} />

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Déjà inscrit ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.surface },
  content: { flexGrow: 1, padding: Spacing.lg, paddingTop: Spacing.xl },
  blobTopRight: {
    position: 'absolute', top: -30, right: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: `${Colors.secondaryContainer}40`,
  },
  backBtn: { marginBottom: Spacing.lg },
  backText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.primary },
  header: { marginBottom: Spacing.xl },
  title: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.displayMd, color: Colors.onSurface, letterSpacing: -0.5 },
  subtitle: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant, marginTop: 4 },
  card: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xxl,
    padding: Spacing.xl, shadowColor: Colors.onSurface, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06, shadowRadius: 24, elevation: 3,
  },
  btn: { marginTop: Spacing.md },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  loginText: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  loginLink: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.primary, textDecorationLine: 'underline' },
});
