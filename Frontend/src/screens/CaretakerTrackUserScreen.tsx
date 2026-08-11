import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, MapPin, ArrowLeft, RefreshCw, Phone, Navigation, WifiOff } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { colors, radius, spacing, fonts, neuSm } from '../theme';
import { riskColor } from '../utils';

export default function CaretakerTrackUserScreen({ navigation, route }: any) {
  const { mockUsers, darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  
  const userId = route?.params?.userId;
  const user = mockUsers.find(u => u.id === userId);

  const bgStyle = darkMode ? { backgroundColor: '#000000' } : { backgroundColor: colors.background };
  const cardStyle = darkMode ? { backgroundColor: '#1c1c1e' } : { backgroundColor: '#fff' };
  const textStyle = darkMode ? { color: '#fff' } : { color: colors.foreground };
  const subTextStyle = darkMode ? { color: '#aaa' } : { color: colors.mutedForeground };

  if (!user) {
    return (
      <View style={[styles.container, bgStyle, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={textStyle}>User not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary, ...fonts.bold }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rColor = riskColor(user.risk);
  let statusText = 'SAFE';
  if (user.risk >= 3) statusText = 'MEDIUM';
  if (user.risk >= 5) statusText = 'HIGH';
  if (user.isCrisis || user.risk >= 9) statusText = 'CRITICAL';

  const isLocationAvailable = user.locationSharingStatus === 'Active' || user.locationSharingStatus === 'Paused';

  return (
    <View style={[styles.container, bgStyle, { paddingTop: insets.top }]}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft size={24} color={textStyle.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, textStyle]}>Track User</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => {}}>
          <RefreshCw size={20} color={textStyle.color} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Selected User Card */}
        <View style={[styles.profileCard, neuSm, cardStyle]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.avatar, { backgroundColor: `${rColor}20` }]}>
              <User size={32} color={rColor} />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.name, textStyle]}>{user.name}</Text>
                <View style={[styles.riskBadge, { backgroundColor: `${rColor}15` }]}>
                  <Text style={[styles.riskBadgeText, { color: rColor }]}>{statusText}</Text>
                </View>
              </View>
              <Text style={[styles.locationText, subTextStyle]}>📍 {user.phoneLocation}</Text>
              {user.condition && (
                <Text style={[styles.conditionText, textStyle]}>
                  {user.condition} {user.sensorValue && `• ${user.sensorValue}`}
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.callBtn}>
              <Phone size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Location */}
        <View style={[styles.mapContainer, neuSm, cardStyle]}>
          {isLocationAvailable ? (
            <View style={[styles.mapPlaceholder, { backgroundColor: darkMode ? '#222' : '#e6eaf0' }]}>
              <View style={styles.currentLocationPin}>
                <View style={[styles.pinOuter, { backgroundColor: `${colors.riskHigh}30` }]} />
                <View style={[styles.pinInner, { backgroundColor: colors.riskHigh }]}>
                  <MapPin size={16} color="#fff" />
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.mapPlaceholder, { backgroundColor: darkMode ? '#222' : '#f0f0f0', justifyContent: 'center' }]}>
              <WifiOff size={32} color={colors.mutedForeground} />
              <Text style={[styles.unavailableText, subTextStyle, { marginTop: 8 }]}>Location Unavailable</Text>
            </View>
          )}

          <View style={styles.mapInfo}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.sectionTitle, textStyle]}>
                {isLocationAvailable ? 'Current Location' : 'Location Unavailable'}
              </Text>
              {isLocationAvailable && <Navigation size={18} color={colors.mutedForeground} />}
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: user.locationSharingStatus === 'Active' ? colors.primary : user.locationSharingStatus === 'Paused' ? colors.riskMed : colors.mutedForeground }
              ]} />
              <Text style={[styles.timeText, subTextStyle, { ...fonts.bold }]}>
                {user.locationSharingStatus === 'Active' ? 'Location Sharing Active' : user.locationSharingStatus === 'Paused' ? 'Location Sharing Paused' : "User's mobile phone is not sharing location"}
              </Text>
            </View>

            <Text style={[styles.timeText, subTextStyle, { marginTop: 4, marginBottom: 12 }]}>
              Location Source: User's Mobile Phone
            </Text>
            
            {isLocationAvailable ? (
              <>
                <Text style={[styles.addressText, textStyle]}>{user.phoneLocation}</Text>
                <Text style={[styles.addressSubText, subTextStyle]}>Updated {user.lastUpdated}</Text>
                <TouchableOpacity style={styles.directionsBtn} activeOpacity={0.8}>
                  <Text style={styles.directionsBtnText}>Get Directions</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.addressText, textStyle, { color: colors.mutedForeground }]}>Last Known Location: {user.phoneLocation}</Text>
                <Text style={[styles.addressSubText, subTextStyle]}>Updated {user.lastUpdated}</Text>
              </>
            )}
            
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
  
  scrollContent: { padding: spacing.lg, paddingBottom: 100, gap: spacing.lg },
  
  profileCard: {
    padding: spacing.lg, borderRadius: radius.xl,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 18, ...fonts.bold },
  riskBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  riskBadgeText: { fontSize: 10, ...fonts.bold },
  locationText: { fontSize: 13, marginTop: 4 },
  conditionText: { fontSize: 13, ...fonts.medium, marginTop: 2 },
  
  callBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center', justifyContent: 'center',
  },

  mapContainer: { borderRadius: radius.xl, overflow: 'hidden' },
  mapPlaceholder: { height: 180, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  
  currentLocationPin: { position: 'absolute', top: '40%', left: '40%', alignItems: 'center', justifyContent: 'center' },
  pinOuter: { position: 'absolute', width: 60, height: 60, borderRadius: 30 },
  pinInner: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  
  unavailableText: { ...fonts.bold },

  mapInfo: { padding: spacing.lg },
  sectionTitle: { fontSize: 16, ...fonts.bold },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  timeText: { fontSize: 11 },
  addressText: { fontSize: 15, ...fonts.medium, marginBottom: 2 },
  addressSubText: { fontSize: 13, marginBottom: spacing.lg },
  
  directionsBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: 14, alignItems: 'center',
  },
  directionsBtnText: { color: '#fff', fontSize: 15, ...fonts.bold },
});
