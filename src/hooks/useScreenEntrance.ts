import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export const useScreenEntrance = () => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useFocusEffect(
    useCallback(() => {
      opacity.setValue(0);
      translateY.setValue(14);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 260,
        }),
      ]).start();
    }, []),
  );

  return { opacity, translateY };
};
