import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, AlertTriangle } from 'lucide-react-native';
import { BarChart } from 'react-native-gifted-charts';
import { colors, radius, spacing, fonts, neuSm } from '../theme';

const { width } = Dimensions.get('window');

export default function SoundHistoryScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const barColor = '#3478F6';

  const barData = useMemo(() => {
    const data = [];
    let current = 50;
    for (let i = 0; i < 24; i++) {
      let spike = Math.random() > 0.6 ? Math.random() * 40 : (Math.random() * 20 - 10);
      current = Math.max(0, Math.min(110, current + spike));
      
      if (Math.random() > 0.7) {
        data.push({ value: 0 });
      } else {
        data.push({ 
          value: current,
          frontColor: barColor
        });
      }
    }
    return data;
  }, []);

  const stats = useMemo(() => {
    const validVals = barData.map(d => d.value).filter(v => v > 0);
    if (validVals.length === 0) return { latest: 0, min: 0, max: 0, avg: 0, exposure: 0 };
    
    const latest = Math.round(validVals[validVals.length - 1]);
    const min = Math.round(Math.min(...validVals));
    const max = Math.round(Math.max(...validVals));
    const avg = Math.round(validVals.reduce((a, b) => a + b, 0) / validVals.length);
    const exposure = Math.round(avg + (max - avg) * 0.4); 
    return { latest, min, max, avg, exposure };
  }, [barData]);

  const isLoud = stats.exposure > 80;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, { flexDirection: 'row', alignItems: 'center' }]}>
          <ArrowLeft size={24} color={colors.foreground} />
          <Text style={[styles.headerTitle, { marginLeft: 8 }]}>Sound</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Chart Card */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text style={styles.label}>Sound Exposure</Text>
          </View>

          <View style={styles.exposureHeader}>
            <Text style={styles.statLabel}>EXPOSURE</Text>
            <View style={styles.exposureRow}>
              <View style={styles.exposureLeft}>
                {isLoud && <AlertTriangle size={28} color="#FFCC00" style={{ marginRight: 8 }} />}
                <Text style={styles.statValue}>{isLoud ? 'Loud' : 'OK'}</Text>
              </View>
            </View>
            <Text style={styles.dateSub}>Today, 00:00 - Now</Text>
          </View>

          <View style={styles.chartWrapper}>
            <View pointerEvents="none">
              <BarChart
                data={barData}
                height={160}
                width={width - 80}
                barWidth={(width - 80) / 48}
                spacing={(width - 80) / 48}
                initialSpacing={0}
                noOfSections={4}
                maxValue={120}
                yAxisThickness={0}
                xAxisThickness={0}
                yAxisTextStyle={{ color: colors.mutedForeground, fontSize: 10 }}
                rulesType="solid"
                rulesColor={colors.border}
                yAxisLabelTexts={['0', '30', '60', '90', '120']}
              />
            </View>
            
            {/* X Axis Labels */}
            <View style={styles.xAxisLabels}>
              <Text style={styles.xAxisText}>10 AM</Text>
              <Text style={styles.xAxisText}>11 AM</Text>
              <Text style={styles.xAxisText}>12 PM</Text>
              <Text style={styles.xAxisText}>1 PM</Text>
              <Text style={styles.xAxisText}>Now</Text>
            </View>
          </View>
        </View>

        {/* Detailed Stats Card */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Text style={styles.label}>Statistics</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Exposure</Text>
            <Text style={styles.infoValue}>{stats.exposure} <Text style={styles.infoUnit}>dB (1h 34m)</Text></Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Hourly Average</Text>
            <Text style={styles.infoValue}>{stats.min}–{stats.avg} <Text style={styles.infoUnit}>dB</Text></Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Latest: 16:07</Text>
            <Text style={styles.infoValue}>{stats.latest} <Text style={styles.infoUnit}>dB</Text></Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoKey}>Range</Text>
            <Text style={styles.infoValue}>0–{stats.max} <Text style={styles.infoUnit}>dB</Text></Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md 
  },
  iconBtn: {
    padding: spacing.sm, marginLeft: -spacing.sm,
  },
  headerTitle: {
    fontSize: 18, ...fonts.bold, color: colors.foreground,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
    gap: spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: colors.muted,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...neuSm,
  },
  label: {
    fontSize: 12, color: colors.primary, ...fonts.bold,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  exposureHeader: {
    marginBottom: spacing.md,
  },
  statLabel: {
    fontSize: 12,
    ...fonts.bold,
    color: colors.mutedForeground,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  exposureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exposureLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    ...fonts.bold,
    color: colors.foreground,
  },
  dateSub: {
    fontSize: 12,
    ...fonts.medium,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  chartWrapper: {
    marginTop: spacing.sm,
    marginLeft: -10,
    marginBottom: spacing.sm,
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 30,
    marginTop: spacing.xs,
  },
  xAxisText: {
    fontSize: 10,
    color: colors.mutedForeground,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  infoKey: {
    fontSize: 14,
    color: colors.mutedForeground,
    ...fonts.medium,
  },
  infoValue: {
    fontSize: 14,
    color: colors.foreground,
    ...fonts.semibold,
  },
  infoUnit: {
    fontSize: 12,
    color: colors.mutedForeground,
    ...fonts.medium,
  },
});
