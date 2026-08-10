import React, { useContext, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, Shield, Trash2, ChevronRight, Bell, Moon, Wind, Phone, MessageCircle, QrCode, Watch, Battery, Smartphone, Zap, Globe, LogOut, Palette, Check } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { Header } from '../components/Header';
import { Accordion, AccItem } from '../components/Accordion';
import { colors, neuSm, neuInset, radius, spacing, fonts } from '../theme';
import { supabase } from '../services/supabaseClient';

export default function CaretakerProfileScreen() {
  const styles = getStyles();
  const {
    reduceMotion, setReduceMotion, navigateTo, highContrast, setHighContrast,
    darkMode, setDarkMode, colorVisionMode, setColorVisionMode,
    setUserId, setAccessToken, caretakerType, mockUsers, mockStudents,
  } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  
  const [notifications, setNotifications] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || 'No email found');
        // Extract a friendly name from email (e.g. john.doe@... -> John Doe)
        if (user.email) {
          const prefix = user.email.split('@')[0];
          const formattedName = prefix.split(/[._-]/).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
          setUserName(formattedName);
        }
      }
    });
  }, []);

  const containerStyle = darkMode ? { backgroundColor: '#000000' } : {};
  const cardStyle = darkMode ? { backgroundColor: '#1c1c1e' } : {};
  const textStyle = darkMode ? { color: '#ffffff' } : { color: colors.foreground };
  const subTextStyle = darkMode ? { color: '#aaa' } : { color: colors.mutedForeground };

  return (
    <View style={[styles.container, containerStyle, { paddingTop: insets.top }]}>
      <Header title="Settings" subtitle={caretakerType === 'teacher' ? 'Teacher Profile' : 'Personal Caretaker Profile'} />
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <Accordion>
          
          {/* Caregiver Profile */}
          <AccItem id="profile" title={caretakerType === 'teacher' ? 'Teacher Profile' : 'Personal Caretaker Profile'} defaultOpen icon={<Users size={18} color={colors.primary} />}>
            <View style={{ gap: 8, marginTop: 8 }}>
              <View style={[styles.navRow, cardStyle]}>
                <Text style={[styles.navRowTitle, textStyle]}>Name</Text>
                <Text style={styles.navRowValue}>{userName || 'Caretaker'}</Text>
              </View>
              <View style={[styles.navRow, cardStyle]}>
                <Text style={[styles.navRowTitle, textStyle]}>Email</Text>
                <Text style={styles.navRowValue}>{userEmail || 'Loading...'}</Text>
              </View>

              <View style={[styles.navRow, cardStyle]}>
                <Text style={[styles.navRowTitle, textStyle]}>Monitoring</Text>
                <Text style={styles.navRowValue}>{caretakerType === 'teacher' ? 'Students' : 'Users'}</Text>
              </View>
              {caretakerType === 'personal-caretaker' && (
                <View style={[styles.navRow, cardStyle]}>
                  <Text style={[styles.navRowTitle, textStyle]}>Managed Users</Text>
                  <Text style={styles.navRowValue}>{mockUsers.length}</Text>
                </View>
              )}
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
          {caretakerType === 'personal-caretaker' && (
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
          )}

          {/* Device Information */}
          {caretakerType === 'teacher' && (
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
          )}


          
        </Accordion>
        
        <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
          <TouchableOpacity onPress={async () => { setUserId(null); setAccessToken(null); navigateTo('login'); await supabase.auth.signOut(); }} style={styles.deleteBtn} activeOpacity={0.8}>
            <LogOut size={16} color={colors.riskHigh} />
            <Text style={styles.deleteBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function ToggleRow({
  icon, label, value, onChange, highContrast, darkMode
}: { icon: React.ReactNode; label: string; value: boolean; onChange: (v: boolean) => void; highContrast?: boolean, darkMode?: boolean }) {
  const styles = getStyles();
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

const getStyles = () => StyleSheet.create({
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
  previewRiskSub: { fontSize: 12 },
  previewButton: {
    paddingVertical: 12, borderRadius: radius.md, alignItems: 'center',
  },
  previewButtonText: { fontSize: 13, ...fonts.semibold },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
});
