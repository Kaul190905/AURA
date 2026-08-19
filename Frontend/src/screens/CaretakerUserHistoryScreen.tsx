import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Filter } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { colors, radius, spacing, fonts, neuSm } from '../theme';
import { getCaregiverUserAlerts } from '../services/caregiverApi';

const formatTime = (ts: number) => {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function CaretakerUserHistoryScreen({ navigation, route }: any) {
  const { darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  
  const userId = route?.params?.userId;
  const userName = route?.params?.userName || 'User';

  const [filter, setFilter] = useState('7 Days');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      getCaregiverUserAlerts(userId)
        .then(data => {
          // Sort descending
          const sorted = data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setHistory(sorted);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch history:', err);
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

  if (!userId) {
    return (
      <View style={[styles.container, bgStyle, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={textStyle}>User not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary, ...fonts.bold }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sensoryEvents = history.length;
  const highRiskEvents = history.filter(e => e.severity === 'HIGH' || e.severity === 'CRITICAL').length;
  const successfulInterventions = history.filter(e => e.is_resolved).length;

  return (
    <View style={[styles.container, bgStyle, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft size={24} color={textStyle.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, textStyle]}>{userName}'s History</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* History & Insights Overview */}
        <Text style={[styles.sectionHeader, textStyle]}>HISTORY & INSIGHTS</Text>
        <View style={[styles.overviewCard, cardStyle, neuSm]}>
          <View style={styles.filterRow}>
            <Text style={[styles.overviewTitle, textStyle]}>Overview</Text>
            <TouchableOpacity style={styles.filterBtn}>
              <Text style={[styles.filterBtnText, textStyle]}>{filter}</Text>
              <Filter size={14} color={textStyle.color} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, textStyle]}>{sensoryEvents}</Text>
              <Text style={[styles.statLabel, subTextStyle]}>Sensory Events</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.riskHigh }]}>{highRiskEvents}</Text>
              <Text style={[styles.statLabel, subTextStyle]}>High Risk Events</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{successfulInterventions}</Text>
              <Text style={[styles.statLabel, subTextStyle]}>Successful Interventions</Text>
            </View>
          </View>
        </View>

        {/* Timeline */}
        <Text style={[styles.sectionHeader, textStyle]}>TIMELINE</Text>
        
        {loading ? (
          <View style={[styles.emptyState, cardStyle, neuSm]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : history.length === 0 ? (
          <View style={[styles.emptyState, cardStyle, neuSm]}>
            <Text style={[styles.emptyStateTitle, textStyle]}>No sensory history yet</Text>
            <Text style={[styles.emptyStateSub, subTextStyle]}>
              AURA will show sensory events here as they are recorded.
            </Text>
          </View>
        ) : (
          history.map((event, index) => {
            const isHighRisk = event.severity === 'HIGH' || event.severity === 'CRITICAL';
            const riskColor = isHighRisk ? colors.riskHigh : (event.severity === 'MEDIUM' ? colors.riskMed : colors.riskLow);
            const riskLabel = event.severity || 'Normal';

            return (
              <View key={event.id || index} style={[styles.timelineEvent, cardStyle, neuSm]}>
                <View style={styles.eventHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.timelineDot, { backgroundColor: riskColor }]} />
                    <Text style={[styles.eventTime, textStyle]}>{formatTime(new Date(event.created_at).getTime())}</Text>
                  </View>
                  <Text style={[styles.eventRiskLabel, { color: riskColor }]}>{riskLabel}</Text>
                </View>

                <View style={styles.eventDataRow}>
                  <View style={styles.eventDataBox}>
                    <Text style={[styles.dataLabel, subTextStyle]}>Alert Message</Text>
                    <Text style={[styles.dataValue, textStyle, { fontSize: 14, fontWeight: 'normal' }]}>{event.message}</Text>
                  </View>
                </View>

                <View style={styles.eventActionRow}>
                  <Text style={[styles.actionLabel, subTextStyle]}>Status:</Text>
                  <Text style={[styles.actionValue, textStyle]}>
                    {event.is_resolved ? 'Resolved' : 'Active'}
                  </Text>
                </View>
              </View>
            );
          })
        )}

      </ScrollView>
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
  
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: 100 },
  
  sectionHeader: {
    fontSize: 14, ...fonts.bold, letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.md, marginLeft: 8,
  },

  overviewCard: {
    padding: 24, borderRadius: radius.xl, marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24,
  },
  overviewTitle: {
    fontSize: 18, ...fonts.bold,
  },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  filterBtnText: {
    fontSize: 13, ...fonts.medium,
  },
  statsGrid: {
    flexDirection: 'row', justifyContent: 'space-between', gap: 12,
  },
  statItem: {
    flex: 1, alignItems: 'center',
  },
  statValue: {
    fontSize: 24, ...fonts.bold, marginBottom: 4,
  },
  statLabel: {
    fontSize: 11, ...fonts.medium, textAlign: 'center',
  },

  emptyState: {
    padding: 32, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 18, ...fonts.bold, marginBottom: 8,
  },
  emptyStateSub: {
    fontSize: 14, ...fonts.medium, textAlign: 'center', lineHeight: 22,
  },

  timelineEvent: {
    padding: 20, borderRadius: radius.xl, marginBottom: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  timelineDot: {
    width: 10, height: 10, borderRadius: 5,
  },
  eventTime: {
    fontSize: 16, ...fonts.bold,
  },
  eventRiskLabel: {
    fontSize: 14, ...fonts.bold,
  },
  eventDataRow: {
    flexDirection: 'row', gap: 24, marginBottom: 16,
  },
  eventDataBox: {
    flex: 1,
  },
  dataLabel: {
    fontSize: 12, ...fonts.medium, marginBottom: 2,
  },
  dataValue: {
    fontSize: 16, ...fonts.bold,
  },
  eventActionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.2)', paddingTop: 12,
  },
  actionLabel: {
    fontSize: 13, ...fonts.medium,
  },
  actionValue: {
    fontSize: 14, ...fonts.bold,
  },
});
