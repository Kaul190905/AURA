import React, { useMemo, useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, MapPin } from 'lucide-react-native';
import { colors, fonts, spacing, radius } from '../theme';
import { AppContext } from '../AppContext';
import { getUserHighRiskLocations } from '../services/api';



export default function LocationsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { userId } = useContext(AppContext);
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    if (userId) {
      getUserHighRiskLocations(userId)
        .then(data => {
          if (Array.isArray(data)) {
            setLocations(data);
          }
        })
        .catch(err => console.warn('Failed to fetch locations', err));
    }
  }, [userId]);

  const sortedLocations = useMemo(() => {
    return [...locations].sort((a, b) => b.riskScore - a.riskScore);
  }, [locations]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <ChevronLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>High-Risk Locations</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.disclaimerText}>
          Based on your historical crisis events and sensor data, these locations frequently trigger sensory overload.
        </Text>
        
        {sortedLocations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No high-risk locations identified yet.</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {sortedLocations.map((loc) => (
              <View key={loc.id} style={styles.locationCard}>
                <View style={styles.iconContainer}>
                  <MapPin size={24} color={colors.riskHigh} />
                </View>
                <View style={styles.locationContent}>
                  <Text style={styles.locationTitle}>{loc.name}</Text>
                  <Text style={styles.locationReason}>{loc.reason}</Text>
                  <Text style={styles.locationStats}>Visits: {loc.visits}</Text>
                </View>
                <View style={styles.riskBadge}>
                  <Text style={styles.riskBadgeText}>Risk: {loc.riskScore}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.muted,
  },
  headerTitle: { fontSize: 18, color: colors.foreground, ...fonts.bold },
  scrollContent: { padding: spacing.lg, paddingBottom: 80 },
  disclaimerText: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  emptyCard: { backgroundColor: colors.muted, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.mutedForeground },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border + '80',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.riskHigh + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  locationContent: { flex: 1 },
  locationTitle: { fontSize: 16, color: colors.foreground, ...fonts.semibold, marginBottom: 4 },
  locationReason: { fontSize: 13, color: colors.mutedForeground, marginBottom: 4 },
  locationStats: { fontSize: 12, color: colors.primary, ...fonts.medium },
  riskBadge: {
    backgroundColor: colors.riskHigh + '20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    marginLeft: 12,
  },
  riskBadgeText: { fontSize: 12, color: colors.riskHigh, ...fonts.bold },
});
