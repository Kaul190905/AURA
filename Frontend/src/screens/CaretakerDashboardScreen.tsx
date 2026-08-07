import React, { useContext, useMemo, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity, MapPin, Watch, ShieldAlert, Phone, Navigation, Bell, CheckCircle2, User } from 'lucide-react-native';

import { AppContext } from '../AppContext';
import { Accordion, AccItem } from '../components/Accordion';
import { colors, neuSm, radius, spacing, fonts } from '../theme';
import { riskColor, riskLabel, timeAgo } from '../utils';

// ─── Critical Alert Data Shape ────────────────────────────────────────────────
// Structured for future backend replacement — swap buildCriticalAlerts() with
// an API call without any UI changes.
type CriticalAlert = {
  id: string;
  name: string;
  role: 'User' | 'Student';
  status: string;
  riskScore: number;
  riskLevel: 'high' | 'medium' | 'low';
  isCrisis: boolean;
  location: string;
  triggeredAt: number; // epoch ms
  reason: string;
};

// Priority weight: Reset Mode (3) > High (2) > Medium (1)
function alertPriority(a: CriticalAlert): number {
  if (a.isCrisis) return 3;
  if (a.riskLevel === 'high') return 2;
  if (a.riskLevel === 'medium') return 1;
  return 0;
}

export default function CaretakerDashboardScreen() {
  const styles = getStyles();
  const {
    risk, isCrisisMode, notifications, setIsNotificationCenterOpen,
    bleConnected, darkMode, mockStudents,
  } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  const containerStyle = darkMode ? { backgroundColor: '#000000' } : {};
  const textStyle = darkMode ? { color: '#ffffff' } : {};
  const cardStyle = darkMode ? { backgroundColor: '#1c1c1e' } : {};

  const unreadCount = notifications.filter(n => !n.read).length;
  const riskC = riskColor(risk.score);

  // Deriving Caretaker Status from risk
  const userStatus = isCrisisMode ? 'Reset Mode Active' : (risk.score >= 5 ? 'Needs Attention' : 'Safe');
  const userStatusDesc = isCrisisMode
    ? 'User has activated emergency protocol and requested space.'
    : (risk.score >= 5 ? 'Elevated sensory levels detected.' : 'User is currently stable.');

  // ── Build Critical Alerts from shared state ──────────────────────────────
  // This function is the single data-source point. Replace with an API call
  // in the future without touching the render tree below.
  const criticalAlerts = useMemo<CriticalAlert[]>(() => {
    const alerts: CriticalAlert[] = [];

    // 1. Connected User (from risk engine)
    if (isCrisisMode || risk.score >= 3) {
      const level = isCrisisMode ? 'high' : (risk.score >= 5 ? 'high' : 'medium');
      alerts.push({
        id: 'connected-user',
        name: 'Connected User',
        role: 'User',
        status: isCrisisMode ? 'Reset Mode Active' : (risk.score >= 5 ? 'Needs Attention' : 'Elevated'),
        riskScore: risk.score,
        riskLevel: level,
        isCrisis: isCrisisMode,
        location: 'Library',
        triggeredAt: Date.now() - 2 * 60 * 1000, // 2 min ago mock
        reason: isCrisisMode
          ? 'User activated the Reset Mode emergency protocol.'
          : 'Elevated wearable stress indicators and environmental noise detected.',
      });
    }

    // 2. Students from mockStudents (teacher mode shared state)
    for (const s of mockStudents) {
      if (!s.isCrisis && s.risk < 3) continue; // skip low risk
      const level: CriticalAlert['riskLevel'] = s.isCrisis ? 'high' : (s.risk >= 5 ? 'high' : 'medium');
      alerts.push({
        id: s.id,
        name: s.name,
        role: 'Student',
        status: s.isCrisis ? 'Reset Mode Active' : (s.risk >= 5 ? 'Needs Attention' : 'Elevated'),
        riskScore: s.risk,
        riskLevel: level,
        isCrisis: s.isCrisis,
        location: s.location,
        triggeredAt: Date.now() - Math.floor(Math.random() * 10) * 60 * 1000,
        reason: s.recentActivity ?? 'Elevated sensory stress indicators detected.',
      });
    }

    // Sort by priority descending
    return alerts.sort((a, b) => alertPriority(b) - alertPriority(a));
  }, [risk, isCrisisMode, mockStudents]);

  const mockLocation = 'Library';

  return (
    <View style={[styles.container, containerStyle, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.topLabel}>CAREGIVER VIEW</Text>
            {!bleConnected && (
              <View style={{ backgroundColor: colors.muted, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontSize: 8, color: colors.mutedForeground, ...fonts.bold }}>OFFLINE</Text>
              </View>
            )}
          </View>
          <Text style={[styles.greeting, textStyle]}>Caregiver Dashboard</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <TouchableOpacity
            style={[styles.sparkleBtn, cardStyle, neuSm]}
            onPress={() => setIsNotificationCenterOpen(true)}
            activeOpacity={0.8}
          >
            <Bell size={20} color={colors.primary} />
            {unreadCount > 0 && <View style={styles.unreadBadge} />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <Accordion>

          {/* ── Critical Alerts AccItem ─────────────────────────────────── */}
          <AccItem
            id="critical-alerts"
            title="Critical Alerts"
            defaultOpen
            icon={<ShieldAlert size={18} color={criticalAlerts.length > 0 ? colors.riskHigh : colors.primary} />}
            badge={
              criticalAlerts.length > 0
                ? <View style={[styles.alertBadge, { backgroundColor: `${colors.riskHigh}20`, borderColor: `${colors.riskHigh}40` }]}><Text style={[styles.alertBadgeText, { color: colors.riskHigh }]}>{criticalAlerts.length}</Text></View>
                : <Text style={styles.badge}>All Safe</Text>
            }
          >
        {criticalAlerts.length === 0 ? (
          /* Empty state */
          <View style={[styles.emptyCard, cardStyle, { marginTop: 8, marginBottom: 4 }]}>
            <CheckCircle2 size={28} color={colors.primary} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyTitle, textStyle]}>Everyone is currently safe.</Text>
            <Text style={styles.emptySubtitle}>No active alerts at this time.</Text>
          </View>
        ) : (
          <View style={{ marginTop: 8 }}>
            {criticalAlerts.map(alert => {
              const rColor = riskColor(alert.riskScore);
              const isPriority = alert.isCrisis || alert.riskLevel === 'high';
              return (
                <View
                  key={alert.id}
                  style={[
                    styles.alertCard, cardStyle, neuSm,
                    isPriority
                      ? { borderWidth: 1, borderColor: `${colors.riskHigh}40`, backgroundColor: darkMode ? '#1c1c1e' : `${colors.riskHigh}08` }
                      : { borderLeftWidth: 4, borderLeftColor: rColor },
                  ]}
                >
                  {/* Priority banner */}
                  {isPriority && (
                    <View style={styles.priorityBanner}>
                      <ShieldAlert size={14} color={colors.riskHigh} />
                      <Text style={styles.priorityBannerText}>⚠ Requires Immediate Attention</Text>
                    </View>
                  )}

                  {/* Header row: avatar + name + risk ring */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={styles.avatar}>
                        <User size={20} color={colors.mutedForeground} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.alertName, textStyle]}>{alert.name}</Text>
                        <Text style={styles.alertRole}>{alert.role}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <View style={[styles.riskRing, { borderColor: rColor }]}>
                        <Text style={[styles.riskRingScore, { color: rColor }]}>{alert.riskScore}</Text>
                      </View>
                      <Text style={[styles.riskRingLabel, { color: rColor }]}>
                        {alert.isCrisis ? 'CRISIS' : (alert.riskLevel === 'high' ? 'HIGH' : 'MED')}
                      </Text>
                    </View>
                  </View>

                  {/* Details */}
                  <View style={{ gap: 5, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Activity size={12} color={colors.mutedForeground} />
                      <Text style={[styles.detailText, textStyle]}>
                        Status: <Text style={{ color: rColor, ...fonts.semibold }}>{alert.status}</Text>
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MapPin size={12} color={colors.mutedForeground} />
                      <Text style={[styles.detailText, textStyle]}>
                        Location: <Text style={{ ...fonts.semibold }}>{alert.location}</Text>
                      </Text>
                    </View>
                    <Text style={styles.triggeredText}>Triggered {timeAgo(alert.triggeredAt)}</Text>
                    <View style={[styles.reasonBox, { backgroundColor: darkMode ? '#2a2a2a' : colors.muted }]}>
                      <Text style={[styles.reasonText, textStyle]}>Reason: {alert.reason}</Text>
                    </View>
                  </View>

                  {/* Quick Actions */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isPriority ? colors.riskHigh : colors.primary, flex: 2 }]} activeOpacity={0.8}>
                      <Text style={styles.actionBtnText}>View Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtnOutline, cardStyle]} activeOpacity={0.8}>
                      <Navigation size={13} color={darkMode ? '#fff' : colors.foreground} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtnOutline, cardStyle]} activeOpacity={0.8}>
                      <Phone size={13} color={darkMode ? '#fff' : colors.foreground} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtnOutline, cardStyle]} activeOpacity={0.8}>
                      <CheckCircle2 size={13} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
          </AccItem>

          {/* Current User Risk */}
          <AccItem id="risk-status" title="Current User Status" defaultOpen
            icon={<ShieldAlert size={18} color={isCrisisMode ? colors.riskHigh : colors.primary} />}>
            <View style={[styles.riskCard, cardStyle, neuSm, { marginTop: 8 }]}>
              <View style={[styles.ringOuter, darkMode && { backgroundColor: '#333' }]}>
                <View style={[styles.ringInner, cardStyle, { borderColor: riskC }]}>
                  <Text style={[styles.riskScore, textStyle, { color: riskC }]}>{risk.score}</Text>
                  <Text style={styles.riskLevelLabel}>{riskLabel(risk.level)}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.riskSubLabel}>Current status</Text>
                <Text style={[styles.riskLevelText, textStyle]}>{userStatus}</Text>
                <Text style={[styles.riskFactor, textStyle]} numberOfLines={2}>{userStatusDesc}</Text>
              </View>
            </View>
          </AccItem>

          {/* Location */}
          <AccItem id="location" title="Current Location"
            icon={<MapPin size={18} color={isCrisisMode ? colors.riskHigh : colors.primary} />}>
            {isCrisisMode ? (
              <View style={[styles.emergencyContainer, cardStyle]}>
                <View style={styles.emergencyHeader}>
                  <ShieldAlert size={20} color={colors.riskHigh} />
                  <Text style={styles.emergencyTitle}>Emergency Support Active</Text>
                </View>
                <Text style={styles.emergencySub}>Live Location Enabled</Text>
                <View style={styles.coordsRow}>
                  <Text style={[styles.coordText, textStyle]}>Lat: 37.7749</Text>
                  <Text style={[styles.coordText, textStyle]}>Lng: -122.4194</Text>
                </View>
                <Text style={styles.lastUpdatedText}>Updated just now</Text>
                <View style={styles.emergencyActions}>
                  <TouchableOpacity style={styles.emergencyBtn} activeOpacity={0.8}>
                    <Navigation size={14} color="#fff" />
                    <Text style={styles.emergencyBtnText}>Open Navigation</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.emergencyBtn, cardStyle, { borderColor: darkMode ? '#555' : 'transparent', borderWidth: 1 }]} activeOpacity={0.8}>
                    <Phone size={14} color={darkMode ? '#fff' : colors.foreground} />
                    <Text style={[styles.emergencyBtnText, textStyle]}>Call User</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={[styles.locationContainer, cardStyle, { borderRadius: radius.md, marginTop: 8 }]}>
                <View style={styles.locationBadge}>
                  <MapPin size={24} color={colors.primary} />
                </View>
                <Text style={[styles.locationText, textStyle]}>{mockLocation}</Text>
              </View>
            )}
          </AccItem>

          {/* Wearable Status */}
          <AccItem id="wearable" title="Wearable Status" icon={<Watch size={18} color={colors.primary} />}>
            <View style={{ gap: 8, marginTop: 8 }}>
              <View style={[styles.factorItem, cardStyle]}>
                <Text style={[styles.factorText, textStyle]}>Connection: <Text style={{ color: colors.primary, ...fonts.semibold }}>Connected</Text></Text>
              </View>
              <View style={[styles.factorItem, cardStyle]}>
                <Text style={[styles.factorText, textStyle]}>Battery: 84%</Text>
              </View>
              <View style={[styles.factorItem, cardStyle]}>
                <Text style={[styles.factorText, textStyle]}>Last Sync: Just now</Text>
              </View>
            </View>
          </AccItem>

          {/* Today Summary */}
          <AccItem id="summary" title="Today's Summary" icon={<Activity size={18} color={colors.primary} />}>
            <View style={{ gap: 8, marginTop: 8 }}>
              <View style={[styles.factorItem, cardStyle]}>
                <Text style={[styles.factorText, textStyle]}>High Risk Events: <Text style={{ ...fonts.bold }}>2</Text></Text>
              </View>
              <View style={[styles.factorItem, cardStyle]}>
                <Text style={[styles.factorText, textStyle]}>Reset Sessions: <Text style={{ ...fonts.bold }}>1</Text></Text>
              </View>
              <View style={[styles.factorItem, cardStyle]}>
                <Text style={[styles.factorText, textStyle]}>Suggestions Accepted: <Text style={{ ...fonts.bold }}>3</Text></Text>
              </View>
            </View>
          </AccItem>

        </Accordion>
      </ScrollView>
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
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.primary,
  },

  // ── Section header ─────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginBottom: spacing.md, marginTop: spacing.sm,
  },
  sectionTitle: { fontSize: 17, color: colors.foreground, ...fonts.bold },
  sectionSubtitle: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  alertBadge: {
    borderWidth: 1, borderRadius: radius.full,
    paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start',
  },
  alertBadgeText: { fontSize: 12, ...fonts.bold },

  // ── Critical Alert Cards ───────────────────────────────────────────────────
  alertCard: {
    borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.md, backgroundColor: colors.background,
  },
  priorityBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 10,
  },
  priorityBannerText: { fontSize: 13, color: colors.riskHigh, ...fonts.bold },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.muted,
    alignItems: 'center', justifyContent: 'center',
  },
  alertName: { fontSize: 16, ...fonts.bold, color: colors.foreground },
  alertRole: { fontSize: 12, color: colors.mutedForeground, ...fonts.medium },
  riskRing: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  riskRingScore: { fontSize: 13, ...fonts.bold },
  riskRingLabel: { fontSize: 8, ...fonts.bold, letterSpacing: 1 },
  detailText: { fontSize: 12, color: colors.foreground, opacity: 0.85 },
  triggeredText: { fontSize: 10, color: colors.mutedForeground, marginTop: 2 },
  reasonBox: {
    borderRadius: radius.sm, padding: 8, marginTop: 4,
  },
  reasonText: { fontSize: 12, color: colors.foreground, opacity: 0.75, lineHeight: 17 },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.lg, paddingVertical: 11,
  },
  actionBtnText: { color: '#fff', fontSize: 13, ...fonts.semibold },
  actionBtnOutline: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.muted,
  },

  // ── Empty state ────────────────────────────────────────────────────────────
  emptyCard: {
    borderRadius: radius.lg, padding: spacing.xl,
    alignItems: 'center', backgroundColor: colors.background,
  },
  emptyTitle: { fontSize: 16, ...fonts.bold, color: colors.foreground, textAlign: 'center' },
  emptySubtitle: { fontSize: 12, color: colors.mutedForeground, marginTop: 4, textAlign: 'center' },

  // ── Risk card (inside accordion) ───────────────────────────────────────────
  riskCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
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

  factorItem: {
    backgroundColor: colors.muted, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 12, marginBottom: 6,
  },
  factorText: { fontSize: 13, color: colors.foreground, opacity: 0.8 },

  locationContainer: { alignItems: 'center', paddingVertical: spacing.lg },
  locationBadge: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  locationText: { fontSize: 22, color: colors.foreground, ...fonts.bold },

  emergencyContainer: {
    backgroundColor: `${colors.riskHigh}15`, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: `${colors.riskHigh}40`,
  },
  emergencyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  emergencyTitle: { fontSize: 16, color: colors.riskHigh, ...fonts.bold },
  emergencySub: { fontSize: 12, color: colors.riskHigh, opacity: 0.8, marginBottom: spacing.md },
  coordsRow: { flexDirection: 'row', gap: spacing.lg, marginBottom: 4 },
  coordText: { fontSize: 12, color: colors.foreground, ...fonts.medium },
  lastUpdatedText: { fontSize: 10, color: colors.mutedForeground, marginBottom: spacing.md },
  emergencyActions: { flexDirection: 'row', gap: spacing.sm },
  emergencyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.riskHigh, borderRadius: radius.lg, paddingVertical: 12,
  },
  emergencyBtnText: { color: '#fff', fontSize: 13, ...fonts.semibold },

  badge: { fontSize: 12, color: colors.mutedForeground, marginRight: 4 },
});
