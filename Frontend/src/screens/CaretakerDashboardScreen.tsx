import React, { useContext, useMemo, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star, Heart, Activity, MapPin, Watch, ShieldAlert, Phone, Navigation, MessageCircle, Bell } from 'lucide-react-native';
import { LineChart } from 'react-native-gifted-charts';

import { AppContext } from '../AppContext';
import { Accordion, AccItem } from '../components/Accordion';
import { colors, neuSm, radius, spacing, fonts } from '../theme';
import { riskColor, riskLabel, timeAgo } from '../utils';
import { getAlerts, AlertResponse } from '../services/api';

export default function CaretakerDashboardScreen() {
  const styles = getStyles();
<<<<<<< HEAD
  const { risk, history, isCrisisMode, notifications, setIsNotificationCenterOpen, bleConnected, darkMode, userId } = useContext(AppContext);
=======
  const { risk, history, isCrisisMode, notifications, setIsNotificationCenterOpen, bleConnected, darkMode, setIsAIPanelOpen, userId } = useContext(AppContext);
>>>>>>> origin/srinath-dev
  const insets = useSafeAreaInsets();

  // Fetch real alerts from backend
  const [backendAlerts, setBackendAlerts] = useState<AlertResponse[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setAlertsLoading(true);
    getAlerts(userId)
      .then(setBackendAlerts)
      .catch((e) => console.warn('[AURA] Could not fetch caretaker alerts:', e))
      .finally(() => setAlertsLoading(false));
  }, [userId]);

  const containerStyle = darkMode ? { backgroundColor: '#000000' } : {};
  const textStyle = darkMode ? { color: '#ffffff' } : {};
  const cardStyle = darkMode ? { backgroundColor: '#1c1c1e' } : {};
  const subTextStyle = darkMode ? { color: '#aaaaaa' } : {};
  
  const unreadCount = notifications.filter(n => !n.read).length;
  const riskC = riskColor(risk.score);

  // Deriving Caretaker Status from risk
  const userStatus = isCrisisMode ? 'Reset Mode Active' : (risk.score >= 5 ? 'Needs Attention' : 'Safe');
  const userStatusDesc = isCrisisMode 
    ? "User has activated emergency protocol and requested space." 
    : (risk.score >= 5 ? "Elevated sensory levels detected." : "User is currently stable.");

  const todayData = useMemo(() => {
    const rows = history.slice(0, 8).reverse().map((h) => ({ value: h.score }));
    rows.push({ value: risk.score });
    return rows;
  }, [history, risk.score]);

  const mockLocation = "Library";
  
  return (
    <View style={[styles.container, containerStyle, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
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
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity 
            style={[styles.sparkleBtn, cardStyle, neuSm]}
            onPress={() => setIsNotificationCenterOpen(true)}
            activeOpacity={0.8}
          >
            <Bell size={20} color={colors.primary} />
            {unreadCount > 0 && <View style={styles.unreadBadge} />}
          </TouchableOpacity>
<<<<<<< HEAD
=======
            <TouchableOpacity 
              activeOpacity={0.7} 
              style={[styles.sparkleBtn, cardStyle, neuSm]}
              onPress={() => setIsAIPanelOpen(true)}
            >
              <Star size={20} color={colors.primary} />
            </TouchableOpacity>
>>>>>>> origin/srinath-dev
        </View>
      </View>

      {/* Risk card - Exact duplicate styling from User House */}
      <View style={[styles.riskCard, cardStyle, neuSm]}>
        {/* Ring */}
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

      {/* Accordion sections */}
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <Accordion>
          
          {/* Location Card / Emergency Support */}
          <AccItem id="location" title="Current Location" defaultOpen
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
          <AccItem id="summary" title="Today Summary" icon={<Activity size={18} color={colors.primary} />}>
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

          {/* Backend Alerts */}
          <AccItem id="alerts" title="Active Alerts" icon={<Bell size={18} color={colors.primary} />}>
            <View style={{ gap: 8, marginTop: 8 }}>
              {alertsLoading ? (
                <View style={[styles.factorItem, cardStyle]}>
                  <Text style={[styles.factorText, textStyle]}>Loading alerts...</Text>
                </View>
              ) : backendAlerts.length > 0 ? (
                backendAlerts.map(alert => (
                  <View key={alert.id} style={[styles.factorItem, cardStyle, { borderLeftWidth: 3, borderLeftColor: alert.severity === 'critical' ? colors.riskHigh : (alert.severity === 'warning' ? colors.riskMed : colors.primary) }]}>
                    <Text style={[styles.factorText, textStyle, fonts.semibold, { marginBottom: 2 }]}>{alert.severity.toUpperCase()}</Text>
                    <Text style={[styles.factorText, textStyle]}>{alert.message}</Text>
                    <Text style={{ fontSize: 10, color: colors.mutedForeground, marginTop: 4 }}>{new Date(alert.created_at).toLocaleString()}</Text>
                  </View>
                ))
              ) : (
                <View style={[styles.factorItem, cardStyle]}>
                  <Text style={[styles.factorText, textStyle]}>No active alerts.</Text>
                </View>
              )}
            </View>
          </AccItem>

          {/* Recent events */}
          <AccItem id="recent" title="Recent Activity"
            icon={<Heart size={18} color={colors.primary} />}
            badge={<Text style={styles.badge}>{history.length}</Text>}>
            <View style={{ marginTop: 8 }}>
              {history.slice(0, 4).map((h) => {
                const c = riskColor(h.score);
                return (
                  <View key={h.id} style={[styles.eventRow, cardStyle]}>
                    <View style={[styles.eventDot, containerStyle, { borderColor: c }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.eventTitle, textStyle]}>{h.trigger} · {h.action}</Text>
                      <Text style={styles.eventTime}>{timeAgo(h.time)}</Text>
                    </View>
                    <Text style={[styles.eventScore, { color: c }]}>{h.score}</Text>
                  </View>
                );
              })}
            </View>
          </AccItem>
          
          {/* Quick Support */}
          <AccItem id="support" title="Quick Support" icon={<MessageCircle size={18} color={colors.primary} />}>
             <View style={styles.supportGrid}>
                <TouchableOpacity style={[styles.supportBtn, cardStyle]} activeOpacity={0.8}>
                   <Phone size={20} color={colors.primary} />
                   <Text style={[styles.supportBtnText, textStyle]}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.supportBtn, cardStyle]} activeOpacity={0.8}>
                   <MessageCircle size={20} color={colors.primary} />
                   <Text style={[styles.supportBtnText, textStyle]}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.supportBtn, cardStyle]} activeOpacity={0.8}>
                   <Navigation size={20} color={colors.primary} />
                   <Text style={[styles.supportBtnText, textStyle]}>Navigate</Text>
                </TouchableOpacity>
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
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
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
  
  badge: { fontSize: 12, color: colors.mutedForeground, marginRight: 4 },
  
  factorItem: {
    backgroundColor: colors.muted, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 12, marginBottom: 6,
  },
  factorText: { fontSize: 13, color: colors.foreground, opacity: 0.8 },
  
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
  
  locationContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  locationBadge: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  locationText: {
    fontSize: 22, color: colors.foreground, ...fonts.bold,
  },

  emergencyContainer: {
    backgroundColor: `${colors.riskHigh}15`,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.riskHigh}40`,
  },
  emergencyHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 4,
  },
  emergencyTitle: {
    fontSize: 16, color: colors.riskHigh, ...fonts.bold,
  },
  emergencySub: {
    fontSize: 12, color: colors.riskHigh, opacity: 0.8,
    marginBottom: spacing.md,
  },
  coordsRow: {
    flexDirection: 'row', gap: spacing.lg,
    marginBottom: 4,
  },
  coordText: {
    fontSize: 12, color: colors.foreground, ...fonts.medium,
  },
  lastUpdatedText: {
    fontSize: 10, color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  emergencyActions: {
    flexDirection: 'row', gap: spacing.sm,
  },
  emergencyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.riskHigh, borderRadius: radius.lg, paddingVertical: 12,
  },
  emergencyBtnText: {
    color: '#fff', fontSize: 13, ...fonts.semibold,
  },
  
  supportGrid: {
    flexDirection: 'row', gap: spacing.sm, marginTop: 8,
  },
  supportBtn: {
    flex: 1, alignItems: 'center', gap: 8,
    backgroundColor: colors.muted, borderRadius: radius.md, paddingVertical: 16,
  },
  supportBtnText: {
    fontSize: 12, color: colors.foreground, ...fonts.medium,
  }
});
