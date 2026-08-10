import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Users, User, ChevronRight } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { colors, radius, spacing, fonts, neuSm } from '../theme';
import { supabase } from '../services/supabaseClient';

export default function MonitoringModeScreen() {
  const { darkMode, setCaretakerType, navigateTo } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  const bgStyle = darkMode ? { backgroundColor: '#000000' } : { backgroundColor: colors.background };
  const cardStyle = darkMode ? { backgroundColor: '#1c1c1e' } : { backgroundColor: '#fff' };
  const textStyle = darkMode ? { color: '#fff' } : { color: colors.foreground };
  const subTextStyle = darkMode ? { color: '#aaa' } : { color: colors.mutedForeground };

  const [phone, setPhone] = useState('');

  const selectMode = async (mode: 'teacher' | 'personal-caretaker') => {
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      Alert.alert('Invalid Number', 'Please enter exactly 10 digits.');
      return;
    }
    setCaretakerType(mode);
    await supabase.auth.updateUser({ data: { caretakerType: mode, caretakerPhone: phone } });
    navigateTo(mode === 'teacher' ? 'teacher-home' : 'caretaker-home');
  };

  return (
    <View style={[styles.container, bgStyle, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <Text style={[styles.title, textStyle]}>Choose Caretaker Type</Text>
        <Text style={[styles.subtitle, subTextStyle]}>
          Please provide your contact number and choose how you will be monitoring connected devices.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, textStyle]}>Contact Number</Text>
          <TextInput
            style={[styles.input, cardStyle, textStyle]}
            placeholder="Enter 10-digit number"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            maxLength={10}
            value={phone}
            onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
          />
        </View>

        <TouchableOpacity 
          style={[styles.card, neuSm, cardStyle]} 
          activeOpacity={0.8}
          onPress={() => selectMode('teacher')}
        >
          <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
            <Users size={32} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, textStyle]}>Teacher</Text>
            <Text style={[styles.cardDesc, subTextStyle]}>
              Monitor multiple students
            </Text>
          </View>
          <ChevronRight size={24} color={colors.mutedForeground} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, neuSm, cardStyle]} 
          activeOpacity={0.8}
          onPress={() => selectMode('personal-caretaker')}
        >
          <View style={[styles.iconContainer, { backgroundColor: `${colors.riskMed}20` }]}>
            <User size={32} color={colors.riskMed} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, textStyle]}>Personal Caretaker</Text>
            <Text style={[styles.cardDesc, subTextStyle]}>
              Monitor connected users
            </Text>
          </View>
          <ChevronRight size={24} color={colors.mutedForeground} />
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingBottom: 100, gap: spacing.lg },
  
  title: { fontSize: 24, ...fonts.bold, marginTop: spacing.xl, marginBottom: 8 },
  subtitle: { fontSize: 16, lineHeight: 24, marginBottom: spacing.xl },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.xl,
  },
  inputLabel: {
    fontSize: 14,
    ...fonts.bold,
    marginBottom: 8,
  },
  input: {
    borderRadius: radius.lg,
    padding: 16,
    fontSize: 16,
    ...fonts.medium,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    ...fonts.bold,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
});
