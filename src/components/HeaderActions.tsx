import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/colors';
import { useColors } from '../context/PreferencesContext';
import { FontFamily, FontSize } from '../constants/typography';

type Props = {
  navigation: any;
  tint?: string;
};

export const HeaderActions: React.FC<Props> = ({ navigation, tint = 'rgba(255,255,255,0.9)' }) => {
  const { user } = useAuth();
  const Colors = useColors();

  const initials = user?.displayName
    ? user.displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'E';

  const styles = createStyles(Colors);

  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Settings')}>
        <Ionicons name="settings-outline" size={20} color={tint} />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.avatar]} onPress={() => navigation.navigate('Profile')}>
        <Text style={styles.avatarText}>{initials}</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (C: typeof Colors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarText: {
    fontFamily: FontFamily.headlineBold,
    fontSize: FontSize.labelMd,
    color: '#fff',
    letterSpacing: 0.5,
  },
});
