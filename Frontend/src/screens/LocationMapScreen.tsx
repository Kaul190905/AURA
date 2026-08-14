import React, { useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { AppContext } from '../AppContext';
import { colors, radius, spacing, fonts, neuSm } from '../theme';

export default function LocationMapScreen({ navigation, route }: any) {
  const { mockUsers, darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  
  const userId = route?.params?.userId;
  const connectedUser = mockUsers.find(u => u.id === userId);

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.8);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(2, { duration: 2000, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 })
      ),
      -1,
      false
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
        withTiming(0.8, { duration: 0 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const bgStyle = darkMode ? { backgroundColor: '#000000' } : { backgroundColor: '#F8F9FA' };
  const cardStyle = darkMode ? { backgroundColor: '#1c1c1e' } : { backgroundColor: '#ffffff' };
  const textStyle = darkMode ? { color: '#ffffff' } : { color: colors.foreground };
  const subTextStyle = darkMode ? { color: '#aaaaaa' } : { color: colors.mutedForeground };
  const mapBg = darkMode ? '#151515' : '#eef2f5';
  const gridColor = darkMode ? '#2a2a2a' : '#e0e5e9';

  if (!connectedUser) {
    return (
      <View style={[styles.container, bgStyle, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={textStyle}>User not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary, ...fonts.bold }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, bgStyle, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft size={24} color={textStyle.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, textStyle]}>{connectedUser.name}'s Location</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.mapPlaceholder, cardStyle, neuSm, { backgroundColor: mapBg, overflow: 'hidden' }]}>
          {/* Grid lines for map feel */}
          <View style={[styles.gridLineH, { top: '25%', backgroundColor: gridColor }]} />
          <View style={[styles.gridLineH, { top: '50%', backgroundColor: gridColor }]} />
          <View style={[styles.gridLineH, { top: '75%', backgroundColor: gridColor }]} />
          <View style={[styles.gridLineV, { left: '25%', backgroundColor: gridColor }]} />
          <View style={[styles.gridLineV, { left: '50%', backgroundColor: gridColor }]} />
          <View style={[styles.gridLineV, { left: '75%', backgroundColor: gridColor }]} />

          <View style={styles.pinContainer}>
            <Animated.View style={[styles.pulseRing, animatedStyle, { backgroundColor: colors.primary }]} />
            <View style={[styles.pinDot, { backgroundColor: colors.primary }]}>
              <MapPin size={18} color="#fff" />
            </View>
          </View>

          <View style={[styles.mapOverlayLabel, cardStyle, neuSm]}>
            <Text style={[styles.mapOverlayText, textStyle]}>{connectedUser.phoneLocation || 'Unknown Location'}</Text>
            <Text style={[styles.mapOverlaySub, subTextStyle]}>Lat: 34.0522  •  Lng: -118.2437</Text>
          </View>
        </View>

        <View style={[styles.card, cardStyle, neuSm, { marginTop: spacing.md }]}>
          <Text style={[styles.cardSuperTitle, subTextStyle]}>LOCATION DETAILS</Text>
          <View style={styles.compactRow}>
            <Text style={[styles.infoLabel, subTextStyle]}>Sharing Status</Text>
            <Text style={[styles.infoValue, { color: connectedUser.locationSharingStatus === 'Active' ? colors.primary : colors.mutedForeground, ...fonts.bold }]}>
              {connectedUser.locationSharingStatus || 'Unknown'}
            </Text>
          </View>
          <View style={[styles.compactRow, { marginBottom: 0 }]}>
            <Text style={[styles.infoLabel, subTextStyle]}>Last Updated</Text>
            <Text style={[styles.infoValue, textStyle]}>{connectedUser.lastUpdated || 'Just now'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md 
  },
  iconBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, ...fonts.bold },
  
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  
  card: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: radius.xl,
  },
  cardSuperTitle: {
    fontSize: 10, ...fonts.bold, letterSpacing: 1, marginBottom: 8,
  },
  compactRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13, ...fonts.medium,
  },
  infoValue: {
    fontSize: 13, ...fonts.bold,
  },

  /* Map Diagram Styles */
  mapPlaceholder: {
    flex: 1,
    borderRadius: radius.xl,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLineH: {
    position: 'absolute',
    left: 0, right: 0,
    height: 1,
  },
  gridLineV: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: 1,
  },
  pinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  pinDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  mapOverlayLabel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  mapOverlayText: {
    fontSize: 16,
    ...fonts.bold,
    marginBottom: 4,
  },
  mapOverlaySub: {
    fontSize: 12,
    ...fonts.medium,
  }
});
