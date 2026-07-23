import React, { useContext, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star, Heart, Activity, MapPin, Watch, ShieldAlert, Phone, Navigation, MessageCircle, Bell } from 'lucide-react-native';
import { LineChart } from 'react-native-gifted-charts';

import { AppContext } from '../AppContext';
import { Accordion, AccItem } from '../components/Accordion';
import { colors, neuSm, radius, spacing, fonts } from '../theme';
import { riskColor, riskLabel, timeAgo } from '../utils';

export default function CaretakerDashboardScreen() {
  const { risk, history, isCrisisMode, notifications, setIsNotificationCenterOpen, bleConnected } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
          <Text style={styles.greeting}>Caregiver Dashboard</Text>
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

      {/* Risk card - Exact duplicate styling from User Home */}
      <View style={[styles.riskCard, neuSm]}>
        {/* Ring */}
        <View style={styles.ringOuter}>
          <View style={[styles.ringInner, { borderColor: riskC }]}>
            <Text style={[styles.riskScore, { color: riskC }]}>{risk.score}</Text>
            <Text style={styles.riskLevelLabel}>{riskLabel(risk.level)}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.riskSubLabel}>Current status</Text>
          <Text style={styles.riskLevelText}>{userStatus}</Text>
          <Text style={styles.riskFactor} numberOfLines={2}>{userStatusDesc}</Text>
        </View>
      </View>

      {/* Accordion sections */}
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <Accordion>
          
          {/* Location Card / Emergency Support */}
          <AccItem id="location" title="Current Location" defaultOpen
            icon={<MapPin size={18} color={isCrisisMode ? colors.riskHigh : colors.primary} />}>
            
            {isCrisisMode ? (
              <View style={[styles.emergencyContainer]}>
                <View style={styles.emergencyHeader}>
                  <ShieldAlert size={20} color={colors.riskHigh} />
                  <Text style={styles.emergencyTitle}>Emergency Support Active</Text>
                </View>
                <Text style={styles.emergencySub}>Live Location Enabled</Text>
                
                <View style={styles.coordsRow}>
                  <Text style={styles.coordText}>Lat: 37.7749</Text>
                  <Text style={styles.coordText}>Lng: -122.4194</Text>
                </View>
                <Text style={styles.lastUpdatedText}>Updated just now</Text>

                <View style={styles.emergencyActions}>
                  <TouchableOpacity style={styles.emergencyBtn} activeOpacity={0.8}>
                    <Navigation size={14} color="#fff" />
                    <Text style={styles.emergencyBtnText}>Open Navigation</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.emergencyBtn, { backgroundColor: colors.background }]} activeOpacity={0.8}>
                    <Phone size={14} color={colors.foreground} />
                    <Text style={[styles.emergencyBtnText, { color: colors.foreground }]}>Call User</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.locationContainer}>
                <View style={styles.locationBadge}>
                  <MapPin size={24} color={colors.primary} />
                </View>
                <Text style={styles.locationText}>{mockLocation}</Text>
              </View>
            )}
          </AccItem>

          {/* Wearable Status */}
          <AccItem id="wearable" title="Wearable Status" icon={<Watch size={18} color={colors.primary} />}>
            <View style={{ gap: 8, marginTop: 8 }}>
              <View style={styles.factorItem}>
                <Text style={styles.factorText}>Connection: <Text style={{ color: colors.primary, ...fonts.semibold }}>Connected</Text></Text>
              </View>
              <View style={styles.factorItem}>
                <Text style={styles.factorText}>Battery: 84%</Text>
              </View>
              <View style={styles.factorItem}>
                <Text style={styles.factorText}>Last Sync: Just now</Text>
              </View>
            </View>
          </AccItem>

          {/* Today Summary */}
          <AccItem id="summary" title="Today Summary" icon={<Activity size={18} color={colors.primary} />}>
            <View style={{ gap: 8, marginTop: 8 }}>
              <View style={styles.factorItem}>
                <Text style={styles.factorText}>High Risk Events: <Text style={{ ...fonts.bold }}>2</Text></Text>
              </View>
              <View style={styles.factorItem}>
                <Text style={styles.factorText}>Reset Sessions: <Text style={{ ...fonts.bold }}>1</Text></Text>
              </View>
              <View style={styles.factorItem}>
                <Text style={styles.factorText}>Suggestions Accepted: <Text style={{ ...fonts.bold }}>3</Text></Text>
              </View>
            </View>
          </AccItem>

          {/* Recent events */}
          <AccItem id="recent" title="Recent Activity"
            icon={<Heart size={18} color={colors.primary} />}
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
          
          {/* Quick Support */}
          <AccItem id="support" title="Quick Support" icon={<MessageCircle size={18} color={colors.primary} />}>
             <View style={styles.supportGrid}>
                <TouchableOpacity style={styles.supportBtn} activeOpacity={0.8}>
                   <Phone size={20} color={colors.primary} />
                   <Text style={styles.supportBtnText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.supportBtn} activeOpacity={0.8}>
                   <MessageCircle size={20} color={colors.primary} />
                   <Text style={styles.supportBtnText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.supportBtn} activeOpacity={0.8}>
                   <Navigation size={20} color={colors.primary} />
                   <Text style={styles.supportBtnText}>Navigate</Text>
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
