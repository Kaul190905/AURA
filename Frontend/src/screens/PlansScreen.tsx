import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Bell, Calendar, Clock, EllipsisVertical } from 'lucide-react-native';
import { Header } from '../components/Header';
import { colors, neuSm, radius, spacing, fonts } from '../theme';

export default function PlansScreen({ onBack }: { onBack: () => void }) {
  const styles = getStyles();
  const insets = useSafeAreaInsets();
  const [notifsEnabled, setNotifsEnabled] = useState(true);

  const routines = [
    { id: '1', title: 'Morning Prep', time: '07:30 AM', active: true, tasks: ['Check bag', 'Noise-cancelling headphones', 'Review schedule'] },
    { id: '2', title: 'Evening Wind-Down', time: '08:00 PM', active: false, tasks: ['Dim lights', 'Deep breathing', 'Speech diary'] }
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="My Plans & Routines" onBack={onBack} right={
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.8}>
           <Plus size={20} color={colors.primary} />
        </TouchableOpacity>
      } />

      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={[styles.settingRow, neuSm]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Bell size={18} color={colors.primary} />
            <Text style={styles.settingText}>Routine Reminders</Text>
          </View>
          <Switch 
             value={notifsEnabled} 
             onValueChange={setNotifsEnabled}
             trackColor={{ false: colors.border, true: colors.primary }}
             thumbColor="#fff"
          />
        </View>

        <Text style={styles.sectionTitle}>Upcoming Routines</Text>

        {routines.map(r => (
          <View key={r.id} style={[styles.card, neuSm, !r.active && { opacity: 0.6 }]}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Clock size={16} color={r.active ? colors.primary : colors.mutedForeground} />
                <Text style={styles.cardTime}>{r.time}</Text>
              </View>
              <TouchableOpacity><EllipsisVertical size={16} color={colors.mutedForeground} /></TouchableOpacity>
            </View>
            <Text style={styles.cardTitle}>{r.title}</Text>
            
            <View style={styles.tasksContainer}>
              {r.tasks.map((t, i) => (
                <View key={i} style={styles.taskRow}>
                  <View style={styles.taskDot} />
                  <Text style={styles.taskText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

      </ScrollView>
    </View>
  );
}

const getStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  addBtn: { padding: spacing.xs },
  content: { padding: spacing.lg, gap: spacing.lg },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.background, padding: spacing.md, borderRadius: radius.xl,
  },
  settingText: { fontSize: 14, ...fonts.medium, color: colors.foreground },
  sectionTitle: { fontSize: 18, ...fonts.bold, color: colors.foreground, marginTop: spacing.sm },
  card: { backgroundColor: colors.background, padding: spacing.md, borderRadius: radius.xl },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  cardTime: { fontSize: 12, ...fonts.bold, color: colors.mutedForeground },
  cardTitle: { fontSize: 16, ...fonts.bold, color: colors.foreground, marginBottom: spacing.md },
  tasksContainer: { gap: spacing.sm },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  taskDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  taskText: { fontSize: 13, color: colors.foreground },
});
