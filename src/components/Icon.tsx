import React from 'react';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
}

export const Icon: React.FC<Props> = ({ name, size = 24, color = '#1a1c1b' }) => (
  <Ionicons name={name} size={size} color={color} />
);
