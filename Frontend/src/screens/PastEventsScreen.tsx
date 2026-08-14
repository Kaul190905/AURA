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

      {history.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No events recorded yet.</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableWrapper}>
          <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={styles.tableContent}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, { width: 140 }]}>Date / Time</Text>
              <Text style={[styles.headerCell, { width: 100 }]}>Trigger</Text>
              <Text style={[styles.headerCell, { width: 90 }]}>Action</Text>
              <Text style={[styles.headerCell, { width: 70 }]}>Score</Text>
              <Text style={[styles.headerCell, { width: 220 }]}>Notes</Text>
            </View>

            {/* Table Rows */}
            {history.map((h, index) => {
              const c = riskColor(h.score);
              return (
                <View key={h.id} style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                  <Text style={[styles.cell, { width: 140 }]}>
                    {new Date(h.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </Text>
                  <Text style={[styles.cell, { width: 100, textTransform: 'capitalize' }]}>{h.trigger}</Text>
                  <Text style={[styles.cell, { width: 90 }]}>{h.action}</Text>
                  <Text style={[styles.cell, { width: 70, color: c, ...fonts.bold }]}>{h.score}</Text>
                  <Text style={[styles.cell, { width: 220, fontStyle: 'italic', opacity: 0.8 }]} numberOfLines={2}>
                    {h.note || '-'}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </ScrollView>
      )}
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
  emptyCard: { backgroundColor: colors.muted, borderRadius: radius.md, margin: 16, padding: 16, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.mutedForeground },
  tableWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tableContent: {
    paddingBottom: 80,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCell: {
    fontSize: 13,
    color: colors.foreground,
    ...fonts.bold,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
    alignItems: 'center',
  },
  rowEven: {
    backgroundColor: colors.background,
  },
  rowOdd: {
    backgroundColor: colors.muted + '40',
  },
  cell: {
    fontSize: 13,
    color: colors.foreground,
    paddingRight: 8,
  },
});
