import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { colors, neu, neuSm, radius, spacing, fonts } from '../theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function Header({ title, subtitle, onBack, right }: HeaderProps) {
  return (
    <View style={styles.container}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
      )}
      <View style={styles.titleWrap}>
        {subtitle && <Text style={styles.subtitle}>{subtitle.toUpperCase()}</Text>}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...neuSm,
  },
  backArrow: {
    fontSize: 18,
    color: colors.foreground,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  subtitle: {
    fontSize: 10,
    letterSpacing: 2,
    color: colors.mutedForeground,
    ...fonts.medium,
  },
  title: {
    fontSize: 20,
    color: colors.foreground,
    ...fonts.bold,
  },
});
