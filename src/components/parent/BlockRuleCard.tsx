import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../../context/ThemeContext';
import type { AppBlockRule } from '../../lib/appRules';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type BlockedAppRowProps = {
  rule: AppBlockRule;
  onUnblock: () => void;
  unblocking?: boolean;
};

export function BlockedAppRow({
  rule,
  onUnblock,
  unblocking = false,
}: BlockedAppRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const displayName = rule.appName ?? rule.packageName;

  return (
    <View style={styles.row}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>{displayName.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.package}>{rule.packageName}</Text>
      </View>
      <Pressable
        accessibilityLabel={`Unblock ${displayName}`}
        accessibilityRole="button"
        disabled={unblocking}
        onPress={onUnblock}
        style={({ pressed }) => [
          styles.unblockButton,
          pressed && styles.unblockButtonPressed,
          unblocking && styles.unblockButtonDisabled,
        ]}>
        <Text style={styles.unblockText}>{unblocking ? '...' : 'Unblock'}</Text>
      </Pressable>
    </View>
  );
}

type ActiveBlockRuleCardProps = {
  childName: string;
  rules: AppBlockRule[];
  onPress?: () => void;
};

export function ActiveBlockRuleCard({
  childName,
  rules,
  onPress,
}: ActiveBlockRuleCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createCardStyles(colors), [colors]);

  const appNames = rules
    .map(rule => rule.appName ?? rule.packageName)
    .join(', ');

  const content = (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Blocked apps</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Active</Text>
        </View>
      </View>
      <Text style={styles.childName}>{childName}</Text>
      <Text style={styles.description}>{appNames}</Text>
      {onPress ? (
        <View style={styles.footer}>
          <Text style={styles.footerText}>Manage</Text>
          <Feather color={colors.text.brand} name="chevron-right" size={16} />
        </View>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.card}>{content}</View>;
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    row: {
      alignItems: 'center',
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
    },
    icon: {
      alignItems: 'center',
      backgroundColor: colors.background.accentStrong,
      borderRadius: radii.pill,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    iconText: {
      ...typography.label,
      color: colors.text.brand,
      fontSize: 16,
    },
    info: {
      flex: 1,
      gap: spacing.xs,
    },
    name: {
      ...typography.label,
      color: colors.text.primary,
    },
    package: {
      ...typography.caption,
      color: colors.text.placeholder,
    },
    unblockButton: {
      borderColor: colors.border.strong,
      borderRadius: radii.pill,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    unblockButtonPressed: {
      opacity: 0.85,
    },
    unblockButtonDisabled: {
      opacity: 0.5,
    },
    unblockText: {
      ...typography.caption,
      color: colors.text.primary,
      fontWeight: '700',
    },
  });
}

function createCardStyles(colors: ColorPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.xs,
      padding: spacing.md,
    },
    cardPressed: {
      opacity: 0.9,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    title: {
      ...typography.label,
      color: colors.text.primary,
      flex: 1,
      fontSize: 16,
    },
    badge: {
      backgroundColor: colors.background.accent,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    badgeText: {
      ...typography.caption,
      color: colors.text.brand,
      fontWeight: '600',
    },
    childName: {
      ...typography.caption,
      color: colors.text.brand,
      fontWeight: '700',
    },
    description: {
      ...typography.caption,
      color: colors.text.secondary,
      lineHeight: 20,
    },
    footer: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'flex-end',
      marginTop: spacing.xs,
    },
    footerText: {
      ...typography.caption,
      color: colors.text.brand,
      fontWeight: '600',
    },
  });
}
