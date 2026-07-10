import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../../context/ThemeContext';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type LinkMethod = 'form' | 'qr';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (method: LinkMethod) => void;
};

type OptionProps = {
  colors: ColorPalette;
  description: string;
  icon: string;
  onPress: () => void;
  title: string;
};

function LinkMethodOption({
  colors,
  description,
  icon,
  onPress,
  title,
}: OptionProps) {
  const styles = useMemo(() => createOptionStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Feather color={colors.text.secondary} name="chevron-right" size={20} />
    </Pressable>
  );
}

export function LinkChildMethodModal({ visible, onClose, onSelect }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.heading}>Link a child</Text>
          <Text style={styles.subtitle}>
            Choose how you want to connect your child&apos;s device.
          </Text>

          <LinkMethodOption
            colors={colors}
            description="Set up their profile and login email/password manually."
            icon="📝"
            onPress={() => onSelect('form')}
            title="Create account"
          />
          <LinkMethodOption
            colors={colors}
            description="Show a QR code for your child to scan on their device. No login needed."
            icon="📷"
            onPress={() => onSelect('qr')}
            title="Scan QR code"
          />

          <Pressable accessibilityRole="button" onPress={onClose}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    backdrop: {
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      flex: 1,
      justifyContent: 'center',
      padding: spacing.lg,
    },
    card: {
      backgroundColor: colors.background.primary,
      borderRadius: radii.lg,
      gap: spacing.md,
      padding: spacing.lg,
      width: '100%',
    },
    heading: {
      ...typography.title,
      color: colors.text.primary,
      fontSize: 24,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.subtitle,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    cancel: {
      ...typography.label,
      color: colors.text.secondary,
      paddingTop: spacing.xs,
      textAlign: 'center',
    },
  });
}

function createOptionStyles(colors: ColorPalette) {
  return StyleSheet.create({
    option: {
      alignItems: 'center',
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.md,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
    },
    optionPressed: {
      opacity: 0.85,
    },
    iconWrap: {
      alignItems: 'center',
      backgroundColor: colors.background.accentStrong,
      borderRadius: radii.pill,
      height: 48,
      justifyContent: 'center',
      width: 48,
    },
    icon: {
      fontSize: 24,
    },
    copy: {
      flex: 1,
      gap: spacing.xs,
    },
    title: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 16,
    },
    description: {
      ...typography.caption,
      color: colors.text.secondary,
    },
  });
}
