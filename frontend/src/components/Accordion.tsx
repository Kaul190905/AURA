import React, { useState, ReactNode } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { colors, neuSm, radius, spacing, fonts } from '../theme';
import { ChevronDown } from 'lucide-react-native';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface AccordionProps {
  children: ReactNode;
}

interface AccItemProps {
  id: string;
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function AccItem({ title, icon, badge, children, defaultOpen = false }: AccItemProps) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={[styles.card, open && styles.cardOpen]}>
      <TouchableOpacity onPress={toggle} style={styles.header} activeOpacity={0.8}>
        {icon && (
          <View style={styles.iconWrap}>
            {icon}
          </View>
        )}
        <View style={styles.labelWrap}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>
        {badge}
        <ChevronDown
          size={18}
          color={colors.mutedForeground}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </TouchableOpacity>
      {open && (
        <View style={styles.body}>
          {children}
        </View>
      )}
    </View>
  );
}

export function Accordion({ children }: AccordionProps) {
  return (
    <View style={styles.container}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: 10,
  },
  card: {
    borderRadius: radius.xl,
    backgroundColor: colors.background,
    marginBottom: 10,
    ...neuSm,
  },
  cardOpen: {
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    gap: spacing.md,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...neuSm,
  },
  labelWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    color: colors.foreground,
    ...fonts.semibold,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
});
