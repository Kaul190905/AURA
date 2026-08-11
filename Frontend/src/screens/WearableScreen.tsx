import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, FlatList, ActivityIndicator, Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bluetooth, Zap, Volume2, Sun, Shield, RefreshCw } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { Header } from '../components/Header';
import { colors, neuSm, radius, spacing, fonts } from '../theme';
import { submitSensorData } from '../services/api';
import { bleManagerService } from '../services/bleManagerService';
import { Device } from 'react-native-ble-plx';

export default function WearableScreen() {
  const styles = getStyles();
  const { bleConnected, setBleConnected, noise, setNoise, temperature, setTemperature, heartRate, setHeartRate, userId } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [pairing, setPairing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [showScanModal, setShowScanModal] = useState(false);

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
        (rawData) => {
          console.log('[BLE] Raw Data:', rawData);
          try {
            if (rawData.startsWith('{')) {
              const parsed = JSON.parse(rawData);
              if (parsed.noise !== undefined) { setNoise(parsed.noise); }
              if (parsed.temp !== undefined) { setTemperature(parsed.temp); }
              if (parsed.bpm !== undefined) { setHeartRate(parsed.bpm); }
            } else {
              const noiseMatch = rawData.match(/(?:noise|N)[:=]\s*(\d+)/i);
              const tempMatch = rawData.match(/(?:temp|T)[:=]\s*([\d.]+)/i);
              const bpmMatch = rawData.match(/(?:bpm|H)[:=]\s*(\d+)/i);
              if (noiseMatch) { setNoise(parseInt(noiseMatch[1], 10)); }
              if (tempMatch) { setTemperature(parseFloat(tempMatch[1])); }
              if (bpmMatch) { setHeartRate(parseInt(bpmMatch[1], 10)); }
            }
          } catch (e) {
            console.warn('[BLE] Error parsing data:', rawData, e);
          }
        },
        () => {
          setBleConnected(false);
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
    await bleManagerService.disconnect();
    setBleConnected(false);
  };

  // Push sensor data to backend when BLE is connected
  useEffect(() => {
    if (!bleConnected || !userId) { return; }
    submitSensorData({
      user_id: userId,
      noise,
      temperature,
      heart_rate: heartRate,
      blood_oxygen: null,
    }).catch((e) => console.warn('[AURA] Wearable sensor push failed:', e));
  }, [bleConnected, userId, noise, temperature, heartRate]);

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
        <View style={{ flex: 1 }}>
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
          <Text style={[styles.pairBtnText, !bleConnected && { color: '#fff' }]}>
            {bleConnected ? 'Disconnect' : pairing ? '…' : 'Pair'}
          </Text>
        </TouchableOpacity>
        </View>
      </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <View style={styles.sectionContainer}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
              value={noise} onValueChange={(v) => !bleConnected && setNoise(Math.round(v))}
              disabled={bleConnected}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={bleConnected ? colors.muted : colors.primary}
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
              <Text style={styles.sliderValue}>{Math.round(((temperature - 32) * 5) / 9)}<Text style={styles.sliderUnit}> °C</Text></Text>
            </View>
            <Slider
              minimumValue={30} maximumValue={110} step={1}
              value={temperature} onValueChange={(v) => !bleConnected && setTemperature(Math.round(v))}
              disabled={bleConnected}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={bleConnected ? colors.muted : colors.primary}
              style={{ marginTop: 10 }}
            />
          </View>
        </View>
        </View>

        <View style={styles.sectionContainer}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Shield size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Device status</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, neuSm]}>
              <Text style={styles.statLabel}>BATTERY</Text>
              <Text style={styles.statValue}>{bleConnected ? '82%' : '—'}</Text>
            </View>
            <View style={[styles.statCard, neuSm]}>
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
                  <RefreshCw size={14} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.rescanBtnText}>Scan Again</Text>
                </TouchableOpacity>
              </View>
            )}

            <FlatList
              data={devices}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingVertical: 10 }}
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
                  <Bluetooth size={18} color={colors.primary} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
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
});
