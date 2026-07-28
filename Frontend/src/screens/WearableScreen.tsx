import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bluetooth, Zap, Volume2, Sun, Heart, Shield } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { Header } from '../components/Header';
import { Accordion, AccItem } from '../components/Accordion';
import { colors, neuSm, radius, spacing, fonts } from '../theme';
import { submitSensorData } from '../services/api';

export default function WearableScreen() {
  const styles = getStyles();
  const { bleConnected, setBleConnected, noise, setNoise, temperature, setTemperature, goCrisis, userId } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [pairing, setPairing] = useState(false);

  const pair = () => {
    setPairing(true);
    setTimeout(() => { setPairing(false); setBleConnected(true); }, 1400);
  };

  // Push sensor data to backend when BLE is connected
  useEffect(() => {
    if (!bleConnected || !userId) return;
    submitSensorData({
      user_id: userId,
      noise,
      temperature,
      heart_rate: null,
      blood_oxygen: null,
    }).catch((e) => console.warn('[AURA] Wearable sensor push failed:', e));
  }, [bleConnected, userId, noise, temperature]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Wearable" subtitle="AURA band" />

      {/* Connection card */}
      <View style={[styles.connectCard, neuSm]}>
        <View style={[styles.bleIcon, bleConnected && { backgroundColor: colors.muted }]}>
          <Bluetooth size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.deviceName}>AURA band</Text>
          <Text style={styles.deviceStatus}>
            {pairing ? 'Pairing…' : bleConnected ? 'Connected' : 'Not paired'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={bleConnected ? () => setBleConnected(false) : pair}
          disabled={pairing}
          style={[styles.pairBtn, !bleConnected && styles.pairBtnActive]}
          activeOpacity={0.85}
        >
          <Text style={[styles.pairBtnText, !bleConnected && { color: '#fff' }]}>
            {bleConnected ? 'Disconnect' : pairing ? '…' : 'Pair'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <Accordion>
          <AccItem id="sensors" title="Simulated sensors" defaultOpen icon={<Zap size={18} color={colors.primary} />}>
            <Text style={styles.sensorHint}>Move the sliders to see your House dashboard react in real time.</Text>
            
            {/* Noise slider */}
            <View style={[styles.sliderCard, { marginTop: 12 }]}>
              <View style={styles.sliderCardTop}>
                <View style={[styles.sliderIcon, neuSm]}>
                  <Volume2 size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sliderCardTitle}>Noise</Text>
                  <Text style={styles.sliderCardHint}>{noise < 60 ? 'Quiet' : noise < 80 ? 'Busy' : 'Loud'}</Text>
                </View>
                <Text style={styles.sliderValue}>{noise}<Text style={styles.sliderUnit}> dB</Text></Text>
              </View>
              <Slider
                minimumValue={40} maximumValue={100} step={1}
                value={noise} onValueChange={(v) => setNoise(Math.round(v))}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.primary}
                style={{ marginTop: 10 }}
              />
            </View>

            {/* Temperature slider */}
            <View style={[styles.sliderCard, { marginTop: 10 }]}>
              <View style={styles.sliderCardTop}>
                <View style={[styles.sliderIcon, neuSm]}>
                  <Sun size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sliderCardTitle}>Temperature</Text>
                  <Text style={styles.sliderCardHint}>{temperature < 97 ? 'Cold' : temperature < 100 ? 'Normal' : 'Fever'}</Text>
                </View>
                <Text style={styles.sliderValue}>{temperature}<Text style={styles.sliderUnit}> °F</Text></Text>
              </View>
              <Slider
                minimumValue={30} maximumValue={110} step={1}
                value={temperature} onValueChange={(v) => setTemperature(Math.round(v))}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.primary}
                style={{ marginTop: 10 }}
              />
            </View>
          </AccItem>

          <AccItem id="btn" title="Simulate wearable button" icon={<Heart size={18} color={colors.primary} />}>
            <TouchableOpacity onPress={goCrisis} style={styles.simulateBtn} activeOpacity={0.85}>
              <Zap size={18} color="#fff" />
              <Text style={styles.simulateBtnText}>Press band button</Text>
            </TouchableOpacity>
          </AccItem>

          <AccItem id="battery" title="Device status" icon={<Shield size={18} color={colors.primary} />}>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, neuSm]}>
                <Text style={styles.statLabel}>BATTERY</Text>
                <Text style={styles.statValue}>82%</Text>
              </View>
              <View style={[styles.statCard, neuSm]}>
                <Text style={styles.statLabel}>SIGNAL</Text>
                <Text style={styles.statValue}>{bleConnected ? 'Strong' : '—'}</Text>
              </View>
            </View>
          </AccItem>
        </Accordion>
      </ScrollView>
    </View>
  );
}

const getStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  connectCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.background,
  },
  bleIcon: {
    width: 48, height: 48, borderRadius: radius.full,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', ...neuSm,
  },
  deviceName: { fontSize: 15, color: colors.foreground, ...fonts.semibold },
  deviceStatus: { fontSize: 12, color: colors.mutedForeground },
  pairBtn: {
    height: 40, paddingHorizontal: 16, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, ...neuSm,
  },
  pairBtnActive: {
    backgroundColor: colors.primary,
    elevation: 4, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 4,
  },
  pairBtnText: { fontSize: 13, color: colors.foreground, ...fonts.semibold },
  sensorHint: { fontSize: 12, color: colors.mutedForeground, lineHeight: 18 },
  sliderCard: { backgroundColor: colors.muted, borderRadius: radius.lg, padding: 12 },
  sliderCardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sliderIcon: { width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  sliderCardTitle: { fontSize: 13, color: colors.foreground, ...fonts.semibold },
  sliderCardHint: { fontSize: 10, color: colors.mutedForeground },
  sliderValue: { fontSize: 13, color: colors.foreground, ...fonts.semibold },
  sliderUnit: { fontSize: 10, color: colors.mutedForeground },
  simulateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: radius.xl, paddingVertical: 14, marginTop: 8,
    elevation: 4, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 4,
  },
  simulateBtnText: { color: '#fff', fontSize: 14, ...fonts.semibold },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  statCard: { flex: 1, backgroundColor: colors.background, borderRadius: radius.lg, padding: 12 },
  statLabel: { fontSize: 9, letterSpacing: 2, color: colors.mutedForeground, ...fonts.medium },
  statValue: { fontSize: 15, color: colors.foreground, marginTop: 4, ...fonts.bold, textTransform: 'capitalize' },
});
