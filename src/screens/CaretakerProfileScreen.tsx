import React, { useContext, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, Shield, Trash2, ChevronRight, Bell, Moon, Wind, Phone, MessageCircle, QrCode, Watch, Battery, Smartphone, Zap, Globe, LogOut } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { Header } from '../components/Header';
import { Accordion, AccItem } from '../components/Accordion';
import { colors, neuSm, radius, spacing, fonts } from '../theme';

export default function CaretakerProfileScreen() {
  const {
    reduceMotion, setReduceMotion, navigateTo, highContrast, setHighContrast,
    darkMode, setDarkMode
  } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  
  const [notifications, setNotifications] = useState(true);

  const containerStyle = darkMode ? { backgroundColor: '#000000' } : {};
  const textStyle = darkMode ? { color: '#ffffff' } : {};
  const cardStyle = darkMode ? { backgroundColor: '#1c1c1e' } : {};

  return (
    <View style={[styles.container, containerStyle, { paddingTop: insets.top }]}>
      <Header title="Settings" subtitle="Caregiver Profile" />
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <Accordion>
          
          {/* Caregiver Profile */}
          <AccItem id="profile" title="Caregiver Profile" defaultOpen icon={<Users size={18} color={colors.primary} />}>
            <View style={{ gap: 8, marginTop: 8 }}>
              <View style={[styles.navRow, cardStyle]}>
                <Text style={[styles.navRowTitle, textStyle]}>Relationship</Text>
                <Text style={styles.navRowValue}>Parent / Guardian</Text>
              </View>
              <View style={[styles.navRow, cardStyle]}>
                <Text style={[styles.navRowTitle, textStyle]}>Connected User</Text>
                <Text style={styles.navRowValue}>Alex's Device</Text>
              </View>
            </View>
          </AccItem>

          {/* Preferences */}
          <AccItem id="prefs" title="Preferences"
            icon={<Bell size={18} color={colors.primary} />}>
            <View style={{ gap: 8, marginTop: 8 }}>
              <ToggleRow
                icon={<Bell size={16} color={colors.primary} />}
                label="Notification Preferences"
                value={notifications}
                onChange={setNotifications}
                highContrast={highContrast}
                darkMode={darkMode}
              />
              <TouchableOpacity style={[styles.navRowTouchable, cardStyle]} activeOpacity={0.8}>
                 <View style={styles.navRowLeft}>
                   <Globe size={16} color={colors.primary} />
                   <Text style={[styles.navRowTitle, textStyle, { marginLeft: 8 }]}>Language</Text>
                 </View>
                 <Text style={styles.navRowValue}>English (US)</Text>
                 <ChevronRight size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </AccItem>

          {/* Accessibility */}
          <AccItem id="a11y" title="Accessibility" icon={<Moon size={18} color={colors.primary} />}>
            <View style={{ gap: 8, marginTop: 8 }}>
              <ToggleRow
                icon={<Moon size={16} color={colors.primary} />}
                label="Dark Mode"
                value={darkMode}
                onChange={setDarkMode}
                highContrast={highContrast}
                darkMode={darkMode}
              />
              <ToggleRow
                icon={<Wind size={16} color={colors.primary} />}
                label="Reduce motion"
                value={reduceMotion}
                onChange={setReduceMotion}
                highContrast={highContrast}
                darkMode={darkMode}
              />
            </View>
          </AccItem>
          
          {/* Emergency Contacts */}
          <AccItem id="emergency" title="Emergency Contacts" icon={<Phone size={18} color={colors.primary} />}>
            <View style={{ gap: 12, marginTop: 8 }}>
              {[
                { name: 'Dr. Smith', role: 'Doctor', phone: '555-0102' },
                { name: 'City Hospital', role: 'Hospital', phone: '911' }
              ].map((contact, i) => (
                <View key={i} style={[styles.navRow, cardStyle, { justifyContent: 'space-between', paddingVertical: 12 }]}>
                  <View>
                    <Text style={[styles.navRowTitle, textStyle, fonts.bold]}>{contact.name}</Text>
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

          {/* Connected User */}
          <AccItem id="connectedUser" title="Connected User" icon={<Users size={18} color={colors.primary} />}>
            <View style={{ gap: 12, marginTop: 8 }}>
              <View style={[styles.navRow, cardStyle, { justifyContent: 'space-between', paddingVertical: 12 }]}>
                 <View>
                   <Text style={[styles.navRowTitle, textStyle, fonts.bold]}>Santosh</Text>
                   <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Status: Connected</Text>
                   <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Paired: Jul 12, 2026</Text>
                 </View>
                 <View style={{ padding: 4, backgroundColor: `${colors.primary}20`, borderRadius: 4 }}>
                   <Text style={{ fontSize: 10, color: colors.primary, ...fonts.bold }}>ACTIVE</Text>
                 </View>
              </View>
              <TouchableOpacity style={[styles.navRowTouchable, cardStyle, { justifyContent: 'flex-start', gap: 8 }]} activeOpacity={0.8}>
                <Trash2 size={14} color={colors.riskHigh} />
                <Text style={[styles.navRowTitle, { color: colors.riskHigh }]}>Remove User</Text>
              </TouchableOpacity>
            </View>
          </AccItem>

          {/* Device Information */}
          <AccItem id="device" title="Device Information" icon={<Watch size={18} color={colors.primary} />}>
            <View style={{ gap: 12, marginTop: 8 }}>
              <View style={[styles.navRow, cardStyle, { paddingVertical: 12 }]}>
                <Smartphone size={16} color={colors.mutedForeground} />
                <Text style={[styles.navRowTitle, textStyle]}>AURA Band Pro</Text>
              </View>
              <View style={[styles.navRow, cardStyle, { paddingVertical: 12 }]}>
                <Battery size={16} color={colors.mutedForeground} />
                <Text style={[styles.navRowTitle, textStyle]}>Battery: 84%</Text>
              </View>
              <View style={[styles.navRow, cardStyle, { paddingVertical: 12 }]}>
                <Zap size={16} color={colors.mutedForeground} />
                <Text style={[styles.navRowTitle, textStyle]}>Firmware: v1.4.2</Text>
              </View>
            </View>
          </AccItem>

          {/* Privacy */}
          <AccItem id="privacy" title="Privacy" icon={<Shield size={18} color={colors.primary} />}>
            <View style={{ gap: 8, marginTop: 8 }}>
              <TouchableOpacity style={[styles.navRowTouchable, cardStyle]} activeOpacity={0.8}>
                <Text style={[styles.navRowTitle, textStyle]}>Privacy Settings</Text>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
              <View style={styles.privacyCard}>
                <Shield size={16} color={colors.primary} />
                <Text style={styles.privacyText}>
                  Your data stays on this device. Nothing is uploaded unless you share it with a caretaker.
                </Text>
              </View>
              <TouchableOpacity onPress={() => navigateTo('welcome')} style={styles.deleteBtn} activeOpacity={0.8}>
                <LogOut size={14} color={colors.riskHigh} />
                <Text style={styles.deleteBtnText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </AccItem>
          
        </Accordion>
      </ScrollView>
    </View>
  );
}

function ToggleRow({
  icon, label, value, onChange, highContrast, darkMode
}: { icon: React.ReactNode; label: string; value: boolean; onChange: (v: boolean) => void; highContrast?: boolean, darkMode?: boolean }) {
  const hcBorder = highContrast ? { borderColor: '#000', borderWidth: 2 } : {};
  const hcText = highContrast ? { color: '#000', fontWeight: 'bold' as const } : {};
  const dmBg = darkMode ? { backgroundColor: '#222' } : {};
  const dmText = darkMode ? { color: '#fff' } : {};
  
  return (
    <TouchableOpacity onPress={() => onChange(!value)} style={[styles.toggleRow, dmBg, hcBorder]} activeOpacity={0.8}>
      <View style={[styles.toggleIcon, value && { backgroundColor: colors.muted }, hcBorder, dmBg]}>
        {icon}
      </View>
      <Text style={[styles.toggleLabel, dmText, hcText]}>{label}</Text>
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
    backgroundColor: colors.background, borderRadius: radius.lg, padding: 14, ...neuSm,
  },
  navRowTouchable: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.background, borderRadius: radius.lg, padding: 14, ...neuSm,
  },
  navRowLeft: {
     flexDirection: 'row', alignItems: 'center',
  },
  navRowTitle: { fontSize: 13, color: colors.foreground, ...fonts.medium },
  navRowValue: { fontSize: 13, color: colors.mutedForeground },
  badge: { fontSize: 12, color: colors.mutedForeground, marginRight: 4 },
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
