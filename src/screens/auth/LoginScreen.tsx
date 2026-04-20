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
import { loginUser } from '../../services/authService';
import { RootStackParamList } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email requis';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email invalide';
    if (!password) e.password = 'Mot de passe requis';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await loginUser(email, password);
      navigation.replace('MainTabs');
    } catch (err: any) {
      Alert.alert('Erreur', err.message ?? 'Connexion échouée');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Decorative blob */}
        <View style={styles.blobTopRight} />
        <View style={styles.blobBottomLeft} />

        <View style={styles.card}>
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoIconText}>🍴</Text>
            </View>
            <Text style={styles.logoText}>Eatsy</Text>
            <Text style={styles.tagline}>Bienvenue à la table curatée.</Text>
          </View>

          {/* Form */}
          <EatsyInput
            label="Adresse e-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="hello@example.com"
            error={errors.email}
          />
          <EatsyInput
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="••••••••"
            error={errors.password}
            rightIcon={
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            }
            onRightIconPress={() => setShowPassword(!showPassword)}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotRow}
          >
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <EatsyButton
            label="Se connecter"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginBtn}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Sign up */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Nouveau ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.signupLink}>Créer un compte</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer links */}
        <View style={styles.footer}>
          <Text style={styles.footerLink}>Confidentialité</Text>
          <Text style={styles.footerDot}>·</Text>
          <Text style={styles.footerLink}>CGU</Text>
          <Text style={styles.footerDot}>·</Text>
          <Text style={styles.footerLink}>Aide</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.surface },
  content: {
    flexGrow: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  blobTopRight: {
    position: 'absolute',
    top: -40,
    right: -60,
    width: 200,
    height: 200,
    backgroundColor: `${Colors.secondaryContainer}40`,
    borderRadius: 100,
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -60,
    left: -80,
    width: 250,
    height: 250,
    backgroundColor: `${Colors.primaryFixed}30`,
    borderRadius: 125,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xxl + 8,
    padding: Spacing.xl,
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.06,
    shadowRadius: 32,
    elevation: 4,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoIconText: {
    fontSize: 36,
  },
  logoText: {
    fontFamily: FontFamily.headlineBold,
    fontSize: FontSize.displayLg,
    color: Colors.primary,
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -Spacing.xs,
    marginBottom: Spacing.lg,
  },
  forgotText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.bodyMd,
    color: Colors.secondary,
  },
  loginBtn: {
    marginTop: Spacing.xs,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: `${Colors.outlineVariant}40`,
  },
  dividerText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.labelMd,
    color: Colors.outline,
    marginHorizontal: Spacing.sm,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  signupLink: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.bodyMd,
    color: Colors.primary,
    textDecorationLine: 'underline',
    textDecorationColor: Colors.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
    gap: Spacing.xs,
  },
  footerLink: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.labelSm,
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footerDot: {
    color: Colors.outlineVariant,
  },
  eyeIcon: {
    fontSize: 18,
  },
});
