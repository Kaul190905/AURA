import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, FlatList, ActivityIndicator, Alert,
  Vibration,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bluetooth, Zap, Volume2, Sun, Shield, RefreshCw, Siren } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { Header } from '../components/Header';
import { colors, shadowSm, radius, spacing, fonts } from '../theme';
import { submitSensorData } from '../services/api';
import { bleManagerService } from '../services/bleManagerService';
import { Device } from 'react-native-ble-plx';

// Repeating vibrate pattern used as the in-app SOS ring. Passing `true`
// to Vibration.vibrate loops it until stopSosRing() cancels it.
const SOS_PATTERN = [0, 700, 400, 700, 400];

export default function WearableScreen() {
  const styles = getStyles();
  const { bleConnected, setBleConnected, noise, setNoise, temperature, setTemperature, heartRate, setHeartRate, userId, setTelemetryStale } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [pairing, setPairing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [showScanModal, setShowScanModal] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [sosOrigin, setSosOrigin] = useState<'band' | 'phone' | null>(null);

  const ringing = useRef(false);
  const lastTelemetryTime = useRef(0);

  const startSosRing = useCallback(() => {
    if (ringing.current) { return; }
    ringing.current = true;
    Vibration.vibrate(SOS_PATTERN, true);
  }, []);

  const stopSosRing = useCallback(() => {
    ringing.current = false;
    Vibration.cancel();
  }, []);

  // Never leave the phone buzzing if the screen goes away.
  useEffect(() => stopSosRing, [stopSosRing]);

  useEffect(() => {
    if (!bleConnected) {
      setTelemetryStale(false);
      return;
    }
    const interval = setInterval(() => {
      if (Date.now() - lastTelemetryTime.current > 3000) {
        setTelemetryStale(true);
      } else {
        setTelemetryStale(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [bleConnected, setTelemetryStale]);

  const startScan = async () => {
    const granted = await bleManagerService.requestPermissions();
    if (!granted) {
      Alert.alert('Permission Denied', 'Bluetooth and Location permissions are required to scan.');
      return;
    }
    setDevices([]);
    setScanning(true);
    setShowScanModal(true);
    bleManagerService.startDeviceScan(
      (device) => {
        if (device.name) {
          setDevices((prev) => {
            if (prev.some((d) => d.id === device.id)) { return prev; }
            return [...prev, device];
          });
        }
      },
      (error) => {
        console.error('[BLE] Scan error:', error);
        setScanning(false);
        Alert.alert('Scan Error', error.message || 'An error occurred during scanning.');
      }
    );

    // Stop scanning after 15 seconds
    setTimeout(() => {
      bleManagerService.stopDeviceScan();
      setScanning(false);
    }, 15000);
  };

  const connectDevice = async (device: Device) => {
    bleManagerService.stopDeviceScan();
    setScanning(false);
    setPairing(true);
    try {
      await bleManagerService.connectToDevice(
        device,
        {
          onTelemetry: (t) => {
            lastTelemetryTime.current = Date.now();
            setTelemetryStale(false);
            setNoise(Math.round(t.micDb));
            if (t.bpm > 0) {
              setHeartRate(Math.round(t.bpm));
            }
            setTemperature(t.tempC);
          },
          onSosFromBand: (source) => {
            setSosActive(true);
            setSosOrigin(source === 'PHONE' ? 'phone' : 'band');
            if (source !== 'PHONE') {
              // The wearer pressed the button. Ring the phone and tell
              // the band we heard it so it eases off its buzzing.
              startSosRing();
              bleManagerService.acknowledgeSOS().catch(() => {});
              Alert.alert(
                'SOS from AURA band',
                'The band SOS button was pressed.',
                [{ text: 'Dismiss', onPress: stopSosRing }],
                { cancelable: false }
              );
            }
          },
          onSosCleared: () => {
            setSosActive(false);
            setSosOrigin(null);
            stopSosRing();
          },
          onRawLine: (line) => console.log('[BLE]', line),
        },
        () => {
          setBleConnected(false);
          setSosActive(false);
          setSosOrigin(null);
          stopSosRing();
        }
      );
      setBleConnected(true);
      setShowScanModal(false);
    } catch (e: any) {
      console.error('[BLE] Connection failed:', e);
      Alert.alert('Connection Failed', e.message || 'Could not connect to the selected device.');
    } finally {
      setPairing(false);
    }
  };

  const disconnectDevice = async () => {
    stopSosRing();
    setSosActive(false);
    setSosOrigin(null);
    await bleManagerService.disconnect();
    setBleConnected(false);
  };

  // Phone -> band: make the wearable vibrate and glow red.
  const triggerBandSOS = async () => {
    try {
      await bleManagerService.sendSOS();
      setSosActive(true);
      setSosOrigin('phone');
    } catch (e: any) {
      Alert.alert('SOS Failed', e.message || 'Could not reach the AURA band.');
    }
  };

  const clearBandSOS = async () => {
    stopSosRing();
    try {
      await bleManagerService.clearSOS();
    } catch (e: any) {
      console.warn('[BLE] Clear SOS failed:', e);
    }
    setSosActive(false);
    setSosOrigin(null);
  };

  const latestSensors = useRef({ noise, temperature, heartRate });
  useEffect(() => {
    latestSensors.current = { noise, temperature, heartRate };
  }, [noise, temperature, heartRate]);

  // Push sensor data to backend when BLE is connected
  useEffect(() => {
    if (!bleConnected || !userId) { return; }
    const interval = setInterval(() => {
      submitSensorData({
        user_id: userId,
        noise: latestSensors.current.noise,
        temperature: latestSensors.current.temperature,
        heart_rate: latestSensors.current.heartRate,
        blood_oxygen: null,
      }).catch((e) => console.warn('[AURA] Wearable sensor push failed:', e));
    }, 5000);
    return () => clearInterval(interval);
  }, [bleConnected, userId]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Wearable" subtitle="AURA band" />

      {/* Connection card */}
      <View style={styles.sectionContainer}>
      <View style={styles.sectionCard}>
        <View style={styles.connectRow}>
        <View style={[styles.bleIcon, bleConnected && { backgroundColor: colors.muted }]}>
          <Bluetooth size={22} color={colors.primary} />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.deviceName}>AURA band</Text>
          <Text style={styles.deviceStatus}>
            {pairing ? 'Pairing…' : bleConnected ? 'Connected' : 'Not paired'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={bleConnected ? disconnectDevice : startScan}
          disabled={pairing}
          style={[styles.pairBtn, !bleConnected && styles.pairBtnActive]}
          activeOpacity={0.85}
        >
          <Text style={[styles.pairBtnText, !bleConnected && styles.textWhite]}>
            {bleConnected ? 'Disconnect' : pairing ? '…' : 'Pair'}
          </Text>
        </TouchableOpacity>
        </View>
      </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionContainer}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderInner}>
              <Zap size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>{bleConnected ? 'Real-time sensors' : 'Simulated sensors'}</Text>
            </View>
          </View>
          <Text style={styles.sensorHint}>
            {bleConnected
              ? 'Showing real-time data streaming from your AURA band.'
              : 'Move the sliders to see your House dashboard react in real time (Simulation Mode).'}
          </Text>

          {/* Noise slider */}
          <View style={[styles.sliderCard, styles.mt12]}>
            <View style={styles.sliderCardTop}>
              <View style={[styles.sliderIcon, shadowSm]}>
                <Volume2 size={18} color={colors.primary} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.sliderCardTitle}>Noise</Text>
                <Text style={styles.sliderCardHint}>{noise === null ? 'No Data' : noise < 60 ? 'Quiet' : noise < 80 ? 'Busy' : 'Loud'}</Text>
              </View>
              <Text style={styles.sliderValue}>{noise !== null ? noise : '--'}<Text style={styles.sliderUnit}> dB</Text></Text>
            </View>
            <Slider
              minimumValue={40} maximumValue={100} step={1}
              value={noise ?? 40} onValueChange={(v) => !bleConnected && setNoise(Math.round(v))}
              disabled={bleConnected}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={bleConnected ? colors.muted : colors.primary}
              style={styles.mt10}
            />
          </View>

          {/* Temperature slider */}
          <View style={[styles.sliderCard, styles.mt10]}>
            <View style={styles.sliderCardTop}>
              <View style={[styles.sliderIcon, shadowSm]}>
                <Sun size={18} color={colors.primary} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.sliderCardTitle}>Temperature</Text>
                <Text style={styles.sliderCardHint}>{temperature === null ? 'No Data' : temperature < 36.1 ? 'Cold' : temperature < 37.8 ? 'Normal' : 'Fever'}</Text>
              </View>
              <Text style={styles.sliderValue}>{temperature !== null ? temperature.toFixed(1) : '--'}<Text style={styles.sliderUnit}> °C</Text></Text>
            </View>
            <Slider
              minimumValue={32} maximumValue={43} step={0.1}
              value={temperature ?? 37.0} onValueChange={(v) => !bleConnected && setTemperature(parseFloat(v.toFixed(1)))}
              disabled={bleConnected}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={bleConnected ? colors.muted : colors.primary}
              style={styles.mt10}
            />
          </View>
        </View>
        </View>

        {/* SOS */}
        <View style={styles.sectionContainer}>
        <View style={[styles.sectionCard, sosActive && styles.sosCardActive]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderInner}>
              <Siren size={18} color={sosActive ? '#d92d20' : colors.primary} />
              <Text style={styles.sectionTitle}>Emergency</Text>
            </View>
          </View>
          <Text style={styles.sensorHint}>
            {!bleConnected
              ? 'Pair the AURA band to use SOS.'
              : sosActive
                ? sosOrigin === 'band'
                  ? 'SOS raised from the band button.'
                  : 'Alerting the band — it is vibrating and glowing red.'
                : 'Sends an alert to the band: it vibrates and glows red until stopped. Pressing the button on the band rings this phone.'}
          </Text>
          <TouchableOpacity
            onPress={sosActive ? clearBandSOS : triggerBandSOS}
            disabled={!bleConnected}
            style={[
              styles.sosBtn,
              sosActive && styles.sosBtnStop,
              !bleConnected && styles.sosBtnDisabled,
            ]}
            activeOpacity={0.85}
          >
            <Text style={styles.sosBtnText}>
              {sosActive ? 'Stop alert' : 'Send SOS to band'}
            </Text>
          </TouchableOpacity>
        </View>
        </View>

        <View style={styles.sectionContainer}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderInner}>
              <Shield size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Device status</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, shadowSm]}>
              <Text style={styles.statLabel}>BATTERY</Text>
              <Text style={styles.statValue}>{bleConnected ? '82%' : '—'}</Text>
            </View>
            <View style={[styles.statCard, shadowSm]}>
              <Text style={styles.statLabel}>SIGNAL</Text>
              <Text style={styles.statValue}>{bleConnected ? 'Strong' : '—'}</Text>
            </View>
          </View>
        </View>
        </View>
      </ScrollView>

      {/* BLE Scanner Modal */}
      <Modal visible={showScanModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Scan for AURA Band</Text>
              <TouchableOpacity
                onPress={() => {
                  bleManagerService.stopDeviceScan();
                  setScanning(false);
                  setShowScanModal(false);
                }}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {scanning ? (
              <View style={styles.scanStatus}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.scanStatusText}>Scanning for nearby BLE devices...</Text>
              </View>
            ) : (
              <View style={styles.scanStatus}>
                <TouchableOpacity onPress={startScan} style={styles.rescanBtn}>
                  <RefreshCw size={14} color={colors.primary} style={styles.mr6} />
                  <Text style={styles.rescanBtnText}>Scan Again</Text>
                </TouchableOpacity>
              </View>
            )}

            <FlatList
              data={devices}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.pv10}
              ListEmptyComponent={
                <Text style={styles.emptyListText}>
                  {scanning ? 'No devices found yet...' : 'No devices found. Ensure the band is powered on.'}
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => connectDevice(item)}
                  style={styles.deviceItem}
                >
                  <Bluetooth size={18} color={colors.primary} style={styles.mr12} />
                  <View style={styles.flex1}>
                    <Text style={styles.deviceItemName}>{item.name || 'Unnamed Device'}</Text>
                    <Text style={styles.deviceItemId}>{item.id}</Text>
                  </View>
                  <Text style={styles.connectText}>Connect</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  sectionContainer: { marginBottom: 28, paddingHorizontal: 16 },
  sectionCard: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border + '80',
    shadowColor: colors.primary,
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 14, color: colors.foreground, ...fonts.semibold },
  connectRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  bleIcon: {
    width: 48, height: 48, borderRadius: radius.full,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', ...shadowSm,
  },
  deviceName: { fontSize: 15, color: colors.foreground, ...fonts.semibold },
  deviceStatus: { fontSize: 12, color: colors.mutedForeground },
  pairBtn: {
    height: 40, paddingHorizontal: 16, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, ...shadowSm,
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
  sosCardActive: { borderWidth: 1, borderColor: '#d92d20' },
  sosBtn: {
    height: 46, borderRadius: radius.full, marginTop: 12,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#d92d20',
  },
  sosBtnStop: { backgroundColor: colors.foreground },
  sosBtnDisabled: { backgroundColor: colors.muted },
  sosBtnText: { fontSize: 14, color: '#fff', ...fonts.bold, letterSpacing: 1 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  statCard: { flex: 1, backgroundColor: colors.background, borderRadius: radius.lg, padding: 12 },
  statLabel: { fontSize: 9, letterSpacing: 2, color: colors.mutedForeground, ...fonts.medium },
  statValue: { fontSize: 15, color: colors.foreground, marginTop: 4, ...fonts.bold, textTransform: 'capitalize' },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 16,
    color: colors.foreground,
    ...fonts.bold,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: colors.mutedForeground,
    fontSize: 14,
  },
  scanStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  scanStatusText: {
    marginLeft: 8,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  rescanBtnText: {
    fontSize: 12,
    color: colors.primary,
    ...fonts.semibold,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  deviceItemName: {
    fontSize: 14,
    color: colors.foreground,
    ...fonts.semibold,
  },
  deviceItemId: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  connectText: {
    color: colors.primary,
    fontSize: 13,
    ...fonts.semibold,
  },
  emptyListText: {
    textAlign: 'center',
    color: colors.mutedForeground,
    marginVertical: 20,
    fontSize: 13,
  },
  flex1: {
    flex: 1,
  },
  textWhite: {
    color: '#fff',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  sectionHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mt12: {
    marginTop: 12,
  },
  mt10: {
    marginTop: 10,
  },
  mr6: {
    marginRight: 6,
  },
  mr12: {
    marginRight: 12,
  },
  pv10: {
    paddingVertical: 10,
  },
});
