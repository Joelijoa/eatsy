import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize } from '../constants/typography';
import { usePreferences } from '../context/PreferencesContext';

type Props = { userName?: string };

export const WelcomeScreen: React.FC<Props> = ({ userName }) => {
  const insets = useSafeAreaInsets();
  const { t } = usePreferences();
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
        <Image source={require('../../assets/Icon2.0.png')} style={styles.logoImage} />
      </Animated.View>

      <Animated.View style={[styles.textWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.greeting}>
          {firstName ? `${t('welcome_greeting').replace('👋', '').trim()}, ${firstName} 👋` : t('welcome_greeting')}
        </Text>
        <Text style={styles.subtitle}>{t('welcome_tagline')}</Text>
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
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 18,
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
