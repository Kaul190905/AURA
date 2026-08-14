import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Watch, Battery, Smartphone, Zap, Check } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { Header } from '../components/Header';
import { colors, neuSm, neuInset, radius, fonts } from '../theme';

export default function SettingsDeviceScreen() {
  const styles = getStyles();
  const { sensitivity, setSensitivity, navigateTo } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity onPress={() => navigateTo('settings')} style={styles.backBtn} activeOpacity={0.8}>
        <Text style={styles.backBtnText}>← Back to Settings</Text>
      </TouchableOpacity>
      
      <Header title="Device Information" subtitle="Manage your AURA Band Pro" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.sectionCard}>
          <View style={styles.navRow}>
            <View style={styles.iconContainer}>
              <Watch size={20} color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.navRowTitle}>Connected Device</Text>
              <Text style={styles.navRowSubtitle}>AURA Band Pro</Text>
            </View>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.navRow}>
            <View style={styles.iconContainer}>
              <Battery size={20} color={colors.riskLow} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.navRowTitle}>Battery Status</Text>
              <Text style={styles.navRowSubtitle}>84% - Approx 2 days remaining</Text>
            </View>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.navRow}>
            <View style={styles.iconContainer}>
              <Zap size={20} color={colors.mutedForeground} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.navRowTitle}>Firmware Version</Text>
              <Text style={styles.navRowSubtitle}>v1.4.2 (Up to date)</Text>
            </View>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.navRow}>
            <View style={styles.iconContainer}>
              <Smartphone size={20} color={colors.mutedForeground} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.navRowTitle}>App Version</Text>
              <Text style={styles.navRowSubtitle}>v{require('../../package.json').version}</Text>
            </View>
          </View>
        </View>

        <View style={styles.vibrationSection}>
          <View style={styles.vibrationHeader}>
            <Zap size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Vibration Pattern</Text>
          </View>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[styles.radioItem, sensitivity === 1 && styles.radioItemActive]}
              onPress={() => setSensitivity(1)}
              activeOpacity={0.7}
            >
              <Text style={[styles.radioLabel, sensitivity === 1 && { color: colors.primary, ...fonts.bold }]}>
                Short Vibration
              </Text>
              {sensitivity === 1 && <Check size={16} color={colors.primary} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioItem, sensitivity === 2 && styles.radioItemActive]}
              onPress={() => setSensitivity(2)}
              activeOpacity={0.7}
            >
              <Text style={[styles.radioLabel, sensitivity === 2 && { color: colors.primary, ...fonts.bold }]}>
                Long Vibration
              </Text>
              {sensitivity === 2 && <Check size={16} color={colors.primary} />}
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const getStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backBtn: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  backBtnText: { color: colors.primary, ...fonts.bold, fontSize: 16 },
  
  sectionCard: { 
    backgroundColor: colors.background, 
    borderRadius: radius.xl, 
    padding: 16, 
    ...neuSm,
    borderWidth: 1,
    borderColor: colors.border + '80',
    marginTop: 16
  },

  navRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingVertical: 4,
  },
  iconContainer: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.muted,
    alignItems: 'center', justifyContent: 'center'
  },
  rowContent: { flex: 1 },
  navRowTitle: { fontSize: 15, color: colors.foreground, ...fonts.bold },
  navRowSubtitle: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },

  scrollContent: { paddingBottom: 80, paddingHorizontal: 16 },
  vibrationSection: {
    backgroundColor: colors.background, 
    borderRadius: radius.xl, 
    padding: 16, 
    ...neuSm,
    borderWidth: 1,
    borderColor: colors.border + '80',
    marginTop: 20
  },
  vibrationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },

  sectionTitle: { fontSize: 16, color: colors.foreground, ...fonts.bold },
  radioGroup: { gap: 8 },
  radioItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.muted, borderRadius: radius.lg, padding: 14,
  },
  radioItemActive: { ...neuInset, backgroundColor: colors.muted, borderColor: colors.primary, borderWidth: 1 },
  radioLabel: { fontSize: 14, color: colors.foreground, ...fonts.medium },
});
