import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, Check } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { Header } from '../components/Header';
import { colors, shadowSm, shadowInset, radius, fonts } from '../theme';

export default function SettingsAccessibilityScreen() {
  const styles = getStyles();
  const { colorVisionMode, setColorVisionMode, navigateTo } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity onPress={() => navigateTo('settings')} style={styles.backBtn} activeOpacity={0.8}>
        <Text style={styles.backBtnText}>← Back to Settings</Text>
      </TouchableOpacity>
      
      <Header title="Accessibility" subtitle="Personalize your visual and physical experience" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.sectionCard}>
          <View style={styles.colorVisionSection}>
            <View style={styles.colorVisionHeader}>
              <Palette size={18} color={colors.primary} />
              <Text style={styles.colorVisionTitle}>Color Vision Support</Text>
            </View>

            <View style={styles.radioGroup}>
              {([
                { id: 'default', label: 'Default' },
                { id: 'protanopia', label: 'Protanopia' },
                { id: 'deuteranopia', label: 'Deuteranopia' },
                { id: 'tritanopia', label: 'Tritanopia' },
              ] as const).map(option => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.radioItem, colorVisionMode === option.id && styles.radioItemActive]}
                  onPress={() => setColorVisionMode(option.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.radioLabel, colorVisionMode === option.id && { color: colors.primary, ...fonts.bold }]}>
                    {option.label}
                  </Text>
                  {colorVisionMode === option.id && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Live Preview Card */}
            <View style={[styles.previewCard, { backgroundColor: colors.background, borderColor: colors.border }]} pointerEvents="none">
              <Text style={styles.previewTitle}>Live Preview</Text>

              <View style={styles.previewRow}>
                <View style={[styles.previewBadge, { backgroundColor: colors.muted }]}>
                  <View style={[styles.previewDot, { backgroundColor: colors.riskLow }]} />
                  <Text style={[styles.previewBadgeText, { color: colors.foreground }]}>Success</Text>
                </View>
                <View style={[styles.previewBadge, { backgroundColor: colors.muted }]}>
                  <View style={[styles.previewDot, { backgroundColor: colors.riskMed }]} />
                  <Text style={[styles.previewBadgeText, { color: colors.foreground }]}>Warning</Text>
                </View>
              </View>

              <View style={[styles.previewRiskCard, { backgroundColor: colors.muted }]}>
                <View style={[styles.previewRiskRing, { borderColor: colors.riskHigh, backgroundColor: colors.background }]}>
                  <Text style={[styles.previewRiskScore, { color: colors.riskHigh }]}>72</Text>
                </View>
                <View>
                  <Text style={[styles.previewRiskLabel, { color: colors.foreground }]}>High Risk</Text>
                  <Text style={[styles.previewRiskSub, { color: colors.mutedForeground }]}>Example Level</Text>
                </View>
              </View>
            </View>
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
  colorVisionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  
  colorVisionSection: { marginTop: 4 },
  colorVisionTitle: { fontSize: 16, color: colors.foreground, ...fonts.bold },
  radioGroup: { gap: 8, marginBottom: 24 },
  radioItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.muted, borderRadius: radius.lg, padding: 14,
  },
  radioItemActive: { ...shadowInset, backgroundColor: colors.muted, borderColor: colors.primary, borderWidth: 1 },
  radioLabel: { fontSize: 14, color: colors.foreground, ...fonts.medium },

  previewCard: {
    borderRadius: radius.xl, padding: 16, borderWidth: 1, gap: 14,
  },
  previewTitle: { fontSize: 12, color: colors.mutedForeground, ...fonts.bold, textTransform: 'uppercase', letterSpacing: 1 },
  previewRow: { flexDirection: 'row', gap: 12 },
  previewBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full,
  },
  previewDot: { width: 8, height: 8, borderRadius: 4 },
  previewBadgeText: { fontSize: 12, ...fonts.medium },
  previewRiskCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: radius.lg, padding: 14,
  },
  previewRiskRing: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  previewRiskScore: { fontSize: 18, ...fonts.bold },
  previewRiskLabel: { fontSize: 15, ...fonts.bold },
  previewRiskSub: { fontSize: 12 },
});
