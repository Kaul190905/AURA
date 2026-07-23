import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lock } from 'lucide-react-native';
import { Header } from '../components/Header';
import { colors, neuSm, radius, spacing, fonts } from '../theme';

interface Props { onUnlock: () => void; }

export default function CaretakerGateScreen({ onUnlock }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const insets = useSafeAreaInsets();

  const submit = () => {
    if (code.length === 4) onUnlock();
    else setError(true);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Caretaker view" subtitle="Private" />
      <View style={styles.card}>
        <View style={[styles.lockIcon, neuSm]}>
          <Lock size={22} color={colors.primary} />
        </View>
        <Text style={styles.cardTitle}>Enter your 4-digit code</Text>
        <Text style={styles.cardSub}>Only shared caretakers can see this view.</Text>
        <TextInput
          value={code}
          onChangeText={(t) => { setCode(t.replace(/\D/g, '').slice(0, 4)); setError(false); }}
          keyboardType="numeric"
          placeholder="••••"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry
          style={styles.codeInput}
          maxLength={4}
        />
        {error && <Text style={styles.errorText}>Please enter 4 digits.</Text>}
        <TouchableOpacity onPress={submit} style={styles.unlockBtn} activeOpacity={0.85}>
          <Text style={styles.unlockBtnText}>Unlock</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: {
    margin: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: radius.xl + 4,
    padding: spacing.xl,
    ...neuSm,
  },
  lockIcon: {
    width: 52, height: 52, borderRadius: radius.lg,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 17, color: colors.foreground, marginTop: spacing.lg, ...fonts.semibold },
  cardSub: { fontSize: 13, color: colors.mutedForeground, marginTop: 4, lineHeight: 18 },
  codeInput: {
    marginTop: spacing.xl,
    backgroundColor: colors.muted,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    fontSize: 24,
    letterSpacing: 16,
    textAlign: 'center',
    color: colors.foreground,
    ...neuSm,
  },
  errorText: { fontSize: 13, color: colors.riskHigh, marginTop: 6 },
  unlockBtn: {
    marginTop: spacing.lg, height: 56, backgroundColor: colors.primary,
    borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6,
  },
  unlockBtnText: { color: '#fff', fontSize: 16, ...fonts.semibold },
});
