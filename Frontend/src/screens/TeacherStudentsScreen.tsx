import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Filter, User, ChevronRight, ArrowLeft, Bluetooth } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { colors, radius, spacing, fonts, neuSm } from '../theme';
import { riskColor } from '../utils';

type FilterType = 'All' | 'Safe' | 'Need Attention' | 'Critical';

export default function TeacherStudentsScreen({ navigation, route }: any) {
  const { mockStudents, darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  
  const initialFilter = route?.params?.filter || 'All';
  const [activeFilter, setActiveFilter] = useState<FilterType>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (route?.params?.filter) {
      setActiveFilter(route.params.filter as FilterType);
    }
  }, [route?.params?.filter]);

  const bgStyle = darkMode ? { backgroundColor: '#000000' } : { backgroundColor: colors.background };
  const cardStyle = darkMode ? { backgroundColor: '#1c1c1e' } : { backgroundColor: '#fff' };
  const textStyle = darkMode ? { color: '#fff' } : { color: colors.foreground };
  const subTextStyle = darkMode ? { color: '#aaa' } : { color: colors.mutedForeground };

  const counts = {
    All: mockStudents.length,
    Safe: mockStudents.filter(s => !s.isCrisis && s.risk < 5).length,
    'Need Attention': mockStudents.filter(s => !s.isCrisis && s.risk >= 5 && s.risk < 9).length,
    Critical: mockStudents.filter(s => s.isCrisis || s.risk >= 9).length,
  };

  const filteredStudents = mockStudents.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (s.rollNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (s.className || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFilter === 'Safe') return !s.isCrisis && s.risk < 5;
    if (activeFilter === 'Need Attention') return !s.isCrisis && s.risk >= 5 && s.risk < 9;
    if (activeFilter === 'Critical') return s.isCrisis || s.risk >= 9;
    return true; // All
  });

  const getStatusText = (s: any) => {
    if (s.isCrisis) return 'CRITICAL';
    if (s.risk >= 9) return 'CRITICAL';
    if (s.risk >= 5) return 'HIGH';
    if (s.risk >= 3) return 'MEDIUM';
    return 'SAFE';
  };

  const openStudent = (id: string) => {
    navigation.navigate('TrackStudent', { studentId: id });
  };

  const getBleStatusColor = (status?: string) => {
    if (status === 'Connected') return colors.primary;
    if (status === 'Reconnecting') return colors.riskMed;
    return colors.mutedForeground;
  };

  return (
    <View style={[styles.container, bgStyle, { paddingTop: insets.top }]}>
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Dashboard')} style={styles.iconBtn}>
          <ArrowLeft size={24} color={textStyle.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, textStyle]}>Students</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn}>
            <Search size={20} color={textStyle.color} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Filter size={20} color={textStyle.color} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {(['All', 'Safe', 'Need Attention', 'Critical'] as FilterType[]).map(f => {
            const isActive = activeFilter === f;
            let activeColor = colors.primary;
            if (f === 'Safe') activeColor = colors.riskLow;
            if (f === 'Need Attention') activeColor = colors.riskMed;
            if (f === 'Critical') activeColor = colors.riskHigh;

            return (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterChip,
                  cardStyle,
                  isActive && { backgroundColor: activeColor, borderColor: activeColor, borderWidth: 1 }
                ]}
                onPress={() => setActiveFilter(f)}
              >
                <Text style={[
                  styles.filterText,
                  isActive ? { color: '#fff' } : { color: f === 'All' ? colors.primary : activeColor }
                ]}>
                  {f} ({counts[f]})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.content}>
        <View style={[styles.searchBar, cardStyle]}>
          <Search size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, textStyle]}
            placeholder="Search students..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {filteredStudents.map(student => {
            const rColor = riskColor(student.risk);
            const statusLabel = getStatusText(student);

            return (
              <TouchableOpacity
                key={student.id}
                style={[styles.studentRow, cardStyle]}
                activeOpacity={0.7}
                onPress={() => openStudent(student.id)}
              >
                <View style={[styles.avatar, { backgroundColor: `${rColor}20` }]}>
                  <User size={24} color={rColor} />
                </View>
                <View style={styles.rowInfo}>
                  <View style={styles.rowHeader}>
                    <Text style={[styles.studentName, textStyle]}>{student.name}</Text>
                    <View style={[styles.riskBadge, { backgroundColor: `${rColor}15` }]}>
                      <Text style={[styles.riskBadgeText, { color: rColor }]}>{statusLabel}</Text>
                    </View>
                  </View>
                  
                  {student.condition ? (
                    <Text style={[styles.studentCondition, textStyle]}>
                      {student.condition} {student.sensorValue && `• ${student.sensorValue}`}
                    </Text>
                  ) : (
                    <Text style={[styles.studentCondition, textStyle]}>Monitoring Active</Text>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Bluetooth size={12} color={getBleStatusColor(student.bluetoothStatus)} />
                    <Text style={[styles.alertBleStatus, { color: getBleStatusColor(student.bluetoothStatus) }]}>
                      Bluetooth {student.bluetoothStatus || 'Disconnected'}
                    </Text>
                  </View>
                </View>

                <View style={styles.rowRight}>
                  <Text style={[styles.timeText, subTextStyle]}>{student.lastUpdated}</Text>
                  <ChevronRight size={20} color={colors.mutedForeground} style={{ marginTop: 8 }} />
                </View>
              </TouchableOpacity>
            );
          })}
          {filteredStudents.length === 0 && (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={[subTextStyle, { fontSize: 16 }]}>No students match the criteria.</Text>
            </View>
          )}
        </ScrollView>
      </View>
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
  headerTitle: { fontSize: 18, ...fonts.bold, flex: 1, marginLeft: 8 },
  headerActions: { flexDirection: 'row', gap: 8 },
  
  filtersContainer: { marginBottom: spacing.sm },
  filtersScroll: { paddingHorizontal: spacing.lg, gap: 8 },
  filterChip: { 
    paddingHorizontal: 16, paddingVertical: 8, 
    borderRadius: 20, borderWidth: 1, borderColor: 'transparent'
  },
  filterText: { fontSize: 13, ...fonts.bold },

  content: { flex: 1, paddingHorizontal: spacing.lg },
  
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, height: 50, borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, ...fonts.medium },
  
  studentRow: {
    flexDirection: 'row', padding: 16,
    borderRadius: radius.lg, marginBottom: spacing.sm,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  
  rowInfo: { flex: 1, justifyContent: 'center' },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  studentName: { fontSize: 16, ...fonts.bold },
  riskBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  riskBadgeText: { fontSize: 10, ...fonts.bold },
  
  studentCondition: { fontSize: 13, opacity: 0.8 },
  alertBleStatus: { fontSize: 11, ...fonts.bold },

  rowRight: { alignItems: 'flex-end', justifyContent: 'flex-start' },
  timeText: { fontSize: 11 },
});
