import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, Search, ListFilter, Play, Trash2, Pen, BrainCircuit } from 'lucide-react-native';
import { Header } from '../components/Header';
import { colors, neuSm, radius, spacing, fonts } from '../theme';

export default function SpeechDiaryScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();

  const entries = [
    { id: '1', time: 'Today, 2:30 PM', emotion: 'Anxious', text: 'The cafeteria was too loud today...', duration: '0:45' },
    { id: '2', time: 'Yesterday, 9:15 AM', emotion: 'Calm', text: 'Morning bus ride was peaceful.', duration: '1:12' }
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Speech Diary" onBack={onBack} />
      
      <View style={styles.searchBar}>
        <Search size={16} color={colors.mutedForeground} />
        <TextInput 
           style={styles.searchInput}
           placeholder="Search entries..."
           placeholderTextColor={colors.mutedForeground}
        />
        <TouchableOpacity style={styles.filterBtn}>
           <ListFilter size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* AI Summary */}
        <View style={[styles.card, neuSm, { backgroundColor: `${colors.primary}10` }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <BrainCircuit size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.primary }]}>Weekly AI Summary</Text>
          </View>
          <Text style={styles.cardText}>
            You've recorded 4 entries this week. Themes of "noise" are prevalent. Overall emotion trend is shifting from Anxious towards Calm.
          </Text>
        </View>

        {/* Entries */}
        {entries.map(e => (
          <View key={e.id} style={[styles.card, neuSm]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTime}>{e.time}</Text>
                <Text style={styles.cardEmotion}>{e.emotion}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.iconBtn}><Play size={16} color={colors.primary} /></TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn}><Pen size={16} color={colors.mutedForeground} /></TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn}><Trash2 size={16} color={colors.riskHigh} /></TouchableOpacity>
              </View>
            </View>
            <Text style={styles.cardText}>{e.text}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Floating Record Button */}
      <TouchableOpacity style={[styles.recordFab, neuSm]} activeOpacity={0.85}>
        <Mic size={24} color={colors.background} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.muted, borderRadius: radius.lg,
    marginHorizontal: spacing.lg, paddingHorizontal: spacing.md,
    height: 44, marginBottom: spacing.md,
  },
  searchInput: { flex: 1, marginLeft: spacing.sm, color: colors.foreground },
  filterBtn: { padding: spacing.xs },
  content: { padding: spacing.lg, paddingBottom: 100, gap: spacing.lg },
  card: { backgroundColor: colors.background, padding: spacing.md, borderRadius: radius.xl },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  cardTitle: { fontSize: 14, ...fonts.bold },
  cardTime: { fontSize: 12, color: colors.mutedForeground, ...fonts.bold },
  cardEmotion: { fontSize: 12, color: colors.primary, marginTop: 2 },
  cardText: { fontSize: 14, color: colors.foreground, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: { padding: 4 },
  recordFab: {
    position: 'absolute', bottom: 40, right: spacing.lg,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});
