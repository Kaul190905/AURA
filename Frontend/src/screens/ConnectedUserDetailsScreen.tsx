import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, User, Activity, Heart, Info, AlertCircle } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { colors, radius, spacing, fonts, neuSm } from '../theme';

export default function ConnectedUserDetailsScreen({ navigation }: any) {
  const { darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  
  // Mock data for the connected user (this would typically come from route params or context)
  const connectedUser = {
    name: 'Santosh',
    age: 28,
    condition: 'Autism Spectrum',
    status: 'Connected',
    pairedDate: 'Jul 12, 2026',
    heartRate: '82 bpm',
    stressLevel: 'Low',
    inputs: [
      { label: 'Sensory Preferences', value: 'Prefers dim lighting, sensitive to loud noises.' },
      { label: 'Communication Mode', value: 'Verbal, prefers direct instruction.' },
      { label: 'Emergency Protocol', value: 'Contact Dr. Smith immediately.' }
    ]
  };

  const bgStyle = darkMode ? { backgroundColor: '#000000' } : { backgroundColor: colors.background };
  const cardStyle = darkMode ? { backgroundColor: '#1c1c1e' } : { backgroundColor: '#ffffff' };
  const textStyle = darkMode ? { color: '#ffffff' } : { color: colors.foreground };
  const subTextStyle = darkMode ? { color: '#aaaaaa' } : { color: colors.mutedForeground };

  return (
    <View style={[styles.container, bgStyle, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft size={24} color={textStyle.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, textStyle]}>Connected User Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Card */}
        <View style={[styles.profileCard, neuSm, cardStyle]}>
          <View style={styles.avatarSection}>
            <View style={[styles.avatar, { backgroundColor: `${colors.primary}20` }]}>
              <User size={36} color={colors.primary} />
            </View>
            <View style={styles.nameSection}>
              <Text style={[styles.name, textStyle]}>{connectedUser.name}</Text>
              <Text style={[styles.age, subTextStyle]}>{connectedUser.age} years old</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{connectedUser.status}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Health & Condition Overview */}
        <Text style={[styles.sectionTitle, textStyle]}>Overview</Text>
        <View style={styles.row}>
          <View style={[styles.statCard, neuSm, cardStyle]}>
            <Activity size={20} color={colors.primary} style={styles.statIcon} />
            <Text style={[styles.statLabel, subTextStyle]}>Condition</Text>
            <Text style={[styles.statValue, textStyle]}>{connectedUser.condition}</Text>
          </View>
          <View style={[styles.statCard, neuSm, cardStyle]}>
            <Heart size={20} color={colors.riskHigh} style={styles.statIcon} />
            <Text style={[styles.statLabel, subTextStyle]}>Avg Heart Rate</Text>
            <Text style={[styles.statValue, textStyle]}>{connectedUser.heartRate}</Text>
          </View>
        </View>

        {/* User Inputs / Preferences */}
        <Text style={[styles.sectionTitle, textStyle, { marginTop: spacing.md }]}>User Inputs & Preferences</Text>
        <View style={[styles.inputsContainer, neuSm, cardStyle]}>
          {connectedUser.inputs.map((input, index) => (
            <View key={index} style={[styles.inputRow, index !== connectedUser.inputs.length - 1 && styles.inputBorder]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Info size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.inputLabel, textStyle]}>{input.label}</Text>
              </View>
              <Text style={[styles.inputValue, subTextStyle]}>{input.value}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.disconnectBtn}>
          <AlertCircle size={18} color={colors.riskHigh} />
          <Text style={styles.disconnectText}>Disconnect User</Text>
        </TouchableOpacity>

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
  
  scrollContent: { padding: spacing.xl, paddingBottom: 100 },
  
  profileCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    marginBottom: spacing.xl,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 16,
  },
  nameSection: {
    flex: 1,
  },
  name: { fontSize: 20, ...fonts.bold, marginBottom: 2 },
  age: { fontSize: 14, marginBottom: 8 },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: colors.primary,
    fontSize: 10,
    ...fonts.bold,
    textTransform: 'uppercase',
  },

  sectionTitle: {
    fontSize: 16,
    ...fonts.bold,
    marginBottom: spacing.md,
  },
  
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'flex-start',
  },
  statIcon: {
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    ...fonts.semibold,
  },

  inputsContainer: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  inputRow: {
    paddingVertical: 12,
  },
  inputBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inputLabel: {
    fontSize: 14,
    ...fonts.semibold,
  },
  inputValue: {
    fontSize: 13,
    lineHeight: 20,
    paddingLeft: 24,
  },

  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: `${colors.riskHigh}15`,
  },
  disconnectText: {
    color: colors.riskHigh,
    fontSize: 15,
    ...fonts.bold,
  },
});
