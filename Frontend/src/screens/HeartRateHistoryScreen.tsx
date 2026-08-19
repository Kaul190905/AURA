import React, { useContext, useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowUp } from 'lucide-react-native';
import { LineChart } from 'react-native-gifted-charts';
import { AppContext } from '../AppContext';
import { colors, radius, spacing, fonts, neuSm } from '../theme';
import { getCaregiverUserSensorData } from '../services/caregiverApi';

const { width } = Dimensions.get('window');

export default function HeartRateHistoryScreen({ navigation, route }: any) {
  const { darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const userId = route?.params?.userId;

  const [sensorHistory, setSensorHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      getCaregiverUserSensorData(userId)
        .then(data => {
          // Sort chronologically if API returns descending
          const sorted = data.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          setSensorHistory(sorted);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [userId]);

  const bgStyle = darkMode ? { backgroundColor: '#000000' } : { backgroundColor: '#F8F9FA' };
  const cardStyle = darkMode ? { backgroundColor: '#1c1c1e' } : { backgroundColor: '#ffffff' };
  const textStyle = darkMode ? { color: '#ffffff' } : { color: colors.foreground };
  const subTextStyle = darkMode ? { color: '#aaaaaa' } : { color: colors.mutedForeground };
  const rulesColor = darkMode ? '#333333' : '#eeeeee';
  const trendColor = darkMode ? '#FFFFFF' : colors.primary;

  // Process real data for the HRV / BPM graph
  const lineData = useMemo(() => {
    if (!sensorHistory || sensorHistory.length === 0) return [];
    
    return sensorHistory
      .filter(item => item.heart_rate != null)
      .map(item => ({
        value: item.heart_rate,
        hideDataPoint: true,
      }));
  }, [sensorHistory]);

  const stats = useMemo(() => {
    if (lineData.length === 0) return { latest: 0, min: 0, max: 0, avg: 0, resting: 0 };
    const vals = lineData.map(d => d.value);
    const latest = Math.round(vals[vals.length - 1]);
    const min = Math.round(Math.min(...vals));
    const max = Math.round(Math.max(...vals));
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    const resting = Math.round(min + (max - min) * 0.15); // Approximation for resting based on live range
    return { latest, min, max, avg, resting };
  }, [lineData]);

  return (
    <View style={[styles.container, bgStyle, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft size={24} color={textStyle.color} />
        </TouchableOpacity>
      </View>

      <View style={[styles.content, { paddingBottom: spacing.lg }]}>
        <View style={[styles.chartCard, neuSm, cardStyle]}>
          <Text style={[styles.cardTitle, textStyle]}>Heart Rate History</Text>
          
          <View style={styles.statsRow}>
            <View>
              <Text style={[styles.statLabel, subTextStyle]}>Most Recent</Text>
              <View style={styles.statValueRow}>
                <Text style={[styles.statValue, textStyle]}>{stats.latest}</Text>
                <Text style={[styles.statUnit, subTextStyle]}> BPM</Text>
              </View>
            </View>
            <View style={{ marginLeft: spacing.xl }}>
              <Text style={[styles.statLabel, subTextStyle]}>Baseline</Text>
              <View style={styles.statValueRow}>
                <Text style={[styles.statValue, textStyle]}>{stats.resting}</Text>
                <Text style={[styles.statUnit, subTextStyle]}> BPM</Text>
              </View>
            </View>
          </View>

          <View style={styles.chartWrapper}>
            {loading ? (
              <View style={{ height: 160, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : lineData.length > 0 ? (
              <View pointerEvents="none">
              <LineChart
                areaChart
                data={lineData}
                height={160}
                width={width - 70}
                hideDataPoints
                spacing={(width - 70) / 40}
                color1={colors.riskHigh}
                startFillColor1={colors.riskHigh}
                endFillColor1="transparent"
                startOpacity={0.15}
                endOpacity={0.0}
                thickness1={2}
                initialSpacing={0}
                yAxisColor="transparent"
                xAxisColor="transparent"
                yAxisTextStyle={{ color: subTextStyle.color, fontSize: 10 }}
                rulesType="solid"
                rulesColor={rulesColor}
                yAxisLabelTexts={['40', '60', '80', '100', '120']}
                maxValue={130}
                noOfSections={4}
                stepHeight={40}
                animateOnDataChange={false}
                disableScroll={true}
              />
            </View>
            ) : (
              <View style={{ height: 160, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={subTextStyle}>No sensor history available.</Text>
              </View>
            )}
            
            {/* X Axis Labels matching screenshot */}
            <View style={styles.xAxisLabels}>
              <Text style={[styles.xAxisText, subTextStyle]}>10 AM</Text>
              <Text style={[styles.xAxisText, subTextStyle]}>11 AM</Text>
              <Text style={[styles.xAxisText, subTextStyle]}>12 PM</Text>
              <Text style={[styles.xAxisText, subTextStyle]}>1 PM</Text>
              <Text style={[styles.xAxisText, subTextStyle]}>Now</Text>
            </View>
          </View>
        </View>

        {/* Detailed Stats List */}
        <View style={styles.listContainer}>
          <View style={[styles.listItem, neuSm, cardStyle]}>
            <Text style={[styles.listLabel, textStyle]}>Latest Reading</Text>
            <Text style={[styles.listValue, textStyle]}>{stats.latest} <Text style={[styles.listUnit, subTextStyle]}>BPM</Text></Text>
          </View>
          <View style={[styles.listItem, neuSm, cardStyle]}>
            <Text style={[styles.listLabel, textStyle]}>Range</Text>
            <Text style={[styles.listValue, textStyle]}>{stats.min}-{stats.max} <Text style={[styles.listUnit, subTextStyle]}>BPM</Text></Text>
          </View>
          <View style={[styles.listItem, neuSm, cardStyle]}>
            <Text style={[styles.listLabel, textStyle]}>Resting Rate</Text>
            <Text style={[styles.listValue, textStyle]}>{stats.resting} <Text style={[styles.listUnit, subTextStyle]}>BPM</Text></Text>
          </View>
          <View style={[styles.listItem, neuSm, cardStyle]}>
            <Text style={[styles.listLabel, textStyle]}>Average</Text>
            <Text style={[styles.listValue, textStyle]}>{stats.avg} <Text style={[styles.listUnit, subTextStyle]}>BPM</Text></Text>
          </View>
        </View>
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
  headerTitle: { fontSize: 18, ...fonts.bold },
  
  content: { flex: 1, paddingHorizontal: spacing.lg },
  
  chartCard: {
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    ...fonts.bold,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  statLabel: {
    fontSize: 14,
    ...fonts.medium,
    marginBottom: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statValue: {
    fontSize: 28,
    ...fonts.bold,
  },
  statUnit: {
    fontSize: 14,
    ...fonts.medium,
  },
  
  chartWrapper: {
    marginTop: spacing.sm,
    marginLeft: -10,
    marginBottom: spacing.sm,
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 30, // Offset for Y axis labels
    marginTop: spacing.xs,
  },
  xAxisText: {
    color: '#666',
    fontSize: 10,
  },
  
  listContainer: {
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  listLabel: {
    fontSize: 16,
    ...fonts.medium,
  },
  listValue: {
    fontSize: 16,
    ...fonts.bold,
  },
  listUnit: {
    fontSize: 14,
    ...fonts.medium,
  }
});
