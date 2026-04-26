import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Animated, Image, Platform,
} from 'react-native';
import { useColors } from './PreferencesContext';
import { FontFamily, FontSize, BorderRadius, Spacing } from '../constants/typography';

export type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: AlertButtonStyle;
}

export interface AlertConfig {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

interface AlertContextType {
  showAlert: (config: AlertConfig) => void;
}

const AlertContext = createContext<AlertContextType>({ showAlert: () => {} });

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const Colors = useColors();
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig>({ title: '' });
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const showAlert = useCallback((cfg: AlertConfig) => {
    setConfig(cfg);
    setVisible(true);
    scaleAnim.setValue(0.85);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 260 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, []);

  const dismiss = (onPress?: () => void) => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true, damping: 20, stiffness: 300 }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      onPress?.();
    });
  };

  const buttons: AlertButton[] = config.buttons?.length
    ? config.buttons
    : [{ text: 'OK', style: 'default' }];

  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  const actionBtns = buttons.filter((b) => b.style !== 'cancel');

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
        <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
          <Animated.View
            style={[
              styles.card,
              { backgroundColor: Colors.surfaceContainerLowest, transform: [{ scale: scaleAnim }] },
            ]}
          >
            {/* Logo */}
            <View style={[styles.logoWrap, { backgroundColor: `${Colors.primary}12` }]}>
              <Image
                source={require('../../assets/Icon2.0.png')}
                style={styles.logoImg}
              />
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: Colors.onSurface }]}>{config.title}</Text>

            {/* Message */}
            {config.message ? (
              <Text style={[styles.message, { color: Colors.onSurfaceVariant }]}>{config.message}</Text>
            ) : null}

            {/* Buttons */}
            <View style={styles.btnCol}>
              {actionBtns.map((btn, i) => {
                const isDestructive = btn.style === 'destructive';
                const bg = isDestructive ? Colors.error : Colors.primary;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.btnPrimary, { backgroundColor: bg }]}
                    onPress={() => dismiss(btn.onPress)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.btnPrimaryText, { color: Colors.onPrimary }]}>{btn.text}</Text>
                  </TouchableOpacity>
                );
              })}
              {cancelBtn && (
                <TouchableOpacity
                  style={[styles.btnCancel, { borderColor: Colors.outlineVariant }]}
                  onPress={() => dismiss(cancelBtn.onPress)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.btnCancelText, { color: Colors.onSurfaceVariant }]}>{cancelBtn.text}</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    width: '100%',
    borderRadius: 28,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24 },
      android: { elevation: 12 },
    }),
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
    overflow: 'hidden',
  },
  logoImg: {
    width: 72,
    height: 72,
  },
  title: {
    fontFamily: FontFamily.headlineBold,
    fontSize: FontSize.headlineSm,
    textAlign: 'center',
  },
  message: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.bodyMd,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xs,
  },
  btnCol: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  btnPrimary: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.bodyMd,
  },
  btnCancel: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  btnCancelText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.bodyMd,
  },
});
