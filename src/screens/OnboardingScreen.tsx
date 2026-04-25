import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, Animated, Platform, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../constants/typography';
import { usePreferences } from '../context/PreferencesContext';

// Palette alignée sur le design system (vert primaire / vert secondaire / orange tertiaire)
const SLIDE_COLORS = [
  { color: Colors.primary,          bg: Colors.primaryFixed,      decor: Colors.primaryContainer },
  { color: Colors.tertiary,         bg: '#fdf3e7',                decor: Colors.tertiaryContainer },
  { color: Colors.secondary,        bg: Colors.secondaryContainer, decor: Colors.secondary },
];

export const ONBOARDING_KEY = 'eatsy_onboarding_done';

const { width: W, height: H } = Dimensions.get('window');

const SLIDES_BASE = [
  { id: '1', icon: 'calendar-outline'   as const, ...SLIDE_COLORS[0], tk: 1 },
  { id: '2', icon: 'wallet-outline'     as const, ...SLIDE_COLORS[1], tk: 2 },
  { id: '3', icon: 'restaurant-outline' as const, ...SLIDE_COLORS[2], tk: 3 },
];

type Props = { navigation: any };

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = usePreferences();
  const SLIDES = SLIDES_BASE.map((s) => ({
    ...s,
    title: t(`onboarding_slide${s.tk}_title` as any),
    desc:  t(`onboarding_slide${s.tk}_desc`  as any),
  }));
  const [activeIdx, setActiveIdx] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const dotAnims = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;

  const goTo = (idx: number) => {
    flatRef.current?.scrollToIndex({ index: idx, animated: true });
    dotAnims.forEach((a, i) => {
      Animated.spring(a, {
        toValue: i === idx ? 1 : 0,
        useNativeDriver: false,
        damping: 18,
        stiffness: 200,
      }).start();
    });
    setActiveIdx(idx);
  };

  const finish = () => {
    AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(() => {});
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const isLast = activeIdx === SLIDES.length - 1;

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => (
    <View style={[styles.slide, { width: W }]}>
      {/* Decorative blobs */}
      <View style={[styles.blob1, { backgroundColor: `${item.decor}18` }]} />
      <View style={[styles.blob2, { backgroundColor: `${item.decor}10` }]} />

      {/* Illustration area */}
      <View style={styles.illustrationArea}>
        <View style={[styles.iconRingOuter, { backgroundColor: `${item.color}14` }]}>
          <View style={[styles.iconRingInner, { backgroundColor: `${item.color}22` }]}>
            <View style={[styles.iconCircle, { backgroundColor: `${item.color}30` }]}>
              <Ionicons name={item.icon} size={64} color={item.color} />
            </View>
          </View>
        </View>
      </View>

      {/* Text */}
      <View style={styles.textArea}>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideDesc}>{item.desc}</Text>
      </View>
    </View>
  );

  const slide = SLIDES[activeIdx];

  return (
    <View style={[styles.screen, { backgroundColor: Colors.surface }]}>

      {/* Skip */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={{ width: 60 }} />
        <View style={styles.logoRow}>
          <View style={styles.logoIconWrap}>
            <Image source={require('../../assets/icon2.0.png')} style={styles.logoIconImage} />
          </View>
          <Text style={styles.logoLabel}>Eatsy</Text>
        </View>
        <TouchableOpacity style={styles.skipBtn} onPress={finish}>
          <Text style={styles.skipText}>{t('onboarding_skip')}</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / W);
          goTo(idx);
        }}
        getItemLayout={(_, index) => ({ length: W, offset: W * index, index })}
        style={{ flex: 1 }}
      />

      {/* Bottom */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => {
            const width = dotAnims[i].interpolate({ inputRange: [0, 1], outputRange: [8, 24] });
            const bg    = dotAnims[i].interpolate({ inputRange: [0, 1], outputRange: [Colors.outlineVariant, slide.color] });
            return (
              <TouchableOpacity key={i} onPress={() => goTo(i)} activeOpacity={0.7}>
                <Animated.View style={[styles.dot, { width, backgroundColor: bg }]} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: slide.color }]}
          onPress={isLast ? finish : () => goTo(activeIdx + 1)}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>{isLast ? t('onboarding_start') : t('onboarding_next')}</Text>
          <Ionicons
            name={isLast ? 'arrow-forward-circle-outline' : 'chevron-forward'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>

        {/* Step indicator */}
        <Text style={styles.stepText}>{activeIdx + 1} / {SLIDES.length}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  logoIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: `${Colors.primary}18`,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  logoIconImage: { width: 32, height: 32 },
  logoLabel: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg, color: Colors.primary },
  skipBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  skipText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },

  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, overflow: 'hidden' },
  blob1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    top: -60, right: -80,
  },
  blob2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    bottom: 40, left: -60,
  },

  illustrationArea: { alignItems: 'center', marginBottom: Spacing.xl + 8 },
  iconRingOuter: { width: 220, height: 220, borderRadius: 110, alignItems: 'center', justifyContent: 'center' },
  iconRingInner: { width: 180, height: 180, borderRadius: 90, alignItems: 'center', justifyContent: 'center' },
  iconCircle:    { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center' },

  textArea: { alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.sm },
  slideTitle: { fontFamily: FontFamily.headlineBold, fontSize: 26, color: Colors.onSurface, textAlign: 'center', letterSpacing: -0.5 },
  slideDesc:  { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 24, maxWidth: 300 },

  bottom: { paddingHorizontal: Spacing.lg, alignItems: 'center', gap: Spacing.md },
  dotsRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },

  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: W - Spacing.lg * 2, paddingVertical: 16,
    borderRadius: BorderRadius.full,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  ctaText: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.bodyMd, color: '#fff' },
  stepText: { fontFamily: FontFamily.body, fontSize: FontSize.labelSm, color: Colors.outlineVariant },
});
