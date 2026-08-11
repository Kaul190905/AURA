import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, User, Bluetooth, Activity } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { colors, radius, spacing, fonts, neuSm } from '../theme';
import { riskColor } from '../utils';

export default function TeacherStudentDetailsScreen({ route, navigation }: any) {
  const { studentId } = route.params;
  const { mockStudents, darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  
  const student = mockStudents.find(s => s.id === studentId);
  
  if (!student) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Student not found.</Text>
      </View>
    );
  }

  const bgStyle = darkMode ? { backgroundColor: '#000000' } : { backgroundColor: colors.background };
  const cardStyle = darkMode ? { backgroundColor: '#1c1c1e' } : { backgroundColor: '#fff' };
  const textStyle = darkMode ? { color: '#fff' } : { color: colors.foreground };
  const subTextStyle = darkMode ? { color: '#aaa' } : { color: colors.mutedForeground };
  
  const rColor = riskColor(student.risk);

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
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft size={24} color={textStyle.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, textStyle]}>Student Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Card */}
        <View style={[styles.profileCard, neuSm, cardStyle]}>
          <View style={[styles.avatarLg, { backgroundColor: `${rColor}20` }]}>
            <User size={48} color={rColor} />
          </View>
          <Text style={[styles.profileName, textStyle]}>{student.name}</Text>
          <View style={[styles.riskBadge, { backgroundColor: `${rColor}15` }]}>
            <Text style={[styles.riskBadgeText, { color: rColor }]}>{getStatusText(student)}</Text>
          </View>
        </View>

        {/* Current Condition */}
        <View style={[styles.sectionCard, neuSm, cardStyle]}>
          <Text style={[styles.sectionTitle, textStyle]}>Current Condition</Text>
          <View style={styles.conditionRow}>
            <Activity size={20} color={colors.primary} />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.conditionText, textStyle]}>{student.condition || 'Monitoring Active'}</Text>
              {student.sensorValue && <Text style={[styles.sensorValue, subTextStyle]}>{student.sensorValue}</Text>}
            </View>
          </View>
        </View>

        {/* Device Status */}
        <View style={[styles.sectionCard, neuSm, cardStyle]}>
          <Text style={[styles.sectionTitle, textStyle]}>Device Status</Text>
          <View style={styles.conditionRow}>
            <Bluetooth size={20} color={getBleStatusColor(student.bluetoothStatus)} />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.conditionText, { color: getBleStatusColor(student.bluetoothStatus) }]}>
                {student.bluetoothStatus || 'Disconnected'}
              </Text>
              <Text style={[styles.sensorValue, subTextStyle]}>Last update: {student.lastUpdated}</Text>
            </View>
          </View>
        </View>

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
  iconBtn: { padding: 8 },
  headerTitle: { fontSize: 18, ...fonts.bold },
  
  scrollContent: { padding: spacing.lg, paddingBottom: 100, gap: spacing.lg },
  
  profileCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius.xl,
  },
  avatarLg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    ...fonts.bold,
    marginBottom: 8,
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  riskBadgeText: {
    fontSize: 12,
    ...fonts.bold,
  },

  sectionCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
  },
  sectionTitle: {
    fontSize: 16,
    ...fonts.bold,
    marginBottom: 16,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conditionText: {
    fontSize: 16,
    ...fonts.bold,
  },
  sensorValue: {
    fontSize: 14,
    marginTop: 4,
  }
});
