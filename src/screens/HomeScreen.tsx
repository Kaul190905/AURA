import React, { useContext, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star, Heart, TrendingUp, Zap, AudioWaveform, Bell, Mic, CalendarDays, ChevronRight } from 'lucide-react-native';
import { LineChart } from 'react-native-gifted-charts';

import { AppContext } from '../AppContext';
import { Accordion, AccItem } from '../components/Accordion';
import { colors, neuSm, radius, spacing, fonts } from '../theme';
import { riskColor, riskLabel, timeAgo } from '../utils';
import { TRIGGERS } from '../data';

export default function HomeScreen() {
  const { risk, selfReport, setSelfReport, history, setIsNotificationCenterOpen, notifications, bleConnected, navigateTo } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  const unreadCount = notifications.filter(n => !n.read).length;
  const riskC = riskColor(risk.score);

  const todayData = useMemo(() => {
    const rows = history.slice(0, 8).reverse().map((h) => ({ value: h.score }));
    rows.push({ value: risk.score });
    return rows;
  }, [history, risk.score]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.topLabel}>AURA</Text>
            {!bleConnected && (
               <View style={{ backgroundColor: colors.muted, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                 <Text style={{ fontSize: 8, color: colors.mutedForeground, ...fonts.bold }}>OFFLINE</Text>
               </View>
            )}
          </View>
          <Text style={styles.greeting}>Hi, how are you?</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity 
            style={[styles.sparkleBtn, neuSm]}
            onPress={() => setIsNotificationCenterOpen(true)}
            activeOpacity={0.8}
          >
            <Bell size={20} color={colors.primary} />
            {unreadCount > 0 && <View style={styles.unreadBadge} />}
          </TouchableOpacity>
          <View style={[styles.sparkleBtn, neuSm]}>
            <Star size={20} color={colors.primary} />
          </View>
        </View>
      </View>

      {/* Risk card */}
      <View style={[styles.riskCard, neuSm]}>
        {/* Ring */}
        <View style={styles.ringOuter}>
          <View style={[styles.ringInner, { borderColor: riskC }]}>
            <Text style={[styles.riskScore, { color: riskC }]}>{risk.score}</Text>
            <Text style={styles.riskLevelLabel}>{riskLabel(risk.level)}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.riskSubLabel}>Current level</Text>
          <Text style={styles.riskLevelText}>{risk.level}</Text>
          {risk.factors[0] && (
            <Text style={styles.riskFactor} numberOfLines={2}>{risk.factors[0].label}</Text>
          )}
        </View>
      </View>

      {/* Accordion sections */}
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <Accordion>
          {/* Check in */}
          <AccItem id="checkin" title="Check in with yourself" defaultOpen
            icon={<Heart size={18} color={colors.primary} />}
            badge={<Text style={styles.badgePrimary}>{selfReport}/5</Text>}>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>Calm</Text>
              <Slider
                style={{ flex: 1 }}
                minimumValue={1} maximumValue={5} step={1}
                value={selfReport}
                onValueChange={(v) => setSelfReport(Math.round(v))}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.primary}
              />
              <Text style={styles.sliderLabel}>A lot</Text>
            </View>
            <Text style={styles.sliderHint}>Sliding updates your risk score live.</Text>
          </AccItem>

          {/* Today's trend */}
          <AccItem id="today" title="Today's trend" icon={<TrendingUp size={18} color={colors.primary} />}>
            <View style={{ marginTop: 8 }}>
              <LineChart
                data={todayData}
                height={100}
                width={280}
                color={colors.primary}
                thickness={2.5}
                hideDataPoints
                hideYAxisText
                hideAxesAndRules
                curved
                areaChart
                startFillColor={colors.primary}
                endFillColor={colors.background}
                startOpacity={0.2}
                endOpacity={0}
              />
              <View style={styles.chartLabels}>
                <Text style={styles.chartLabel}>Earlier</Text>
                <Text style={styles.chartLabel}>Now</Text>
              </View>
            </View>
          </AccItem>

          {/* Factors */}
          <AccItem id="factors" title="What's affecting you"
            icon={<Zap size={18} color={colors.primary} />}
            badge={<Text style={styles.badge}>{risk.factors.length}</Text>}>
            {risk.factors.length === 0 ? (
              <Text style={styles.emptyText}>Nothing standing out. You're doing great.</Text>
            ) : (
              risk.factors.map((f, i) => (
                <View key={i} style={styles.factorItem}>
                  <Text style={styles.factorText}>{f.label}</Text>
                </View>
              ))
            )}
          </AccItem>

          {/* Recent events */}
          <AccItem id="recent" title="Recent events"
            icon={<AudioWaveform size={18} color={colors.primary} />}
            badge={<Text style={styles.badge}>{history.length}</Text>}>
            {history.slice(0, 4).map((h) => {
              const c = riskColor(h.score);
              return (
                <View key={h.id} style={styles.eventRow}>
                  <View style={[styles.eventDot, { borderColor: c }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventTitle}>{h.trigger} · {h.action}</Text>
                    <Text style={styles.eventTime}>{timeAgo(h.time)}</Text>
                  </View>
                  <Text style={[styles.eventScore, { color: c }]}>{h.score}</Text>
                </View>
              );
            })}
          </AccItem>
          {/* AURA Toolkit */}
          <AccItem id="toolkit" title="AURA Toolkit" icon={<Zap size={18} color={colors.primary} />}>
             <View style={{ gap: 8, marginTop: 8 }}>
               <TouchableOpacity onPress={() => navigateTo('speech')} style={[styles.navRow, { backgroundColor: colors.muted, borderRadius: radius.md, padding: 12 }]} activeOpacity={0.8}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                   <Mic size={18} color={colors.primary} />
                   <Text style={{ fontSize: 14, color: colors.foreground, ...fonts.medium }}>Speech Diary</Text>
                 </View>
                 <ChevronRight size={16} color={colors.mutedForeground} />
               </TouchableOpacity>
               <TouchableOpacity onPress={() => navigateTo('plans')} style={[styles.navRow, { backgroundColor: colors.muted, borderRadius: radius.md, padding: 12 }]} activeOpacity={0.8}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                   <CalendarDays size={18} color={colors.primary} />
                   <Text style={{ fontSize: 14, color: colors.foreground, ...fonts.medium }}>My Plans & Routines</Text>
                 </View>
                 <ChevronRight size={16} color={colors.mutedForeground} />
               </TouchableOpacity>
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
  unreadBadge: {
    position: 'absolute', top: 10, right: 10,
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary,
  },
  riskCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.background,
  },
  ringOuter: {
    width: 90, height: 90, borderRadius: radius.full,
    backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center',
  },
  ringInner: {
    width: 72, height: 72, borderRadius: radius.full,
    borderWidth: 5, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.background,
  },
  riskScore: { fontSize: 26, ...fonts.bold },
  riskLevelLabel: { fontSize: 9, letterSpacing: 1.5, color: colors.mutedForeground, ...fonts.medium },
  riskSubLabel: { fontSize: 11, color: colors.mutedForeground },
  riskLevelText: { fontSize: 17, color: colors.foreground, textTransform: 'capitalize', ...fonts.bold },
  riskFactor: { fontSize: 11, color: colors.foreground, opacity: 0.7, marginTop: 4, lineHeight: 16 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  sliderLabel: { fontSize: 10, color: colors.mutedForeground, letterSpacing: 1, ...fonts.medium },
  sliderHint: { fontSize: 11, color: colors.mutedForeground, textAlign: 'center', marginTop: 6 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  chartLabel: { fontSize: 10, color: colors.mutedForeground },
  badge: { fontSize: 12, color: colors.mutedForeground, marginRight: 4 },
  badgePrimary: { fontSize: 12, color: colors.primary, marginRight: 4, ...fonts.semibold },
  factorItem: {
    backgroundColor: colors.muted, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6,
  },
  factorText: { fontSize: 12, color: colors.foreground, opacity: 0.8 },
  emptyText: { fontSize: 12, color: colors.mutedForeground },
  trigRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.muted, borderRadius: radius.md, padding: 10, marginBottom: 8,
  },
  trigTitle: { fontSize: 12, ...fonts.medium, color: colors.foreground },
  trigTime: { fontSize: 10, color: colors.mutedForeground, marginTop: 2 },
  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.muted, borderRadius: radius.md, padding: 10, marginBottom: 6,
  },
  eventDot: {
    width: 30, height: 30, borderRadius: radius.full, borderWidth: 3,
    backgroundColor: colors.background,
  },
  eventTitle: { fontSize: 12, color: colors.foreground, textTransform: 'capitalize', ...fonts.medium },
  eventTime: { fontSize: 10, color: colors.mutedForeground },
  eventScore: { fontSize: 14, ...fonts.semibold },
});
