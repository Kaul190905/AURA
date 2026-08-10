import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, MapPin, ArrowLeft, RefreshCw, Phone, Navigation } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { colors, radius, spacing, fonts, neuSm } from '../theme';
import { riskColor } from '../utils';

export default function CaretakerTrackStudentScreen({ navigation, route }: any) {
  const { mockStudents, darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  
  const studentId = route?.params?.studentId;
  const student = mockStudents.find(s => s.id === studentId);

  const bgStyle = darkMode ? { backgroundColor: '#000000' } : { backgroundColor: colors.background };
  const cardStyle = darkMode ? { backgroundColor: '#1c1c1e' } : { backgroundColor: '#fff' };
  const textStyle = darkMode ? { color: '#fff' } : { color: colors.foreground };
  const subTextStyle = darkMode ? { color: '#aaa' } : { color: colors.mutedForeground };

  if (!student) {
    return (
      <View style={[styles.container, bgStyle, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={textStyle}>Student not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary, ...fonts.bold }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rColor = riskColor(student.risk);
  let statusText = 'SAFE';
  if (student.risk >= 3) statusText = 'MEDIUM';
  if (student.risk >= 5) statusText = 'HIGH';
  if (student.isCrisis || student.risk >= 9) statusText = 'CRITICAL';

  return (
    <View style={[styles.container, bgStyle, { paddingTop: insets.top }]}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft size={24} color={textStyle.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, textStyle]}>Track Student</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => {}}>
          <RefreshCw size={20} color={textStyle.color} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Selected Student Card */}
        <View style={[styles.profileCard, cardStyle, neuSm]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.avatar, { backgroundColor: `${rColor}20` }]}>
              <User size={32} color={rColor} />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.name, textStyle]}>{student.name}</Text>
                <View style={[styles.riskBadge, { backgroundColor: `${rColor}15` }]}>
                  <Text style={[styles.riskBadgeText, { color: rColor }]}>{statusText}</Text>
                </View>
              </View>
              <Text style={[styles.locationText, subTextStyle]}>{student.location}</Text>
              {student.condition && (
                <Text style={[styles.conditionText, textStyle]}>
                  {student.condition} {student.sensorValue && `• ${student.sensorValue}`}
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.callBtn}>
              <Phone size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Location */}
        <View style={[styles.mapContainer, cardStyle, neuSm]}>
          {/* Map Image Placeholder */}
          <View style={[styles.mapPlaceholder, { backgroundColor: darkMode ? '#222' : '#e6eaf0' }]}>
            {/* Visual representation of a route */}
            <View style={[styles.routeDot, { top: '30%', left: '70%', backgroundColor: colors.primary }]} />
            <View style={[styles.routeDot, { top: '60%', left: '50%', backgroundColor: colors.primary, width: 8, height: 8, borderRadius: 4, opacity: 0.5 }]} />
            
            <View style={styles.currentLocationPin}>
              <View style={[styles.pinOuter, { backgroundColor: `${colors.riskHigh}30` }]} />
              <View style={[styles.pinInner, { backgroundColor: colors.riskHigh }]}>
                <MapPin size={16} color="#fff" />
              </View>
            </View>
          </View>

          <View style={styles.mapInfo}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.sectionTitle, textStyle]}>Live Location</Text>
              <Navigation size={18} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.timeText, subTextStyle, { marginBottom: 12 }]}>Updated {student.lastUpdated}</Text>
            
            <Text style={[styles.addressText, textStyle]}>{student.location}</Text>
            <Text style={[styles.addressSubText, subTextStyle]}>AURA Campus View</Text>

            <TouchableOpacity style={styles.directionsBtn} activeOpacity={0.8}>
              <Text style={styles.directionsBtnText}>Get Directions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Location History */}
        <View style={[styles.historyContainer, cardStyle]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={[styles.sectionTitle, textStyle]}>Location History</Text>
            <TouchableOpacity>
              <Text style={{ color: colors.primary, ...fonts.bold, fontSize: 13 }}>View All</Text>
            </TouchableOpacity>
          </View>

          {(!student.locationHistory || student.locationHistory.length === 0) ? (
            <Text style={[subTextStyle, { fontSize: 13 }]}>No location history available.</Text>
          ) : (
            student.locationHistory.map((hist, idx) => (
              <View key={idx} style={styles.historyRow}>
                <Text style={[styles.histTime, subTextStyle]}>{hist.time}</Text>
                <Text style={[styles.histLoc, textStyle]}>{hist.location}</Text>
              </View>
            ))
          )}
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
  routeDot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, opacity: 0.8 },

  mapInfo: { padding: spacing.lg },
  sectionTitle: { fontSize: 16, ...fonts.bold },
  timeText: { fontSize: 11 },
  addressText: { fontSize: 15, ...fonts.medium, marginBottom: 2 },
  addressSubText: { fontSize: 13, marginBottom: spacing.lg },
  
  directionsBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: 14, alignItems: 'center',
  },
  directionsBtnText: { color: '#fff', fontSize: 15, ...fonts.bold },

  historyContainer: { padding: spacing.lg, borderRadius: radius.xl },
  historyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  histTime: { width: 70, fontSize: 13 },
  histLoc: { flex: 1, fontSize: 14, ...fonts.medium },
});
