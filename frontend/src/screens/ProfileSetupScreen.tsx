import React, { useContext, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Volume2, Sun, Hand, Users2, Waves, Wind, Sparkles, Home, MessageCircle } from 'lucide-react-native';

import { AppContext } from '../../App';
import { Header } from '../components/Header';
import { Accordion, AccItem } from '../components/Accordion';
import { colors, neuSm, radius, spacing, fonts } from '../theme';
import { TriggerKey } from '../types';
import { TRIGGERS, PRESETS, ENVIRONMENTS } from '../data';

const TRIGGER_ICONS: Record<TriggerKey, React.ElementType> = {
  sound: Volume2, light: Sun, touch: Hand, crowd: Users2, movement: Waves, smell: Wind,
};

interface Props { onDone: () => void; }

export default function ProfileSetupScreen({ onDone }: Props) {
  const { profile, setProfile, environments, setEnvironments, ageGroup, setAgeGroup, commStyle, setCommStyle } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  const toggleTrigger = (k: TriggerKey) => {
    const next = { ...profile };
    if (k in next) delete next[k]; else next[k] = 3;
    setProfile(next);
  };
  const toggleEnv = (e: string) =>
    setEnvironments(environments.includes(e) ? environments.filter((x) => x !== e) : [...environments, e]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Your sensory profile" subtitle="Setup" />
      <Text style={styles.hint}>Tap a section to open it.</Text>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Accordion>
          {/* Quick presets */}
          <AccItem id="quick" title="Quick start presets" icon={<Sparkles size={18} color={colors.primary} />}>
            <View style={styles.chips}>
              {PRESETS.map((p) => (
                <TouchableOpacity key={p.name} onPress={() => setProfile(p.triggers)} style={styles.chip} activeOpacity={0.8}>
                  <Text style={styles.chipText}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </AccItem>

          {/* Triggers */}
          <AccItem id="triggers" title="Triggers" defaultOpen
            icon={<Volume2 size={18} color={colors.primary} />}
            badge={<Text style={styles.badge}>{Object.keys(profile).length}</Text>}>
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
          </AccItem>

          {/* Environments */}
          <AccItem id="env" title="Where does this happen?" icon={<Home size={18} color={colors.primary} />}
            badge={<Text style={styles.badge}>{environments.length}</Text>}>
            <View style={styles.chips}>
              {ENVIRONMENTS.map((e) => {
                const on = environments.includes(e);
                return (
                  <TouchableOpacity key={e} onPress={() => toggleEnv(e)}
                    style={[styles.chip, on && styles.chipActive]} activeOpacity={0.8}>
                    <Text style={[styles.chipText, on && { color: colors.primary }]}>{e}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </AccItem>

          {/* Age group */}
          <AccItem id="age" title="Age group" icon={<Users2 size={18} color={colors.primary} />}
            badge={<Text style={styles.badge}>{ageGroup}</Text>}>
            <View style={styles.chips}>
              {['Child', 'Teen', 'Adult'].map((a) => (
                <TouchableOpacity key={a} onPress={() => setAgeGroup(a)}
                  style={[styles.chip, ageGroup === a && styles.chipActive]} activeOpacity={0.8}>
                  <Text style={[styles.chipText, ageGroup === a && { color: colors.primary }]}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </AccItem>

          {/* Comm style */}
          <AccItem id="comm" title="How should we talk to you?" icon={<MessageCircle size={18} color={colors.primary} />}
            badge={<Text style={styles.badge}>{commStyle}</Text>}>
            <View style={styles.chips}>
              {(['text', 'emoji', 'visual'] as const).map((c) => (
                <TouchableOpacity key={c} onPress={() => setCommStyle(c)}
                  style={[styles.chip, commStyle === c && styles.chipActive]} activeOpacity={0.8}>
                  <Text style={[styles.chipText, commStyle === c && { color: colors.primary }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </AccItem>
        </Accordion>
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

const styles = StyleSheet.create({
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
  badge: { fontSize: 12, color: colors.mutedForeground, marginRight: 4 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: 8 },
  continueBtn: {
    height: 56, backgroundColor: colors.primary, borderRadius: radius.xl,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6,
  },
  continueBtnText: { color: '#fff', fontSize: 16, ...fonts.semibold },
});
