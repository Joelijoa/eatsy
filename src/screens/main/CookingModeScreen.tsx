import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useColors } from '../../context/PreferencesContext';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { getRecipe } from '../../services/recipeService';
import { deductRecipeFromPantry } from '../../services/pantryService';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { Recipe } from '../../types';

type Props = { navigation: any; route: any };

const PRESET_TIMERS = [
  { label: '1 min', secs: 60 },
  { label: '5 min', secs: 300 },
  { label: '10 min', secs: 600 },
  { label: '15 min', secs: 900 },
];

export const CookingModeScreen: React.FC<Props> = ({ navigation, route }) => {
  const { recipeId } = route.params;
  const { user } = useAuth();
  const { t } = usePreferences();
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = createStyles(Colors);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const stepSlide = useRef(new Animated.Value(0)).current;
  const stepOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getRecipe(recipeId).then(setRecipe);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recipeId]);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(stepOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(stepSlide, { toValue: 16, duration: 120, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(stepOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(stepSlide, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 220 }),
      ]),
    ]).start();
  }, [currentStep]);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setTimerRunning(false);
            Alert.alert('Minuteur', 'Le temps est écoulé !');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  if (!recipe) return (
    <View style={styles.loading}>
      <Ionicons name="restaurant-outline" size={44} color={Colors.inversePrimary} />
      <Text style={styles.loadingText}>Chargement...</Text>
    </View>
  );

  const totalSteps = recipe.instructions.length;
  const progress = (currentStep + 1) / totalSteps;
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;

  const goNext = () => { if (currentStep < totalSteps - 1) setCurrentStep(s => s + 1); };
  const goPrev = () => { if (currentStep > 0) setCurrentStep(s => s - 1); };

  return (
    <Animated.View style={[styles.screen, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={Colors.inverseOnSurface} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.recipeName} numberOfLines={1}>{recipe.name}</Text>
          <Text style={styles.stepSubtitle}>Étape {currentStep + 1} sur {totalSteps}</Text>
        </View>
        <View style={styles.stepPill}>
          <Text style={styles.stepPillText}>{currentStep + 1}/{totalSteps}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step card */}
        <Animated.View style={[styles.stepCard, { opacity: stepOpacity, transform: [{ translateY: stepSlide }] }]}>
          <View style={styles.stepBadgeRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>Étape {currentStep + 1}</Text>
            </View>
            {currentStep === totalSteps - 1 && (
              <View style={styles.lastBadge}>
                <Ionicons name="flag" size={12} color={Colors.inversePrimary} />
                <Text style={styles.lastBadgeText}>Dernière étape</Text>
              </View>
            )}
          </View>
          <Text style={styles.stepText}>{recipe.instructions[currentStep]}</Text>
        </Animated.View>

        {/* Nav buttons */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, currentStep === 0 && styles.navBtnDisabled]}
            onPress={goPrev}
            disabled={currentStep === 0}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.inverseOnSurface} />
            <Text style={styles.navBtnText}>Précédent</Text>
          </TouchableOpacity>

          {currentStep < totalSteps - 1 ? (
            <TouchableOpacity style={styles.navBtnNext} onPress={goNext} activeOpacity={0.8}>
              <Text style={styles.navBtnNextText}>Suivant</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.onPrimary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.finishBtn}
              activeOpacity={0.8}
              onPress={() => {
                if (!user || !recipe?.ingredients?.length) {
                  Alert.alert(t('cooking_deduct_title'), 'La recette est terminée.', [
                    { text: t('cooking_deduct_no'), onPress: () => navigation.goBack() },
                  ]);
                  return;
                }
                Alert.alert(
                  t('cooking_deduct_title'),
                  t('cooking_deduct_question'),
                  [
                    { text: t('cooking_deduct_no'), style: 'cancel', onPress: () => navigation.goBack() },
                    {
                      text: t('cooking_deduct_yes'),
                      onPress: async () => {
                        try {
                          await deductRecipeFromPantry(user.uid, recipe.ingredients);
                        } catch {}
                        navigation.goBack();
                      },
                    },
                  ],
                );
              }}
            >
              <Ionicons name="checkmark-circle" size={20} color={Colors.onPrimary} />
              <Text style={styles.finishBtnText}>Terminer</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Timer */}
        <View style={styles.timerCard}>
          <View style={styles.timerHeader}>
            <Ionicons name="timer-outline" size={18} color={Colors.inversePrimary} />
            <Text style={styles.timerTitle}>Minuteur</Text>
          </View>
          <Text style={styles.timerDisplay}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </Text>
          <View style={styles.timerPresets}>
            {PRESET_TIMERS.map((t) => (
              <TouchableOpacity key={t.label} style={styles.presetBtn} onPress={() => { setTimerSeconds(t.secs); setTimerRunning(true); }}>
                <Text style={styles.presetBtnText}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.timerControls}>
            <TouchableOpacity
              style={[styles.timerBtn, timerRunning && styles.timerBtnActive]}
              onPress={() => setTimerRunning(r => !r)}
              activeOpacity={0.8}
            >
              <Ionicons name={timerRunning ? 'pause' : 'play'} size={17} color={Colors.onPrimary} />
              <Text style={styles.timerBtnText}>{timerRunning ? 'Pause' : 'Démarrer'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => { setTimerRunning(false); setTimerSeconds(0); }}
            >
              <Ionicons name="refresh" size={16} color={Colors.inverseOnSurface} />
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Steps overview */}
        <View style={styles.overviewSection}>
          <Text style={styles.overviewTitle}>Toutes les étapes</Text>
          {recipe.instructions.map((step, idx) => {
            const isDone = idx < currentStep;
            const isActive = idx === currentStep;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.overviewRow, isActive && styles.overviewRowActive]}
                onPress={() => setCurrentStep(idx)}
                activeOpacity={0.7}
              >
                <View style={[styles.overviewNum, isDone && styles.overviewNumDone, isActive && styles.overviewNumActive]}>
                  {isDone
                    ? <Ionicons name="checkmark" size={13} color={Colors.onPrimary} />
                    : <Text style={[styles.overviewNumText, isActive && { color: Colors.onPrimary }]}>{idx + 1}</Text>
                  }
                </View>
                <Text
                  style={[styles.overviewText, isActive && styles.overviewTextActive, isDone && styles.overviewTextDone]}
                  numberOfLines={2}
                >
                  {step}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </Animated.View>
  );
};

const createStyles = (C: typeof Colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.inverseSurface },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.inverseSurface, gap: Spacing.sm },
  loadingText: { fontFamily: FontFamily.body, color: C.inverseOnSurface },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20, flexShrink: 0,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  recipeName: { fontFamily: FontFamily.headlineBold, fontSize: FontSize.titleLg, color: C.inverseOnSurface },
  stepSubtitle: { fontFamily: FontFamily.body, fontSize: FontSize.labelMd, color: C.inversePrimary, marginTop: 2 },
  stepPill: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
  },
  stepPillText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.inverseOnSurface },

  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: Spacing.lg, borderRadius: 2, marginBottom: Spacing.md },
  progressFill: { height: '100%', backgroundColor: C.inversePrimary, borderRadius: 2 },

  content: { flex: 1 },

  stepCard: {
    margin: Spacing.lg, backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: BorderRadius.xxl, padding: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
  },
  stepBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.md },
  stepBadge: {
    backgroundColor: C.primary, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 5,
  },
  stepBadgeText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.onPrimary },
  lastBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
  },
  lastBadgeText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.labelSm, color: C.inversePrimary },
  stepText: { fontFamily: FontFamily.headlineRegular, fontSize: FontSize.headlineSm, color: C.inverseOnSurface, lineHeight: 28 },

  navRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  navBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: BorderRadius.full, paddingVertical: 14,
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.inverseOnSurface },
  navBtnNext: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: C.primary, borderRadius: BorderRadius.full, paddingVertical: 14,
  },
  navBtnNextText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onPrimary },
  finishBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.primaryContainer, borderRadius: BorderRadius.full, paddingVertical: 14,
  },
  finishBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onPrimary },

  timerCard: {
    marginHorizontal: Spacing.lg, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.xxl, padding: Spacing.lg, marginBottom: Spacing.md,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  timerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.xs },
  timerTitle: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.inversePrimary },
  timerDisplay: { fontFamily: FontFamily.headlineBold, fontSize: 54, color: C.inverseOnSurface, letterSpacing: 6, marginBottom: Spacing.md },
  timerPresets: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.md },
  presetBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: BorderRadius.full,
  },
  presetBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: C.inverseOnSurface },
  timerControls: { flexDirection: 'row', gap: Spacing.sm },
  timerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.primary, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xl, paddingVertical: 11,
  },
  timerBtnActive: { backgroundColor: C.tertiary },
  timerBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.onPrimary },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg, paddingVertical: 11,
  },
  resetBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: C.inverseOnSurface },

  overviewSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  overviewTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.titleLg, color: C.inverseOnSurface, marginBottom: Spacing.sm },
  overviewRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl, marginBottom: Spacing.xs,
  },
  overviewRowActive: { backgroundColor: 'rgba(255,255,255,0.07)' },
  overviewNum: {
    width: 28, height: 28, borderRadius: 14, flexShrink: 0,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  overviewNumActive: { backgroundColor: C.primary },
  overviewNumDone: { backgroundColor: C.primaryContainer },
  overviewNumText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: 'rgba(255,255,255,0.55)' },
  overviewText: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: 'rgba(255,255,255,0.45)', flex: 1, lineHeight: 20 },
  overviewTextActive: { color: C.inverseOnSurface, fontFamily: FontFamily.bodyMedium },
  overviewTextDone: { opacity: 0.4 },
});
