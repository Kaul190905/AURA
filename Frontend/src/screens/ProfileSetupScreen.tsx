import React, { useContext, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ear, Sun, Star, Calendar, User } from 'lucide-react-native';

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

  const toggleTrigger = (k: TriggerKey) => {
    const next = { ...profile };
    if (k in next) delete next[k]; else next[k] = 3;
    setProfile(next);
  };
  const calculateAge = (dobString: string) => {
    if (!dobString) return '';
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return '';
    const ageDifMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDifMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    return `${age} years old`;
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
              <Text style={styles.sectionTitle}>Date of Birth</Text>
            </View>
            <Text style={styles.badge}>{calculateAge(dob)}</Text>
          </View>
          <View style={{ padding: 12 }}>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
              value={dob}
              onChangeText={setDob}
              keyboardType="numeric"
            />
            {dob ? <Text style={styles.ageText}>Calculated Age: {calculateAge(dob)}</Text> : null}
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
            <TextInput
              style={styles.input}
              placeholder="Caregiver Name"
              placeholderTextColor={colors.mutedForeground}
              value={caregiver?.name}
              onChangeText={(t) => setCaregiver({ ...caregiver, name: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Relationship (e.g., Parent, Spouse)"
              placeholderTextColor={colors.mutedForeground}
              value={caregiver?.relationship}
              onChangeText={(t) => setCaregiver({ ...caregiver, relationship: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor={colors.mutedForeground}
              value={caregiver?.phone}
              onChangeText={(t) => setCaregiver({ ...caregiver, phone: t })}
              keyboardType="phone-pad"
            />
          </View>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity onPress={onDone} style={styles.continueBtn} activeOpacity={0.85}>
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
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
    ...neuSm,
  },
  ageText: {
    marginTop: 8,
    fontSize: 13,
    color: colors.primary,
    ...fonts.medium,
  },
});
