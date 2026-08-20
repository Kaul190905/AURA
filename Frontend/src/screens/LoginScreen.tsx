import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Animated,
  ScrollView, Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star, Mail, Lock, Eye, EyeOff, ChevronRight, Globe, User, Heart } from 'lucide-react-native';
import Logo from '../../assets/AURA.png';
import { signIn, signUp, signInWithGoogle } from '../services/supabaseClient';
import { colors, fonts, radius, spacing } from '../theme';

interface Props {
  onSuccess: () => void;
}

type Mode = 'signin' | 'signup';

export default function LoginScreen({ onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('signin');
  const [role, setRole] = useState<'user' | 'caretaker'>('user');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Breathing animation for the logo
  const breathe = useRef(new Animated.Value(0.9)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.12, duration: 3800, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0.9, duration: 3800, useNativeDriver: true }),
      ])
    ).start();
  }, [breathe]);

  // Fade-in on mount
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (mode === 'signup') {
        if (!username.trim()) {
          setError('Please enter a username.');
          setLoading(false);
          return;
        }
        await signUp(email.trim(), password, username.trim(), role);
        setSuccessMsg('Account created! Check your email to confirm, then sign in.');
        setMode('signin');
      } else {
        await signIn(email.trim(), password);
        onSuccess();
      }
    } catch (err: any) {
      let msg = err?.message ?? 'Authentication failed. Please try again.';
      if (typeof msg === 'string' && msg.startsWith('{')) {
        try {
          const parsed = JSON.parse(msg);
          msg = parsed.msg || parsed.message || parsed.error_description || (parsed.status === 500 ? 'Server error: Email sending may have failed. Please check your Supabase SMTP settings.' : 'Authentication failed.');
        } catch (e) {
          if (msg.includes('"status":500')) {
            msg = 'Server error (500). Please check your Supabase SMTP or project settings.';
          }
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // For web/redirect-based OAuth, the app will reload on redirect and trigger onAuthStateChange
      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === 'signup';

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.logoOuter}>
            <Animated.View
              style={[styles.breatheRing, { transform: [{ scale: breathe }] }]}
            />
            <Image 
              source={Logo}
              style={{ width: 40, height: 40, borderRadius: 20 }} 
            />
          </View>

          <Text style={styles.appName}>AURA</Text>
          <Text style={styles.tagline}>
            {isSignup
              ? 'Create your account to get started'
              : 'Welcome back to your sensory companion'}
          </Text>

          {/* Role Toggle */}
          <View style={styles.roleToggleRow}>
            <TouchableOpacity
              style={[styles.roleToggleBtn, role === 'user' && styles.roleToggleActive]}
              onPress={() => setRole('user')}
              activeOpacity={0.8}
            >
              <User size={16} color={role === 'user' ? colors.foreground : colors.mutedForeground} />
              <Text style={[styles.roleToggleText, role === 'user' && styles.roleToggleTextActive]}>User</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleToggleBtn, role === 'caretaker' && styles.roleToggleActive]}
              onPress={() => setRole('caretaker')}
              activeOpacity={0.8}
            >
              <Heart size={16} color={role === 'caretaker' ? colors.foreground : colors.mutedForeground} />
              <Text style={[styles.roleToggleText, role === 'caretaker' && styles.roleToggleTextActive]}>Caregiver</Text>
            </TouchableOpacity>
          </View>

          {/* Card */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionCard}>
              {/* Tab switcher */}
              <View style={styles.tabRow}>
                <TouchableOpacity
                  style={[styles.tab, !isSignup && styles.tabActive]}
                  onPress={() => { setMode('signin'); setError(null); setSuccessMsg(null); }}
                >
                  <Text style={[styles.tabText, !isSignup && styles.tabTextActive]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, isSignup && styles.tabActive]}
                  onPress={() => { setMode('signup'); setError(null); setSuccessMsg(null); }}
                >
                  <Text style={[styles.tabText, isSignup && styles.tabTextActive]}>
                    Create Account
                  </Text>
                </TouchableOpacity>
              </View>

            {isSignup && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Username</Text>
                <View style={styles.inputRow}>
                  <User size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="How should we call you?"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              </View>
            )}

            {/* Email field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputRow}>
                <Mail size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputRow}>
                <Lock size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={isSignup ? 'At least 6 characters' : '••••••••'}
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(v => !v)}
                  style={styles.eyeBtn}
                >
                  {showPassword
                    ? <Eye size={18} color={colors.mutedForeground} />
                    : <EyeOff size={18} color={colors.mutedForeground} />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Error / success messages */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            {successMsg ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            ) : null}

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.btnText}>
                    {isSignup ? 'Create Account' : 'Sign In'}
                  </Text>
                  <ChevronRight size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-In button */}
            <TouchableOpacity
              style={[styles.googleBtn, loading && styles.btnDisabled]}
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Globe size={18} color={colors.foreground} />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.footerText}>
            Your data is encrypted and stored securely via Supabase.
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.lg,
  },
  roleToggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    borderRadius: radius.full,
    padding: 4,
    marginBottom: spacing.xs,
    width: '80%',
    alignSelf: 'center',
  },
  roleToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radius.full,
    gap: spacing.sm,
  },
  roleToggleActive: {
    backgroundColor: colors.background,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  roleToggleText: {
    fontSize: 14,
    color: colors.mutedForeground,
    ...fonts.medium,
  },
  roleToggleTextActive: {
    color: colors.foreground,
    ...fonts.bold,
  },
  logoOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  breatheRing: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 10,
    bottom: 10,
    borderRadius: 40,
    backgroundColor: `${colors.primary}25`,
  },
  appName: {
    fontSize: 36,
    color: colors.foreground,
    letterSpacing: -1,
    ...fonts.bold,
  },
  tagline: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: -spacing.sm,
  },
  sectionContainer: { width: '100%', marginBottom: 28 },
  sectionCard: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border + '80',
    shadowColor: colors.primary,
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    borderRadius: radius.full,
    padding: 4,
    marginBottom: spacing.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.background,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tabText: {
    fontSize: 13,
    color: colors.mutedForeground,
    ...fonts.medium,
  },
  tabTextActive: {
    color: colors.foreground,
    ...fonts.bold,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 13,
    color: colors.foreground,
    ...fonts.medium,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.muted,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: colors.foreground,
  },
  eyeBtn: {
    paddingLeft: spacing.sm,
    paddingVertical: spacing.sm,
  },
  errorBox: {
    backgroundColor: `${colors.riskHigh}18`,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.riskHigh}40`,
  },
  errorText: {
    color: colors.riskHigh,
    fontSize: 13,
    lineHeight: 18,
  },
  successBox: {
    backgroundColor: `${colors.riskLow}18`,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.riskLow}40`,
  },
  successText: {
    color: colors.riskLow,
    fontSize: 13,
    lineHeight: 18,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 52,
    gap: spacing.sm,
    marginTop: spacing.xs,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    ...fonts.bold,
  },
  footerText: {
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    color: colors.mutedForeground,
    fontSize: 12,
    ...fonts.medium,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    height: 52,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  googleBtnText: {
    color: colors.foreground,
    fontSize: 15,
    ...fonts.bold,
  },
});
