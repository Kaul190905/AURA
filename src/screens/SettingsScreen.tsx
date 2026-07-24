import React, { useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, Zap, Eye, Shield, Trash2, ChevronRight, Wind, Phone, MessageCircle, QrCode, Watch, Battery, Smartphone, Navigation, LogOut } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { Header } from '../components/Header';
import { Accordion, AccItem } from '../components/Accordion';
import { colors, neuSm, radius, spacing, fonts } from '../theme';

export default function SettingsScreen() {
  const {
    highContrast, setHighContrast,
    reduceMotion, setReduceMotion,
    sensitivity, setSensitivity,
    navigateTo,
    history,
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
              <TouchableOpacity onPress={() => navigateTo('welcome')} style={styles.navRow} activeOpacity={0.8}>
                <Text style={styles.navRowText}>Logout</Text>
                <LogOut size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </AccItem>

          {/* Alerts */}
          <AccItem id="alerts" title="Alerts"
            icon={<Zap size={18} color={colors.primary} />}
            badge={<Text style={styles.badge}>{sensitivity}/5</Text>}>
            <View style={{ marginTop: 8 }}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sliderTitle}>Alert sensitivity</Text>
                <Text style={styles.sliderVal}>{sensitivity}/5</Text>
              </View>
              <Slider
                minimumValue={1} maximumValue={5} step={1}
                value={sensitivity}
                onValueChange={(v) => setSensitivity(Math.round(v))}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.primary}
                style={{ marginTop: 8 }}
              />
              <Text style={styles.sliderHint}>Higher = check in with you sooner.</Text>
            </View>
          </AccItem>

          {/* Accessibility */}
          <AccItem id="a11y" title="Accessibility" icon={<Eye size={18} color={colors.primary} />}>
            <View style={{ gap: 8, marginTop: 8 }}>
              <ToggleRow
                icon={<Eye size={16} color={colors.primary} />}
                label="High contrast"
                value={highContrast}
                onChange={setHighContrast}
                highContrast={highContrast}
              />
              <ToggleRow
                icon={<Wind size={16} color={colors.primary} />}
                label="Reduce motion"
                value={reduceMotion}
                onChange={setReduceMotion}
                highContrast={highContrast}
              />
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

          {/* Emergency Contacts */}
          <AccItem id="emergency" title="Emergency Contacts" icon={<Phone size={18} color={colors.primary} />}>
            <View style={{ gap: 12, marginTop: 8 }}>
              {[
                { name: 'Mom', role: 'Parent', phone: '555-0101' },
                { name: 'Dr. Smith', role: 'Doctor', phone: '555-0102' }
              ].map((contact, i) => (
                <View key={i} style={[styles.navRow, { justifyContent: 'space-between' }]}>
                  <View>
                    <Text style={[styles.navRowText, fonts.bold]}>{contact.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{contact.role}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: `${colors.primary}20` }]}>
                      <Phone size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: `${colors.primary}20` }]}>
                      <MessageCircle size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </AccItem>

          {/* Connected Caregiver */}
          <AccItem id="caregiver" title="Connected Caregiver" icon={<Users size={18} color={colors.primary} />}>
            <View style={{ gap: 12, marginTop: 8 }}>
              <View style={[styles.navRow, { justifyContent: 'space-between' }]}>
                 <View>
                   <Text style={[styles.navRowText, fonts.bold]}>Jane Doe</Text>
                   <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Status: Connected</Text>
                 </View>
                 <View style={{ padding: 4, backgroundColor: `${colors.primary}20`, borderRadius: 4 }}>
                   <Text style={{ fontSize: 10, color: colors.primary, ...fonts.bold }}>ACTIVE</Text>
                 </View>
              </View>
              <TouchableOpacity style={styles.navRow} activeOpacity={0.8}>
                <QrCode size={16} color={colors.mutedForeground} />
                <Text style={styles.navRowText}>Generate Invite Code</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.navRow, { justifyContent: 'flex-start', gap: 8 }]} activeOpacity={0.8}>
                <Trash2 size={14} color={colors.riskHigh} />
                <Text style={[styles.navRowText, { color: colors.riskHigh }]}>Remove Caregiver</Text>
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

function ToggleRow({
  icon, label, value, onChange, highContrast
}: { icon: React.ReactNode; label: string; value: boolean; onChange: (v: boolean) => void; highContrast?: boolean }) {
  const hcBorder = highContrast ? { borderColor: '#000', borderWidth: 2 } : {};
  const hcText = highContrast ? { color: '#000', fontWeight: 'bold' as const } : {};
  return (
    <TouchableOpacity onPress={() => onChange(!value)} style={[styles.toggleRow, hcBorder]} activeOpacity={0.8}>
      <View style={[styles.toggleIcon, value && { backgroundColor: colors.muted }, hcBorder]}>
        {icon}
      </View>
      <Text style={[styles.toggleLabel, hcText]}>{label}</Text>
      <View style={[styles.toggleTrack, highContrast && { backgroundColor: '#555' }]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn, highContrast && { backgroundColor: '#000' }]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
});
