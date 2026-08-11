import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { colors, fonts, spacing, radius } from '../theme';
import { riskColor } from '../utils';

export default function PastEventsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { history } = useContext(AppContext);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <ChevronLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Past Events</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No events recorded yet.</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {history.map((h) => {
              const c = riskColor(h.score);
              return (
                <View key={h.id} style={styles.eventCard}>
                  <View style={[styles.eventIndicator, { backgroundColor: c }]} />
                  <View style={styles.eventContent}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventTitle}>
                        {h.trigger} · <Text style={styles.eventAction}>{h.action}</Text>
                      </Text>
                      <Text style={[styles.eventScore, { color: c }]}>{h.score}</Text>
                    </View>
                    <Text style={styles.eventDate}>{new Date(h.time).toLocaleString()}</Text>
                    {h.note && <Text style={styles.eventNote}>"{h.note}"</Text>}
                  </View>
                </View>
              );
            })}
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
  emptyCard: { backgroundColor: colors.muted, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.mutedForeground },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border + '80',
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eventIndicator: { width: 6 },
  eventContent: { flex: 1, padding: 16 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eventTitle: { fontSize: 15, color: colors.foreground, textTransform: 'capitalize', ...fonts.semibold },
  eventAction: { color: colors.mutedForeground },
  eventDate: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
  eventNote: { fontSize: 13, color: colors.foreground, opacity: 0.8, marginTop: 8, fontStyle: 'italic' },
  eventScore: { fontSize: 18, ...fonts.bold },
});
