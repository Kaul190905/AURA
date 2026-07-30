<<<<<<< HEAD
import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, Zap, Bell, Mic, CalendarDays, ChevronRight, X, Activity, Thermometer, Volume2 } from 'lucide-react-native';

import { AppContext } from '../AppContext';

import { colors, neuSm, radius, spacing, fonts } from '../theme';
import { riskColor, riskLabel } from '../utils';
import { supabase } from '../services/supabaseClient';

// ── Dynamic status label based on risk score ────────────────────────────────
function statusLabel(score: number): string {
  if (score <= 2) return 'Calm';
  if (score <= 4) return 'Stable';
  if (score <= 6) return 'Elevated Response';
  return 'High Stress';
}
=======
import React, { useContext, useMemo, useEffect } from 'react';
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
>>>>>>> origin/srinath-dev

export default function HomeScreen() {
  const styles = getStyles();
  const {
<<<<<<< HEAD
    risk, selfReport, setSelfReport, setIsNotificationCenterOpen,
    notifications, bleConnected, navigateTo,
    userId,
    noise, temperature,
  } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  const [sensorModalOpen, setSensorModalOpen] = useState(false);

  const [userName, setUserName] = useState<string>('User');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserName(data.user.email.split('@')[0]);
      }
    });
  }, []);
=======
    risk, selfReport, setSelfReport, history, setIsNotificationCenterOpen,
    notifications, bleConnected, navigateTo,
    userId, refreshRecommendations,
  } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  // Fetch AI recommendations from the backend when the user is authenticated
  useEffect(() => {
    if (userId) {
      refreshRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
>>>>>>> origin/srinath-dev

  const unreadCount = notifications.filter(n => !n.read).length;
  const riskC = riskColor(risk.score);

<<<<<<< HEAD
  // Convert temperature from Fahrenheit to Celsius
  const tempCelsius = ((temperature - 32) * 5) / 9;

  // Timestamp for "Last Updated"
  const lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
=======
  const todayData = useMemo(() => {
    const rows = history.slice(0, 8).reverse().map((h) => ({ value: h.score }));
    rows.push({ value: risk.score });
    return rows;
  }, [history, risk.score]);
>>>>>>> origin/srinath-dev

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
<<<<<<< HEAD
          <Text style={styles.greeting}>{userName}</Text>
=======
          <Text style={styles.greeting}>Hi, how are you?</Text>
>>>>>>> origin/srinath-dev
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
<<<<<<< HEAD
        </View>
      </View>

      {/* Risk card — tappable */}
      <TouchableOpacity
        style={[styles.riskCard, neuSm]}
        activeOpacity={0.8}
        onPress={() => setSensorModalOpen(true)}
      >
=======
          <View style={[styles.sparkleBtn, neuSm]}>
            <Star size={20} color={colors.primary} />
          </View>
        </View>
      </View>

      {/* Risk card */}
      <View style={[styles.riskCard, neuSm]}>
>>>>>>> origin/srinath-dev
        {/* Ring */}
        <View style={styles.ringOuter}>
          <View style={[styles.ringInner, { borderColor: riskC }]}>
            <Text style={[styles.riskScore, { color: riskC }]}>{risk.score}</Text>
            <Text style={styles.riskLevelLabel}>{riskLabel(risk.level)}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.riskSubLabel}>Current level</Text>
<<<<<<< HEAD
          <Text style={styles.riskLevelText}>{statusLabel(risk.score)}</Text>
          {risk.factors[0] && (
            <Text style={styles.riskFactor} numberOfLines={2}>{risk.factors[0].label}</Text>
          )}
          <Text style={styles.tapHint}>Tap for live metrics →</Text>
        </View>
      </TouchableOpacity>

      {/* Accordion sections */}
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Check in */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Heart size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Check in with yourself</Text>
            </View>
            <Text style={styles.badgePrimary}>{selfReport}/5</Text>
          </View>
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
        </View>

        {/* Factors */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Zap size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>What's affecting you</Text>
            </View>
            <Text style={styles.badge}>{risk.factors.length}</Text>
          </View>
          {risk.factors.length === 0 ? (
            <Text style={styles.emptyText}>Nothing standing out. You're doing great.</Text>
          ) : (
            risk.factors.map((f, i) => (
              <View key={i} style={styles.factorItem}>
                <Text style={styles.factorText}>{f.label}</Text>
              </View>
            ))
          )}
        </View>

        {/* AURA Toolkit */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Zap size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>AURA Toolkit</Text>
            </View>
          </View>
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
        </View>
      </ScrollView>

      {/* ── Live Sensor Metrics Modal ───────────────────────────────────────── */}
      <Modal
        visible={sensorModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSensorModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Live Sensor Readings</Text>
              <TouchableOpacity onPress={() => setSensorModalOpen(false)} activeOpacity={0.7}>
                <X size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Status */}
            <View style={[styles.statusBanner, { backgroundColor: `${riskC}18`, borderColor: `${riskC}40` }]}>
              <View style={[styles.statusDot, { backgroundColor: riskC }]} />
              <Text style={[styles.statusText, { color: riskC }]}>{statusLabel(risk.score)}</Text>
            </View>

            {/* Sensor cards */}
            <View style={styles.sensorGrid}>
              {/* Heart Rate */}
              <View style={[styles.sensorCard, neuSm]}>
                <View style={[styles.sensorIconWrap, { backgroundColor: `${colors.riskHigh}15` }]}>
                  <Activity size={22} color={colors.riskHigh} />
                </View>
                <Text style={styles.sensorValue}>--</Text>
                <Text style={styles.sensorUnit}>BPM</Text>
                <Text style={styles.sensorLabel}>Heart Rate</Text>
                <Text style={styles.sensorUnavailable}>Sensor unavailable</Text>
              </View>

              {/* Temperature */}
              <View style={[styles.sensorCard, neuSm]}>
                <View style={[styles.sensorIconWrap, { backgroundColor: `${colors.primary}15` }]}>
                  <Thermometer size={22} color={colors.primary} />
                </View>
                <Text style={styles.sensorValue}>{tempCelsius.toFixed(1)}</Text>
                <Text style={styles.sensorUnit}>°C</Text>
                <Text style={styles.sensorLabel}>Temperature</Text>
              </View>

              {/* Noise Level */}
              <View style={[styles.sensorCard, neuSm]}>
                <View style={[styles.sensorIconWrap, { backgroundColor: `${colors.riskMed ?? '#E0A83A'}15` }]}>
                  <Volume2 size={22} color={colors.riskMed ?? '#E0A83A'} />
                </View>
                <Text style={styles.sensorValue}>{Math.round(noise)}</Text>
                <Text style={styles.sensorUnit}>dB</Text>
                <Text style={styles.sensorLabel}>Noise Level</Text>
              </View>
            </View>

            {/* Last updated */}
            <Text style={styles.lastUpdated}>Last updated: {lastUpdated}</Text>
          </View>
        </View>
      </Modal>
=======
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
>>>>>>> origin/srinath-dev
    </View>
  );
}

const getStyles = () => StyleSheet.create({
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
<<<<<<< HEAD
  riskLevelText: { fontSize: 17, color: colors.foreground, ...fonts.bold },
  riskFactor: { fontSize: 11, color: colors.foreground, opacity: 0.7, marginTop: 4, lineHeight: 16 },
  tapHint: { fontSize: 10, color: colors.primary, marginTop: 6, ...fonts.medium },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  sliderLabel: { fontSize: 10, color: colors.mutedForeground, letterSpacing: 1, ...fonts.medium },
  sliderHint: { fontSize: 11, color: colors.mutedForeground, textAlign: 'center', marginTop: 6 },
  sectionCard: {
    backgroundColor: colors.background, borderRadius: radius.xl, padding: spacing.lg,
    marginHorizontal: spacing.lg, marginBottom: spacing.md, ...neuSm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 14, color: colors.foreground, ...fonts.semibold },
  badge: { fontSize: 12, color: colors.mutedForeground },
  badgePrimary: { fontSize: 12, color: colors.primary, ...fonts.semibold },
=======
  riskLevelText: { fontSize: 17, color: colors.foreground, textTransform: 'capitalize', ...fonts.bold },
  riskFactor: { fontSize: 11, color: colors.foreground, opacity: 0.7, marginTop: 4, lineHeight: 16 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  sliderLabel: { fontSize: 10, color: colors.mutedForeground, letterSpacing: 1, ...fonts.medium },
  sliderHint: { fontSize: 11, color: colors.mutedForeground, textAlign: 'center', marginTop: 6 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  chartLabel: { fontSize: 10, color: colors.mutedForeground },
  badge: { fontSize: 12, color: colors.mutedForeground, marginRight: 4 },
  badgePrimary: { fontSize: 12, color: colors.primary, marginRight: 4, ...fonts.semibold },
>>>>>>> origin/srinath-dev
  factorItem: {
    backgroundColor: colors.muted, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6,
  },
  factorText: { fontSize: 12, color: colors.foreground, opacity: 0.8 },
  emptyText: { fontSize: 12, color: colors.mutedForeground },
  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
<<<<<<< HEAD

  // ── Modal styles ──────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.xl, paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: { fontSize: 18, color: colors.foreground, ...fonts.bold },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: radius.lg, padding: 12, borderWidth: 1, marginBottom: spacing.lg,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 15, ...fonts.bold },
  sensorGrid: { flexDirection: 'row', gap: 12, marginBottom: spacing.lg },
  sensorCard: {
    flex: 1, backgroundColor: colors.background, borderRadius: radius.xl,
    padding: 14, alignItems: 'center', gap: 4,
  },
  sensorIconWrap: {
    width: 44, height: 44, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  sensorValue: { fontSize: 24, color: colors.foreground, ...fonts.bold },
  sensorUnit: { fontSize: 11, color: colors.mutedForeground, ...fonts.medium, marginTop: -2 },
  sensorLabel: { fontSize: 11, color: colors.mutedForeground, marginTop: 4, textAlign: 'center' },
  sensorUnavailable: { fontSize: 9, color: colors.riskHigh, marginTop: 2, ...fonts.medium },
  lastUpdated: {
    fontSize: 11, color: colors.mutedForeground, textAlign: 'center',
    ...fonts.medium,
  },
=======
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
>>>>>>> origin/srinath-dev
});
