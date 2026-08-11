import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Phone, MessageCircle, Plus } from 'lucide-react-native';
import { AppContext } from '../AppContext';
import { colors, radius, spacing, fonts, neuSm } from '../theme';

export default function EmergencyContactsScreen({ navigation }: any) {
  const { darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  
  const contacts = [
    { id: '1', name: 'Dr. Smith', role: 'Primary Doctor', phone: '555-0102' },
    { id: '2', name: 'City Hospital', role: 'Hospital / ER', phone: '911' },
    { id: '3', name: 'Jane Doe', role: 'Family Member', phone: '555-0199' },
  ];

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleMessage = (phone: string) => {
    Linking.openURL(`sms:${phone}`);
  };

  const bgStyle = darkMode ? { backgroundColor: '#000000' } : { backgroundColor: colors.background };
  const cardStyle = darkMode ? { backgroundColor: '#1c1c1e' } : { backgroundColor: '#ffffff' };
  const textStyle = darkMode ? { color: '#ffffff' } : { color: colors.foreground };
  const subTextStyle = darkMode ? { color: '#aaaaaa' } : { color: colors.mutedForeground };

  return (
    <View style={[styles.container, bgStyle, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft size={24} color={textStyle.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, textStyle]}>Emergency Contacts</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Plus size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {contacts.map((contact) => (
          <View key={contact.id} style={[styles.contactCard, neuSm, cardStyle]}>
            <View style={styles.contactInfo}>
              <Text style={[styles.contactName, textStyle]}>{contact.name}</Text>
              <Text style={[styles.contactRole, subTextStyle]}>{contact.role}</Text>
              <Text style={[styles.contactPhone, { color: colors.primary }]}>{contact.phone}</Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: `${colors.primary}15` }]}
                onPress={() => handleCall(contact.phone)}
              >
                <Phone size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: `${colors.primary}15` }]}
                onPress={() => handleMessage(contact.phone)}
              >
                <MessageCircle size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
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
  
  scrollContent: { padding: spacing.xl, paddingBottom: 100, gap: spacing.md },
  
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: radius.xl,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    ...fonts.bold,
    marginBottom: 4,
  },
  contactRole: {
    fontSize: 13,
    marginBottom: 6,
  },
  contactPhone: {
    fontSize: 14,
    ...fonts.semibold,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
