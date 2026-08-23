import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../AppContext';
import { colors, shadowSm, radius, spacing, fonts } from '../theme';
import { Activity, Clock, ThumbsUp, ThumbsDown, CircleCheck } from 'lucide-react-native';

interface Props {
  onDone: () => void;
}

export default function RecoverySummaryScreen({ onDone }: Props) {
  const styles = getStyles();
  const { risk, crisisRiskBefore, logEvent } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  const handleFeedback = (helpful: boolean) => {
    logEvent({
      trigger: 'self',
      score: risk.score,
      action: helpful ? 'ok' : 'dismissed',
      note: helpful ? 'Found recovery strategy helpful' : 'Did not find strategy helpful',
    });
    onDone();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <CircleCheck size={32} color={colors.primary} />
        </View>
        <Text style={styles.title}>Recovery Complete</Text>
        <Text style={styles.subtitle}>You've exited Reset Mode.</Text>
      </View>

      <View style={styles.content}>
        {/* Recovery Stats Card */}
        <View style={[styles.card, shadowSm]}>
          <View style={styles.statRow}>
             <View style={styles.statItem}>
                <Text style={styles.statLabel}>Risk Before</Text>
                <Text style={styles.statValue}>{crisisRiskBefore ?? 8}</Text>
             </View>
             <View style={styles.statDivider} />
             <View style={styles.statItem}>
                <Text style={styles.statLabel}>Risk After</Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>{risk.score}</Text>
             </View>
          </View>

          <View style={styles.detailRow}>
             <Clock size={16} color={colors.mutedForeground} />
             <Text style={styles.detailText}>Duration: <Text style={fonts.semibold}>8 mins</Text></Text>
          </View>

          <View style={styles.detailRow}>
             <Activity size={16} color={colors.mutedForeground} />
             <Text style={styles.detailText}>Strategy Used: <Text style={fonts.semibold}>Deep Breathing</Text></Text>
          </View>
        </View>

        {/* Feedback Section */}
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackTitle}>Was this helpful?</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.feedbackBtn, shadowSm]}
              activeOpacity={0.8}
              onPress={() => handleFeedback(true)}
            >
              <ThumbsUp size={24} color={colors.primary} />
              <Text style={styles.feedbackBtnText}>Yes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.feedbackBtn, shadowSm]}
              activeOpacity={0.8}
              onPress={() => handleFeedback(false)}
            >
              <ThumbsDown size={24} color={colors.riskHigh} />
              <Text style={styles.feedbackBtnText}>No</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const getStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    color: colors.foreground,
    ...fonts.bold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    ...fonts.medium,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.muted,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    color: colors.foreground,
    ...fonts.bold,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.muted,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailText: {
    fontSize: 14,
    color: colors.foreground,
  },
  feedbackContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  feedbackTitle: {
    fontSize: 16,
    color: colors.foreground,
    ...fonts.bold,
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    width: '100%',
    justifyContent: 'center',
  },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    width: 120,
  },
  feedbackBtnText: {
    fontSize: 16,
    color: colors.foreground,
    ...fonts.bold,
  },
});
