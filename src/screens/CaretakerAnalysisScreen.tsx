import React, { useContext, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrendingUp, Zap, Waves, BrainCircuit, Activity, Clock, Target, MapPin, Network, Star } from 'lucide-react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { AppContext } from '../AppContext';
import { Accordion, AccItem } from '../components/Accordion';
import { colors, neuSm, radius, spacing, fonts } from '../theme';
import { riskColor, timeAgo } from '../utils';

export default function CaretakerAnalysisScreen() {
  const { history, strategies } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<'7d' | '30d'>('7d');
  
  const cutoff = Date.now() - (range === '7d' ? 7 : 30) * 86400000;
  const filtered = history.filter((h) => h.time >= cutoff);

  // Reused average risk logic from HistoryInsightsScreen
  const perDay = useMemo(() => {
    const days = range === '7d' ? 7 : 14;
    return Array.from({ length: days }).map((_, i) => {
      const d = new Date(Date.now() - (days - 1 - i) * 86400000);
      const key = d.toLocaleDateString(undefined, { weekday: 'short' });
      const hits = filtered.filter((h) => new Date(h.time).toDateString() === d.toDateString());
      const avg = hits.length ? Math.round((hits.reduce((a, b) => a + b.score, 0) / hits.length) * 10) / 10 : 0;
      return { value: avg, label: key };
    });
  }, [filtered, range]);

  // Reused trigger breakdown logic
  const triggerBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((h) => m.set(h.trigger, (m.get(h.trigger) ?? 0) + 1));
    return Array.from(m.entries()).map(([name, value]) => ({ value, label: name.slice(0, 3) }));
  }, [filtered]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      
      {/* Top Bar Duplicate layout */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topLabel}>CAREGIVER VIEW</Text>
          <Text style={styles.greeting}>Analysis & Insights</Text>
        </View>
        <View style={[styles.sparkleBtn, neuSm]}>
          <BrainCircuit size={20} color={colors.primary} />
        </View>
      </View>

      {/* Range toggle - Exact Duplicate */}
      <View style={styles.rangeWrap}>
        {(['7d', '30d'] as const).map((r) => (
          <TouchableOpacity key={r} onPress={() => setRange(r)}
            style={[styles.rangeBtn, range === r && styles.rangeBtnActive]} activeOpacity={0.8}>
            <Text style={[styles.rangeBtnText, range === r && { color: colors.primary }]}>
              Last {r === '7d' ? '7 days' : '30 days'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <Accordion>
          <AccItem id="avg" title="Weekly Risk Trend" defaultOpen icon={<TrendingUp size={18} color={colors.primary} />}>
            <View style={{ marginTop: 8 }}>
              <LineChart
                data={perDay}
                height={120}
                width={280}
                color={colors.primary}
                thickness={2.5}
                showXAxisIndices
                xAxisLabelTextStyle={{ fontSize: 9, color: colors.mutedForeground }}
                hideYAxisText
                curved
                areaChart
                startFillColor={colors.primary}
                endFillColor={colors.background}
                startOpacity={0.25}
                endOpacity={0}
                maxValue={10}
              />
            </View>
          </AccItem>

          <AccItem id="top" title="Trigger Breakdown"
            icon={<Zap size={18} color={colors.primary} />}
            badge={<Text style={styles.badge}>{triggerBreakdown.length}</Text>}>
            <View style={{ marginTop: 8 }}>
              {triggerBreakdown.length > 0 ? (
                <BarChart
                  data={triggerBreakdown}
                  height={120}
                  width={280}
                  barWidth={28}
                  barBorderRadius={6}
                  frontColor={colors.primary}
                  xAxisLabelTextStyle={{ fontSize: 9, color: colors.mutedForeground }}
                  hideYAxisText
                  noOfSections={4}
                />
              ) : (
                <Text style={styles.emptyText}>No events in this range.</Text>
              )}
            </View>
          </AccItem>
          
          <AccItem id="peak" title="Peak Overload Times" icon={<Activity size={18} color={colors.primary} />}>
            <View style={{ gap: 8, marginTop: 8 }}>
              <View style={styles.factorItem}>
                <Text style={styles.factorText}>Afternoons (2 PM - 4 PM) show highest activity.</Text>
              </View>
            </View>
          </AccItem>
          
          <AccItem id="strat" title="Strategy Effectiveness" icon={<Target size={18} color={colors.primary} />}>
            <View style={{ gap: 8, marginTop: 8 }}>
              {strategies.slice(0, 3).map((s) => (
                <View key={s.id} style={styles.effRow}>
                  <Text style={styles.effTitle} numberOfLines={1}>{s.title}</Text>
                  <Text style={styles.effHelped}>
                    <Text style={{ color: colors.riskLow, ...fonts.semibold }}>{s.helped}</Text> helped
                  </Text>
                </View>
              ))}
            </View>
          </AccItem>
          
          <AccItem id="recovery" title="Recovery Duration" icon={<Clock size={18} color={colors.primary} />}>
            <View style={{ gap: 8, marginTop: 8 }}>
              <View style={styles.factorItem}>
                <Text style={styles.factorText}>Average recovery time: <Text style={fonts.semibold}>18 mins</Text></Text>
              </View>
            </View>
          </AccItem>

          <AccItem id="events" title="Recent Event History"
            icon={<Waves size={18} color={colors.primary} />}
            badge={<Text style={styles.badge}>{filtered.length}</Text>}>
            {filtered.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No events in this range.</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {filtered.map((h) => {
                  const c = riskColor(h.score);
                  return (
                    <View key={h.id} style={styles.eventRow}>
                      <View style={[styles.eventDot, { borderColor: c }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.eventTitle}>
                          {h.trigger} · <Text style={styles.eventAction}>{h.action}</Text>
                        </Text>
                        <Text style={styles.eventDate}>{new Date(h.time).toLocaleString()}</Text>
                        {h.note && <Text style={styles.eventNote}>"{h.note}"</Text>}
                      </View>
                      <Text style={[styles.eventScore, { color: c }]}>{h.score}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </AccItem>
          
          {/* Recovery Duration Trend */}
          <AccItem id="recovery" title="Recovery Duration Trend" icon={<Clock size={18} color={colors.primary} />}>
            <View style={{ marginTop: 8, alignItems: 'center' }}>
              <LineChart
                data={[{value: 12}, {value: 9}, {value: 14}, {value: 8}, {value: 6}, {value: 7}, {value: 8}]}
                height={120}
                width={280}
                color={colors.primary}
                thickness={2}
                hideYAxisText
                curved
                areaChart
                startFillColor={colors.primary}
                endFillColor={colors.background}
                startOpacity={0.25}
                endOpacity={0}
                maxValue={20}
              />
            </View>
          </AccItem>

          {/* Most Dangerous Locations */}
          <AccItem id="locations" title="High-Risk Locations" icon={<MapPin size={18} color={colors.primary} />}>
            <View style={{ gap: 12, marginTop: 8 }}>
              {[
                { name: 'Downtown Subway', risk: 'High', visits: 4 },
                { name: 'Shopping Mall', risk: 'Medium', visits: 2 }
              ].map((loc, i) => (
                <View key={i} style={[styles.eventRow, { justifyContent: 'space-between' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <MapPin size={18} color={colors.riskHigh} />
                    <View>
                      <Text style={[styles.eventTrigger, fonts.bold]}>{loc.name}</Text>
                      <Text style={styles.eventTime}>{loc.visits} visits this week</Text>
                    </View>
                  </View>
                  <View style={styles.riskBadge}>
                    <Text style={styles.riskBadgeText}>{loc.risk}</Text>
                  </View>
                </View>
              ))}
            </View>
          </AccItem>

          {/* Trigger Combination */}
          <AccItem id="triggerCombo" title="Trigger Combinations" icon={<Network size={18} color={colors.primary} />}>
            <View style={{ gap: 12, marginTop: 8 }}>
              <View style={[styles.eventRow, { alignItems: 'flex-start' }]}>
                <Zap size={16} color={colors.primary} />
                <View>
                   <Text style={[styles.eventTrigger, fonts.bold]}>Noise + Crowds</Text>
                   <Text style={styles.eventTime}>80% of overloads occur when these two triggers are combined.</Text>
                </View>
              </View>
            </View>
          </AccItem>

          {/* AI Recommendation */}
          <AccItem id="ai" title="Aura AI Insights" icon={<Star size={18} color={colors.primary} />} defaultOpen>
            <View style={{ gap: 8, marginTop: 8, padding: 12, backgroundColor: `${colors.primary}10`, borderRadius: radius.lg }}>
               <Text style={{ fontSize: 14, color: colors.foreground, ...fonts.medium }}>
                 Based on the past 7 days, Santosh's risk level spikes mostly in the afternoon. Deep Breathing exercises have been the most effective recovery tool. We suggest prompting a 5-minute preemptive break around 2:00 PM.
               </Text>
            </View>
          </AccItem>
        </Accordion>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
  },
  topLabel: { fontSize: 10, letterSpacing: 2, color: colors.mutedForeground, ...fonts.medium },
  greeting: { fontSize: 20, color: colors.foreground, ...fonts.bold },
  sparkleBtn: {
    width: 44, height: 44, borderRadius: radius.full,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
  },
  rangeWrap: {
    flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.md,
    backgroundColor: colors.muted, borderRadius: radius.xl, padding: 6,
  },
  rangeBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.lg },
  rangeBtnActive: { backgroundColor: colors.background, ...neuSm },
  rangeBtnText: { fontSize: 12, color: colors.mutedForeground, ...fonts.semibold },
  badge: { fontSize: 12, color: colors.mutedForeground, marginRight: 4 },
  emptyCard: { backgroundColor: colors.muted, borderRadius: radius.md, padding: 12 },
  emptyText: { fontSize: 12, color: colors.mutedForeground },
  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.muted, borderRadius: radius.md, padding: 10,
  },
  eventDot: { width: 28, height: 28, borderRadius: radius.full, borderWidth: 3, backgroundColor: colors.background },
  eventTitle: { fontSize: 12, color: colors.foreground, textTransform: 'capitalize', ...fonts.medium },
  eventAction: { color: colors.mutedForeground },
  eventDate: { fontSize: 10, color: colors.mutedForeground, marginTop: 1 },
  eventNote: { fontSize: 10, color: colors.foreground, opacity: 0.7, marginTop: 2, fontStyle: 'italic' },
  eventScore: { fontSize: 14, ...fonts.semibold },
  factorItem: {
    backgroundColor: colors.muted, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 12, marginBottom: 6,
  },
  factorText: { fontSize: 13, color: colors.foreground, opacity: 0.8 },
  effRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.muted, borderRadius: radius.md, padding: 10,
  },
  effTitle: { flex: 1, fontSize: 12, color: colors.foreground, ...fonts.medium, marginRight: 8 },
  effHelped: { fontSize: 10, color: colors.mutedForeground },
});
