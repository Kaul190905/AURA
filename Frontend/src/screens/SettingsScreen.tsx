import React, { useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, Eye, Shield, ChevronRight, Watch, LogOut, User } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { Header } from '../components/Header';
import { colors, neuSm, radius, fonts } from '../theme';
import { supabase } from '../services/supabaseClient';

export default function SettingsScreen() {
  const styles = getStyles();
  const { navigateTo, setUserId, setAccessToken } = useContext(AppContext);
  const insets = useSafeAreaInsets();



  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Settings" subtitle="Personalize AURA" />
      <View style={styles.scrollContent}>

        {/* Profile Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Users size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Profile & Account</Text>
          </View>
          <View style={styles.sectionCard}>

            <TouchableOpacity onPress={() => navigateTo('user_profile')} style={styles.navRow} activeOpacity={0.7}>
              <View style={styles.navRowInner}>
                <User size={16} color={colors.primary} />
                <Text style={styles.navRowText}>View profile page</Text>
              </View>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity onPress={() => navigateTo('profile')} style={styles.navRow} activeOpacity={0.7}>
              <Text style={styles.navRowText}>Edit sensory profile</Text>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity onPress={() => navigateTo('caregiver_manager')} style={styles.navRow} activeOpacity={0.7}>
              <Text style={styles.navRowText}>Caregiver Management</Text>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity onPress={async () => { setUserId(null); setAccessToken(null); navigateTo('login'); await supabase.auth.signOut(); }} style={styles.navRow} activeOpacity={0.7}>
              <Text style={styles.navRowText}>Logout</Text>
              <LogOut size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Preferences & Device</Text>
          </View>
          <View style={styles.sectionCard}>

            <TouchableOpacity onPress={() => navigateTo('accessibility')} style={styles.navRow} activeOpacity={0.7}>
              <View style={styles.navRowInnerLg}>
                <View style={styles.iconContainer}>
                  <Eye size={18} color={colors.primary} />
                </View>
                <Text style={styles.navRowTextLg}>Accessibility</Text>
              </View>
              <ChevronRight size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
            <View style={styles.divider} />

            <TouchableOpacity onPress={() => navigateTo('device')} style={styles.navRow} activeOpacity={0.7}>
              <View style={styles.navRowInnerLg}>
                <View style={styles.iconContainer}>
                  <Watch size={18} color={colors.primary} />
                </View>
                <Text style={styles.navRowTextLg}>Device Information</Text>
              </View>
              <ChevronRight size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
            <View style={styles.divider} />

            <TouchableOpacity onPress={() => navigateTo('privacy')} style={styles.navRow} activeOpacity={0.7}>
              <View style={styles.navRowInnerLg}>
                <View style={styles.iconContainer}>
                  <Shield size={18} color={colors.primary} />
                </View>
                <Text style={styles.navRowTextLg}>Privacy & Data</Text>
              </View>
              <ChevronRight size={18} color={colors.mutedForeground} />
            </TouchableOpacity>

          </View>
        </View>

      </View>
    </View>
  );
}

const getStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  sectionContainer: { marginBottom: 28, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 18, color: colors.foreground, ...fonts.bold },
  sectionCard: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: 16,
    ...neuSm,
    borderWidth: 1,
    borderColor: colors.border + '80',
  },

  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8,
  },
  iconContainer: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.muted,
    alignItems: 'center', justifyContent: 'center',
  },
  navRowText: { fontSize: 14, color: colors.foreground, ...fonts.medium },
  navRowTextLg: { fontSize: 15, color: colors.foreground, ...fonts.semibold },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },

  scrollContent: { paddingBottom: 80, paddingTop: 16 },
  navRowPadded: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12,
  },
  textInput: { flex: 1, color: colors.foreground, ...fonts.medium, padding: 0 },
  navRowInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navRowInnerLg: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
