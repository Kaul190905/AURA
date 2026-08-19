import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, Thermometer, Mic } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { colors, radius, spacing, fonts, neuSm } from '../theme';
import { getCaregiverUserSensorData } from '../services/caregiverApi';

export default function SensoryStatusScreen({ navigation, route }: any) {
  const { darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  
  const userId = route?.params?.userId;

  const [loading, setLoading] = useState(true);
  const [latestData, setLatestData] = useState<any>(null);

  const bgStyle = darkMode ? { backgroundColor: '#000000' } : { backgroundColor: '#F8F9FA' };
  const cardStyle = darkMode ? { backgroundColor: '#1c1c1e' } : { backgroundColor: '#ffffff' };
  const textStyle = darkMode ? { color: '#ffffff' } : { color: colors.foreground };
  const subTextStyle = darkMode ? { color: '#aaaaaa' } : { color: colors.mutedForeground };

  useEffect(() => {
    if (userId) {
      getCaregiverUserSensorData(userId)
        .then(data => {
          if (data && data.length > 0) {
            // Assuming the first item is the most recent
            setLatestData(data[0]);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch sensor data:', err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [userId]);

  if (loading) {
    return (
      <View style={[styles.container, bgStyle, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!latestData) {
    return (
      <View style={[styles.container, bgStyle, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={textStyle}>No sensory data available.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary, ...fonts.bold }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getStatusLabel = (risk: number, isCrisis: boolean) => {
    if (isCrisis || risk >= 9) return 'CRITICAL';
    if (risk >= 5) return 'HIGH RISK';
    if (risk >= 3) return 'MEDIUM RISK';
    return 'SAFE';
  };

  // Calculate simple mock risk until Risk Engine is fully integrated in UI
  const risk = latestData.heart_rate > 100 || latestData.noise > 80 ? 5 : 1;
  const isCrisis = latestData.heart_rate > 120;
  
  const status = getStatusLabel(risk, isCrisis);
  const isElevated = risk >= 5 || isCrisis;
  
  const hasSound = latestData.noise !== undefined;
  const hasTemp = latestData.temperature !== undefined;

  const liveBpm = latestData.heart_rate ? Math.round(latestData.heart_rate) : 0;
  const liveSound = latestData.noise ? Math.round(latestData.noise) : 0;
  const liveTemp = latestData.temperature ? parseFloat(latestData.temperature).toFixed(1) : 'N/A';

  const soundIconBg = `${liveSound > 80 ? colors.riskHigh : colors.primary}15`;
  const soundIconColor = liveSound > 80 ? colors.riskHigh : colors.primary;

  let activeTriggers: string[] = [];
  if (liveSound > 80) activeTriggers.push('Sound');
  if (hasTemp && parseFloat(liveTemp as string) > 37.5) activeTriggers.push('Temperature');

  const primaryTriggerText = activeTriggers.join(' + ') || 'None';

  return (
    <View style={[styles.container, bgStyle, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft size={24} color={textStyle.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, textStyle]}>Current Sensory Status</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.fixedContent}>
        
        {/* Overall Status Summary */}
        <View style={[styles.summaryCard, cardStyle, neuSm]}>
          <Text style={[styles.cardSuperTitle, subTextStyle]}>CURRENT CONDITION</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 4 }}>
            <View style={[styles.dotLg, { backgroundColor: isElevated ? colors.riskHigh : colors.primary }]} />
            <Text style={[styles.conditionValue, textStyle]}>{status}</Text>
          </View>
          <Text style={[styles.cardSubValue, subTextStyle]}>
            Affected Trigger: {isElevated ? primaryTriggerText : 'None'}
          </Text>
        </View>

        <Text style={[styles.sectionHeader, textStyle]}>CURRENT SENSORY DATA</Text>

        {/* Heart Rate Card (Always visible) */}
        <TouchableOpacity 
          style={[styles.sensorCard, cardStyle, neuSm]} 
          onPress={() => navigation.navigate('HeartRateHistory', { userId })}
          activeOpacity={0.7}
        >
          <View style={styles.sensorCardHeader}>
            <View style={[styles.sensorIconBox, { backgroundColor: `${colors.riskHigh}15` }]}>
              <Heart size={22} color={colors.riskHigh} />
            </View>
            <Text style={[styles.sensorCardTitle, textStyle]}>Heart Rate</Text>
          </View>
          <View style={styles.sensorCardBody}>
            <Text style={[styles.sensorCardValue, textStyle]}>{liveBpm} BPM</Text>
            <Text style={[styles.sensorCardSub, subTextStyle]}>
              Status: {liveBpm > 100 ? 'Elevated' : 'Normal'}
            </Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
              <Text style={{ color: colors.primary, fontSize: 12, ...fonts.bold, marginRight: 4 }}>View detailed trends</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Sound Card (Conditional) */}
        {hasSound && (
          <TouchableOpacity
            style={[styles.sensorCard, cardStyle, neuSm]}
            onPress={() => navigation.navigate('SoundHistory')}
            activeOpacity={0.7}
          >
            <View style={styles.sensorCardHeader}>
              <View style={[styles.sensorIconBox, { backgroundColor: soundIconBg }]}>
                <Mic size={22} color={soundIconColor} />
              </View>
              <Text style={[styles.sensorCardTitle, textStyle]}>Sound</Text>
            </View>
            <View style={styles.sensorCardBody}>
              <Text style={[styles.sensorCardValue, textStyle]}>{liveSound} dB</Text>
              <Text style={[styles.sensorCardSub, subTextStyle]}>
                Status: {liveSound > 80 ? 'High' : 'Normal'}
              </Text>
              <View style={styles.progressContainer}>
                <View style={[
                  styles.progressBar,
                  {
                    width: `${Math.min(liveSound, 120) / 120 * 100}%`,
                    backgroundColor: liveSound > 80 ? colors.riskHigh : colors.primary,
                  }
                ]} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
                <Text style={{ color: colors.primary, fontSize: 12, ...fonts.bold, marginRight: 4 }}>View detailed trends</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Temperature Card (Conditional) */}
        {hasTemp && (
          <View style={[styles.sensorCard, cardStyle, neuSm]}>
            <View style={styles.sensorCardHeader}>
              <View style={[styles.sensorIconBox, { backgroundColor: `${colors.riskMed}15` }]}>
                <Thermometer size={22} color={colors.riskMed} />
              </View>
              <Text style={[styles.sensorCardTitle, textStyle]}>Temperature</Text>
            </View>
            <View style={styles.sensorCardBody}>
              <Text style={[styles.sensorCardValue, textStyle]}>{liveTemp}°C</Text>
              <Text style={[styles.sensorCardSub, subTextStyle]}>
                Status: {liveTemp > 37.5 ? 'Elevated' : 'Normal'}
              </Text>
            </View>
          </View>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md 
  },
  iconBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 20, ...fonts.bold },
  
  fixedContent: { flex: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, paddingTop: spacing.md },

  summaryCard: {
    padding: 24,
    borderRadius: radius.xl,
    marginBottom: spacing.xl,
  },
  cardSuperTitle: {
    fontSize: 12, ...fonts.bold, letterSpacing: 1, marginBottom: 12,
  },
  dotLg: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  conditionValue: {
    fontSize: 22, ...fonts.bold,
  },
  cardSubValue: {
    fontSize: 14, ...fonts.medium, marginTop: 4,
  },

  sectionHeader: {
    fontSize: 14, ...fonts.bold, letterSpacing: 1, marginBottom: spacing.md, marginLeft: 8,
  },

  sensorCard: {
    padding: 24,
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
  },
  sensorCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16,
  },
  sensorIconBox: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },
  sensorCardTitle: {
    fontSize: 15, ...fonts.bold, letterSpacing: 0.5,
  },
  sensorCardBody: {
    paddingLeft: 4,
  },
  sensorCardValue: {
    fontSize: 32, ...fonts.bold, marginBottom: 4,
  },
  sensorCardSub: {
    fontSize: 15, ...fonts.medium,
  },
  progressContainer: {
    marginVertical: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
});
