import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, User, ArrowUpRight, Activity, ChevronRight, MapPin } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { colors, radius, spacing, fonts, neuSm } from '../theme';

export default function ConnectedUserDetailsScreen({ navigation, route }: any) {
  const { mockUsers, darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  
  const userId = route?.params?.userId;
  const connectedUser = mockUsers.find(u => u.id === userId);

  const bgStyle = darkMode ? { backgroundColor: '#000000' } : { backgroundColor: '#F8F9FA' };
  const cardStyle = darkMode ? { backgroundColor: '#1c1c1e' } : { backgroundColor: '#ffffff' };
  const textStyle = darkMode ? { color: '#ffffff' } : { color: colors.foreground };
  const subTextStyle = darkMode ? { color: '#aaaaaa' } : { color: colors.mutedForeground };

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

  const getStatusLabel = (risk: number, isCrisis: boolean) => {
    if (isCrisis || risk >= 9) return 'CRITICAL';
    if (risk >= 5) return 'HIGH RISK';
    if (risk >= 3) return 'MEDIUM RISK';
    return 'SAFE';
  };

  const status = getStatusLabel(connectedUser.risk, connectedUser.isCrisis);
  const isElevated = connectedUser.risk >= 5 || connectedUser.isCrisis;
  
  const hasSound = connectedUser.sensoryProfile?.sound;
  const hasTemp = connectedUser.sensoryProfile?.temperature;

  let activeTriggers: string[] = [];
  if (hasSound) activeTriggers.push('Sound');
  if (hasTemp) activeTriggers.push('Temperature');

  const primaryTriggerText = activeTriggers.join(' + ') || 'None';

  return (
    <View style={[styles.container, bgStyle, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft size={24} color={textStyle.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, textStyle]}>User Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Avatar & Name */}
        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: `${colors.primary}20` }]}>
            <User size={48} color={colors.primary} />
          </View>
          <Text style={[styles.name, textStyle]}>{connectedUser.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <View style={[styles.dot, { backgroundColor: isElevated ? colors.riskHigh : colors.primary }]} />
            <Text style={[styles.statusText, { color: isElevated ? colors.riskHigh : colors.primary }]}>
              {status}
            </Text>
          </View>
        </View>

        {/* About User Card */}
        <View style={[styles.card, cardStyle, neuSm]}>
          <Text style={[styles.cardSuperTitle, subTextStyle]}>ABOUT USER</Text>
          <View style={styles.compactRow}>
            <Text style={[styles.infoLabel, subTextStyle]}>Name</Text>
            <Text style={[styles.infoValue, textStyle]}>{connectedUser.name}</Text>
          </View>
          <View style={styles.compactRow}>
            <Text style={[styles.infoLabel, subTextStyle]}>Email</Text>
            <Text style={[styles.infoValue, textStyle]}>{connectedUser.email || 'Not set'}</Text>
          </View>
          <View style={styles.compactRow}>
            <Text style={[styles.infoLabel, subTextStyle]}>Condition</Text>
            <Text style={[styles.infoValue, textStyle]}>{primaryTriggerText || 'Not set'}</Text>
          </View>
        </View>

        {/* Sensory Profile Card */}
        <View style={[styles.card, cardStyle, neuSm]}>
          <Text style={[styles.cardSuperTitle, subTextStyle]}>SENSORY PROFILE</Text>
          <View style={styles.compactRow}>
            <Text style={[styles.infoLabel, subTextStyle]}>Primary Trigger{activeTriggers.length > 1 ? 's' : ''}</Text>
            <Text style={[styles.infoValue, textStyle]}>{primaryTriggerText}</Text>
          </View>
        </View>

        {/* Current Sensory Status Link Card */}
        <TouchableOpacity 
          style={[styles.statusLinkCard, cardStyle, neuSm]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('SensoryStatus', { userId: connectedUser.id })}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardSuperTitle, subTextStyle]}>CURRENT SENSORY STATUS</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <View style={[styles.dotLg, { backgroundColor: isElevated ? colors.riskHigh : colors.primary }]} />
              <Text style={[styles.conditionValue, textStyle]}>{status}</Text>
            </View>
            <Text style={[styles.cardSubValue, subTextStyle]}>
              Affected: {isElevated ? primaryTriggerText : 'None'}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        {/* Location Link Card */}
        <TouchableOpacity 
          style={[styles.statusLinkCard, cardStyle, neuSm]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('LocationMap', { userId: connectedUser.id })}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardSuperTitle, subTextStyle]}>LOCATION</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <MapPin size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.conditionValue, textStyle]}>{connectedUser.phoneLocation || 'Unknown'}</Text>
            </View>
            <Text style={[styles.cardSubValue, subTextStyle]}>
              Sharing: {connectedUser.locationSharingStatus || 'Unknown'}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        {/* View History Card */}
        <TouchableOpacity 
          style={[styles.historyCard, cardStyle, neuSm]} 
          activeOpacity={0.8}
          onPress={() => navigation.navigate('UserHistory', { userId: connectedUser.id })}
        >
          <View style={styles.historyCardContent}>
            <View style={[styles.historyIconBox, { backgroundColor: `${colors.primary}15` }]}>
              <ArrowUpRight size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.historyTitle, textStyle]}>VIEW HISTORY</Text>
              <Text style={[styles.historySub, subTextStyle]}>See {connectedUser.name}'s sensory history</Text>
            </View>
            <Activity size={24} color={colors.mutedForeground} />
          </View>
        </TouchableOpacity>
        
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
  iconBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 20, ...fonts.bold },
  
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  
  profileSection: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  name: { fontSize: 22, ...fonts.bold, marginBottom: 2 },
  statusText: { fontSize: 12, ...fonts.bold, letterSpacing: 0.5 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  dotLg: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },

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

  statusLinkCard: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conditionValue: {
    fontSize: 18, ...fonts.bold,
  },
  cardSubValue: {
    fontSize: 12, ...fonts.medium,
  },

  historyCard: {
    borderRadius: radius.xl, overflow: 'hidden',
  },
  historyCardContent: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
  },
  historyIconBox: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  historyTitle: {
    fontSize: 14, ...fonts.bold, letterSpacing: 0.5, marginBottom: 2,
  },
  historySub: {
    fontSize: 12, ...fonts.medium,
  }
});
