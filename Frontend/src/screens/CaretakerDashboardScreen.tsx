import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, AlertTriangle, Users, User } from 'lucide-react-native';
import { AppContext, AppNotification } from '../AppContext';
import { colors, radius, spacing, fonts, shadowSm } from '../theme';
import { riskColor } from '../utils';
import { connectCaregiverIoTData, getPendingInvitations, acceptInvitation, CaregiverResponse, getAssignedUsersDetails } from '../services/caregiverApi';

function LiveSensorRow({ darkMode, userId }: { darkMode: boolean, userId: string }) {
  const [bpm, setBpm] = useState(82);
  const [temp, setTemp] = useState(98.4);
  const [soundLevel, setSoundLevel] = useState(45);

  const { setNotifications } = useContext(AppContext);

  useEffect(() => {
    const ws = connectCaregiverIoTData(userId, (data) => {
      if (data.type === 'SOS_ALERT' && data.alert) {
        setNotifications((prev: AppNotification[]) => {
          const exists = prev.find((n: AppNotification) => n.id === data.alert.id);
          if (exists) { return prev; }
          return [{
            id: data.alert.id,
            title: 'Critical Alert',
            description: data.alert.message,
            time: new Date(data.alert.created_at).getTime(),
            read: false,
            type: 'alert' as const,
          }, ...prev].sort((a, b) => b.time - a.time);
        });
      }
      if (data.bpm) { setBpm(data.bpm); }
      if (data.temp) { setTemp(data.temp); }
      if (data.soundLevel) { setSoundLevel(data.soundLevel); }
    });

    // Fallback simulation if no real data is arriving yet (for UI demo purposes)
    const interval = setInterval(() => {
      setBpm(prev => prev + (Math.floor(Math.random() * 5) - 2));
      setTemp(prev => parseFloat((prev + (Math.random() * 0.2 - 0.1)).toFixed(1)));
      setSoundLevel(prev => prev + (Math.floor(Math.random() * 11) - 5));
    }, 5000);

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, [userId, setNotifications]);

  const textStyle = darkMode ? { color: '#fff' } : { color: colors.foreground };
  const subTextStyle = darkMode ? { color: '#aaa' } : { color: colors.mutedForeground };

  return (
    <View style={[styles.sensorRow, darkMode ? styles.bgDark333 : styles.bgLightF8]}>
      <View style={styles.alignCenter}>
        <Text style={[subTextStyle, styles.font10Bold]}>BPM</Text>
        <Text style={[textStyle, styles.font13Bold, bpm > 100 ? styles.colorRiskHigh : undefined]}>{bpm}</Text>
      </View>
      <View style={styles.alignCenter}>
        <Text style={[subTextStyle, styles.font10Bold]}>TEMP</Text>
        <Text style={[textStyle, styles.font13Bold]}>{temp}°</Text>
      </View>
      <View style={styles.alignCenter}>
        <Text style={[subTextStyle, styles.font10Bold]}>NOISE</Text>
        <Text style={[textStyle, styles.font13Bold, soundLevel > 70 ? styles.colorRiskMed : undefined]}>{soundLevel}dB</Text>
      </View>
    </View>
  );
}

export default function CaretakerDashboardScreen({ navigation }: any) {
  const {
    mockUsers, setMockUsers, recentlyViewedUserIds, setRecentlyViewedUserIds,
    darkMode, setIsNotificationCenterOpen, isCaregiverOnline,
  } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [pendingInvitations, setPendingInvitations] = useState<CaregiverResponse[]>([]);
  const fetchDashboardData = React.useCallback(async () => {
    try {
      const [pending, details] = await Promise.all([
        getPendingInvitations(),
        getAssignedUsersDetails(),
      ]);
      setPendingInvitations(pending);
      setMockUsers(details as any);
    } catch (e) {
      console.warn('Failed to fetch dashboard data:', e);
    }
  }, [setMockUsers]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleAccept = async (assignmentId: string) => {
    try {
      await acceptInvitation(assignmentId);
      // Immediately remove from list
      setPendingInvitations(prev => prev.filter(inv => inv.id !== assignmentId));
      fetchDashboardData(); // Refresh the list
    } catch (e: any) {
      Alert.alert('Error', 'Failed to accept invitation: ' + e.message);
    }
  };

  const bgStyle = darkMode ? { backgroundColor: '#000000' } : { backgroundColor: colors.background };
  const cardStyle = darkMode ? { backgroundColor: '#1c1c1e' } : { backgroundColor: '#fff' };
  const textStyle = darkMode ? { color: '#fff' } : { color: colors.foreground };
  const subTextStyle = darkMode ? { color: '#aaa' } : { color: colors.mutedForeground };

  // Calculate Overview Stats
  const stats = {
    total: mockUsers.length,
    safe: mockUsers.filter(u => !u.isCrisis && u.risk < 5).length,
    needAttention: mockUsers.filter(u => !u.isCrisis && u.risk >= 5 && u.risk < 9).length,
    critical: mockUsers.filter(u => u.isCrisis || u.risk >= 9).length,
  };

  const criticalUsers = mockUsers.filter(u => u.isCrisis || u.risk >= 5).sort((a, b) => {
    const pA = a.isCrisis ? 3 : (a.risk >= 9 ? 2 : 1);
    const pB = b.isCrisis ? 3 : (b.risk >= 9 ? 2 : 1);
    return pB - pA;
  });

  // const recentlyViewed = recentlyViewedUserIds.map(id => mockUsers.find(u => u.id === id)).filter(Boolean);

  const openUser = (id: string, initialTab: 'Overview' | 'Location' = 'Overview') => {
    const newIds = [id, ...recentlyViewedUserIds.filter(pid => pid !== id)];
    setRecentlyViewedUserIds(newIds.slice(0, 10));

    if (initialTab === 'Location') {
      navigation.navigate('LocationMap', { userId: id });
    } else {
      navigation.navigate('ConnectedUserDetails', { userId: id });
    }
  };

  const getStatusText = (s: any) => {
    if (s.isCrisis || s.risk >= 9) { return 'CRITICAL'; }
    if (s.risk >= 5) { return 'HIGH'; }
    return 'SAFE';
  };

  return (
    <View style={[styles.container, bgStyle, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, textStyle]}>Dashboard</Text>

          <View style={styles.headerStatus}>
            {isCaregiverOnline ? (
              <>
                <View style={[styles.onlineDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.onlineTextStatus, { color: colors.primary }]}>Online</Text>
              </>
            ) : (
              <>
                <View style={[styles.onlineDot, { backgroundColor: colors.mutedForeground }]} />
                <Text style={[styles.onlineTextStatus, { color: colors.mutedForeground }]}>Offline</Text>
              </>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.bellBtn} onPress={() => setIsNotificationCenterOpen(true)}>
          <Bell size={24} color={colors.primary} />
          <View style={styles.bellBadge} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Pending Invitations Section */}
        {pendingInvitations.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, textStyle]}>Pending Invitations</Text>
            {pendingInvitations.map(inv => (
              <View key={inv.id} style={[styles.pendingCard, cardStyle, shadowSm]}>
                <View style={styles.flex1}>
                  <Text style={[styles.pendingTitle, textStyle]}>New Request</Text>
                  <Text style={[styles.pendingText, subTextStyle]}>You have been invited to be a caregiver by User ID: {inv.user_id}</Text>
                </View>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(inv.id)}>
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Overview Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, textStyle]}>Overview</Text>
          <View style={styles.overviewGrid}>
            <TouchableOpacity style={[styles.statCard, cardStyle]} onPress={() => navigation.navigate('Users', { filter: 'All' })}>
              <Text style={[styles.statLabel, { color: colors.primary }]}>Total Users</Text>
              <Users size={20} color={colors.primary} style={styles.marginV4} />
              <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statCard, cardStyle]} onPress={() => navigation.navigate('Users', { filter: 'Safe' })}>
              <Text style={[styles.statLabel, { color: colors.riskLow }]}>Safe</Text>
              <Users size={20} color={colors.riskLow} style={styles.marginV4} />
              <Text style={[styles.statValue, { color: colors.riskLow }]}>{stats.safe}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statCard, cardStyle]} onPress={() => navigation.navigate('Users', { filter: 'Need Attention' })}>
              <Text style={[styles.statLabel, { color: colors.riskMed }]}>Need Attention</Text>
              <Users size={20} color={colors.riskMed} style={styles.marginV4} />
              <Text style={[styles.statValue, { color: colors.riskMed }]}>{stats.needAttention}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statCard, cardStyle]} onPress={() => navigation.navigate('Users', { filter: 'Critical' })}>
              <Text style={[styles.statLabel, { color: colors.riskHigh }]}>Critical</Text>
              <Users size={20} color={colors.riskHigh} style={styles.marginV4} />
              <Text style={[styles.statValue, { color: colors.riskHigh }]}>{stats.critical}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Critical Alerts Section */}
        {criticalUsers.length > 0 ? (
          <View style={[styles.criticalContainer, shadowSm, cardStyle]}>
            <View style={styles.criticalHeader}>
              <View style={styles.criticalHeaderLeft}>
                <AlertTriangle size={20} color={colors.riskHigh} />
                <Text style={[styles.sectionTitle, styles.criticalTitle]}>Critical Users</Text>
              </View>
              <View style={[styles.criticalCountBadge, { backgroundColor: `${colors.riskHigh}15` }]}>
                <Text style={[styles.criticalCountText, { color: colors.riskHigh }]}>{stats.critical + stats.needAttention}</Text>
              </View>
            </View>

            {criticalUsers.map(user => {
              const rColor = riskColor(user.risk);
              return (
                <TouchableOpacity key={user.id} style={styles.alertItem} onPress={() => openUser(user.id, 'Location')}>
                  <View style={[styles.avatarSm, { backgroundColor: `${rColor}20` }]}>
                    <User size={20} color={rColor} />
                  </View>
                  <View style={[styles.alertInfo, darkMode ? styles.borderDark333 : styles.borderLightF0]}>
                    <View style={styles.rowBetweenCenter}>
                      <Text style={[styles.alertName, textStyle]}>{user.name}</Text>
                      <View style={[styles.riskBadge, { backgroundColor: `${rColor}15` }]}>
                        <Text style={[styles.riskBadgeText, { color: rColor }]}>{getStatusText(user)}</Text>
                      </View>
                    </View>
                    <View style={styles.alertLocationRow}>
                      <Text style={[styles.alertLocation, textStyle, styles.fontWeightBold]}>📍 {user.phoneLocation}</Text>
                      <Text style={[styles.alertTime, subTextStyle]}>{user.lastUpdated}</Text>
                    </View>
                    <Text style={[styles.alertCondition, subTextStyle]}>
                      {user.condition} {user.sensorValue && `• ${user.sensorValue}`}
                    </Text>
                    <LiveSensorRow darkMode={darkMode} userId={user.id} />
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={[styles.viewAllBtn, darkMode ? styles.borderTopDark333 : styles.borderTopLightF0]} onPress={() => navigation.navigate('Users', { filter: 'Critical' })}>
              <Text style={styles.viewAllText}>View All Alerts</Text>
            </TouchableOpacity>
          </View>
        ) : (
          stats.safe > 0 && (
            <View style={[styles.criticalContainer, shadowSm, cardStyle]}>
              <View style={styles.criticalHeader}>
                <View style={styles.criticalHeaderLeft}>
                  <User size={20} color={colors.riskLow} />
                  <Text style={[styles.sectionTitle, styles.safeTitle]}>Safe Users</Text>
                </View>
                <View style={[styles.criticalCountBadge, { backgroundColor: `${colors.riskLow}15` }]}>
                  <Text style={[styles.criticalCountText, { color: colors.riskLow }]}>{stats.safe}</Text>
                </View>
              </View>
              
              {mockUsers.filter(u => !u.isCrisis && u.risk < 5).map(user => {
                const rColor = riskColor(user.risk);
                return (
                  <TouchableOpacity key={user.id} style={styles.alertItem} onPress={() => openUser(user.id, 'Overview')}>
                    <View style={[styles.avatarSm, { backgroundColor: `${rColor}20` }]}>
                      <User size={20} color={rColor} />
                    </View>
                    <View style={[styles.alertInfo, darkMode ? styles.borderDark333 : styles.borderLightF0]}>
                      <View style={styles.rowBetweenCenter}>
                        <Text style={[styles.alertName, textStyle]}>{user.name}</Text>
                        <View style={[styles.riskBadge, { backgroundColor: `${rColor}15` }]}>
                          <Text style={[styles.riskBadgeText, { color: rColor }]}>SAFE</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )
        )}



      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  superText: { fontSize: 10, ...fonts.bold, letterSpacing: 0.5 },
  onlineBadge: { backgroundColor: `${colors.primary}20`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  onlineText: { color: colors.primary, fontSize: 9, ...fonts.bold },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineTextStatus: { fontSize: 14, ...fonts.bold },
  headerTitle: { fontSize: 24, ...fonts.bold, marginTop: 4 },
  bellBtn: { padding: 8, position: 'relative' },
  bellBadge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.riskHigh },

  scrollContent: { padding: spacing.lg, paddingBottom: 100, gap: spacing.lg },

  section: {},
  sectionTitle: { fontSize: 16, ...fonts.bold, marginBottom: 12 },

  pendingCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: radius.lg, marginBottom: 12 },
  pendingTitle: { fontSize: 15, ...fonts.bold, marginBottom: 4 },
  pendingText: { fontSize: 12 },
  acceptBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginLeft: 12 },
  acceptBtnText: { color: '#fff', fontSize: 14, ...fonts.bold },

  overviewGrid: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  statCard: {
    flex: 1, padding: 12, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statLabel: { fontSize: 10, ...fonts.bold, textAlign: 'center', height: 28 },
  statValue: { fontSize: 20, ...fonts.bold },

  criticalContainer: { borderRadius: radius.xl, padding: spacing.md },
  criticalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  criticalCountBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  criticalCountText: { fontSize: 12, ...fonts.bold },
  safeTitle: { color: colors.riskLow, marginBottom: 0, marginLeft: 8 },

  alertItem: { flexDirection: 'row', marginBottom: 16, paddingHorizontal: 4 },
  avatarSm: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  alertInfo: { flex: 1, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 16 },
  alertName: { fontSize: 15, ...fonts.bold },
  riskBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  riskBadgeText: { fontSize: 9, ...fonts.bold },
  alertCondition: { fontSize: 13, ...fonts.medium, marginTop: 4 },
  alertLocation: { fontSize: 12 },
  alertTime: { fontSize: 11 },

  viewAllBtn: { alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  viewAllText: { color: colors.primary, ...fonts.bold, fontSize: 14 },



  sensorRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, padding: 8, borderRadius: 8 },
  bgDark333: { backgroundColor: '#333' },
  bgLightF8: { backgroundColor: '#f8f9fa' },
  alignCenter: { alignItems: 'center' },
  font10Bold: { fontSize: 10, ...fonts.bold },
  font13Bold: { fontSize: 13, ...fonts.bold },
  colorRiskHigh: { color: colors.riskHigh },
  colorRiskMed: { color: colors.riskMed },
  headerTop: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flex1: { flex: 1 },
  marginV4: { marginVertical: 4 },
  criticalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  criticalTitle: { color: colors.riskHigh, marginBottom: 0 },
  borderDark333: { borderBottomColor: '#333' },
  borderLightF0: { borderBottomColor: '#f0f0f0' },
  borderTopDark333: { borderTopColor: '#333' },
  borderTopLightF0: { borderTopColor: '#f0f0f0' },
  rowBetweenCenter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alertLocationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 4 },
  fontWeightBold: { fontWeight: 'bold' },
});
