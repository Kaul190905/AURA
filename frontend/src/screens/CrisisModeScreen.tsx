import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, Play, Pause } from 'lucide-react-native';
import { AppContext } from '../../App';
import { colors, neuSm, radius, spacing, fonts } from '../theme';

interface Props { onExit: () => void; }

export default function CrisisModeScreen({ onExit }: Props) {
  const { suggestions } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const breathe1 = useRef(new Animated.Value(0.85)).current;
  const breathe2 = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe1, { toValue: 1.15, duration: 4000, useNativeDriver: true }),
        Animated.timing(breathe1, { toValue: 0.85, duration: 4000, useNativeDriver: true }),
      ])
    );
    const anim2 = Animated.loop(
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(breathe2, { toValue: 1.1, duration: 4000, useNativeDriver: true }),
        Animated.timing(breathe2, { toValue: 0.9, duration: 4000, useNativeDriver: true }),
      ])
    );
    anim.start(); anim2.start();
    return () => { anim.stop(); anim2.stop(); };
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => (s >= 300 ? 300 : s + 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  const remaining = 300 - seconds;
  const mm = String(Math.floor(remaining / 60)).padStart(1, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.headerBlock}>
        <Text style={styles.label}>CALM MODE</Text>
        <Text style={styles.title}>Let's slow this down</Text>
      </View>

      {/* Breathe rings */}
      <View style={styles.breatheOuter}>
        <Animated.View style={[styles.ring1, { transform: [{ scale: breathe1 }] }]} />
        <Animated.View style={[styles.ring2, { transform: [{ scale: breathe2 }] }]} />
        <View style={styles.breatheCenter}>
          <Text style={styles.breatheLabel}>Breathe</Text>
          <Text style={styles.breatheSequence}>In · Hold · Out</Text>
        </View>
      </View>

      {/* Suggestions */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 8 }}>
        {suggestions.map((s) => (
          <View key={s.id} style={[styles.suggRow, neuSm]}>
            <View style={styles.suggIcon}>
              <Sparkles size={16} color={colors.primary} />
            </View>
            <Text style={styles.suggText}>{s.title}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Timer */}
      <View style={[styles.timerRow, neuSm]}>
        <View>
          <Text style={styles.timerLabel}>RESET TIMER</Text>
          <Text style={styles.timerValue}>{mm}:{ss}</Text>
        </View>
        <TouchableOpacity onPress={() => setRunning((r) => !r)} style={styles.timerBtn} activeOpacity={0.85}>
          {running ? <Pause size={16} color="#fff" /> : <Play size={16} color="#fff" />}
          <Text style={styles.timerBtnText}>{running ? 'Pause' : 'Start 5 min'}</Text>
        </TouchableOpacity>
      </View>

      {/* Exit */}
      <TouchableOpacity onPress={onExit} style={styles.exitBtn} activeOpacity={0.85}>
        <Text style={styles.exitBtnText}>I feel better</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xl },
  headerBlock: { alignItems: 'center', marginBottom: spacing.xl },
  label: { fontSize: 10, letterSpacing: 2, color: colors.mutedForeground, ...fonts.medium },
  title: { fontSize: 20, color: colors.foreground, marginTop: 4, ...fonts.semibold },
  breatheOuter: {
    width: 180, height: 180, borderRadius: radius.full,
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.muted, marginBottom: spacing.xl,
  },
  ring1: {
    position: 'absolute', width: 150, height: 150, borderRadius: radius.full,
    backgroundColor: `${colors.primary}40`,
  },
  ring2: {
    position: 'absolute', width: 110, height: 110, borderRadius: radius.full,
    backgroundColor: `${colors.primary}55`,
  },
  breatheCenter: { alignItems: 'center' },
  breatheLabel: { fontSize: 12, color: colors.foreground, opacity: 0.7 },
  breatheSequence: { fontSize: 14, color: colors.foreground, ...fonts.semibold },
  suggRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: radius.xl, padding: spacing.md, backgroundColor: colors.background, marginBottom: 8,
  },
  suggIcon: {
    width: 36, height: 36, borderRadius: radius.full,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', ...neuSm,
  },
  suggText: { flex: 1, fontSize: 13, color: colors.foreground, ...fonts.medium },
  timerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: radius.xl, padding: spacing.md, backgroundColor: colors.background, marginBottom: spacing.md,
  },
  timerLabel: { fontSize: 9, letterSpacing: 2, color: colors.mutedForeground, ...fonts.medium },
  timerValue: { fontSize: 26, color: colors.foreground, ...fonts.semibold, fontVariant: ['tabular-nums'] },
  timerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: radius.full, elevation: 4,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4,
  },
  timerBtnText: { color: '#fff', fontSize: 13, ...fonts.semibold },
  exitBtn: {
    height: 56, backgroundColor: colors.foreground, borderRadius: radius.xl,
    alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  exitBtnText: { color: colors.background, fontSize: 16, ...fonts.semibold },
});
