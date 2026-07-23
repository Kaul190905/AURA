import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shield } from 'lucide-react-native';
import { colors, neuSm, radius, spacing, fonts } from '../theme';

interface Props {
  onNext: () => void;
}

export default function WelcomeScreen({ onNext }: Props) {
  const insets = useSafeAreaInsets();
  const breathe = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.15, duration: 4000, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0.85, duration: 4000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      {/* Logo */}
      <View style={styles.top}>
        <View style={styles.logoOuter}>
          <Animated.View style={[styles.breatheRing, { transform: [{ scale: breathe }] }]} />
          <Image
            source={require('../assets/images/logo.jpeg')}
            style={styles.logoImage}
            resizeMode="contain"
          />
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

      {/* CTA */}
      <TouchableOpacity onPress={onNext} style={styles.btn} activeOpacity={0.85}>
        <Text style={styles.btnText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
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
  btn: {
    width: '100%',
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    ...fonts.semibold,
  },
});
