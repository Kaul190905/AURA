import React, { useContext, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
} from 'react-native';
import Svg, { Circle, Path, Rect, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, Zap, Bell, Mic, CalendarDays, ChevronRight, X, Activity, Thermometer, Volume2 } from 'lucide-react-native';

import { AppContext } from '../AppContext';

import { colors, neuSm, radius, spacing, fonts } from '../theme';
import { riskColor } from '../utils';
import { supabase } from '../services/supabaseClient';

// ── Dynamic status label based on risk score ────────────────────────────────
function statusLabel(score: number): string {
  if (score <= 2) {return 'Calm';}
  if (score <= 4) {return 'Stable';}
  if (score <= 6) {return 'Elevated Response';}
  return 'High Stress';
}

export default function HomeScreen() {
  const styles = getStyles();
  const {
    risk, selfReport, setSelfReport, setIsNotificationCenterOpen,
    notifications, bleConnected, navigateTo, triggerSos,
    noise, temperature,
  } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  const [sensorModalOpen, setSensorModalOpen] = useState(false);

  const [userName, setUserName] = useState<string>('User');

  useFocusEffect(
    useCallback(() => {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          const metadataName = data.user.user_metadata?.name;
          if (metadataName) {
            setUserName(metadataName);
          } else if (data.user.email) {
            setUserName(data.user.email.split('@')[0]);
          }
        }
      });
    }, [])
  );

  const unreadCount = notifications.filter(n => !n.read).length;
  const riskC = riskColor(risk.score);

  // Convert temperature from Fahrenheit to Celsius
  const tempCelsius = ((temperature - 32) * 5) / 9;

  // Timestamp for "Last Updated"
  const lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

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
          <Text style={styles.greeting}>Hi, {userName}!</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={triggerSos}
            style={{ backgroundColor: '#E06B3A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#fff', fontSize: 14, ...fonts.bold }}>SOS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sparkleBtn, neuSm]}
            onPress={() => setIsNotificationCenterOpen(true)}
            activeOpacity={0.8}
          >
            <Bell size={20} color={colors.primary} />
            {unreadCount > 0 && <View style={styles.unreadBadge} />}
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {/* Live Details Dashboard */}
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
        <Text style={[styles.sectionTitle, { marginBottom: 16, marginLeft: 4 }]}>Live Details</Text>

        {/* Top Card: Concentric Rings */}
        <View style={styles.dashboardCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>

            {/* Rings */}
            <View style={{ width: 140, height: 140 }}>
              <Svg width="140" height="140" viewBox="0 0 160 160">
                <G rotation="-90" originX="80" originY="80">
                  {/* Outer - BPM */}
                  <Circle cx="80" cy="80" r="65" stroke="#00C48C" strokeWidth="12" fill="none" strokeOpacity="0.2" />
                  <Circle cx="80" cy="80" r="65" stroke="#00C48C" strokeWidth="12" fill="none" strokeDasharray={`${2 * Math.PI * 65}`} strokeDashoffset={`${2 * Math.PI * 65 * (1 - 0.75)}`} strokeLinecap="round" />

                  {/* Middle - Temp */}
                  <Circle cx="80" cy="80" r="47" stroke="#FF9F43" strokeWidth="12" fill="none" strokeOpacity="0.2" />
                  <Circle cx="80" cy="80" r="47" stroke="#FF9F43" strokeWidth="12" fill="none" strokeDasharray={`${2 * Math.PI * 47}`} strokeDashoffset={`${2 * Math.PI * 47 * (1 - 0.65)}`} strokeLinecap="round" />

                  {/* Inner - Noise */}
                  <Circle cx="80" cy="80" r="29" stroke="#5F88FF" strokeWidth="12" fill="none" strokeOpacity="0.2" />
                  <Circle cx="80" cy="80" r="29" stroke="#5F88FF" strokeWidth="12" fill="none" strokeDasharray={`${2 * Math.PI * 29}`} strokeDashoffset={`${2 * Math.PI * 29 * (1 - 0.45)}`} strokeLinecap="round" />
                </G>
              </Svg>
            </View>

            {/* Legend */}
            <View style={{ flex: 1, marginLeft: 20, justifyContent: 'center' }}>
              <View style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#00C48C' }} />
                  <Text style={{ fontSize: 15, color: colors.foreground, ...fonts.bold }}>BPM</Text>
                </View>
                <Text style={{ fontSize: 13, color: colors.mutedForeground, marginLeft: 18 }}>72 bpm</Text>
              </View>

              <View style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF9F43' }} />
                  <Text style={{ fontSize: 15, color: colors.foreground, ...fonts.bold }}>Temp</Text>
                </View>
                <Text style={{ fontSize: 13, color: colors.mutedForeground, marginLeft: 18 }}>{tempCelsius.toFixed(1)}°C</Text>
              </View>

              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#5F88FF' }} />
                  <Text style={{ fontSize: 15, color: colors.foreground, ...fonts.bold }}>Noise</Text>
                </View>
                <Text style={{ fontSize: 13, color: colors.mutedForeground, marginLeft: 18 }}>{Math.round(noise)} dB</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
          {/* Bottom Left: Heart Rate Line Chart */}
          <View style={[styles.dashboardCard, { flex: 1, padding: 16, height: 160 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Heart size={16} color="#FF4D4F" />
              <Text style={{ fontSize: 15, color: colors.foreground, ...fonts.bold }}>Heart rate</Text>
            </View>
            <Text style={{ fontSize: 24, color: colors.foreground, ...fonts.bold, marginTop: 4 }}>72 <Text style={{ fontSize: 12, color: colors.mutedForeground, ...fonts.medium }}>bpm</Text></Text>

            <View style={{ flex: 1, justifyContent: 'flex-end', marginTop: 6 }}>
              <Svg height="80" width="100%" viewBox="0 0 100 50" preserveAspectRatio="none">
                <Defs>
                  <LinearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#FF4D4F" stopOpacity="0.2" />
                    <Stop offset="100%" stopColor="#FF4D4F" stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                <Path d="M0,40 C10,40 15,35 20,20 C25,5 28,5 32,30 C38,40 42,40 48,40 C52,40 55,33 58,20 C62,10 68,10 72,30 C75,40 80,40 85,40 L100,40 L100,50 L0,50 Z" fill="url(#grad)" />
                <Path d="M0,40 C10,40 15,35 20,20 C25,5 28,5 32,30 C38,40 42,40 48,40 C52,40 55,33 58,20 C62,10 68,10 72,30 C75,40 80,40 85,40 L100,40" fill="none" stroke="#FF4D4F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
          </View>

          {/* Bottom Right: Noise Level Bar Chart */}
          <View style={[styles.dashboardCard, { flex: 1, padding: 16, height: 160 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Volume2 size={16} color="#00C48C" />
              <Text style={{ fontSize: 15, color: colors.foreground, ...fonts.bold }}>Noise level</Text>
            </View>
            <Text style={{ fontSize: 24, color: colors.foreground, ...fonts.bold, marginTop: 4 }}>{Math.round(noise)} <Text style={{ fontSize: 12, color: colors.mutedForeground, ...fonts.medium }}>dB</Text></Text>

            <View style={{ flex: 1, justifyContent: 'flex-end', marginTop: 6 }}>
              <Svg height="80" width="100%" viewBox="0 0 100 50" preserveAspectRatio="none">
                <Rect x="5" y="25" width="8" height="25" rx="4" fill="#A7F3D0" />
                <Rect x="20" y="15" width="8" height="35" rx="4" fill="#00C48C" />
                <Rect x="35" y="30" width="8" height="20" rx="4" fill="#A7F3D0" />
                <Rect x="50" y="5" width="8" height="45" rx="4" fill="#00C48C" />
                <Rect x="65" y="20" width="8" height="30" rx="4" fill="#00C48C" />
                <Rect x="80" y="10" width="8" height="40" rx="4" fill="#00C48C" />
                <Rect x="95" y="25" width="8" height="25" rx="4" fill="#A7F3D0" />
              </Svg>
            </View>
          </View>
        </View>
      </View>

      {/* Accordion sections */}
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
      </View>

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
    </View>
  );
}

const getStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  dashboardCard: {
    backgroundColor: colors.background, borderRadius: 20, padding: 20,
    ...neuSm,
  },
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
  factorItem: {
    backgroundColor: colors.muted, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6,
  },
  factorText: { fontSize: 12, color: colors.foreground, opacity: 0.8 },
  emptyText: { fontSize: 12, color: colors.mutedForeground },
  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },

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
});
