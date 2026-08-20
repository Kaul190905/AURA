import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, User, Zap, AlertTriangle, Camera, Edit2, Check } from 'lucide-react-native';
import { colors, fonts, radius, spacing, neuSm } from '../theme';
import { supabase } from '../services/supabaseClient';
import { AppContext } from '../AppContext';
import { launchImageLibrary } from 'react-native-image-picker';

interface Props { onBack: () => void; }

export default function UserProfileScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { caregiver, dob, primaryTrigger, profilePhoto, setProfilePhoto } = React.useContext(AppContext);
  const [userName, setUserName] = useState<string>('User');
  const [isEditingName, setIsEditingName] = useState(false);
  const [updatingName, setUpdatingName] = useState(false);
  const [aboutMe, setAboutMe] = useState<string>('I am using AURA to manage my sensory profile and stay connected with my caretaker.');
  const [isEditingAboutMe, setIsEditingAboutMe] = useState(false);
  const [updatingAboutMe, setUpdatingAboutMe] = useState(false);

  const handleUpdateName = async () => {
    if (!userName.trim()) { return; }
    setUpdatingName(true);
    try {
      await supabase.auth.updateUser({ data: { name: userName.trim() } });
      setIsEditingName(false);
    } catch (e) {
      console.error(e);
    }
    setUpdatingName(false);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        const metadataName = data.user.user_metadata?.name;
        if (metadataName) {
          setUserName(metadataName);
        } else if (data.user.email) {
          setUserName(data.user.email.split('@')[0]);
        }
        const metadataAboutMe = data.user.user_metadata?.aboutMe;
        if (metadataAboutMe) {
          setAboutMe(metadataAboutMe);
        }
      }
    });
  }, []);

  const handleUpdateAboutMe = async () => {
    setUpdatingAboutMe(true);
    try {
      await supabase.auth.updateUser({ data: { aboutMe: aboutMe.trim() } });
      setIsEditingAboutMe(false);
    } catch (e) {
      console.error(e);
    }
    setUpdatingAboutMe(false);
  };

  const handlePickImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
      if (response.didCancel) {return;}
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
        <View style={styles.headerSpacer} />
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
        <View style={styles.nameRow}>
          {isEditingName ? (
            <TextInput
              style={styles.nameInput}
              value={userName}
              onChangeText={setUserName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleUpdateName}
            />
          ) : (
            <Text style={styles.nameText}>{userName}</Text>
          )}
          {isEditingName ? (
            updatingName ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <TouchableOpacity onPress={handleUpdateName} style={styles.editBtn}>
                <Check size={20} color={colors.primary} />
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity onPress={() => setIsEditingName(true)} style={styles.editBtn}>
              <Edit2 size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.detailsContainer}>
          {/* About Me */}
          <View style={styles.card}>
            <View style={styles.sectionHeaderMb8}>
              <View style={styles.rowCenterGap8}>
                <User size={16} color={colors.primary} />
                <Text style={styles.label}>About Me</Text>
              </View>
              {isEditingAboutMe ? (
                updatingAboutMe ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <TouchableOpacity onPress={handleUpdateAboutMe} style={styles.editBtn}>
                    <Check size={18} color={colors.primary} />
                  </TouchableOpacity>
                )
              ) : (
                <TouchableOpacity onPress={() => setIsEditingAboutMe(true)} style={styles.editBtn}>
                  <Edit2 size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
            {isEditingAboutMe ? (
              <TextInput
                style={styles.aboutMeInput}
                value={aboutMe}
                onChangeText={setAboutMe}
                multiline
                autoFocus
              />
            ) : (
              <Text style={styles.desc}>{aboutMe}</Text>
            )}
          </View>

          {/* Sensory Info */}
          <View style={styles.card}>
            <View style={styles.sectionHeaderMb12}>
              <View style={styles.rowCenterGap8}>
                <Zap size={16} color={colors.primary} />
                <Text style={styles.label}>Sensory Profile</Text>
              </View>
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
            <View style={styles.sectionHeaderMb12}>
              <View style={styles.rowCenterGap8}>
                <AlertTriangle size={16} color={colors.primary} />
                <Text style={styles.label}>Emergency Caregiver</Text>
              </View>
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: 8,
  },
  nameInput: {
    fontSize: 24,
    color: colors.foreground,
    ...fonts.bold,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    padding: 0,
    minWidth: 150,
    textAlign: 'center',
  },
  nameText: {
    fontSize: 24, color: colors.foreground, ...fonts.bold,
  },
  editBtn: {
    padding: 4,
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
  headerSpacer: {
    width: 24,
  },
  sectionHeaderMb8: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionHeaderMb12: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rowCenterGap8: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aboutMeInput: {
    fontSize: 14,
    minWidth: '100%',
    textAlign: 'left',
    fontWeight: 'normal',
    color: colors.foreground,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingBottom: 4,
  },
});
