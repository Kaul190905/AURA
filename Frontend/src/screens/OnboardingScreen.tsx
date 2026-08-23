import React, { useContext, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ear, Sun, User, Calendar, Phone, Mail } from 'lucide-react-native';

import { AppContext } from '../AppContext';
import { colors, shadowSm, radius, spacing, fonts } from '../theme';
import { TriggerKey } from '../types';
import { supabase } from '../services/supabaseClient';

interface Props {
  onDone: () => void;
}

export default function OnboardingScreen({ onDone }: Props) {
  const { profile, setProfile, dob, setDob, caregiver, setCaregiver } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleNext = () => {
    let newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!name.trim()) {newErrors.name = 'Name is required';}
      if (!dob || dob.length !== 4 || isNaN(parseInt(dob, 10))) {
        newErrors.dob = 'Year of Birth is required (e.g., 1995)';
      }
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
      setStep(2);
    } else if (step === 2) {
      if (Object.keys(profile).length === 0) {
        newErrors.profile = 'Please select at least one primary issue.';
      }
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
      setStep(3);
    } else if (step === 3) {
      if (caregiver.phone && !/^\d{10}$/.test(caregiver.phone.replace(/\D/g, ''))) {
        newErrors.phone = 'Phone number must be 10 digits';
      }
      if (caregiver.email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i.test(caregiver.email)) {
        newErrors.email = 'Invalid email format';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
      supabase.auth.updateUser({ data: { name: name.trim() } }).catch(console.error);
      onDone();
    }
  };

  const toggleProfile = (key: TriggerKey) => {
    const next = { ...profile };
    if (key in next) {
      delete next[key];
    } else {
      next[key] = 3; // default intensity
    }
    setProfile(next);
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Tell me more about yourself</Text>
      <Text style={styles.subtitle}>Let's personalize your experience.</Text>

      <View style={styles.inputContainer}>
        <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
          <User color={colors.primary} size={20} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Your Name"
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={(t) => { setName(t); setErrors(prev => ({ ...prev, name: '' })); }}
          />
        </View>
        {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

        <View style={[styles.inputWrapper, errors.dob && styles.inputError]}>
          <Calendar color={colors.primary} size={20} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Year of Birth (YYYY)"
            placeholderTextColor={colors.mutedForeground}
            value={dob}
            onChangeText={(t) => { setDob(t); setErrors(prev => ({ ...prev, dob: '' })); }}
            keyboardType="numeric"
            maxLength={4}
          />
        </View>
        {errors.dob ? <Text style={styles.errorText}>{errors.dob}</Text> : null}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>What's your primary issue?</Text>
      <Text style={styles.subtitle}>Select the sensory triggers that affect you.</Text>

      <View style={styles.gridContainer}>
        <TouchableOpacity
          style={[styles.gridCard, ('sound' in profile) && styles.gridCardActive]}
          onPress={() => toggleProfile('sound')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconWrapper, ('sound' in profile) && styles.iconWrapperActive]}>
            <Ear color={('sound' in profile) ? '#fff' : colors.primary} size={32} />
          </View>
          <Text style={[styles.gridCardTitle, ('sound' in profile) && styles.gridCardTitleActive]}>Sound</Text>
          <Text style={styles.gridCardDesc}>Sensitivity to loud or sudden noises</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridCard, ('temp' in profile) && styles.gridCardActive]}
          onPress={() => toggleProfile('temp')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconWrapper, ('temp' in profile) && styles.iconWrapperActive]}>
            <Sun color={('temp' in profile) ? '#fff' : colors.primary} size={32} />
          </View>
          <Text style={[styles.gridCardTitle, ('temp' in profile) && styles.gridCardTitleActive]}>Temperature</Text>
          <Text style={styles.gridCardDesc}>Sensitivity to heat or cold</Text>
        </TouchableOpacity>
      </View>
      {errors.profile ? <Text style={[styles.errorText, styles.centerError]}>{errors.profile}</Text> : null}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Caregiver Details</Text>
      <Text style={styles.subtitle}>Add a contact to receive alerts (Optional).</Text>

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <User color={colors.primary} size={20} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Caregiver Name"
            placeholderTextColor={colors.mutedForeground}
            value={caregiver.name}
            onChangeText={(t) => setCaregiver({ ...caregiver, name: t })}
          />
        </View>

        <View style={[styles.inputWrapper, errors.phone && styles.inputError]}>
          <Phone color={colors.primary} size={20} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor={colors.mutedForeground}
            value={caregiver.phone}
            onChangeText={(t) => { setCaregiver({ ...caregiver, phone: t }); setErrors(prev => ({ ...prev, phone: '' })); }}
            keyboardType="phone-pad"
          />
        </View>
        {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

        <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
          <Mail color={colors.primary} size={20} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor={colors.mutedForeground}
            value={caregiver.email}
            onChangeText={(t) => { setCaregiver({ ...caregiver, email: t }); setErrors(prev => ({ ...prev, email: '' })); }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {[1, 2, 3].map((idx) => (
            <View key={idx} style={[styles.dot, step === idx && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>{step === 3 ? 'Complete' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: 100,
  },
  stepContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    ...fonts.bold,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    gap: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    height: 60,
    ...shadowSm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.foreground,
    ...fonts.medium,
  },
  centerError: {
    textAlign: 'center',
    marginTop: 16,
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 13,
    marginTop: -8,
    marginLeft: 16,
    ...fonts.medium,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  gridCard: {
    width: '45%',
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowSm,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 180,
  },
  gridCardActive: {
    borderColor: colors.primary,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconWrapperActive: {
    backgroundColor: colors.primary,
  },
  gridCardTitle: {
    fontSize: 18,
    ...fonts.semibold,
    color: colors.foreground,
    marginBottom: 8,
  },
  gridCardTitleActive: {
    color: colors.primary,
  },
  gridCardDesc: {
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 16,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  nextBtn: {
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 18,
    ...fonts.semibold,
  },
});
