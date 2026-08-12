import React, { useContext, useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrendingUp, Zap, AudioWaveform, MapPin, ChevronLeft } from 'lucide-react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { AppContext } from '../AppContext';
import { Header } from '../components/Header';
import { colors, neuSm, radius, spacing, fonts } from '../theme';
import { riskColor, timeAgo } from '../utils';
import {
  getRiskTrend, getOverloadForecast,
  RiskTrendResponse, OverloadForecastResponse,
} from '../services/api';

export default function HistoryInsightsScreen({ route }: any) {
  const styles = getStyles();
  const { history, userId: contextUserId } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const userId = route?.params?.userId || contextUserId;
  const [range, setRange] = useState<'7d' | '30d'>('7d');
  const cutoff = Date.now() - (range === '7d' ? 7 : 30) * 86400000;
  const filtered = history.filter((h) => h.time >= cutoff);
  const recentEvents = filtered.slice(0, 3); // Only show top 3 on summary

  // ── Backend data ────────────────────────────────────────────────────────────
  const [riskTrend, setRiskTrend] = useState<RiskTrendResponse | null>(null);
  const [forecast, setForecast] = useState<OverloadForecastResponse | null>(null);
  const [apiLoading, setApiLoading] = useState(false);

  const fetchBackendData = useCallback(async () => {
    if (!userId) { return; }
    setApiLoading(true);
    try {
      const [trendResult, fcResult] = await Promise.allSettled([
        getRiskTrend(userId, range === '7d' ? 7 : 30),
        getOverloadForecast(userId),
      ]);
      if (trendResult.status === 'fulfilled') { setRiskTrend(trendResult.value); }
      if (fcResult.status === 'fulfilled') { setForecast(fcResult.value); }
    } catch (e) {
      console.warn('[AURA] History API fetch failed:', e);
    } finally {
      setApiLoading(false);
    }
  }, [userId, range]);

  useEffect(() => {
    fetchBackendData();
  }, [fetchBackendData]);

  // ── Local computed data (fallback / supplement) ──────────────────────────────
  const perDay = useMemo(() => {
    // Use API trend data if available, else fall back to local history
    if (riskTrend?.trend?.length) {
      return riskTrend.trend.map((t) => ({
        value: t.avg_risk_score,
        label: new Date(t.date).toLocaleDateString(undefined, { weekday: 'short' }),
      }));
    }
    const days = range === '7d' ? 7 : 14;
    return Array.from({ length: days }).map((_, i) => {
      const d = new Date(Date.now() - (days - 1 - i) * 86400000);
      const key = d.toLocaleDateString(undefined, { weekday: 'short' });
      const hits = filtered.filter((h) => new Date(h.time).toDateString() === d.toDateString());
      const avg = hits.length ? Math.round((hits.reduce((a, b) => a + b.score, 0) / hits.length) * 10) / 10 : 0;
      return { value: avg, label: key };
    });
  }, [filtered, range, riskTrend]);

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

      {apiLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Loading backend data…</Text>
        </View>
      )}

      {/* ML Overload Forecast card */}
      {forecast && (
        <View style={[styles.forecastCard, { borderColor: `${colors.primary}30` }]}>
          <TrendingUp size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.forecastTitle}>Overload Forecast</Text>
            <Text style={styles.forecastDesc}>
              {Math.round(forecast.overload_probability * 100)}% probability · Trajectory:{' '}
              <Text style={{ color: forecast.risk_trajectory === 'rising' ? colors.riskHigh : colors.riskLow }}>
                {forecast.risk_trajectory}
              </Text>
            </Text>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Average risk */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Average risk</Text>
            </View>
          </View>
          <View style={styles.sectionCard}>
            <View style={{ alignItems: 'center', marginVertical: 8 }}>
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
          </View>
        </View>

        {/* Top triggers */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Zap size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Top triggers</Text>
            </View>
            <Text style={styles.badge}>{triggerBreakdown.length}</Text>
          </View>
          <View style={styles.sectionCard}>
            <View style={{ alignItems: 'center', marginVertical: 8 }}>
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
          </View>
        </View>

        {/* Past events */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AudioWaveform size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Past events</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('PastEvents')}>
              <Text style={styles.viewAllText}>View all ({filtered.length})</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sectionCard}>
            {recentEvents.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No events in this range.</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {recentEvents.map((h, i) => {
                  const c = riskColor(h.score);
                  return (
                    <React.Fragment key={h.id}>
                      <View style={styles.navRow}>
                        <View style={[styles.eventDot, { borderColor: c }]} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.eventTitle}>
                            {h.trigger} · <Text style={styles.eventAction}>{h.action}</Text>
                          </Text>
                          <Text style={styles.eventDate}>{new Date(h.time).toLocaleString()}</Text>
                          {h.note && <Text style={styles.eventNote}>"{h.note}"</Text>}
                        </View>
                        <Text style={[styles.eventScore, { color: c }]}>{h.score}</Text>
                      </View>
                      {i < recentEvents.length - 1 && <View style={styles.divider} />}
                    </React.Fragment>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* High Risk Locations */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MapPin size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>High-risk locations</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Locations')}>
              <Text style={styles.viewAllText}>View details</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sectionCard}>
            <View style={styles.navRow}>
              <View style={styles.iconContainer}>
                <MapPin size={20} color={colors.riskHigh} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.eventTitle}>Downtown Transit Center</Text>
                <Text style={styles.eventDate}>Highest risk area</Text>
              </View>
              <ChevronLeft size={16} color={colors.mutedForeground} style={{ transform: [{ rotate: '180deg' }] }} />
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const getStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  loadingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  loadingText: { fontSize: 12, color: colors.mutedForeground },
  forecastCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    backgroundColor: `${colors.primary}08`, borderRadius: radius.xl,
    padding: spacing.md, borderWidth: 1,
  },
  forecastTitle: { fontSize: 13, color: colors.foreground, ...fonts.bold },
  forecastDesc: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  sectionContainer: { marginBottom: 28, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 14, color: colors.foreground, ...fonts.semibold },
  sectionCard: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border + '80',
    shadowColor: colors.primary,
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  navRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 4,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12, opacity: 0.5 },
  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.muted, borderRadius: radius.md, padding: 10,
  },
  eventDot: { width: 14, height: 14, borderRadius: radius.full, borderWidth: 3, backgroundColor: colors.background },
  eventTitle: { fontSize: 13, color: colors.foreground, textTransform: 'capitalize', ...fonts.semibold },
  eventAction: { color: colors.mutedForeground },
  eventDate: { fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
  eventNote: { fontSize: 11, color: colors.foreground, opacity: 0.8, marginTop: 4, fontStyle: 'italic' },
  eventScore: { fontSize: 16, ...fonts.bold },
  riskBadge: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: radius.sm, backgroundColor: `${colors.primary}20`,
  },
  riskBadgeText: { fontSize: 11, color: colors.primary, ...fonts.bold },
  viewAllText: { fontSize: 13, color: colors.primary, ...fonts.semibold },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.riskHigh + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
