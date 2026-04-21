import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize } from '../constants/typography';

const LOGO_SVG = `<svg viewBox="0 0 690 270" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="680" height="260" rx="20" fill="#F0EFEA"/>
  <rect x="52" y="38" width="130" height="184" rx="32" fill="#1A2E1A"/>
  <rect x="95" y="68" width="4.5" height="46" rx="2.25" fill="#4CAF50"/>
  <rect x="114.5" y="68" width="4.5" height="46" rx="2.25" fill="#4CAF50"/>
  <rect x="134" y="68" width="4.5" height="46" rx="2.25" fill="#4CAF50"/>
  <path d="M97.25 114 Q97.25 126 116.75 129 Q136.25 126 136.25 114" fill="none" stroke="#4CAF50" stroke-width="4.5" stroke-linecap="round"/>
  <rect x="114.5" y="127" width="4.5" height="72" rx="2.25" fill="#4CAF50"/>
  <circle cx="116.75" cy="210" r="9.5" fill="#FF9800"/>
  <text x="212" y="148" font-family="Georgia, serif" font-size="72" font-weight="700" fill="#1A2E1A" letter-spacing="-2">Eatsy</text>
  <rect x="226" y="158" width="38" height="3.5" rx="1.75" fill="#008080"/>
  <text x="213" y="188" font-family="Arial, sans-serif" font-size="13.5" fill="#73796F" letter-spacing="3">MEAL PLANNER &amp; BUDGET</text>
</svg>`;

type Props = { userName?: string };

export const WelcomeScreen: React.FC<Props> = ({ userName }) => {
  const insets = useSafeAreaInsets();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, damping: 18, stiffness: 160, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 180, useNativeDriver: true }),
    ]).start();
  }, []);

  const firstName = userName
    ? userName.includes('@') ? userName.split('@')[0] : userName.split(' ')[0]
    : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.decor1} />
      <View style={styles.decor2} />
      <View style={styles.decor3} />

      <Animated.View style={[styles.logoCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <SvgXml xml={LOGO_SVG} width={240} height={110} />
      </Animated.View>

      <Animated.View style={[styles.textWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.greeting}>
          {firstName ? `Bienvenue, ${firstName} 👋` : 'Bienvenue 👋'}
        </Text>
        <Text style={styles.subtitle}>Planifiez · Cuisinez · Économisez</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', gap: 32,
  },
  decor1: {
    position: 'absolute', width: 340, height: 340, borderRadius: 170,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -100, right: -80,
  },
  decor2: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: 60, left: -60,
  },
  decor3: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)', bottom: 200, right: 30,
  },
  logoCard: {
    backgroundColor: '#F0EFEA',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  textWrap: { alignItems: 'center', gap: 8 },
  greeting: {
    fontFamily: FontFamily.headlineBold, fontSize: FontSize.displaySm,
    color: '#fff', letterSpacing: -0.5, textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.body, fontSize: FontSize.bodyMd,
    color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5,
  },
});
