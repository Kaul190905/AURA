import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Modal, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Bell, Clock, Trash2, CheckCircle2, Circle, X } from 'lucide-react-native';
import { Header } from '../components/Header';
import { colors, neuSm, radius, spacing, fonts } from '../theme';

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

interface Routine {
  id: string;
  title: string;
  time: string;
  active: boolean;
  tasks: Task[];
}

export default function PlansScreen({ onBack }: { onBack: () => void }) {
  const styles = getStyles();
  const insets = useSafeAreaInsets();
  const [notifsEnabled, setNotifsEnabled] = useState(true);

  const [routines, setRoutines] = useState<Routine[]>([
    {
      id: '1', title: 'Morning Prep', time: '07:30 AM', active: true,
      tasks: [
        { id: 't1', text: 'Check bag', completed: true },
        { id: 't2', text: 'Noise-cancelling headphones', completed: false },
        { id: 't3', text: 'Review schedule', completed: false },
      ],
    },
    {
      id: '2', title: 'Evening Wind-Down', time: '08:00 PM', active: false,
      tasks: [
        { id: 't4', text: 'Dim lights', completed: false },
        { id: 't5', text: 'Deep breathing', completed: false },
        { id: 't6', text: 'Speech diary', completed: false },
      ],
    },
  ]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newTasks, setNewTasks] = useState<string[]>(['']);

  const toggleRoutineActive = (id: string) => {
    setRoutines(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  const toggleTaskCompleted = (routineId: string, taskId: string) => {
    setRoutines(prev => prev.map(r => {
      if (r.id === routineId) {
        return {
          ...r,
          tasks: r.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t),
        };
      }
      return r;
    }));
  };

  const deleteRoutine = (id: string) => {
    setRoutines(prev => prev.filter(r => r.id !== id));
  };

  const handleAddRoutine = () => {
    if (!newTitle.trim()) {return;}

    const validTasks = newTasks.filter(t => t.trim().length > 0);
    const generatedTasks = validTasks.map((t, index) => ({
      id: Date.now().toString() + index.toString(),
      text: t.trim(),
      completed: false,
    }));

    const newRoutine: Routine = {
      id: Date.now().toString(),
      title: newTitle,
      time: newTime || '12:00 PM',
      active: true,
      tasks: generatedTasks,
    };
    setRoutines([...routines, newRoutine]);
    setNewTitle('');
    setNewTime('');
    setNewTasks(['']);
    setIsAddModalOpen(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="My Plans & Routines" onBack={onBack} right={
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.8} onPress={() => setIsAddModalOpen(true)}>
           <Plus size={20} color={colors.primary} />
        </TouchableOpacity>
      } />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

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

        {routines.map(r => {
          const completedCount = r.tasks.filter(t => t.completed).length;
          const progress = r.tasks.length > 0 ? completedCount / r.tasks.length : 0;

          return (
            <View key={r.id} style={[styles.card, neuSm, !r.active && { opacity: 0.6 }]}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Clock size={16} color={r.active ? colors.primary : colors.mutedForeground} />
                  <Text style={styles.cardTime}>{r.time}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Switch
                     value={r.active}
                     onValueChange={() => toggleRoutineActive(r.id)}
                     trackColor={{ false: colors.border, true: colors.primary }}
                     thumbColor="#fff"
                     style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                  />
                  <TouchableOpacity onPress={() => deleteRoutine(r.id)}>
                    <Trash2 size={16} color={colors.riskHigh} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.cardTitle}>{r.title}</Text>

              {/* Progress Bar */}
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.progressText}>{completedCount} of {r.tasks.length} tasks completed</Text>

              <View style={styles.tasksContainer}>
                {r.tasks.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.taskRow}
                    activeOpacity={0.7}
                    onPress={() => toggleTaskCompleted(r.id, t.id)}
                  >
                    {t.completed ? (
                      <CheckCircle2 size={18} color={colors.primary} />
                    ) : (
                      <Circle size={18} color={colors.mutedForeground} />
                    )}
                    <Text style={[styles.taskText, t.completed && styles.taskTextCompleted]}>{t.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}

      </ScrollView>

      {/* Add Modal */}
      <Modal visible={isAddModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, neuSm]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Routine</Text>
              <TouchableOpacity onPress={() => { setIsAddModalOpen(false); setNewTasks(['']); }}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Routine Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Afternoon Walk"
              placeholderTextColor={colors.mutedForeground}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={styles.inputLabel}>Time</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 03:00 PM"
              placeholderTextColor={colors.mutedForeground}
              value={newTime}
              onChangeText={setNewTime}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={[styles.inputLabel, { marginBottom: 0 }]}>Tasks</Text>
              <TouchableOpacity onPress={() => setNewTasks([...newTasks, ''])}>
                <Plus size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={{ maxHeight: 150 }}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {newTasks.map((t, index) => (
                  <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                      placeholder={`Task ${index + 1}`}
                      placeholderTextColor={colors.mutedForeground}
                      value={t}
                      onChangeText={(val) => {
                        const updatedTasks = [...newTasks];
                        updatedTasks[index] = val;
                        setNewTasks(updatedTasks);
                      }}
                    />
                    {newTasks.length > 1 && (
                      <TouchableOpacity onPress={() => setNewTasks(newTasks.filter((_, i) => i !== index))}>
                        <Trash2 size={16} color={colors.riskHigh} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleAddRoutine}>
              <Text style={styles.saveBtnText}>Save Routine</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  addBtn: { padding: spacing.xs },
  content: { padding: spacing.lg, paddingBottom: 100, gap: spacing.lg },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.background, padding: spacing.md, borderRadius: radius.xl,
  },
  settingText: { fontSize: 14, ...fonts.medium, color: colors.foreground },
  sectionTitle: { fontSize: 18, ...fonts.bold, color: colors.foreground, marginTop: spacing.sm },
  card: { backgroundColor: colors.background, padding: spacing.md, borderRadius: radius.xl },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  cardTime: { fontSize: 12, ...fonts.bold, color: colors.mutedForeground },
  cardTitle: { fontSize: 16, ...fonts.bold, color: colors.foreground, marginBottom: spacing.sm },
  progressBarBg: { height: 4, backgroundColor: colors.muted, borderRadius: 2, marginBottom: 4 },
  progressBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  progressText: { fontSize: 11, color: colors.mutedForeground, marginBottom: spacing.md },
  tasksContainer: { gap: spacing.md },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskText: { fontSize: 14, color: colors.foreground },
  taskTextCompleted: { color: colors.mutedForeground, textDecorationLine: 'line-through' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.xl },
  modalCard: { backgroundColor: colors.background, padding: spacing.xl, borderRadius: radius.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: 18, ...fonts.bold, color: colors.foreground },
  inputLabel: { fontSize: 12, ...fonts.medium, color: colors.mutedForeground, marginBottom: 6 },
  input: {
    backgroundColor: colors.muted, borderRadius: radius.md, padding: spacing.md,
    color: colors.foreground, marginBottom: spacing.md,
  },
  saveBtn: {
    backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.lg,
    alignItems: 'center', marginTop: spacing.sm,
  },
  saveBtnText: { color: colors.background, ...fonts.bold, fontSize: 14 },
});
