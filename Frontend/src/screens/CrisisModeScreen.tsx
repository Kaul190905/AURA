import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star, Play, Pause, AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { colors, neuSm, radius, spacing, fonts } from '../theme';

interface Props { onExit: () => void; }

export default function CrisisModeScreen({ onExit }: Props) {
  const styles = getStyles();
  const { suggestions, reduceMotion } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const breathe1 = useRef(new Animated.Value(0.85)).current;
  const breathe2 = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (reduceMotion) {
      breathe1.setValue(1);
      breathe2.setValue(1);
      return;
    }
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
  }, [reduceMotion]);

  useEffect(() => {
    if (!running) {return;}
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= 300) {
          clearInterval(id);
          onExit();
          return 300;
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, onExit]);

  const handleSos = () => {
    setSosSent(true);
    setTimeout(() => {
      setSosSent(false);
    }, 10000); // auto hide after 10 seconds
  };

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
              <Star size={16} color={colors.primary} />
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
      <View style={{ gap: 12 }}>
        <TouchableOpacity
          onPress={handleSos}
          style={styles.sosBtn}
          activeOpacity={0.85}
        >
          <AlertTriangle size={18} color="#fff" />
          <Text style={styles.sosBtnText}>SOS ALERT</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onExit} style={styles.exitBtn} activeOpacity={0.85}>
          <Text style={styles.exitBtnText}>I feel better</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={sosSent}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSosSent(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={24} color={colors.riskHigh} />
                <Text style={styles.modalTitle}>SOS Sent</Text>
              </View>
            </View>
            <Text style={styles.modalText}>
              An emergency alert has been dispatched to your contacts and caretaker. Help is on the way.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = () => StyleSheet.create({
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
  sosBtn: {
    height: 56, backgroundColor: colors.riskHigh, borderRadius: radius.xl,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 4,
    shadowColor: colors.riskHigh, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6,
  },
  sosBtnText: { color: '#fff', fontSize: 16, ...fonts.bold, letterSpacing: 1 },
  exitBtn: {
    height: 56, backgroundColor: colors.foreground, borderRadius: radius.xl,
    alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  exitBtnText: { color: colors.background, fontSize: 16, ...fonts.semibold },
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
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    ...fonts.bold,
    color: colors.foreground,
  },
  modalText: {
    fontSize: 15,
    color: colors.mutedForeground,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
});
