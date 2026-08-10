import React, { useContext, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ear, Sun, Star, Calendar, User, Activity, X } from 'lucide-react-native';

import { AppContext } from '../AppContext';
import { Header } from '../components/Header';

import { colors, neuSm, radius, spacing, fonts } from '../theme';
import { TriggerKey } from '../types';
import { TRIGGERS, PRESETS } from '../data';

const TRIGGER_ICONS: Record<TriggerKey, React.ElementType> = {
  sound: Ear, temp: Sun,
};

interface Props { onDone: () => void; onBack?: () => void; }

export default function ProfileSetupScreen({ onDone, onBack }: Props) {
  const styles = getStyles();
  const { profile, setProfile, dob, setDob, caregiver, setCaregiver } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErrorModal, setShowErrorModal] = useState(false);

  const toggleTrigger = (k: TriggerKey) => {
    const next = { ...profile };
    if (k in next) {delete next[k];} else {next[k] = 3;}
    setProfile(next);
  };
  const calculateAge = (yobString: string) => {
    if (!yobString || yobString.length !== 4) {return '';}
    const yob = parseInt(yobString, 10);
    if (isNaN(yob)) {return '';}
    const currentYear = new Date().getFullYear();
    return `${currentYear - yob} years old`;
  };

  const handleContinue = () => {
    let newErrors: Record<string, string> = {};
    if (!dob || dob.length !== 4 || isNaN(parseInt(dob, 10))) {
      newErrors.dob = 'Year of Birth is required (e.g., 1995)';
    }
    if (!caregiver?.name) {newErrors.name = 'Caregiver Name is required';}

    if (!caregiver?.phone) {
      newErrors.phone = 'Caregiver Phone is required';
    } else if (!/^\d{10}$/.test(caregiver.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone number must be 10 digits';
    }

    if (!caregiver?.email) {
      newErrors.email = 'Caregiver Email is required';
    } else if (!/^[a-zA-Z0-9._%+-]+@(gmail\.com|edu\.in)$/i.test(caregiver.email)) {
      newErrors.email = 'Must be a @gmail.com or @edu.in address';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShowErrorModal(true);
      return;
    }
    setErrors({});
    onDone();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Your sensory profile" subtitle="Setup" onBack={onBack} />
      <Text style={styles.hint}>Tap a section to open it.</Text>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Quick presets */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Star size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Quick start presets</Text>
            </View>
          </View>
          <View style={styles.chips}>
            {PRESETS.map((p) => (
              <TouchableOpacity key={p.name} onPress={() => setProfile(p.triggers)} style={styles.chip} activeOpacity={0.8}>
                <Text style={styles.chipText}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Triggers */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ear size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Triggers</Text>
            </View>
            <Text style={styles.badge}>{Object.keys(profile).length}</Text>
          </View>
          <View style={styles.grid}>
            {TRIGGERS.map((t) => {
              const selected = t.key in profile;
              const Icon = TRIGGER_ICONS[t.key];
              return (
                <TouchableOpacity key={t.key} onPress={() => toggleTrigger(t.key)}
                  style={[styles.triggerBtn, selected && styles.triggerBtnActive]} activeOpacity={0.8}>
                  <Icon size={20} color={selected ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.triggerLabel, selected && { color: colors.foreground }]}>{t.label}</Text>
                  {selected && (
                    <View style={{ width: '100%', marginTop: 6 }}>
                      <Slider
                        minimumValue={1} maximumValue={5} step={1}
                        value={profile[t.key] ?? 3}
                        onValueChange={(v) => setProfile({ ...profile, [t.key]: Math.round(v) })}
                        minimumTrackTintColor={colors.primary}
                        maximumTrackTintColor={colors.border}
                        thumbTintColor={colors.primary}
                      />
                      <Text style={styles.intensityLabel}>Intensity {profile[t.key]}/5</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Date of Birth */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Year of Birth</Text>
            </View>
            <Text style={styles.badge}>{calculateAge(dob)}</Text>
          </View>
          <View style={{ padding: 12 }}>
            <TextInput
              style={[styles.input, errors.dob && styles.inputError]}
              placeholder="YYYY"
              placeholderTextColor={colors.mutedForeground}
              value={dob}
              onChangeText={(t) => { setDob(t); setErrors(prev => ({ ...prev, dob: '' })); }}
              keyboardType="numeric"
            />
            {errors.dob ? <Text style={styles.errorText}>{errors.dob}</Text> : null}
            {dob && !errors.dob ? <Text style={styles.ageText}>Calculated Age: {calculateAge(dob)}</Text> : null}
          </View>
        </View>

        {/* Caregiver Information */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <User size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Caregiver Information</Text>
            </View>
          </View>
          <View style={{ padding: 12, gap: 12 }}>
            <View>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Caregiver Name *"
                placeholderTextColor={colors.mutedForeground}
                value={caregiver?.name}
                onChangeText={(t) => { setCaregiver({ ...caregiver, name: t }); setErrors(prev => ({ ...prev, name: '' })); }}
              />
              {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
            </View>
            <View>
              <TextInput
                style={styles.input}
                placeholder="Relationship (e.g., Parent, Spouse)"
                placeholderTextColor={colors.mutedForeground}
                value={caregiver?.relationship}
                onChangeText={(t) => setCaregiver({ ...caregiver, relationship: t })}
              />
            </View>
            <View>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="Phone Number *"
                placeholderTextColor={colors.mutedForeground}
                value={caregiver?.phone}
                onChangeText={(t) => { setCaregiver({ ...caregiver, phone: t }); setErrors(prev => ({ ...prev, phone: '' })); }}
                keyboardType="phone-pad"
              />
              {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
            </View>
            <View>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="Caregiver Email ID *"
                placeholderTextColor={colors.mutedForeground}
                value={caregiver?.email}
                onChangeText={(t) => { setCaregiver({ ...caregiver, email: t }); setErrors(prev => ({ ...prev, email: '' })); }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>
          </View>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity onPress={handleContinue} style={styles.continueBtn} activeOpacity={0.85}>
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showErrorModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Activity size={20} color={colors.riskHigh} />
                <Text style={styles.modalTitle}>Invalid or Missing Input</Text>
              </View>
              <TouchableOpacity onPress={() => setShowErrorModal(false)} style={styles.closeBtn}>
                <X size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalText}>
              Please correctly fill out all highlighted fields below before continuing.
            </Text>
            <TouchableOpacity onPress={() => setShowErrorModal(false)} style={styles.modalPrimaryBtn}>
              <Text style={styles.modalPrimaryBtnText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hint: { fontSize: 12, color: colors.mutedForeground, paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  scroll: { paddingTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 8 },
  triggerBtn: {
    width: '47%', minHeight: 80, backgroundColor: colors.background,
    borderRadius: radius.lg, padding: 12, alignItems: 'flex-start', ...neuSm,
  },
  triggerBtnActive: { backgroundColor: colors.muted },
  triggerLabel: { fontSize: 13, color: colors.mutedForeground, marginTop: 4, ...fonts.semibold },
  intensityLabel: { fontSize: 10, color: colors.mutedForeground, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.background,
    borderRadius: radius.full, ...neuSm,
  },
  chipActive: { backgroundColor: colors.muted },
  chipText: { fontSize: 12, color: colors.foreground, ...fonts.medium },
  badge: { fontSize: 12, color: colors.mutedForeground },
  sectionCard: {
    backgroundColor: colors.background, borderRadius: radius.xl, padding: spacing.lg,
    marginHorizontal: spacing.lg, marginBottom: spacing.md, ...neuSm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 14, color: colors.foreground, ...fonts.semibold },
  footer: { paddingHorizontal: spacing.lg, paddingTop: 8 },
  continueBtn: {
    height: 56, backgroundColor: colors.primary, borderRadius: radius.xl,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6,
  },
  continueBtnText: { color: '#fff', fontSize: 16, ...fonts.semibold },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 14,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: 'transparent',
    ...neuSm,
  },
  inputError: {
    borderColor: '#ff4444',
    borderWidth: 1,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    ...fonts.medium,
  },
  ageText: {
    marginTop: 8,
    fontSize: 13,
    color: colors.primary,
    ...fonts.medium,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalPanel: {
    backgroundColor: colors.background,
    width: '100%',
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...neuSm,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    ...fonts.bold,
    color: colors.foreground,
  },
  closeBtn: {
    padding: 4,
    backgroundColor: `${colors.muted}`,
    borderRadius: 8,
  },
  modalText: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  modalPrimaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    color: '#fff',
    fontSize: 15,
    ...fonts.semibold,
  },
});
