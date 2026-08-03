import React, { useContext } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { AppContext, AppNotification } from '../AppContext';
import { colors, neuSm, radius, spacing, fonts } from '../theme';
import { X, Bell, Zap, BrainCircuit, Activity, Trash2, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function NotificationModal() {
  const styles = getStyles();
  const { notifications, isNotificationCenterOpen, setIsNotificationCenterOpen, setNotifications } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const sortedNotifications = [...notifications].sort((a, b) => {
    if (a.read === b.read) return new Date(b.time).getTime() - new Date(a.time).getTime();
    return a.read ? 1 : -1;
  });



  const getIcon = (type: AppNotification['type']) => {
    if (type === 'alert') return <Activity size={18} color={colors.riskHigh} />;
    if (type === 'suggestion') return <BrainCircuit size={18} color={colors.primary} />;
    return <Zap size={18} color={colors.mutedForeground} />;
  };

  return (
    <Modal
      visible={isNotificationCenterOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsNotificationCenterOpen(false)}
    >
      <View style={styles.modalBackground}>
        <View style={[styles.panel, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Bell size={20} color={colors.foreground} />
              <Text style={styles.title}>Notifications</Text>
            </View>
            <TouchableOpacity onPress={() => setIsNotificationCenterOpen(false)} style={styles.closeBtn}>
              <X size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity onPress={markAllAsRead} style={styles.markReadBtn}>
            <Text style={styles.markReadText}>Mark all as read</Text>
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {sortedNotifications.map(n => (
                  <View key={n.id} style={[styles.notifCard, neuSm, !n.read && styles.unreadCard, { marginBottom: spacing.md }]}>
                    <View style={[styles.iconContainer, !n.read && styles.unreadIconBg]}>
                      {getIcon(n.type)}
                    </View>
                    <View style={styles.notifBody}>
                      <Text style={[styles.notifTitle, !n.read && fonts.bold]}>{n.title}</Text>
                      <Text style={styles.notifDesc}>{n.description}</Text>
                      <Text style={styles.notifTime}>{new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <View style={{ alignItems: 'center', gap: 12 }}>
                      {!n.read && <View style={styles.unreadDot} />}
                      <TouchableOpacity onPress={() => deleteNotification(n.id)} hitSlop={10} style={styles.deleteBtn}>
                        <Trash2 size={18} color={colors.riskHigh} />
                      </TouchableOpacity>
                    </View>
                  </View>
              ))}
            {notifications.length === 0 && (
              <Text style={styles.emptyText}>No notifications yet.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = () => StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: colors.background,
    height: '90%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    ...fonts.bold,
    color: colors.foreground,
  },
  closeBtn: {
    padding: 8,
  },
  markReadBtn: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  markReadText: {
    fontSize: 12,
    color: colors.primary,
    ...fonts.medium,
  },
  scrollContent: {
    paddingBottom: 40,
    gap: spacing.md,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.md,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadIconBg: {
    backgroundColor: `${colors.primary}15`,
  },
  notifBody: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 14,
    color: colors.foreground,
    ...fonts.medium,
  },
  notifDesc: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  notifTime: {
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.mutedForeground,
    marginTop: spacing.xl,
  },
  deleteBtn: {
    padding: 4,
    backgroundColor: `${colors.riskHigh}15`,
    borderRadius: 8,
  }
});
