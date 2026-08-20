import { Platform } from 'react-native';

const lightBaseColors = {
  background: '#F8F9FA',
  foreground: '#111827',
  primary: '#4F46E5', // Vibrant Indigo
  primaryForeground: '#FFFFFF',
  muted: '#F3F4F6',
  mutedForeground: '#6B7280',
  border: '#E5E7EB',
  riskLow: '#10B981', // Emerald
  riskMed: '#F59E0B', // Amber
  riskHigh: '#EF4444', // Red
  riskLowSoft: '#D1FAE5',
  riskMedSoft: '#FEF3C7',
  riskHighSoft: '#FEE2E2',
  secondary: '#0EA5E9',
  accent: '#E0F2FE',
  white: '#FFFFFF',
};

const darkBaseColors = {
  background: '#0F172A',
  foreground: '#F8FAFC',
  primary: '#6366F1', // Lighter Indigo
  primaryForeground: '#FFFFFF',
  muted: '#1E293B',
  mutedForeground: '#94A3B8',
  border: '#334155',
  riskLow: '#34D399',
  riskMed: '#FBBF24',
  riskHigh: '#F87171',
  riskLowSoft: '#064E3B',
  riskMedSoft: '#78350F',
  riskHighSoft: '#7F1D1D',
  secondary: '#38BDF8',
  accent: '#0C4A6E',
  white: '#FFFFFF', // in dark mode, pure white is still useful for text on primary
};

const palettes = {
  light: {
    default: lightBaseColors,
    protanopia: {
      ...lightBaseColors,
      riskLow: '#3B82F6', // Blue
      riskMed: '#F59E0B', // Orange
      riskHigh: '#D946EF', // Purple
      riskLowSoft: '#DBEAFE',
      riskMedSoft: '#FEF3C7',
      riskHighSoft: '#FAE8FF',
    },
    deuteranopia: {
      ...lightBaseColors,
      riskLow: '#2563EB',
      riskMed: '#D97706',
      riskHigh: '#C2410C',
      riskLowSoft: '#DBEAFE',
      riskMedSoft: '#FEF3C7',
      riskHighSoft: '#FFEDD5',
      primary: '#4F46E5',
    },
    tritanopia: {
      ...lightBaseColors,
      riskLow: '#14B8A6',
      riskMed: '#EC4899',
      riskHigh: '#DC2626',
      riskLowSoft: '#CCFBF1',
      riskMedSoft: '#FCE7F3',
      riskHighSoft: '#FEE2E2',
      primary: '#4B5563',
    },
  },
  dark: {
    default: darkBaseColors,
    protanopia: {
      ...darkBaseColors,
      riskLow: '#60A5FA', // Lighter Blue
      riskMed: '#FBBF24', // Lighter Orange
      riskHigh: '#E879F9', // Lighter Purple
      riskLowSoft: '#1E3A8A',
      riskMedSoft: '#78350F',
      riskHighSoft: '#701A75',
    },
    deuteranopia: {
      ...darkBaseColors,
      riskLow: '#3B82F6',
      riskMed: '#F59E0B',
      riskHigh: '#EA580C',
      riskLowSoft: '#1E3A8A',
      riskMedSoft: '#78350F',
      riskHighSoft: '#7C2D12',
      primary: '#6366F1',
    },
    tritanopia: {
      ...darkBaseColors,
      riskLow: '#2DD4BF',
      riskMed: '#F472B6',
      riskHigh: '#F87171',
      riskLowSoft: '#134E4A',
      riskMedSoft: '#831843',
      riskHighSoft: '#7F1D1D',
      primary: '#9CA3AF',
    },
  },
};

export const colors = { ...lightBaseColors };

export function applyTheme(isDark: boolean, mode: 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia') {
  const themeType = isDark ? 'dark' : 'light';
  const palette = palettes[themeType][mode] || palettes[themeType].default;
  Object.assign(colors, palette);
}

export function applyColorVisionMode(mode: 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia') {
  // Backwards compatibility, but applyTheme should be used.
  applyTheme(false, mode);
}

// ── Modern shadows (Replacing Neumorphism) ──────────────────────────────────
export const shadow = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  android: {
    elevation: 4,
  },
}) as object;

export const shadowSm = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  android: {
    elevation: 2,
  },
}) as object;

// shadowInset mapped to a subtle border
export const shadowInset = {
  borderWidth: 1,
  borderColor: colors.border, // Note: this isn't strictly dynamic on theme change, components should override or avoid if needed
};

export const fonts = {
  regular: { fontFamily: 'System', fontWeight: '400' as const },
  medium: { fontFamily: 'System', fontWeight: '500' as const },
  semibold: { fontFamily: 'System', fontWeight: '600' as const },
  bold: { fontFamily: 'System', fontWeight: '700' as const },
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24, // increased for a squircle look
  full: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};
