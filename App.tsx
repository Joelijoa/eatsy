import React, { useEffect, useState } from 'react';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_700Bold,
} from '@expo-google-fonts/be-vietnam-pro';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { PreferencesProvider } from './src/context/PreferencesContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { Colors } from './src/constants/colors';

const LOADING_PHRASES = [
  'Préparation de vos recettes…',
  'Calcul de votre budget hebdomadaire…',
  'Chargement de votre planning…',
  'Cuisinez malin avec Eatsy.',
  'Votre semaine culinaire se prépare…',
  'Synchronisation de vos listes de courses…',
  'Bienvenue dans votre cuisine intelligente.',
];

function SplashScreen() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const opacity = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const cycle = () => {
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setPhraseIdx((prev) => (prev + 1) % LOADING_PHRASES.length);
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
    };
    const timer = setInterval(cycle, 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={splash.container}>
      {/* Background blobs */}
      <View style={splash.blob1} />
      <View style={splash.blob2} />

      {/* Logo */}
      <View style={splash.logoWrap}>
        <View style={splash.logoIcon}>
          <Text style={splash.logoEmoji}>🍽</Text>
        </View>
        <Text style={splash.logoText}>Eatsy</Text>
        <Text style={splash.tagline}>Planifiez · Cuisinez · Économisez</Text>
      </View>

      {/* Loading indicator */}
      <View style={splash.loaderSection}>
        <View style={splash.dotsRow}>
          {[0, 1, 2].map((i) => (
            <LoadingDot key={i} delay={i * 220} />
          ))}
        </View>
        <Animated.Text style={[splash.phrase, { opacity }]}>
          {LOADING_PHRASES[phraseIdx]}
        </Animated.Text>
      </View>
    </View>
  );
}

function LoadingDot({ delay }: { delay: number }) {
  const scale = React.useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.6, duration: 400, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return <Animated.View style={[splash.dot, { transform: [{ scale }] }]} />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_700Bold,
  });

  if (!fontsLoaded) return <SplashScreen />;

  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}

const splash = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 80, overflow: 'hidden',
  },
  blob1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.08)', top: -80, right: -60,
  },
  blob2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)', bottom: 60, left: -50,
  },
  logoWrap: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  logoIcon: {
    width: 90, height: 90, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
  },
  logoEmoji: { fontSize: 40 },
  logoText: {
    fontSize: 48, color: '#fff', letterSpacing: -2,
    fontWeight: '800', marginBottom: 8,
  },
  tagline: {
    fontSize: 14, color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.5, fontWeight: '500',
  },
  loaderSection: { alignItems: 'center', gap: 16 },
  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.7)' },
  phrase: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', maxWidth: 280, lineHeight: 20 },
});
