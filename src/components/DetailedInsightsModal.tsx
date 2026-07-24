import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, Clock, Star, BrainCircuit } from 'lucide-react-native';
import { colors, fonts, radius, spacing } from '../theme';
import { HistoryEvent, Strategy } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  history: HistoryEvent[];
  strategies: Strategy[];
}

export function DetailedInsightsModal({ visible, onClose, history, strategies }: Props) {
  const timeOfDayAnalysis = useMemo(() => {
    let m = 0, a = 0, e = 0, n = 0;
    history.filter(h => h.score >= 5).forEach(h => {
      const hour = new Date(h.time).getHours();
      if (hour >= 6 && hour < 12) m++;
      else if (hour >= 12 && hour < 17) a++;
      else if (hour >= 17 && hour < 22) e++;
      else n++;
    });
    return [
      { label: 'Morning (6am-12pm)', count: m },
      { label: 'Afternoon (12pm-5pm)', count: a },
      { label: 'Evening (5pm-10pm)', count: e },
      { label: 'Night (10pm-6am)', count: n },
    ].sort((x, y) => y.count - x.count);
  }, [history]);

  const effectiveStrategies = useMemo(() => {
    return [...strategies]
      .filter(s => s.tried > 0)
      .sort((a, b) => (b.helped / b.tried) - (a.helped / a.tried))
      .slice(0, 3);
  }, [strategies]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <BrainCircuit color={colors.primary} size={24} />
              <Text style={styles.title}>Detailed Caretaker Insights</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X color={colors.mutedForeground} size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}><Clock size={16} color={colors.primary} /> High-Risk Time of Day</Text>
              {timeOfDayAnalysis.map((t, i) => (
                <View key={i} style={styles.row}>
                  <Text style={styles.rowLabel}>{t.label}</Text>
                  <Text style={styles.rowValue}>{t.count} events</Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}><Star size={16} color={colors.primary} /> Most Effective Strategies</Text>
              {effectiveStrategies.map((s, i) => (
                <View key={s.id} style={styles.row}>
                  <Text style={styles.rowLabel}>{s.title}</Text>
                  <Text style={styles.rowValue}>{Math.round((s.helped/s.tried)*100)}% success</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    minHeight: '60%', padding: spacing.xl,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: { fontSize: 20, ...fonts.bold, color: colors.foreground },
  content: { flex: 1 },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16, ...fonts.semiBold, color: colors.foreground,
    marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 14, ...fonts.medium, color: colors.foreground, flex: 1 },
  rowValue: { fontSize: 14, ...fonts.semiBold, color: colors.primary },
});
