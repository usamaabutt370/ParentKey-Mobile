import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { AppIcon } from '../AppIcon';
import { useTheme } from '../../context/ThemeContext';
import type { InstalledApp } from '../../types/installedApp';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type ChildDeviceAppsListProps = {
  apps: InstalledApp[];
  blockedPackages: string[];
  loading?: boolean;
};

export function ChildDeviceAppsList({
  apps,
  blockedPackages,
  loading = false,
}: ChildDeviceAppsListProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const blockedSet = useMemo(
    () => new Set(blockedPackages),
    [blockedPackages],
  );

  const sortedApps = useMemo(() => {
    return [...apps].sort((left, right) => {
      const leftBlocked = blockedSet.has(left.packageName);
      const rightBlocked = blockedSet.has(right.packageName);

      if (leftBlocked !== rightBlocked) {
        return leftBlocked ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });
  }, [apps, blockedSet]);

  const blockedCount = blockedPackages.length;

  if (loading && apps.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Apps on this device</Text>
        <Text style={styles.emptyText}>Loading apps...</Text>
      </View>
    );
  }

  if (apps.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Apps on this device</Text>
        <Text style={styles.emptyText}>
          Tap Sync apps and rules to scan apps on this phone.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Apps on this device</Text>
        <Text style={styles.sectionMeta}>
          {blockedCount} blocked · {apps.length} total
        </Text>
      </View>

      <View style={styles.list}>
        {sortedApps.map(app => {
          const isBlocked = blockedSet.has(app.packageName);

          return (
            <View
              key={app.id}
              style={[styles.row, isBlocked && styles.rowBlocked]}>
              <AppIcon
                iconBase64={app.iconBase64}
                iconUri={app.iconUri}
                name={app.name}
                packageName={app.packageName}
                size={40}
              />
              <View style={styles.appInfo}>
                <Text style={styles.appName}>{app.name}</Text>
                <Text style={styles.packageName}>{app.packageName}</Text>
              </View>
              {isBlocked ? (
                <View style={styles.blockedBadge}>
                  <Feather color={colors.error} name="lock" size={14} />
                  <Text style={styles.blockedText}>Blocked</Text>
                </View>
              ) : (
                <Text style={styles.allowedText}>Allowed</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      gap: spacing.sm,
    },
    sectionHeader: {
      gap: spacing.xs,
    },
    sectionTitle: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 16,
    },
    sectionMeta: {
      ...typography.caption,
      color: colors.text.secondary,
    },
    list: {
      gap: spacing.sm,
    },
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
    rowBlocked: {
      borderColor: colors.error,
    },
    appInfo: {
      flex: 1,
      gap: 2,
    },
    appName: {
      ...typography.label,
      color: colors.text.primary,
    },
    packageName: {
      ...typography.caption,
      color: colors.text.placeholder,
      fontSize: 11,
    },
    blockedBadge: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
    },
    blockedText: {
      ...typography.caption,
      color: colors.error,
      fontWeight: '700',
    },
    allowedText: {
      ...typography.caption,
      color: colors.success,
      fontWeight: '600',
    },
    emptyText: {
      ...typography.caption,
      color: colors.text.secondary,
      lineHeight: 20,
    },
  });
}
