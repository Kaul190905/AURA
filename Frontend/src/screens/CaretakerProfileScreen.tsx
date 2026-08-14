import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, Phone, Moon, LogOut, ChevronRight, User } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { Header } from '../components/Header';
import { colors, neuSm, radius, spacing, fonts } from '../theme';
import { supabase } from '../services/supabaseClient';

export default function CaretakerProfileScreen({ navigation }: any) {
  const styles = getStyles();
  const {
    darkMode, setDarkMode, highContrast,
    setUserId, setAccessToken, navigateTo,
    recentlyViewedUserIds, mockUsers, primaryRole
  } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  const [userName, setUserName] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && user.email) {
        const prefix = user.email.split('@')[0];
        const formattedName = prefix.split(/[._-]/).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
        setUserName(formattedName);
      }
    });
  }, []);

  const containerStyle = darkMode ? { backgroundColor: '#000000' } : {};
  const cardStyle = darkMode ? { backgroundColor: '#1c1c1e' } : {};
  const textStyle = darkMode ? { color: '#ffffff' } : { color: colors.foreground };
  const subTextStyle = darkMode ? { color: '#aaa' } : { color: colors.mutedForeground };

  const activeUserId = recentlyViewedUserIds[0] || 'u1';
  const activeUser = mockUsers.find(u => u.id === activeUserId) || mockUsers[0];

  return (
    <View style={[styles.container, containerStyle, { paddingTop: insets.top }]}>
      <Header title="Settings" />
      <ScrollView contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: spacing.xl, paddingTop: spacing.md }}>

        {/* Profile Card */}
        <TouchableOpacity
          style={[styles.menuCard, neuSm, cardStyle]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('ProfileDetails')}
        >
          <View style={[styles.iconBox, { backgroundColor: `${colors.primary}20` }]}>
            <User size={22} color={colors.primary} />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={[styles.menuTitle, textStyle]}>Profile Details</Text>
            <Text style={[styles.menuSubtitle, subTextStyle]}>{userName || 'Manage your account'}</Text>
          </View>
          <ChevronRight size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        {/* Emergency Contacts Card */}
        <TouchableOpacity
          style={[styles.menuCard, neuSm, cardStyle]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('EmergencyContacts')}
        >
          <View style={[styles.iconBox, { backgroundColor: `${colors.riskHigh}20` }]}>
            <Phone size={22} color={colors.riskHigh} />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={[styles.menuTitle, textStyle]}>Emergency Contacts</Text>
            <Text style={[styles.menuSubtitle, subTextStyle]}>Quick call and message</Text>
          </View>
          <ChevronRight size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        {/* Connected User Card (Only for Personal Caretaker) */}
        {primaryRole === 'caretaker' && (
          <TouchableOpacity
            style={[styles.menuCard, neuSm, cardStyle]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ConnectedUserDetails')}
          >
            <View style={[styles.iconBox, { backgroundColor: `${colors.primary}20` }]}>
              <Users size={22} color={colors.primary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, textStyle]}>Connected User</Text>
              <Text style={[styles.menuSubtitle, subTextStyle]}>View condition and inputs</Text>
            </View>
            <ChevronRight size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}

        <Text style={[styles.sectionHeader, textStyle]}>Preferences</Text>

        {/* Accessibility (Flat Card) */}
        <View style={[styles.menuCard, neuSm, cardStyle, { paddingVertical: 12 }]}>
          <ToggleRow
            icon={<Moon size={20} color={colors.primary} />}
            label="Dark Mode"
            value={darkMode}
            onChange={setDarkMode}
            highContrast={highContrast}
            darkMode={darkMode}
          />
        </View>

        {/* Logout */}
        <View style={{ marginTop: spacing.xxl }}>
          <TouchableOpacity
            onPress={async () => {
              setUserId(null);
              setAccessToken(null);
              navigateTo('login');
              await supabase.auth.signOut();
            }}
            style={styles.deleteBtn}
            activeOpacity={0.8}
          >
            <LogOut size={16} color={colors.riskHigh} />
            <Text style={styles.deleteBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

function ToggleRow({
  icon, label, value, onChange, highContrast, darkMode,
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
  sectionHeader: {
    fontSize: 14,
    ...fonts.bold,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.8,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: 16,
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    ...fonts.semibold,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', flex: 1,
  },
  toggleIcon: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: `${colors.primary}15`, alignItems: 'center', justifyContent: 'center',
    marginRight: 16,
  },
  toggleLabel: { flex: 1, fontSize: 16, color: colors.foreground, ...fonts.semibold },
  toggleTrack: {
    width: 46, height: 26, borderRadius: radius.full,
    backgroundColor: colors.muted, justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleThumb: {
    width: 20, height: 20, borderRadius: radius.full,
    backgroundColor: colors.mutedForeground,
  },
  toggleThumbOn: {
    backgroundColor: colors.primary,
    transform: [{ translateX: 20 }],
  },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: `${colors.riskHigh}15`, borderRadius: radius.lg, padding: 16,
  },
  deleteBtnText: { fontSize: 15, color: colors.riskHigh, ...fonts.bold },
});
