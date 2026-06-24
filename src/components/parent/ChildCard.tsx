import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import type { MockChild } from '../../constants/mockParentData';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

const STATUS_LABELS: Record<MockChild['status'], string> = {
  online: 'Online',
  offline: 'Offline',
  locked: 'Locked',
};

type ChildCardProps = {
  child: MockChild;
};

export function ChildCard({ child }: ChildCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statusColor = getStatusColor(colors, child.status);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{child.name.charAt(0)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{child.name}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.status, { color: statusColor }]}>
              {STATUS_LABELS[child.status]}
            </Text>
          </View>
        </View>
        <Text style={styles.screenTime}>{child.screenTimeToday}</Text>
      </View>
      {child.currentApp ? (
        <Text style={styles.currentApp}>Using {child.currentApp}</Text>
      ) : null}
    </View>
  );
}

function getStatusColor(colors: ColorPalette, status: MockChild['status']) {
  switch (status) {
    case 'online':
      return colors.success;
    case 'locked':
      return colors.error;
    default:
      return colors.text.placeholder;
  }
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.md,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
    },
    avatar: {
      alignItems: 'center',
      backgroundColor: colors.background.accentStrong,
      borderRadius: radii.pill,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    avatarText: {
      ...typography.label,
      color: colors.text.brand,
      fontSize: 18,
    },
    info: {
      flex: 1,
      gap: spacing.xs,
    },
    name: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 16,
    },
    statusRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
    },
    statusDot: {
      borderRadius: radii.pill,
      height: 8,
      width: 8,
    },
    status: {
      ...typography.caption,
      fontWeight: '600',
    },
    screenTime: {
      ...typography.label,
      color: colors.text.brand,
    },
    currentApp: {
      ...typography.caption,
      color: colors.text.secondary,
    },
  });
}
