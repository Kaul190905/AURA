import React, { useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users2, Zap, Eye, Shield, Trash2, ChevronRight, Wind } from 'lucide-react-native';
import { AppContext } from '../../App';
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
          <AccItem id="profile" title="Profile" defaultOpen icon={<Users2 size={18} color={colors.primary} />}>
            <View style={{ gap: 8, marginTop: 8 }}>
              <TouchableOpacity onPress={() => navigateTo('profile')} style={styles.navRow} activeOpacity={0.8}>
                <Text style={styles.navRowText}>Edit sensory profile</Text>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateTo('caretaker-gate')} style={styles.navRow} activeOpacity={0.8}>
                <Text style={styles.navRowText}>Open caretaker view</Text>
                <ChevronRight size={16} color={colors.mutedForeground} />
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
              />
              <ToggleRow
                icon={<Wind size={16} color={colors.primary} />}
                label="Reduce motion"
                value={reduceMotion}
                onChange={setReduceMotion}
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
        </Accordion>
      </ScrollView>
    </View>
  );
}

function ToggleRow({
  icon, label, value, onChange,
}: { icon: React.ReactNode; label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity onPress={() => onChange(!value)} style={styles.toggleRow} activeOpacity={0.8}>
      <View style={[styles.toggleIcon, value && { backgroundColor: colors.muted }]}>
        {icon}
      </View>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={styles.toggleTrack}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
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
