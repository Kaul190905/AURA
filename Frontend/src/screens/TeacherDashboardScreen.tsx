import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, AlertTriangle, Users, User, Bluetooth } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { colors, radius, spacing, fonts, neuSm } from '../theme';
import { riskColor } from '../utils';

export default function TeacherDashboardScreen({ navigation }: any) {
  const { 
    mockStudents,
    darkMode, setIsNotificationCenterOpen
  } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  const bgStyle = darkMode ? { backgroundColor: '#000000' } : { backgroundColor: colors.background };
  const cardStyle = darkMode ? { backgroundColor: '#1c1c1e' } : { backgroundColor: '#fff' };
  const textStyle = darkMode ? { color: '#fff' } : { color: colors.foreground };
  const subTextStyle = darkMode ? { color: '#aaa' } : { color: colors.mutedForeground };

  // Calculate Overview Stats
  const stats = {
    total: mockStudents.length,
    safe: mockStudents.filter(s => !s.isCrisis && s.risk < 5).length,
    needAttention: mockStudents.filter(s => !s.isCrisis && s.risk >= 5 && s.risk < 9).length,
    critical: mockStudents.filter(s => s.isCrisis || s.risk >= 9).length,
  };

  const criticalStudents = mockStudents.filter(s => s.isCrisis || s.risk >= 5).sort((a, b) => {
    const pA = a.isCrisis ? 3 : (a.risk >= 9 ? 2 : 1);
    const pB = b.isCrisis ? 3 : (b.risk >= 9 ? 2 : 1);
    return pB - pA;
  });

  const openStudent = (id: string) => {
    navigation.navigate('TrackStudent', { studentId: id });
  };

  const getStatusText = (s: any) => {
    if (s.isCrisis || s.risk >= 9) return 'CRITICAL';
    if (s.risk >= 5) return 'HIGH';
    return 'SAFE';
  };

  const getBleStatusColor = (status?: string) => {
    if (status === 'Connected') return colors.primary;
    if (status === 'Reconnecting') return colors.riskMed;
    return colors.mutedForeground;
  };

  return (
    <View style={[styles.container, bgStyle, { paddingTop: insets.top }]}>
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.superText, subTextStyle]}>TEACHER VIEW</Text>
            <View style={styles.onlineBadge}><Text style={styles.onlineText}>ONLINE</Text></View>
          </View>
          <Text style={[styles.headerTitle, textStyle]}>Teacher Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.bellBtn} onPress={() => setIsNotificationCenterOpen(true)}>
          <Bell size={24} color={colors.primary} />
          <View style={styles.bellBadge} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Overview Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, textStyle]}>Overview</Text>
          <View style={styles.overviewGrid}>
            <TouchableOpacity style={[styles.statCard, cardStyle]} onPress={() => navigation.navigate('Students', { filter: 'All' })}>
              <Text style={[styles.statLabel, { color: colors.primary }]}>Total Students</Text>
              <Users size={20} color={colors.primary} style={{ marginVertical: 4 }} />
              <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statCard, cardStyle]} onPress={() => navigation.navigate('Students', { filter: 'Safe' })}>
              <Text style={[styles.statLabel, { color: colors.riskLow }]}>Safe</Text>
              <Users size={20} color={colors.riskLow} style={{ marginVertical: 4 }} />
              <Text style={[styles.statValue, { color: colors.riskLow }]}>{stats.safe}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statCard, cardStyle]} onPress={() => navigation.navigate('Students', { filter: 'Need Attention' })}>
              <Text style={[styles.statLabel, { color: colors.riskMed }]}>Need Attention</Text>
              <Users size={20} color={colors.riskMed} style={{ marginVertical: 4 }} />
              <Text style={[styles.statValue, { color: colors.riskMed }]}>{stats.needAttention}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statCard, cardStyle]} onPress={() => navigation.navigate('Students', { filter: 'Critical' })}>
              <Text style={[styles.statLabel, { color: colors.riskHigh }]}>Critical</Text>
              <Users size={20} color={colors.riskHigh} style={{ marginVertical: 4 }} />
              <Text style={[styles.statValue, { color: colors.riskHigh }]}>{stats.critical}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Critical Alerts Section */}
        {criticalStudents.length > 0 && (
          <View style={[styles.criticalContainer, neuSm, cardStyle]}>
            <View style={styles.criticalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={20} color={colors.riskHigh} />
                <Text style={[styles.sectionTitle, { color: colors.riskHigh, marginBottom: 0 }]}>Critical Students</Text>
              </View>
              <View style={[styles.criticalCountBadge, { backgroundColor: `${colors.riskHigh}15` }]}>
                <Text style={[styles.criticalCountText, { color: colors.riskHigh }]}>{stats.critical + stats.needAttention}</Text>
              </View>
            </View>

            {criticalStudents.map(student => {
              const rColor = riskColor(student.risk);
              return (
                <TouchableOpacity key={student.id} style={styles.alertItem} onPress={() => openStudent(student.id)}>
                  <View style={[styles.avatarSm, { backgroundColor: `${rColor}20` }]}>
                    <User size={20} color={rColor} />
                  </View>
                  <View style={[styles.alertInfo, { borderBottomColor: darkMode ? '#333' : '#f0f0f0' }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.alertName, textStyle]}>{student.name}</Text>
                      <View style={[styles.riskBadge, { backgroundColor: `${rColor}15` }]}>
                        <Text style={[styles.riskBadgeText, { color: rColor }]}>{getStatusText(student)}</Text>
                      </View>
                    </View>
                    <Text style={[styles.alertCondition, textStyle]}>
                      {student.condition} {student.sensorValue && `• ${student.sensorValue}`}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Bluetooth size={12} color={getBleStatusColor(student.bluetoothStatus)} />
                        <Text style={[styles.alertBleStatus, { color: getBleStatusColor(student.bluetoothStatus) }]}>
                          Bluetooth {student.bluetoothStatus || 'Disconnected'}
                        </Text>
                      </View>
                      <Text style={[styles.alertTime, subTextStyle]}>Updated {student.lastUpdated}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={[styles.viewAllBtn, { borderTopColor: darkMode ? '#333' : '#f0f0f0' }]} onPress={() => navigation.navigate('Students', { filter: 'Critical' })}>
              <Text style={styles.viewAllText}>View All Alerts</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md 
  },
  superText: { fontSize: 10, ...fonts.bold, letterSpacing: 0.5 },
  onlineBadge: { backgroundColor: `${colors.primary}20`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  onlineText: { color: colors.primary, fontSize: 9, ...fonts.bold },
  headerTitle: { fontSize: 24, ...fonts.bold, marginTop: 4 },
  bellBtn: { padding: 8, position: 'relative' },
  bellBadge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.riskHigh },
  
  scrollContent: { padding: spacing.lg, paddingBottom: 100, gap: spacing.lg },
  
  section: {},
  sectionTitle: { fontSize: 16, ...fonts.bold, marginBottom: 12 },
  
  overviewGrid: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  statCard: { 
    flex: 1, padding: 12, borderRadius: radius.lg, 
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
  },
  statLabel: { fontSize: 10, ...fonts.bold, textAlign: 'center', height: 28 },
  statValue: { fontSize: 20, ...fonts.bold },

  criticalContainer: { borderRadius: radius.xl, padding: spacing.md },
  criticalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  criticalCountBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  criticalCountText: { fontSize: 12, ...fonts.bold },
  
  alertItem: { flexDirection: 'row', marginBottom: 16, paddingHorizontal: 4 },
  avatarSm: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  alertInfo: { flex: 1, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 16 },
  alertName: { fontSize: 15, ...fonts.bold },
  riskBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  riskBadgeText: { fontSize: 9, ...fonts.bold },
  alertCondition: { fontSize: 13, ...fonts.medium, marginTop: 4 },
  alertBleStatus: { fontSize: 11, ...fonts.bold },
  alertTime: { fontSize: 11 },
  
  viewAllBtn: { alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  viewAllText: { color: colors.primary, ...fonts.bold, fontSize: 14 },
});
