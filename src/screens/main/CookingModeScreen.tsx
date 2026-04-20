import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../../constants/typography';
import { getRecipe } from '../../services/recipeService';
import { Recipe } from '../../types';

type Props = { navigation: any; route: any };

export const CookingModeScreen: React.FC<Props> = ({ navigation, route }) => {
  const { recipeId } = route.params;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [customTimer, setCustomTimer] = useState(5 * 60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getRecipe(recipeId).then(setRecipe);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recipeId]);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setTimerRunning(false);
            Alert.alert('⏰ Minuteur', 'Le temps est écoulé !');
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
      <Text style={styles.loadingText}>Chargement...</Text>
    </View>
  );

  const totalSteps = recipe.instructions.length;
  const progress = (currentStep + 1) / totalSteps;
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;

  const startTimer = (secs: number) => {
    setTimerSeconds(secs);
    setTimerRunning(true);
  };

  const PRESET_TIMERS = [
    { label: '1min', secs: 60 },
    { label: '5min', secs: 300 },
    { label: '10min', secs: 600 },
    { label: '15min', secs: 900 },
  ];

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.recipeName} numberOfLines={1}>{recipe.name}</Text>
        <Text style={styles.stepCounter}>{currentStep + 1} / {totalSteps}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Main step */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.stepCard}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Étape {currentStep + 1}</Text>
          </View>
          <Text style={styles.stepText}>{recipe.instructions[currentStep]}</Text>
        </View>

        {/* Timer section */}
        <View style={styles.timerCard}>
          <Text style={styles.timerTitle}>⏱ Minuteur</Text>
          <Text style={styles.timerDisplay}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </Text>
          <View style={styles.timerPresets}>
            {PRESET_TIMERS.map((t) => (
              <TouchableOpacity
                key={t.label}
                style={styles.presetBtn}
                onPress={() => startTimer(t.secs)}
              >
                <Text style={styles.presetBtnText}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.timerControls}>
            <TouchableOpacity
              style={[styles.timerBtn, timerRunning && styles.timerBtnPause]}
              onPress={() => setTimerRunning(!timerRunning)}
            >
              <Text style={styles.timerBtnText}>{timerRunning ? '⏸ Pause' : '▶ Démarrer'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.timerBtnReset}
              onPress={() => { setTimerRunning(false); setTimerSeconds(0); }}
            >
              <Text style={styles.timerBtnResetText}>↺ Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Navigation */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, currentStep === 0 && styles.navBtnDisabled]}
            onPress={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
            disabled={currentStep === 0}
          >
            <Text style={styles.navBtnText}>← Précédent</Text>
          </TouchableOpacity>

          {currentStep < totalSteps - 1 ? (
            <TouchableOpacity
              style={styles.navBtnPrimary}
              onPress={() => setCurrentStep(currentStep + 1)}
            >
              <Text style={styles.navBtnPrimaryText}>Suivant →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.finishBtn}
              onPress={() => {
                Alert.alert('🎉 Bon appétit !', 'La recette est terminée.', [
                  { text: 'Terminer', onPress: () => navigation.goBack() },
                ]);
              }}
            >
              <Text style={styles.finishBtnText}>✅ Terminé !</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* All steps overview */}
        <View style={styles.overviewSection}>
          <Text style={styles.overviewTitle}>Toutes les étapes</Text>
          {recipe.instructions.map((step, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.overviewItem, currentStep === idx && styles.overviewItemActive]}
              onPress={() => setCurrentStep(idx)}
            >
              <View style={[styles.overviewNum, currentStep === idx && styles.overviewNumActive]}>
                <Text style={[styles.overviewNumText, currentStep === idx && styles.overviewNumTextActive]}>
                  {idx + 1}
                </Text>
              </View>
              <Text style={[styles.overviewText, currentStep === idx && styles.overviewTextActive]} numberOfLines={2}>
                {step}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.inverseSurface },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.inverseSurface },
  loadingText: { fontFamily: FontFamily.body, color: Colors.inverseOnSurface },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: Colors.inverseOnSurface, fontSize: 16 },
  recipeName: { fontFamily: FontFamily.headline, fontSize: FontSize.titleLg, color: Colors.inverseOnSurface, flex: 1, textAlign: 'center', marginHorizontal: Spacing.sm },
  stepCounter: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.inversePrimary },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: Spacing.lg, borderRadius: 2, marginBottom: Spacing.md },
  progressFill: { height: '100%', backgroundColor: Colors.inversePrimary, borderRadius: 2 },
  content: { flex: 1 },
  stepCard: {
    margin: Spacing.lg, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.xxl, padding: Spacing.xl,
  },
  stepBadge: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: Spacing.md,
  },
  stepBadgeText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.onPrimary },
  stepText: { fontFamily: FontFamily.headlineRegular, fontSize: FontSize.headlineSm, color: Colors.inverseOnSurface, lineHeight: 28 },
  timerCard: {
    marginHorizontal: Spacing.lg, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.xxl, padding: Spacing.lg, marginBottom: Spacing.md,
    alignItems: 'center',
  },
  timerTitle: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.bodyMd, color: Colors.inversePrimary, marginBottom: Spacing.sm },
  timerDisplay: { fontFamily: FontFamily.headlineBold, fontSize: 48, color: Colors.inverseOnSurface, letterSpacing: 2 },
  timerPresets: { flexDirection: 'row', gap: Spacing.xs, marginVertical: Spacing.md },
  presetBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.full,
  },
  presetBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.inverseOnSurface },
  timerControls: { flexDirection: 'row', gap: Spacing.sm },
  timerBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xl, paddingVertical: 10,
  },
  timerBtnPause: { backgroundColor: Colors.tertiary },
  timerBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onPrimary },
  timerBtnReset: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg, paddingVertical: 10,
  },
  timerBtnResetText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.inverseOnSurface },
  navRow: {
    flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg,
  },
  navBtn: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: BorderRadius.full,
    paddingVertical: 14, alignItems: 'center',
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.inverseOnSurface },
  navBtnPrimary: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: BorderRadius.full,
    paddingVertical: 14, alignItems: 'center',
  },
  navBtnPrimaryText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onPrimary },
  finishBtn: {
    flex: 1, backgroundColor: Colors.secondary, borderRadius: BorderRadius.full,
    paddingVertical: 14, alignItems: 'center',
  },
  finishBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.bodyMd, color: Colors.onPrimary },
  overviewSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  overviewTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.titleLg, color: Colors.inverseOnSurface, marginBottom: Spacing.sm },
  overviewItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl, marginBottom: Spacing.xs,
  },
  overviewItemActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  overviewNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  overviewNumActive: { backgroundColor: Colors.primary },
  overviewNumText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.labelMd, color: Colors.inverseOnSurface },
  overviewNumTextActive: { color: Colors.onPrimary },
  overviewText: { fontFamily: FontFamily.body, fontSize: FontSize.bodyMd, color: 'rgba(255,255,255,0.6)', flex: 1, lineHeight: 20 },
  overviewTextActive: { color: Colors.inverseOnSurface },
});
