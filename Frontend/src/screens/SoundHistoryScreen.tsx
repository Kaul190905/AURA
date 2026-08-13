import React, { useContext, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Info, AlertTriangle } from 'lucide-react-native';
import { BarChart } from 'react-native-gifted-charts';
import { AppContext } from '../AppContext';
import { colors, radius, spacing, fonts, neuSm } from '../theme';

const { width } = Dimensions.get('window');

export default function SoundHistoryScreen({ navigation }: any) {
  const { darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  const bgStyle = darkMode ? { backgroundColor: '#000000' } : { backgroundColor: '#F8F9FA' };
  const cardStyle = darkMode ? { backgroundColor: '#1c1c1e' } : { backgroundColor: '#ffffff' };
  const textStyle = darkMode ? { color: '#ffffff' } : { color: colors.foreground };
  const subTextStyle = darkMode ? { color: '#aaaaaa' } : { color: colors.mutedForeground };
  const rulesColor = darkMode ? '#333333' : '#eeeeee';
  const barColor = '#3478F6';

  // Generate mock data for the Sound dB graph matching the screenshot style
  const barData = useMemo(() => {
    const data = [];
    let current = 50;
    for (let i = 0; i < 24; i++) {
      // Simulate sporadic audio exposure (some gaps, some clusters)
      let spike = Math.random() > 0.6 ? Math.random() * 40 : (Math.random() * 20 - 10);
      current = Math.max(0, Math.min(110, current + spike));
      
      if (Math.random() > 0.7) {
        // Gap (no reading)
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
    <View style={[styles.container, bgStyle, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, { flexDirection: 'row', alignItems: 'center' }]}>
          <ArrowLeft size={24} color={textStyle.color} />
          <Text style={[styles.headerTitle, textStyle, { marginLeft: 8 }]}>Sound</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={[styles.chartCard, cardStyle, neuSm]}>
          <Text style={[styles.cardTitle, textStyle]}>Sound</Text>

          <View style={styles.exposureHeader}>
            <Text style={[styles.statLabel, subTextStyle]}>EXPOSURE</Text>
            <View style={styles.exposureRow}>
              <View style={styles.exposureLeft}>
                {isLoud && <AlertTriangle size={28} color="#FFCC00" style={{ marginRight: 8 }} />}
                <Text style={[styles.statValue, textStyle]}>{isLoud ? 'Loud' : 'OK'}</Text>
              </View>
            </View>
            <Text style={[styles.dateSub, subTextStyle]}>Today, 00:00 - Now</Text>
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
                yAxisTextStyle={{ color: subTextStyle.color, fontSize: 10 }}
                rulesType="solid"
                rulesColor={rulesColor}
                yAxisLabelTexts={['0', '30', '60', '90', '120']}
              />
            </View>
            
            {/* X Axis Labels */}
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
          <View style={[styles.listItem, cardStyle, neuSm]}>
            <Text style={[styles.listLabel, textStyle]}>Exposure</Text>
            <Text style={[styles.listValue, textStyle]}>{stats.exposure} <Text style={[styles.listUnit, subTextStyle]}>dB (1h 34m)</Text></Text>
          </View>
          <View style={[styles.listItem, cardStyle, neuSm]}>
            <Text style={[styles.listLabel, textStyle]}>Hourly Average</Text>
            <Text style={[styles.listValue, textStyle]}>{stats.min}-{stats.avg} <Text style={[styles.listUnit, subTextStyle]}>dB</Text></Text>
          </View>
          <View style={[styles.listItem, cardStyle, neuSm]}>
            <Text style={[styles.listLabel, textStyle]}>Latest: 16:07</Text>
            <Text style={[styles.listValue, textStyle]}>{stats.latest} <Text style={[styles.listUnit, subTextStyle]}>dB</Text></Text>
          </View>
          <View style={[styles.listItem, cardStyle, neuSm]}>
            <Text style={[styles.listLabel, textStyle]}>Range</Text>
            <Text style={[styles.listValue, textStyle]}>0-{stats.max} <Text style={[styles.listUnit, subTextStyle]}>dB</Text></Text>
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
  iconBtn: {
    padding: spacing.sm, marginLeft: -spacing.sm,
  },
  headerTitle: {
    fontSize: 18, ...fonts.bold,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  chartCard: {
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    ...fonts.bold,
    marginBottom: spacing.sm,
  },
  exposureHeader: {
    marginBottom: spacing.md,
  },
  statLabel: {
    fontSize: 12,
    ...fonts.bold,
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
  },
  dateSub: {
    fontSize: 12,
    ...fonts.medium,
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
    paddingLeft: 30, // Offset for Y axis labels
    marginTop: spacing.xs,
  },
  xAxisText: {
    fontSize: 10,
  },
  
  listContainer: {
    flex: 1,
    justifyContent: 'space-evenly',
    paddingHorizontal: spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
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
