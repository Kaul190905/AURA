import React, { useRef, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star, Shield, User, Heart } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { colors, radius, spacing, fonts, neuSm } from '../theme';

interface Props {
  onNext: (role: 'user' | 'caretaker') => void;
}

export default function WelcomeScreen({ onNext }: Props) {
  const styles = getStyles();
  const { reduceMotion } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const breathe = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (reduceMotion) {
      breathe.setValue(1);
      return;
    }
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.15, duration: 4000, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0.85, duration: 4000, useNativeDriver: true }),
      ])
    ).start();
  }, [reduceMotion]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      {/* Logo */}
      <View style={styles.top}>
        <View style={styles.logoOuter}>
          <Animated.View style={[styles.breatheRing, { transform: [{ scale: breathe }] }]} />
          <Star size={44} color={colors.primary} strokeWidth={1.8} />
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.appName}>AURA</Text>
          <Text style={styles.tagline}>
            Your gentle early-warning companion for sensory overload.
          </Text>
        </View>

        <View style={styles.privacyCard}>
          <Shield size={20} color={colors.primary} />
          <Text style={styles.privacyText}>
            Your data stays on your device unless you choose to share it.
          </Text>
        </View>
      </View>

      {/* Role Selection */}
      <View style={styles.roleContainer}>
        <Text style={styles.roleLabel}>Who is using AURA today?</Text>
        
        <TouchableOpacity onPress={() => onNext('user')} style={[styles.roleCard, neuSm]} activeOpacity={0.85}>
          <View style={styles.roleIconUser}>
            <User color={colors.primary} size={28} />
          </View>
          <View style={styles.roleTextContainer}>
            <Text style={styles.roleTitle}>I'm a User</Text>
            <Text style={styles.roleDesc}>Continue to your personal sensory companion.</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => onNext('caretaker')} style={[styles.roleCard, neuSm]} activeOpacity={0.85}>
          <View style={[styles.roleIconCaregiver]}>
            <Heart color={colors.riskLow} size={28} />
          </View>
          <View style={styles.roleTextContainer}>
            <Text style={styles.roleTitle}>I'm a Caregiver</Text>
            <Text style={styles.roleDesc}>Monitor status and provide support.</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl + 4,
  },
  top: {
    alignItems: 'center',
    gap: spacing.xl,
    marginTop: spacing.xl,
  },
  logoOuter: {
    width: 128,
    height: 128,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
  },
  breatheRing: {
    position: 'absolute',
    inset: 12,
    left: 12,
    right: 12,
    top: 12,
    bottom: 12,
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}33`,
  },
  textBlock: {
    alignItems: 'center',
    gap: 10,
  },
  appName: {
    fontSize: 42,
    color: colors.foreground,
    letterSpacing: -1,
    ...fonts.bold,
  },
  tagline: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  roleContainer: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  roleLabel: {
    textAlign: 'center',
    color: colors.mutedForeground,
    fontSize: 13,
    ...fonts.medium,
    marginBottom: spacing.xs,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  roleIconUser: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconCaregiver: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: `${colors.riskLow}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    color: colors.foreground,
    ...fonts.bold,
  },
  roleDesc: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
    lineHeight: 16,
  }
});
