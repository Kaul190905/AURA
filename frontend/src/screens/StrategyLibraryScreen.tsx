import React, { useContext, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Star, Trash2, Volume2, Sun, Hand, Users2, Waves, Wind } from 'lucide-react-native';
import { AppContext } from '../../App';
import { Header } from '../components/Header';
import { Accordion, AccItem } from '../components/Accordion';
import { colors, neuSm, radius, spacing, fonts } from '../theme';
import { TRIGGERS } from '../data';
import { TriggerKey, Strategy } from '../types';
import { createStrategy, deleteStrategy as deleteStrategyApi, updateStrategy as updateStrategyApi } from '../api/strategyService';
import { DEV_USER_ID } from '../api/config';

const TRIGGER_ICONS: Record<TriggerKey, React.ElementType> = {
  sound: Volume2, light: Sun, touch: Hand, crowd: Users2, movement: Waves, smell: Wind,
};

export default function StrategyLibraryScreen() {
  const { strategies, setStrategies } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [trigger, setTrigger] = useState<TriggerKey>('sound');

  const grouped = useMemo(() => {
    const m = new Map<TriggerKey, Strategy[]>();
    TRIGGERS.forEach((t) => m.set(t.key, []));
    strategies.forEach((s) => m.get(s.trigger)?.push(s));
    return m;
  }, [strategies]);

  const remove = async (id: string) => {
    await deleteStrategyApi(id, DEV_USER_ID).catch(() => {});
    setStrategies(strategies.filter((s) => s.id !== id));
  };

  const save = async () => {
    if (!title.trim()) return;
    const created = await createStrategy(
      { title: title.trim(), trigger, helped: 0, tried: 0 },
      DEV_USER_ID,
    );
    const newStrategy: Strategy = created
      ? { id: created.id, title: created.title, trigger: created.trigger as TriggerKey, helped: created.helped, tried: created.tried, custom: true }
      : { id: Math.random().toString(36).slice(2), title: title.trim(), trigger, helped: 0, tried: 0, custom: true };
    setStrategies([newStrategy, ...strategies]);
    setTitle(''); setNote(''); setAdding(false);
  };

  const markHelped = async (s: Strategy) => {
    const updated = await updateStrategyApi(s.id, { helped: s.helped + 1, tried: s.tried + 1 }, DEV_USER_ID).catch(() => null);
    setStrategies(strategies.map((st) =>
      st.id === s.id ? { ...st, helped: st.helped + 1, tried: st.tried + 1 } : st
    ));
  };

  const markTried = async (s: Strategy) => {
    await updateStrategyApi(s.id, { tried: s.tried + 1 }, DEV_USER_ID).catch(() => null);
    setStrategies(strategies.map((st) =>
      st.id === s.id ? { ...st, tried: st.tried + 1 } : st
    ));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Coping library" subtitle="Your toolkit"
        right={
          <TouchableOpacity onPress={() => setAdding((v) => !v)} style={styles.addBtn} activeOpacity={0.85}>
            <Plus size={16} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        }
      />

      {adding && (
        <View style={[styles.addCard, { marginHorizontal: spacing.lg, marginBottom: spacing.md }]}>
          <Text style={styles.addCardTitle}>New strategy</Text>
          <TextInput
            value={title} onChangeText={setTitle}
            placeholder="e.g. Squeeze a stress ball"
            placeholderTextColor={colors.mutedForeground}
            style={styles.input}
          />
          <TextInput
            value={note} onChangeText={setNote}
            placeholder="Optional note"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { marginTop: 8 }]}
          />
          <View style={styles.triggerChips}>
            {TRIGGERS.map((t) => (
              <TouchableOpacity key={t.key} onPress={() => setTrigger(t.key)}
                style={[styles.tChip, trigger === t.key && styles.tChipActive]} activeOpacity={0.8}>
                <Text style={[styles.tChipText, trigger === t.key && { color: colors.primary }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.addActions}>
            <TouchableOpacity onPress={save} style={styles.saveBtn} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAdding(false)} style={styles.cancelBtn} activeOpacity={0.85}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <Accordion>
          {TRIGGERS.map((t) => {
            const list = grouped.get(t.key) ?? [];
            const Icon = TRIGGER_ICONS[t.key];
            return (
              <AccItem key={t.key} id={t.key} title={t.label}
                icon={<Icon size={18} color={colors.primary} />}
                badge={<Text style={styles.badge}>{list.length}</Text>}>
                {list.length === 0 ? (
                  <Text style={styles.emptyText}>No strategies yet.</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {list.map((s) => (
                      <View key={s.id} style={styles.strategyCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.strategyTitle}>{s.title}</Text>
                          {s.note && <Text style={styles.strategyNote}>{s.note}</Text>}
                          <View style={styles.helpedRow}>
                            <View style={styles.helpedBadge}>
                              <Star size={10} color={colors.mutedForeground} />
                              <Text style={styles.helpedText}>Helped {s.helped}/{Math.max(s.tried, 1)}</Text>
                            </View>
                            <TouchableOpacity style={styles.markBtn} onPress={() => markHelped(s)} activeOpacity={0.8}>
                              <Text style={styles.markBtnText}>✓ Helped</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.markBtn, { backgroundColor: colors.muted }]} onPress={() => markTried(s)} activeOpacity={0.8}>
                              <Text style={[styles.markBtnText, { color: colors.mutedForeground }]}>Tried</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        {s.custom && (
                          <TouchableOpacity onPress={() => remove(s.id)} style={styles.deleteBtn} activeOpacity={0.8}>
                            <Trash2 size={14} color={colors.mutedForeground} />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </AccItem>
            );
          })}
        </Accordion>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
    elevation: 4, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 4,
  },
  addBtnText: { color: '#fff', fontSize: 13, ...fonts.semibold },
  addCard: {
    backgroundColor: colors.muted, borderRadius: radius.xl, padding: spacing.lg,
  },
  addCardTitle: { fontSize: 14, color: colors.foreground, ...fonts.semibold, marginBottom: 10 },
  input: {
    backgroundColor: colors.background, borderRadius: radius.lg,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: colors.foreground,
    ...neuSm,
  },
  triggerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full,
    backgroundColor: colors.background, ...neuSm,
  },
  tChipActive: { backgroundColor: colors.muted },
  tChipText: { fontSize: 11, color: colors.foreground, ...fonts.medium },
  addActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  saveBtn: {
    flex: 1, height: 44, backgroundColor: colors.primary, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 13, ...fonts.semibold },
  cancelBtn: {
    flex: 1, height: 44, backgroundColor: colors.background, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center', ...neuSm,
  },
  cancelBtnText: { color: colors.foreground, fontSize: 13, ...fonts.medium },
  badge: { fontSize: 12, color: colors.mutedForeground, marginRight: 4 },
  emptyText: { fontSize: 12, color: colors.mutedForeground },
  strategyCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: colors.muted, borderRadius: radius.md, padding: 12,
  },
  strategyTitle: { fontSize: 13, color: colors.foreground, ...fonts.medium },
  strategyNote: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  helpedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6,
    backgroundColor: colors.background, alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, ...neuSm,
  },
  helpedText: { fontSize: 10, color: colors.mutedForeground, ...fonts.semibold },
  helpedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  markBtn: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full,
    backgroundColor: colors.primary + '22',
  },
  markBtnText: { fontSize: 10, color: colors.primary, ...fonts.semibold },
  deleteBtn: {
    width: 32, height: 32, borderRadius: radius.full,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', ...neuSm,
  },
});
