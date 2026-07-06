import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../../context/ThemeContext';
import { getAlertIconName } from '../../lib/parentActivity';
import type { ActivityAlert } from '../../types/parentActivity';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type RecentAlertsListProps = {
  alerts: ActivityAlert[];
};

export function RecentAlertsList({ alerts }: RecentAlertsListProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (alerts.length === 0) {
    return (
      <Text style={styles.emptyText}>
        No recent activity yet. Alerts appear when apps are blocked, usage is
        synced, or a device stops syncing.
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      {alerts.map(alert => (
        <View key={alert.id} style={styles.alertRow}>
          <View style={styles.iconWrap}>
            <Feather
              color={colors.text.brand}
              name={getAlertIconName(alert.type)}
              size={16}
            />
          </View>
          <View style={styles.alertInfo}>
            <Text style={styles.alertTitle}>
              {alert.childName} · {alert.message}
            </Text>
            <Text style={styles.alertTime}>{alert.timeAgo}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    list: {
      gap: spacing.sm,
    },
    alertRow: {
      alignItems: 'center',
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
    },
    iconWrap: {
      alignItems: 'center',
      backgroundColor: colors.background.accent,
      borderRadius: radii.pill,
      height: 36,
      justifyContent: 'center',
      width: 36,
    },
    alertInfo: {
      flex: 1,
      gap: spacing.xs,
    },
    alertTitle: {
      ...typography.caption,
      color: colors.text.primary,
      fontWeight: '600',
      lineHeight: 18,
    },
    alertTime: {
      ...typography.caption,
      color: colors.text.secondary,
      fontSize: 11,
    },
    emptyText: {
      ...typography.body,
      color: colors.text.secondary,
      lineHeight: 22,
    },
  });
}
