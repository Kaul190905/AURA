import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shield, Trash2 } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { Header } from '../components/Header';
import { colors, shadowSm, radius, fonts } from '../theme';

export default function SettingsPrivacyScreen() {
  const styles = getStyles();
  const { navigateTo } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  const resetData = () => {
    navigateTo('profile');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity onPress={() => navigateTo('settings')} style={styles.backBtn} activeOpacity={0.8}>
        <Text style={styles.backBtnText}>← Back to Settings</Text>
      </TouchableOpacity>
      
      <Header title="Privacy" subtitle="Manage your data and privacy settings" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionCard}>
          <View style={styles.privacyCard}>
            <Shield size={20} color={colors.primary} style={styles.shieldIcon} />
            <Text style={styles.privacyText}>
              Your data stays on this device. Nothing is uploaded unless you share it with a caretaker. We prioritize your privacy and do not sell or track your sensory data.
            </Text>
          </View>
          
          <View style={styles.divider} />

          <View style={styles.deleteSection}>
            <Text style={styles.deleteTitle}>Danger Zone</Text>
            <Text style={styles.deleteSubtitle}>
              Permanently delete all locally stored data, history, and custom configurations. This action cannot be undone.
            </Text>
            <TouchableOpacity onPress={resetData} style={styles.deleteBtn} activeOpacity={0.8}>
              <Trash2 size={16} color={colors.riskHigh} />
              <Text style={styles.deleteBtnText}>Delete all my data</Text>
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
    ...shadowSm,
    borderWidth: 1,
    borderColor: colors.border + '80',
    marginTop: 16
  },
  
  scrollContent: { paddingBottom: 80, paddingHorizontal: 16 },
  shieldIcon: { marginTop: 2 },
  
  privacyCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: colors.muted, borderRadius: radius.lg, padding: 16,
  },
  privacyText: { flex: 1, fontSize: 14, color: colors.foreground, opacity: 0.8, lineHeight: 22 },
  
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 24 },
  
  deleteSection: { gap: 8 },
  deleteTitle: { fontSize: 16, color: colors.riskHigh, ...fonts.bold },
  deleteSubtitle: { fontSize: 13, color: colors.mutedForeground, lineHeight: 20, marginBottom: 12 },
  
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.riskHighSoft, borderRadius: radius.lg, padding: 16,
  },
  deleteBtnText: { fontSize: 15, color: colors.riskHigh, ...fonts.bold },
});
