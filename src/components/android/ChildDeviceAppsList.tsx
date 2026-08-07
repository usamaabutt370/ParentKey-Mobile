import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  HorizontalAppsStrip,
  type HorizontalAppItem,
} from '../HorizontalAppsStrip';
import { useTheme } from '../../context/ThemeContext';
import type { InstalledApp } from '../../types/installedApp';
import type { ColorPalette } from '../../theme/colors';
import { spacing, typography } from '../../theme';

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

  const { blockedItems, availableItems } = useMemo(() => {
    const blocked: HorizontalAppItem[] = [];
    const available: HorizontalAppItem[] = [];

    for (const app of apps) {
      const item: HorizontalAppItem = {
        id: app.id,
        packageName: app.packageName,
        name: app.name,
        iconUri: app.iconUri,
        iconBase64: app.iconBase64,
      };

      if (blockedSet.has(app.packageName)) {
        blocked.push({ ...item, subtitle: 'Blocked' });
      } else {
        available.push({ ...item, subtitle: 'Available' });
      }
    }

    blocked.sort((left, right) => left.name.localeCompare(right.name));
    available.sort((left, right) => left.name.localeCompare(right.name));

    return { blockedItems: blocked, availableItems: available };
  }, [apps, blockedSet]);

  if (loading && apps.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.pageTitle}>Apps on this device</Text>
        <Text style={styles.emptyText}>Loading apps...</Text>
      </View>
    );
  }

  if (apps.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.pageTitle}>Apps on this device</Text>
        <Text style={styles.emptyText}>
          Tap Sync apps now to scan apps on this phone.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Apps on this device</Text>
        <Text style={styles.sectionMeta}>
          {blockedItems.length} blocked · {availableItems.length} available
        </Text>
      </View>

      <HorizontalAppsStrip
        countLabel={`${blockedItems.length} apps`}
        emptyMessage="No apps are blocked right now."
        items={blockedItems}
        title="Blocked apps"
      />

      <HorizontalAppsStrip
        countLabel={`${availableItems.length} apps`}
        emptyMessage="No available apps found on this device."
        items={availableItems}
        title="Available apps"
      />
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      gap: spacing.md,
    },
    pageHeader: {
      gap: spacing.xs,
    },
    pageTitle: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 18,
    },
    sectionMeta: {
      ...typography.caption,
      color: colors.text.secondary,
    },
    emptyText: {
      ...typography.caption,
      color: colors.text.secondary,
      lineHeight: 20,
    },
  });
}
