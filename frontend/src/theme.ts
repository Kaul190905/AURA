import { Platform, StyleSheet } from 'react-native';

// ── Color palette (mirrors CSS vars) ──────────────────────────────────────────
export const colors = {
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

// ── Neumorphic shadows ─────────────────────────────────────────────────────────
const NEU_DARK = 'rgba(163, 177, 198, 0.55)';
const NEU_LIGHT = 'rgba(255, 255, 255, 0.95)';

export const neu = Platform.select({
  ios: {
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    backgroundColor: colors.background,
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
  // Inset shadows are simulated using inner borders + darker backgrounds
};

// ── Typography ────────────────────────────────────────────────────────────────
export const fonts = {
  regular: { fontFamily: 'System', fontWeight: '400' as const },
  medium: { fontFamily: 'System', fontWeight: '500' as const },
  semibold: { fontFamily: 'System', fontWeight: '600' as const },
  bold: { fontFamily: 'System', fontWeight: '700' as const },
};

// ── Border radius ──────────────────────────────────────────────────────────────
export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  full: 999,
};

// ── Spacing ───────────────────────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};
