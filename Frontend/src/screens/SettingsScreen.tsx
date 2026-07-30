import React, { useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, Zap, Eye, Shield, Trash2, ChevronRight, Watch, Battery, Smartphone, LogOut, Check, Palette } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { Header } from '../components/Header';
import { Accordion, AccItem } from '../components/Accordion';
import { colors, neuSm, neuInset, radius, spacing, fonts } from '../theme';
import { supabase } from '../services/supabaseClient';

export default function SettingsScreen() {
  const styles = getStyles();
  const {
    colorVisionMode, setColorVisionMode,
    sensitivity, setSensitivity,
    navigateTo,
    history,
    setUserId, setAccessToken,
  } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  const resetData = () => {
    // Reset history by navigating to profile
    navigateTo('profile');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Settings" subtitle="Personalize AURA" />
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <Accordion>
          {/* Profile */}
          <AccItem id="profile" title="Profile" defaultOpen icon={<Users size={18} color={colors.primary} />}>
            <View style={{ gap: 8, marginTop: 8 }}>
              <TouchableOpacity onPress={() => navigateTo('profile')} style={styles.navRow} activeOpacity={0.8}>
                <Text style={styles.navRowText}>Edit sensory profile</Text>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateTo('caretaker-gate')} style={styles.navRow} activeOpacity={0.8}>
                <Text style={styles.navRowText}>Open caretaker view</Text>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => { setUserId(null); setAccessToken(null); navigateTo('welcome'); await supabase.auth.signOut(); }} style={styles.navRow} activeOpacity={0.8}>
                <Text style={styles.navRowText}>Logout</Text>
                <LogOut size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </AccItem>

          {/* Vibration */}
          <AccItem id="vibration" title="Vibration"
            icon={<Zap size={18} color={colors.primary} />}>
            <View style={{ marginTop: 8 }}>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[styles.radioItem, sensitivity === 1 && styles.radioItemActive, sensitivity === 1 && { backgroundColor: colors.muted }]}
                  onPress={() => setSensitivity(1)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.radioLabel, sensitivity === 1 && { color: colors.primary, ...fonts.bold }]}>
                    Short Vibration
                  </Text>
                  {sensitivity === 1 && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioItem, sensitivity === 2 && styles.radioItemActive, sensitivity === 2 && { backgroundColor: colors.muted }]}
                  onPress={() => setSensitivity(2)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.radioLabel, sensitivity === 2 && { color: colors.primary, ...fonts.bold }]}>
                    Long Vibration
                  </Text>
                  {sensitivity === 2 && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
              </View>
            </View>
          </AccItem>

          {/* Accessibility */}
          <AccItem id="a11y" title="Accessibility" icon={<Eye size={18} color={colors.primary} />}>
            <View style={{ gap: 8, marginTop: 8 }}>
              
              <View style={styles.colorVisionSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Palette size={16} color={colors.primary} />
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
                      style={[styles.radioItem, colorVisionMode === option.id && styles.radioItemActive, colorVisionMode === option.id && { backgroundColor: colors.muted }]}
                      onPress={() => setColorVisionMode(option.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.radioLabel, colorVisionMode === option.id && { color: colors.primary, ...fonts.bold }]}>
                        {option.label}
                      </Text>
                      {colorVisionMode === option.id && <Check size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Live Preview Card */}
                <View style={[styles.previewCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
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
          </AccItem>

          {/* Privacy */}
          <AccItem id="privacy" title="Privacy" icon={<Shield size={18} color={colors.primary} />}>
            <View style={{ gap: 8, marginTop: 8 }}>
              <View style={styles.privacyCard}>
                <Shield size={16} color={colors.primary} />
                <Text style={styles.privacyText}>
                  Your data stays on this device. Nothing is uploaded unless you share it with a caretaker.
                </Text>
              </View>
              <TouchableOpacity onPress={resetData} style={styles.deleteBtn} activeOpacity={0.8}>
                <Trash2 size={14} color={colors.riskHigh} />
                <Text style={styles.deleteBtnText}>Delete all my data</Text>
              </TouchableOpacity>
            </View>
          </AccItem>



          {/* Device Information */}
          <AccItem id="device" title="Device Information" icon={<Watch size={18} color={colors.primary} />}>
            <View style={{ gap: 12, marginTop: 8 }}>
              <View style={styles.navRow}>
                <Smartphone size={16} color={colors.mutedForeground} />
                <Text style={styles.navRowText}>AURA Band Pro</Text>
              </View>
              <View style={styles.navRow}>
                <Battery size={16} color={colors.mutedForeground} />
                <Text style={styles.navRowText}>Battery: 84%</Text>
              </View>
              <View style={styles.navRow}>
                <Zap size={16} color={colors.mutedForeground} />
                <Text style={styles.navRowText}>Firmware: v1.4.2</Text>
              </View>
            </View>
          </AccItem>
        </Accordion>
      </ScrollView>
    </View>
  );
}



const getStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.background, borderRadius: radius.lg, padding: 12, ...neuSm,
  },
  navRowText: { fontSize: 13, color: colors.foreground, ...fonts.medium },
  badge: { fontSize: 12, color: colors.mutedForeground, marginRight: 4 },
  sliderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sliderTitle: { fontSize: 13, color: colors.foreground, ...fonts.medium },
  sliderVal: { fontSize: 13, color: colors.mutedForeground },
  sliderHint: { fontSize: 10, color: colors.mutedForeground, marginTop: 4 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.background, borderRadius: radius.lg, padding: 12, ...neuSm,
  },
  toggleIcon: {
    width: 34, height: 34, borderRadius: radius.full,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', ...neuSm,
  },
  toggleLabel: { flex: 1, fontSize: 13, color: colors.foreground, ...fonts.medium },
  toggleTrack: {
    width: 46, height: 26, borderRadius: radius.full,
    backgroundColor: colors.muted, justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleThumb: {
    width: 20, height: 20, borderRadius: radius.full,
    backgroundColor: colors.mutedForeground, ...neuSm,
  },
  toggleThumbOn: {
    backgroundColor: colors.primary,
    transform: [{ translateX: 20 }],
  },
  privacyCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.muted, borderRadius: radius.md, padding: 12,
  },
  privacyText: { flex: 1, fontSize: 12, color: colors.foreground, opacity: 0.8, lineHeight: 18 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.riskHighSoft, borderRadius: radius.lg, padding: 12,
  },
  deleteBtnText: { fontSize: 13, color: colors.riskHigh, ...fonts.semibold },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  colorVisionSection: { marginTop: 4 },
  colorVisionTitle: { fontSize: 14, color: colors.foreground, ...fonts.semibold },
  radioGroup: { gap: 8, marginBottom: 16 },
  radioItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.background, borderRadius: radius.md, padding: 12, ...neuSm,
  },
  radioItemActive: { ...neuInset },
  radioLabel: { fontSize: 13, color: colors.foreground, ...fonts.medium },
  
  previewCard: {
    borderRadius: radius.lg, padding: 16, borderWidth: 1, gap: 12,
  },
  previewTitle: { fontSize: 12, color: colors.mutedForeground, ...fonts.medium, textTransform: 'uppercase', letterSpacing: 1 },
  previewRow: { flexDirection: 'row', gap: 12 },
  previewBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full,
  },
  previewDot: { width: 8, height: 8, borderRadius: 4 },
  previewBadgeText: { fontSize: 11, ...fonts.medium },
  previewRiskCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: radius.md, padding: 12,
  },
  previewRiskRing: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  previewRiskScore: { fontSize: 16, ...fonts.bold },
  previewRiskLabel: { fontSize: 14, ...fonts.bold },
  previewRiskSub: { fontSize: 11 },
  previewButton: {
    borderRadius: radius.md, padding: 12, alignItems: 'center', justifyContent: 'center',
  },
  previewButtonText: { fontSize: 13, ...fonts.bold },
});
