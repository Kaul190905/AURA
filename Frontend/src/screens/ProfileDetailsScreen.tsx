import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, User, Mail, Shield, Users } from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { AppContext } from '../AppContext';
import { colors, radius, spacing, fonts, neuSm } from '../theme';
import { supabase } from '../services/supabaseClient';

export default function ProfileDetailsScreen({ navigation }: any) {
  const { darkMode, caretakerType, mockUsers, mockStudents } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || 'No email found');
        if (user.user_metadata?.avatar_url) {
          setAvatarUrl(user.user_metadata.avatar_url);
        }
        
        if (user.email) {
          const prefix = user.email.split('@')[0];
          const formattedName = prefix.split(/[._-]/).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
          setUserName(formattedName);
        }
      }
    });
  }, []);

  const handleImagePick = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.didCancel || !result.assets || result.assets.length === 0) return;
    
    const uri = result.assets[0].uri;
    if (uri) {
      setUploading(true);
      setAvatarUrl(uri);
      // Save it to Supabase metadata so it persists
      await supabase.auth.updateUser({ data: { avatar_url: uri } });
      setUploading(false);
    }
  };

  const bgStyle = darkMode ? { backgroundColor: '#000000' } : { backgroundColor: colors.background };
  const cardStyle = darkMode ? { backgroundColor: '#1c1c1e' } : { backgroundColor: '#ffffff' };
  const textStyle = darkMode ? { color: '#ffffff' } : { color: colors.foreground };
  const subTextStyle = darkMode ? { color: '#aaaaaa' } : { color: colors.mutedForeground };
  const monitoringCount = caretakerType === 'teacher' ? mockStudents?.length || 0 : mockUsers?.length || 0;
  const monitoringLabel = caretakerType === 'teacher' ? 'Students' : 'Users';

  return (
    <View style={[styles.container, bgStyle, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft size={24} color={textStyle.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, textStyle]}>Profile Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handleImagePick} activeOpacity={0.8} style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: darkMode ? '#333' : '#e0e0e0' }]}>
                <User size={40} color={colors.mutedForeground} />
              </View>
            )}
            
            <View style={styles.editBadge}>
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Camera size={16} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={[styles.nameText, textStyle]}>{userName || 'Caretaker'}</Text>
          <Text style={[styles.roleText, { color: colors.primary }]}>
            {caretakerType === 'teacher' ? 'Teacher' : 'Personal Caretaker'}
          </Text>
        </View>

        {/* Details List */}
        <View style={styles.infoSection}>
          <View style={[styles.infoRow, neuSm, cardStyle]}>
            <View style={[styles.iconBox, { backgroundColor: `${colors.primary}20` }]}>
              <User size={20} color={colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoLabel, subTextStyle]}>Name</Text>
              <Text style={[styles.infoValue, textStyle]}>{userName || 'N/A'}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, neuSm, cardStyle]}>
            <View style={[styles.iconBox, { backgroundColor: `${colors.primary}20` }]}>
              <Mail size={20} color={colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoLabel, subTextStyle]}>Email Address</Text>
              <Text style={[styles.infoValue, textStyle]}>{userEmail || 'N/A'}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, neuSm, cardStyle]}>
            <View style={[styles.iconBox, { backgroundColor: `${colors.primary}20` }]}>
              <Shield size={20} color={colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoLabel, subTextStyle]}>Role</Text>
              <Text style={[styles.infoValue, textStyle]}>{caretakerType === 'teacher' ? 'Teacher' : 'Personal Caretaker'}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, neuSm, cardStyle]}>
            <View style={[styles.iconBox, { backgroundColor: `${colors.primary}20` }]}>
              <Users size={20} color={colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoLabel, subTextStyle]}>Monitoring Count</Text>
              <Text style={[styles.infoValue, textStyle]}>{monitoringCount} {monitoringLabel}</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md 
  },
  iconBtn: { padding: 8 },
  headerTitle: { fontSize: 18, ...fonts.bold },
  
  scrollContent: { padding: spacing.xl, paddingBottom: 100 },
  
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  avatarContainer: {
    position: 'relative',
    width: 120, height: 120,
    marginBottom: spacing.lg,
  },
  avatarImage: {
    width: 120, height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120, height: 120,
    borderRadius: 60,
    alignItems: 'center', justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0, right: 0,
    backgroundColor: colors.primary,
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.background,
  },
  nameText: { fontSize: 24, ...fonts.bold, marginBottom: 4 },
  roleText: { fontSize: 15, ...fonts.semibold },
  
  infoSection: { gap: spacing.md },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: radius.xl,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 16,
  },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 12, marginBottom: 4, ...fonts.medium },
  infoValue: { fontSize: 15, ...fonts.semibold },
});
