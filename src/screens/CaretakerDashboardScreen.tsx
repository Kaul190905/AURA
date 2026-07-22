import React, { useContext, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrendingUp, Star, Edit3, Plus } from 'lucide-react-native';
import { BarChart } from 'react-native-gifted-charts';
import { AppContext } from '../../App';
import { Header } from '../components/Header';
import { Accordion, AccItem } from '../components/Accordion';
import { colors, neuSm, radius, spacing, fonts } from '../theme';

interface Props { onExit: () => void; }

export default function CaretakerDashboardScreen({ onExit }: Props) {
  const { history, strategies, accommodations, setAccommodations } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [note, setNote] = useState('');

  const weekAgo = Date.now() - 7 * 86400000;
  const week = history.filter((h) => h.time >= weekAgo);
  const highs = week.filter((h) => h.score >= 5).length;
  const triggerCounts = week.reduce<Record<string, number>>((acc, h) => {
    acc[h.trigger] = (acc[h.trigger] ?? 0) + 1; return acc;
  }, {});
  const topTrigger = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  const hourly = useMemo(() => {
    const buckets = Array.from({ length: 6 }).map((_, i) => ({
      label: `${i * 4}-${i * 4 + 4}`, value: 0,
    }));
    week.forEach((h) => {
      const hr = new Date(h.time).getHours();
      buckets[Math.floor(hr / 4)].value++;
    });
    return buckets;
  }, [week]);

  const addNote = () => {
    if (!note.trim()) return;
    setAccommodations([{
      id: Math.random().toString(36).slice(2), time: Date.now(), text: note.trim(),
    }, ...accommodations]);
    setNote('');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Caretaker view" subtitle="Week overview" onBack={onExit} />

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard label="High-risk" value={String(highs)} />
        <StatCard label="Events" value={String(week.length)} />
        <StatCard label="Top" value={topTrigger} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Accordion>
          <AccItem id="peak" title="Peak times this week" defaultOpen icon={<TrendingUp size={18} color={colors.primary} />}>
            <View style={{ marginTop: 8 }}>
              <BarChart
                data={hourly}
                height={120}
                width={280}
                barWidth={28}
                barBorderRadius={6}
                frontColor={colors.primary}
                xAxisLabelTextStyle={{ fontSize: 9, color: colors.mutedForeground }}
                hideYAxisText
                noOfSections={4}
              />
            </View>
          </AccItem>

          <AccItem id="eff" title="Strategy effectiveness" icon={<Star size={18} color={colors.primary} />}>
            <View style={{ gap: 8, marginTop: 8 }}>
              {strategies.slice(0, 5).map((s) => (
                <View key={s.id} style={styles.effRow}>
                  <Text style={styles.effTitle} numberOfLines={1}>{s.title}</Text>
                  <Text style={styles.effHelped}>
                    <Text style={{ color: colors.riskLow, ...fonts.semibold }}>{s.helped}</Text> helped
                  </Text>
                </View>
              ))}
            </View>
          </AccItem>

          <AccItem id="acc" title="Accommodations log"
            icon={<Edit3 size={18} color={colors.primary} />}
            badge={<Text style={styles.badge}>{accommodations.length}</Text>}>
            <View style={{ gap: 8, marginTop: 8 }}>
              {accommodations.map((a) => (
                <View key={a.id} style={styles.accCard}>
                  <Text style={styles.accText}>{a.text}</Text>
                  <Text style={styles.accDate}>{new Date(a.time).toLocaleDateString()}</Text>
                </View>
              ))}
              <View style={styles.noteRow}>
                <Edit3 size={14} color={colors.mutedForeground} />
                <TextInput
                  value={note} onChangeText={setNote}
                  placeholder="Add a note"
                  placeholderTextColor={colors.mutedForeground}
                  style={styles.noteInput}
                />
                <TouchableOpacity onPress={addNote} style={styles.noteAddBtn} activeOpacity={0.85}>
                  <Text style={styles.noteAddBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </AccItem>
        </Accordion>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={[styles.statCard, neuSm]}>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.background, borderRadius: radius.lg, padding: 12 },
  statLabel: { fontSize: 9, letterSpacing: 2, color: colors.mutedForeground, ...fonts.medium },
  statValue: { fontSize: 15, color: colors.foreground, marginTop: 4, ...fonts.bold, textTransform: 'capitalize' },
  badge: { fontSize: 12, color: colors.mutedForeground, marginRight: 4 },
  effRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.muted, borderRadius: radius.md, padding: 10,
  },
  effTitle: { flex: 1, fontSize: 12, color: colors.foreground, ...fonts.medium, marginRight: 8 },
  effHelped: { fontSize: 10, color: colors.mutedForeground },
  accCard: { backgroundColor: colors.muted, borderRadius: radius.md, padding: 12 },
  accText: { fontSize: 12, color: colors.foreground },
  accDate: { fontSize: 10, color: colors.mutedForeground, marginTop: 3 },
  noteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.muted, borderRadius: radius.md, padding: 10,
  },
  noteInput: { flex: 1, fontSize: 12, color: colors.foreground },
  noteAddBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.full, elevation: 2,
  },
  noteAddBtnText: { fontSize: 10, color: '#fff', ...fonts.semibold },
});
