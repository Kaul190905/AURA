import { Platform, StyleSheet } from 'react-native';

const baseColors = {
  background: '#EEF0F5',
  foreground: '#2D2E40',
  primary: '#6B72C9',
  primaryForeground: '#FFFFFF',
  muted: '#E4E6EF',
  mutedForeground: '#7A7F9A',
  border: '#DDE0ED',
  riskLow: '#4CAF82',
  riskMed: '#E0A83A',
  riskHigh: '#E06B3A',
  riskLowSoft: '#D6F0E4',
  riskMedSoft: '#FDF1D8',
  riskHighSoft: '#FAE3D8',
  secondary: '#86C6C0',
  accent: '#D5F0EE',
  white: '#FFFFFF',
};

const palettes = {
  default: baseColors,
  protanopia: {
    ...baseColors,
    riskLow: '#3B82F6', // Blue
    riskMed: '#F59E0B', // Orange
    riskHigh: '#D946EF', // Purple
    riskLowSoft: '#DBEAFE',
    riskMedSoft: '#FEF3C7',
    riskHighSoft: '#FAE8FF',
  },
  deuteranopia: {
    ...baseColors,
    riskLow: '#2563EB', // Strong Blue
    riskMed: '#D97706', // Amber
    riskHigh: '#C2410C', // Dark Orange/Red
    riskLowSoft: '#DBEAFE',
    riskMedSoft: '#FEF3C7',
    riskHighSoft: '#FFEDD5',
    primary: '#4F46E5', // Indigo
  },
  tritanopia: {
    ...baseColors,
    riskLow: '#14B8A6', // Teal
    riskMed: '#EC4899', // Pink
    riskHigh: '#DC2626', // Red
    riskLowSoft: '#CCFBF1',
    riskMedSoft: '#FCE7F3',
    riskHighSoft: '#FEE2E2',
    primary: '#4B5563', // Gray
  },
};

export const colors = { ...baseColors };

export function applyColorVisionMode(mode: 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia') {
  const palette = palettes[mode] || palettes.default;
  Object.assign(colors, palette);
}

// ── Neumorphic shadows ─────────────────────────────────────────────────────────
const NEU_DARK = 'rgba(163, 177, 198, 0.55)';
const NEU_LIGHT = 'rgba(255, 255, 255, 0.95)';

export const neu = Platform.select({
  ios: {
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    backgroundColor: colors.background, // NOTE: dynamically evaluating this is tough unless wrapped
  },
  android: {
    elevation: 6,
    backgroundColor: colors.background,
  },
}) as object;

export const neuSm = Platform.select({
  ios: {
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    backgroundColor: colors.background,
  },
  android: {
    elevation: 4,
    backgroundColor: colors.background,
  },
}) as object;

export const neuInset = {
  backgroundColor: colors.background,
};

export const fonts = {
  regular: { fontFamily: 'System', fontWeight: '400' as const },
  medium: { fontFamily: 'System', fontWeight: '500' as const },
  semibold: { fontFamily: 'System', fontWeight: '600' as const },
  bold: { fontFamily: 'System', fontWeight: '700' as const },
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  full: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};
