import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Filter, User, ChevronRight, Plus, X } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { colors, radius, spacing, fonts, shadowSm } from '../theme';
import { riskColor } from '../utils';

type FilterType = 'All' | 'Safe' | 'Need Attention' | 'Critical';

export default function CaretakerUsersScreen({ navigation, route }: any) {
  const { mockUsers, setMockUsers, darkMode, recentlyViewedUserIds, setRecentlyViewedUserIds } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  
  const initialFilter = route?.params?.filter || 'All';
  const [activeFilter, setActiveFilter] = useState<FilterType>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserCondition, setNewUserCondition] = useState<'Sound' | 'Temperature' | 'Both' | null>(null);

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
    All: mockUsers.length,
    Safe: mockUsers.filter(u => !u.isCrisis && u.risk < 5).length,
    'Need Attention': mockUsers.filter(u => !u.isCrisis && u.risk >= 5 && u.risk < 9).length,
    Critical: mockUsers.filter(u => u.isCrisis || u.risk >= 9).length,
  };

  const filteredUsers = mockUsers.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFilter === 'Safe') return !u.isCrisis && u.risk < 5;
    if (activeFilter === 'Need Attention') return !u.isCrisis && u.risk >= 5 && u.risk < 9;
    if (activeFilter === 'Critical') return u.isCrisis || u.risk >= 9;
    return true; // All
  });

  const getStatusText = (u: any) => {
    if (u.isCrisis) return 'CRITICAL';
    if (u.risk >= 9) return 'CRITICAL';
    if (u.risk >= 5) return 'HIGH';
    if (u.risk >= 3) return 'MEDIUM';
    return 'SAFE';
  };

  const openUser = (id: string) => {
    const newIds = [id, ...recentlyViewedUserIds.filter(pid => pid !== id)];
    setRecentlyViewedUserIds(newIds.slice(0, 10));
    navigation.navigate('ConnectedUserDetails', { userId: id });
  };

  const handleAddUser = () => {
    if (!newUserName.trim()) {
      Alert.alert('Validation Error', 'Please enter the user\'s name.');
      return;
    }
    if (!newUserEmail.trim() || !newUserEmail.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }
    if (!newUserCondition) {
      Alert.alert('Validation Error', 'Please select a sensory condition.');
      return;
    }

    const newUser = {
      id: `u${mockUsers.length + 1}`,
      name: newUserName.trim(),
      risk: 1,
      isCrisis: false,
      condition: 'Safe',
      phoneLocation: 'Unknown',
      locationSharingStatus: 'Paused' as const,
      lastUpdated: 'Just now',
      sensoryProfile: {
        sound: newUserCondition === 'Sound' || newUserCondition === 'Both',
        temperature: newUserCondition === 'Temperature' || newUserCondition === 'Both',
      },
      currentSensorData: {
        heartRate: 80,
        soundDb: newUserCondition === 'Sound' || newUserCondition === 'Both' ? 50 : null,
        temperatureC: newUserCondition === 'Temperature' || newUserCondition === 'Both' ? 36.5 : null,
      },
      email: newUserEmail.trim(),
    };
    setMockUsers([...mockUsers, newUser]);
    setIsAddModalOpen(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserCondition(null);
  };

  return (
    <View style={[styles.container, bgStyle, { paddingTop: insets.top }]}>
      
      <View style={styles.header}>
        <Text style={[styles.headerTitle, textStyle, { marginLeft: 0 }]}>Users</Text>
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
            placeholder="Search users..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {filteredUsers.map(user => {
            const rColor = riskColor(user.risk);
            const statusLabel = getStatusText(user);

            return (
              <TouchableOpacity
                key={user.id}
                style={[styles.studentRow, cardStyle]}
                activeOpacity={0.7}
                onPress={() => openUser(user.id)}
              >
                <View style={[styles.avatar, { backgroundColor: `${rColor}20` }]}>
                  <User size={24} color={rColor} />
                </View>
                <View style={styles.rowInfo}>
                  <View style={styles.rowHeader}>
                    <Text style={[styles.studentName, textStyle]}>{user.name}</Text>
                    <View style={[styles.riskBadge, { backgroundColor: `${rColor}15` }]}>
                      <Text style={[styles.riskBadgeText, { color: rColor }]}>{statusLabel}</Text>
                    </View>
                  </View>
                  
                  <Text style={[styles.studentLocation, subTextStyle]}>📍 {user.phoneLocation}</Text>
                  
                  {user.condition && (
                    <Text style={[styles.studentCondition, textStyle]}>
                      {user.condition} {user.sensorValue && `• ${user.sensorValue}`}
                    </Text>
                  )}
                </View>

                <View style={styles.rowRight}>
                  <Text style={[styles.timeText, subTextStyle]}>{user.lastUpdated}</Text>
                  <ChevronRight size={20} color={colors.mutedForeground} style={{ marginTop: 8 }} />
                </View>
              </TouchableOpacity>
            );
          })}
          {filteredUsers.length === 0 && (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={[subTextStyle, { fontSize: 16 }]}>No users match the criteria.</Text>
            </View>
          )}
        </ScrollView>
      </View>

      <Modal visible={isAddModalOpen} transparent animationType="slide" onRequestClose={() => setIsAddModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, cardStyle]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, textStyle]}>Add User</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)} style={styles.closeBtn}>
                <X size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, textStyle]}>Name</Text>
              <TextInput
                style={[styles.inputField, textStyle, { borderColor: darkMode ? '#333' : '#e0e0e0' }]}
                placeholder="User's full name"
                placeholderTextColor={colors.mutedForeground}
                value={newUserName}
                onChangeText={setNewUserName}
              />

              <Text style={[styles.inputLabel, textStyle]}>Condition</Text>
              <View style={styles.conditionOptions}>
                {['Sound', 'Temperature', 'Both'].map(cond => (
                  <TouchableOpacity
                    key={cond}
                    style={[
                      styles.conditionBtn,
                      { borderColor: darkMode ? '#333' : '#e0e0e0' },
                      newUserCondition === cond && { borderColor: colors.primary, backgroundColor: `${colors.primary}10` }
                    ]}
                    onPress={() => setNewUserCondition(cond as any)}
                  >
                    <Text style={[
                      styles.conditionBtnText,
                      textStyle,
                      newUserCondition === cond && { color: colors.primary, ...fonts.bold }
                    ]}>
                      {cond === 'Both' ? 'Sound + Temperature' : cond}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, textStyle]}>Email Address</Text>
              <TextInput
                style={[styles.inputField, textStyle, { borderColor: darkMode ? '#333' : '#e0e0e0' }]}
                placeholder="Email Address"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                value={newUserEmail}
                onChangeText={setNewUserEmail}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleAddUser}>
                <Text style={styles.submitBtnText}>Add User</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  
  studentLocation: { fontSize: 12, marginBottom: 4 },
  studentCondition: { fontSize: 13, opacity: 0.8 },

  rowRight: { alignItems: 'flex-end', justifyContent: 'flex-start' },
  timeText: { fontSize: 11 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 4
  },
  addBtnText: { color: '#fff', fontSize: 13, ...fonts.bold },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, ...fonts.bold },
  closeBtn: { padding: 4 },
  
  inputLabel: { fontSize: 14, ...fonts.bold, marginBottom: 8, marginTop: 16 },
  inputField: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, height: 50, fontSize: 16, ...fonts.medium },
  
  conditionOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  conditionBtn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  conditionBtnText: { fontSize: 14 },

  submitBtn: { backgroundColor: colors.primary, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 32, marginBottom: 40 },
  submitBtnText: { color: '#fff', fontSize: 16, ...fonts.bold },
});
