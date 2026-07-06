import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import type { ChildActivitySummary } from '../../types/parentActivity';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type ChildActivityCardProps = {
  summary: ChildActivitySummary;
};

export function ChildActivityCard({ summary }: ChildActivityCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const statusLabel =
    summary.deviceStatus === 'online'
      ? 'Online'
      : summary.deviceStatus === 'offline'
        ? 'Offline'
        : 'No device';

  const statusColor =
    summary.deviceStatus === 'online'
      ? colors.success
      : summary.deviceStatus === 'offline'
        ? colors.error
        : colors.text.secondary;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{summary.childName}</Text>
        <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary.todayLabel}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary.weekLabel}</Text>
          <Text style={styles.statLabel}>This week</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary.blockedAppsCount}</Text>
          <Text style={styles.statLabel}>Blocked</Text>
        </View>
      </View>

      {summary.topAppName ? (
        <Text style={styles.meta}>
          Top app today: {summary.topAppName}
          {summary.topAppTime ? ` · ${summary.topAppTime}` : ''}
        </Text>
      ) : (
        <Text style={styles.meta}>No app usage synced for today yet.</Text>
      )}
    </View>
  );
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
      justifyContent: 'space-between',
    },
    name: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 16,
    },
    status: {
      ...typography.caption,
      fontWeight: '700',
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    stat: {
      flex: 1,
      gap: 2,
    },
    statValue: {
      ...typography.label,
      color: colors.text.primary,
    },
    statLabel: {
      ...typography.caption,
      color: colors.text.secondary,
    },
    meta: {
      ...typography.caption,
      color: colors.text.secondary,
      lineHeight: 18,
    },
  });
}
