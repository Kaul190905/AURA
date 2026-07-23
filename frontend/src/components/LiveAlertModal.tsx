import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, neuSm, radius, spacing, fonts } from '../theme';
import { Strategy } from '../types';
import { Wind, Sparkles, X } from 'lucide-react-native';
import { computeRisk } from '../utils';

interface Props {
  suggestions: Strategy[];
  risk: ReturnType<typeof computeRisk>;
  onTry: () => void;
  onDismiss: () => void;
  onOk: () => void;
  onCrisis: () => void;
}

export default function LiveAlertModal({ suggestions, risk, onTry, onDismiss, onOk, onCrisis }: Props) {
  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        {/* Header */}
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Wind size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetTitle}>A gentle check-in</Text>
            <Text style={styles.sheetSub} numberOfLines={1}>
              Because {risk.factors[0]?.label.toLowerCase() ?? 'levels are rising'}
            </Text>
          </View>
          <TouchableOpacity onPress={onDismiss} style={styles.closeBtn} activeOpacity={0.8}>
            <X size={16} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <Text style={styles.question}>Would any of these help right now?</Text>

        {suggestions.map((s) => (
          <View key={s.id} style={styles.suggestion}>
            <View style={styles.suggIcon}>
              <Sparkles size={14} color={colors.primary} />
            </View>
            <Text style={styles.suggText}>{s.title}</Text>
          </View>
        ))}

        <View style={styles.actions}>
          <TouchableOpacity onPress={onTry} style={[styles.btn, styles.btnPrimary]} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>Try it</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onOk} style={[styles.btn, styles.btnSecondary]} activeOpacity={0.85}>
            <Text style={styles.btnSecondaryText}>I'm OK</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDismiss} style={[styles.btn, styles.btnSecondary]} activeOpacity={0.85}>
            <Text style={styles.btnSecondaryText}>Dismiss</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onCrisis} style={{ marginTop: 10, alignItems: 'center' }}>
          <Text style={styles.calmLink}>Open calm mode</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
    padding: spacing.lg,
    paddingBottom: 32,
  },
  sheet: {
    backgroundColor: colors.background,
    borderRadius: radius.xl + 4,
    padding: spacing.xl,
    ...neuSm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...neuSm,
  },
  sheetTitle: {
    fontSize: 15,
    color: colors.foreground,
    ...fonts.semibold,
  },
  sheetSub: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...neuSm,
  },
  question: {
    fontSize: 13,
    color: colors.foreground,
    opacity: 0.8,
    marginBottom: spacing.sm,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  suggIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...neuSm,
  },
  suggText: {
    flex: 1,
    fontSize: 13,
    color: colors.foreground,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 13,
    ...fonts.semibold,
  },
  btnSecondary: {
    backgroundColor: colors.background,
    ...neuSm,
  },
  btnSecondaryText: {
    color: colors.foreground,
    fontSize: 13,
    ...fonts.medium,
  },
  calmLink: {
    fontSize: 12,
    color: colors.mutedForeground,
    textDecorationLine: 'underline',
  },
});

const { spacing: _ } = { spacing };
