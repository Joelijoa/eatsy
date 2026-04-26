import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@eatsy_login_attempts';

interface RateLimitState {
  attempts: number;
  lockedUntil: number | null;
}

function getLockoutDuration(attempts: number): number {
  if (attempts <= 3) return 0;
  if (attempts <= 5) return 30;       // 30s
  if (attempts <= 7) return 120;      // 2 min
  if (attempts <= 9) return 600;      // 10 min
  return 1800;                        // 30 min
}

export const useLoginRateLimit = () => {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback((until: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const tick = () => {
      const remaining = Math.ceil((until - Date.now()) / 1000);
      if (remaining <= 0) {
        setSecondsLeft(0);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setSecondsLeft(remaining);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      const state: RateLimitState = JSON.parse(raw);
      setAttempts(state.attempts);
      if (state.lockedUntil && state.lockedUntil > Date.now()) {
        startCountdown(state.lockedUntil);
      }
    });
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startCountdown]);

  const recordFailure = useCallback(async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const prev: RateLimitState = raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: null };
    const newAttempts = prev.attempts + 1;
    const duration = getLockoutDuration(newAttempts);
    const lockedUntil = duration > 0 ? Date.now() + duration * 1000 : null;
    const next: RateLimitState = { attempts: newAttempts, lockedUntil };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setAttempts(newAttempts);
    if (lockedUntil) startCountdown(lockedUntil);
  }, [startCountdown]);

  const recordSuccess = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setAttempts(0);
    setSecondsLeft(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const isLocked = secondsLeft > 0;

  const lockoutMessage = isLocked
    ? secondsLeft < 60
      ? `Trop de tentatives. Réessayez dans ${secondsLeft}s`
      : `Trop de tentatives. Réessayez dans ${Math.ceil(secondsLeft / 60)} min`
    : null;

  return { isLocked, secondsLeft, attempts, lockoutMessage, recordFailure, recordSuccess };
};
