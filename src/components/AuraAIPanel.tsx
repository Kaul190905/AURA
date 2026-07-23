import React, { useContext } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { AppContext } from '../AppContext';
import { colors, neuSm, radius, spacing, fonts } from '../theme';
import { X, Star, BrainCircuit } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AuraAIPanel({ visible, onClose }: Props) {
  const { risk, history, strategies } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  const getDynamicMessage = () => {
    if (risk.score > 7) {
      return "Your risk is currently High. The environment appears overwhelming right now. Please consider finding a quiet space and using your preferred strategies like Deep Breathing.";
    }
    if (risk.score > 4) {
      return "Your risk is currently Medium because noise and light levels have been elevated for several minutes. Taking a short break or using your preferred headphones may help.";
    }
    return "Your risk is currently Low. Everything looks stable and you're in a comfortable environment. Keep up the great work!";
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackground}>
        <View style={[styles.panel, { paddingBottom: insets.bottom + spacing.xl }]}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Star size={20} color={colors.primary} />
              <Text style={styles.title}>Aura AI</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.chatBubble}>
              <Text style={styles.chatText}>{getDynamicMessage()}</Text>
            </View>
            
            <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
              <Text style={styles.sectionTitle}>Suggested Actions</Text>
              <TouchableOpacity style={[styles.suggestionBtn, neuSm]} activeOpacity={0.8}>
                 <BrainCircuit size={16} color={colors.primary} />
                 <Text style={styles.suggestionText}>Why is my risk level high?</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.suggestionBtn, neuSm]} activeOpacity={0.8}>
                 <BrainCircuit size={16} color={colors.primary} />
                 <Text style={styles.suggestionText}>Which coping strategy works best for me?</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.suggestionBtn, neuSm]} activeOpacity={0.8}>
                 <BrainCircuit size={16} color={colors.primary} />
                 <Text style={styles.suggestionText}>What should I do next?</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    ...fonts.bold,
    color: colors.foreground,
  },
  closeBtn: {
    padding: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  chatBubble: {
    backgroundColor: `${colors.primary}15`,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderTopLeftRadius: 4,
  },
  chatText: {
    fontSize: 15,
    color: colors.foreground,
    ...fonts.medium,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    ...fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  suggestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  suggestionText: {
    fontSize: 14,
    color: colors.foreground,
    ...fonts.medium,
  },
});
