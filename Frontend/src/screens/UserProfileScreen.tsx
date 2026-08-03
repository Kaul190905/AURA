import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, User, Phone, Mail, Calendar, Zap, AlertTriangle, Camera } from 'lucide-react-native';
import { colors, fonts, radius, spacing, neuSm } from '../theme';
import { supabase } from '../services/supabaseClient';
import { AppContext } from '../AppContext';
import { launchImageLibrary } from 'react-native-image-picker';

interface Props { onBack: () => void; }

export default function UserProfileScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { caregiver, dob, primaryTrigger, profilePhoto, setProfilePhoto } = React.useContext(AppContext);
  const [userName, setUserName] = useState<string>('User');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        const metadataName = data.user.user_metadata?.name;
        if (metadataName) {
          setUserName(metadataName);
        } else if (data.user.email) {
          setUserName(data.user.email.split('@')[0]);
        }
      }
    });
  }, []);

  const handlePickImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
      if (response.didCancel) return;
      if (response.errorMessage) {
        console.warn('ImagePicker Error: ', response.errorMessage);
        return;
      }
      if (response.assets && response.assets.length > 0) {
        setProfilePhoto(response.assets[0].uri || null);
      }
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={10} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} style={styles.photoContainer}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.photoImage} />
          ) : (
            <User size={60} color={colors.primary} />
          )}
          <View style={styles.editIconContainer}>
            <Camera size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.nameText}>{userName}</Text>
        
        <View style={styles.detailsContainer}>
          {/* About Me */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <User size={16} color={colors.primary} />
              <Text style={styles.label}>About Me</Text>
            </View>
            <Text style={styles.desc}>
              I am using AURA to manage my sensory profile and stay connected with my caretaker.
            </Text>
          </View>

          {/* Sensory Info */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Zap size={16} color={colors.primary} />
              <Text style={styles.label}>Sensory Profile</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Year of Birth:</Text>
              <Text style={styles.infoValue}>{dob || 'Not set'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Primary Trigger:</Text>
              <Text style={styles.infoValue}>{primaryTrigger || 'Not set'}</Text>
            </View>
          </View>

          {/* Caregiver Info */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <AlertTriangle size={16} color={colors.primary} />
              <Text style={styles.label}>Emergency Caregiver</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Name:</Text>
              <Text style={styles.infoValue}>{caregiver?.name || 'Not set'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Phone:</Text>
              <Text style={styles.infoValue}>{caregiver?.phone || 'Not set'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Email:</Text>
              <Text style={styles.infoValue}>{caregiver?.email || 'Not set'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, color: colors.foreground, ...fonts.bold },
  content: {
    alignItems: 'center', padding: spacing.xl, paddingBottom: 100,
  },
  photoContainer: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 2, borderColor: colors.primary,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  nameText: {
    fontSize: 24, color: colors.foreground, ...fonts.bold,
    marginBottom: spacing.xl,
  },
  detailsContainer: {
    width: '100%',
    gap: spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: colors.muted,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...neuSm,
  },
  label: {
    fontSize: 12, color: colors.primary, ...fonts.bold,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  desc: {
    fontSize: 14, color: colors.foreground, lineHeight: 22, opacity: 0.9,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  infoKey: {
    fontSize: 14,
    color: colors.mutedForeground,
    ...fonts.medium,
  },
  infoValue: {
    fontSize: 14,
    color: colors.foreground,
    ...fonts.semibold,
  },
});
