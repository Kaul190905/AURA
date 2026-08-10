import React, { useContext, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Star, Trash2, Ear, Sun, User, Pen } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { Header } from '../components/Header';
import { colors, neuSm, radius, spacing, fonts } from '../theme';
import { TRIGGERS } from '../data';
import { TriggerKey, Strategy } from '../types';

const TRIGGER_ICONS: Record<TriggerKey, React.ElementType> = {
  sound: Ear, temp: Sun,
};

export default function StrategyLibraryScreen() {
  const styles = getStyles();
  const { strategies, setStrategies, caregiver, setCaregiver } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [trigger, setTrigger] = useState<TriggerKey>('sound');
  const [editingCaregiver, setEditingCaregiver] = useState(false);
  const [tempCaregiver, setTempCaregiver] = useState(caregiver);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [ratingStrategy, setRatingStrategy] = useState<Strategy | null>(null);
  const [ratingValue, setRatingValue] = useState('');

  const grouped = useMemo(() => {
    const m = new Map<TriggerKey, Strategy[]>();
    TRIGGERS.forEach((t) => m.set(t.key, []));
    strategies.forEach((s) => m.get(s.trigger)?.push(s));
    return m;
  }, [strategies]);

  const remove = (id: string) => setStrategies(strategies.filter((s) => s.id !== id));

  const save = () => {
    if (!title.trim()) {return;}
    setStrategies([{
      id: Math.random().toString(36).slice(2),
      title: title.trim(), note: note.trim() || undefined,
      trigger, helped: 0, tried: 0, custom: true,
    }, ...strategies]);
    setTitle(''); setNote(''); setAdding(false);
  };

  const handleEditSave = () => {
    if (!editingStrategy || !editingStrategy.title.trim()) {return;}
    setStrategies(strategies.map(s => s.id === editingStrategy.id ? editingStrategy : s));
    setEditingStrategy(null);
  };

  const handleRatingSave = () => {
    if (!ratingStrategy) {return;}
    const val = parseInt(ratingValue, 10);
    if (isNaN(val) || val < 1 || val > 10) {return;} // Require 1-10

    setStrategies(strategies.map(s => {
      if (s.id === ratingStrategy.id) {
        return { ...s, helped: val };
      }
      return s;
    }));
    setRatingStrategy(null);
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
        <View style={[styles.caregiverCard, { marginHorizontal: spacing.lg, marginBottom: spacing.md }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <User size={20} color={colors.primary} />
              <Text style={styles.caregiverTitle}>Caregiver Information</Text>
            </View>
            {!editingCaregiver && (
              <TouchableOpacity onPress={() => { setTempCaregiver(caregiver); setEditingCaregiver(true); }}>
                <Text style={{ color: colors.primary, ...fonts.medium }}>
                  {caregiver?.name ? 'Edit' : 'Add'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {editingCaregiver ? (
            <View style={{ gap: 12 }}>
              <TextInput
                style={styles.input}
                placeholder="Caregiver Name"
                placeholderTextColor={colors.mutedForeground}
                value={tempCaregiver?.name}
                onChangeText={(t) => setTempCaregiver({ ...tempCaregiver, name: t })}
              />
              <TextInput
                style={styles.input}
                placeholder="Relationship (e.g., Parent, Spouse)"
                placeholderTextColor={colors.mutedForeground}
                value={tempCaregiver?.relationship}
                onChangeText={(t) => setTempCaregiver({ ...tempCaregiver, relationship: t })}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor={colors.mutedForeground}
                value={tempCaregiver?.phone}
                onChangeText={(t) => setTempCaregiver({ ...tempCaregiver, phone: t })}
                keyboardType="phone-pad"
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <TouchableOpacity
                  onPress={() => { setCaregiver(tempCaregiver); setEditingCaregiver(false); }}
                  style={styles.saveBtn}
                >
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setEditingCaregiver(false)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : caregiver?.name ? (
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 15, color: colors.foreground, ...fonts.bold }}>{caregiver.name}</Text>
              <Text style={{ fontSize: 13, color: colors.mutedForeground }}>{caregiver.relationship}</Text>
              <Text style={{ fontSize: 13, color: colors.primary, marginTop: 4 }}>{caregiver.phone}</Text>
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>No caregiver added yet.</Text>
          )}
        </View>

          {TRIGGERS.map((t) => {
            const list = grouped.get(t.key) ?? [];
            const Icon = TRIGGER_ICONS[t.key];
            return (
              <View key={t.key} style={[styles.caregiverCard, { marginHorizontal: spacing.lg, marginBottom: spacing.md }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icon size={18} color={colors.primary} />
                    <Text style={styles.caregiverTitle}>{t.label}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={styles.badge}>{list.length}</Text>
                  </View>
                </View>
                {list.length === 0 ? (
                  <Text style={styles.emptyText}>No strategies yet.</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {list.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        style={styles.strategyCard}
                        activeOpacity={0.8}
                        onPress={() => setSelectedStrategyId(selectedStrategyId === s.id ? null : s.id)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.strategyTitle}>{s.title}</Text>
                          {s.note && <Text style={styles.strategyNote}>{s.note}</Text>}
                          <TouchableOpacity
                            style={styles.helpedBadge}
                            onPress={() => { setRatingStrategy(s); setRatingValue(''); }}
                            activeOpacity={0.8}
                          >
                            <Star size={10} color={colors.mutedForeground} />
                            <Text style={styles.helpedText}>Helped {s.helped}/10</Text>
                          </TouchableOpacity>
                        </View>
                        {selectedStrategyId === s.id && (
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity onPress={() => setEditingStrategy(s)} style={styles.deleteBtn} activeOpacity={0.8}>
                              <Pen size={14} color={colors.mutedForeground} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => remove(s.id)} style={styles.deleteBtn} activeOpacity={0.8}>
                              <Trash2 size={14} color={colors.riskHigh} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
      </ScrollView>

      {/* Edit Strategy Overlay (Reusing Add UI Style) */}
      {editingStrategy && (
        <View style={styles.editOverlay}>
          <View style={[styles.addCard, { marginHorizontal: spacing.lg, marginBottom: spacing.md }]}>
            <Text style={styles.addCardTitle}>Edit Strategy</Text>
            <TextInput
              value={editingStrategy.title} onChangeText={(t) => setEditingStrategy({ ...editingStrategy, title: t })}
              placeholder="e.g. Squeeze a stress ball"
              placeholderTextColor={colors.mutedForeground}
              style={styles.input}
            />
            <TextInput
              value={editingStrategy.note || ''} onChangeText={(t) => setEditingStrategy({ ...editingStrategy, note: t })}
              placeholder="Optional note"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { marginTop: 8 }]}
            />
            <View style={styles.triggerChips}>
              {TRIGGERS.map((t) => (
                <TouchableOpacity key={t.key} onPress={() => setEditingStrategy({ ...editingStrategy, trigger: t.key })}
                  style={[styles.tChip, editingStrategy.trigger === t.key && styles.tChipActive]} activeOpacity={0.8}>
                  <Text style={[styles.tChipText, editingStrategy.trigger === t.key && { color: colors.primary }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.addActions}>
              <TouchableOpacity onPress={handleEditSave} style={styles.saveBtn} activeOpacity={0.85}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingStrategy(null)} style={styles.cancelBtn} activeOpacity={0.85}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Rating Overlay */}
      {ratingStrategy && (
        <View style={styles.editOverlay}>
          <View style={[styles.addCard, { marginHorizontal: spacing.lg, marginBottom: spacing.md }]}>
            <Text style={styles.addCardTitle}>How much did this help?</Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 12 }}>Rate from 1 to 10</Text>
            <TextInput
              value={ratingValue}
              onChangeText={(t) => {
                const num = parseInt(t, 10);
                if (t === '' || (!isNaN(num) && num >= 1 && num <= 10)) {
                  setRatingValue(t);
                }
              }}
              placeholder="e.g. 8"
              keyboardType="number-pad"
              placeholderTextColor={colors.mutedForeground}
              style={styles.input}
            />
            <View style={styles.addActions}>
              <TouchableOpacity onPress={handleRatingSave} style={styles.saveBtn} activeOpacity={0.85}>
                <Text style={styles.saveBtnText}>Save Rating</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setRatingStrategy(null)} style={styles.cancelBtn} activeOpacity={0.85}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

    </View>
  );
}

const getStyles = () => StyleSheet.create({
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
  caregiverCard: {
    backgroundColor: colors.background, borderRadius: radius.xl, padding: spacing.lg,
    ...neuSm,
  },
  caregiverTitle: { fontSize: 14, color: colors.foreground, ...fonts.semibold },
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
  deleteBtn: {
    width: 32, height: 32, borderRadius: radius.full,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', ...neuSm,
  },
  editOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', zIndex: 100,
  },
});
