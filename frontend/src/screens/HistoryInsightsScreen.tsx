import React, { useContext, useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrendingUp, Zap, Waves } from 'lucide-react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { AppContext } from '../../App';
import { Header } from '../components/Header';
import { Accordion, AccItem } from '../components/Accordion';
import { colors, neuSm, radius, spacing, fonts } from '../theme';
import { riskColor, timeAgo } from '../utils';
import { getRiskTrend, RiskTrendResponse } from '../api/riskService';

export default function HistoryInsightsScreen() {
  const { history, userId } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<'7d' | '30d'>('7d');
  const cutoff = Date.now() - (range === '7d' ? 7 : 30) * 86400000;
  const filtered = history.filter((h) => h.time >= cutoff);

  // ── Backend risk trend data ────────────────────────────────────────────────
  const [trendData, setTrendData] = useState<RiskTrendResponse | null>(null);

  useEffect(() => {
    const days = range === '7d' ? 7 : 30;
    getRiskTrend(userId, days)
      .then((res) => {
        if (res && res.status !== 'not_implemented') {
          setTrendData(res);
        }
      })
      .catch(() => {});
  }, [range, userId]);

  // ── Chart data: merge backend trend with local history averages ───────────
  const perDay = useMemo(() => {
    const days = range === '7d' ? 7 : 14;

    // Build a date-keyed map from the backend trend, if available
    const backendByDate = new Map<string, number>();
    if (trendData?.trend) {
      for (const entry of trendData.trend) {
        backendByDate.set(entry.date.slice(0, 10), entry.avg_score);
      }
    }

    return Array.from({ length: days }).map((_, i) => {
      const d = new Date(Date.now() - (days - 1 - i) * 86400000);
      const dateKey = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, { weekday: 'short' });

      // Prefer backend trend score when available
      if (backendByDate.has(dateKey)) {
        return { value: backendByDate.get(dateKey)!, label };
      }

      // Fall back to local history average
      const hits = filtered.filter((h) => new Date(h.time).toDateString() === d.toDateString());
      const avg = hits.length
        ? Math.round((hits.reduce((a, b) => a + b.score, 0) / hits.length) * 10) / 10
        : 0;
      return { value: avg, label };
    });
  }, [filtered, range, trendData]);

  const triggerBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((h) => m.set(h.trigger, (m.get(h.trigger) ?? 0) + 1));
    return Array.from(m.entries()).map(([name, value]) => ({ value, label: name.slice(0, 3) }));
  }, [filtered]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Insights" subtitle="Your patterns" />

      {/* Range toggle */}
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
          <AccItem id="avg" title="Average risk" defaultOpen icon={<TrendingUp size={18} color={colors.primary} />}>
            <View style={{ marginTop: 8 }}>
              {trendData?.trend && (
                <Text style={styles.sourceLabel}>↑ Backend trend data</Text>
              )}
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

          <AccItem id="top" title="Top triggers"
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

          <AccItem id="events" title="Past events"
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
        </Accordion>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  rangeWrap: {
    flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.md,
    backgroundColor: colors.muted, borderRadius: radius.xl, padding: 6,
  },
  rangeBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.lg },
  rangeBtnActive: { backgroundColor: colors.background, ...neuSm },
  rangeBtnText: { fontSize: 12, color: colors.mutedForeground, ...fonts.semibold },
  badge: { fontSize: 12, color: colors.mutedForeground, marginRight: 4 },
  sourceLabel: { fontSize: 10, color: colors.primary, marginBottom: 4, opacity: 0.7 },
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
});
