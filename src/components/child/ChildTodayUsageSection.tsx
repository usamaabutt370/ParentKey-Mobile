import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  HorizontalAppsStrip,
  type HorizontalAppItem,
} from '../HorizontalAppsStrip';
import { useTheme } from '../../context/ThemeContext';
import {
  fetchDailyAppUsage,
  isUsageAccessGranted,
} from '../../lib/androidUsageStats';
import {
  filterUsageRecords,
  formatUsageDuration,
  getLocalDateOffset,
} from '../../lib/appUsage';
import type { InstalledApp } from '../../types/installedApp';
import type { ColorPalette } from '../../theme/colors';
import { spacing, typography } from '../../theme';

export type ChildUsageApp = {
  packageName: string;
  name: string;
  foregroundSeconds: number;
  timeLabel: string;
  iconUri?: string | null;
  iconBase64?: string | null;
};

type ChildTodayUsageSectionProps = {
  installedApps: InstalledApp[];
  usageAccessGranted?: boolean;
  /** Bump/change this after a sync so usage reloads. */
  refreshKey?: string | number | null;
};

function buildTimedApps(
  records: Array<{
    packageName: string;
    appName: string;
    usageDate: string;
    foregroundSeconds: number;
  }>,
  installedApps: InstalledApp[],
): ChildUsageApp[] {
  const today = getLocalDateOffset(0);
  const iconByPackage = new Map(
    installedApps.map(app => [app.packageName, app] as const),
  );
  const totals = new Map<
    string,
    { name: string; foregroundSeconds: number }
  >();

  for (const record of filterUsageRecords(records)) {
    if (record.usageDate !== today || record.foregroundSeconds <= 0) {
      continue;
    }

    const existing = totals.get(record.packageName);
    if (existing) {
      existing.foregroundSeconds += record.foregroundSeconds;
      continue;
    }

    totals.set(record.packageName, {
      name: record.appName,
      foregroundSeconds: record.foregroundSeconds,
    });
  }

  return Array.from(totals.entries())
    .map(([packageName, value]) => {
      const installed = iconByPackage.get(packageName);
      return {
        packageName,
        name: installed?.name ?? value.name,
        foregroundSeconds: value.foregroundSeconds,
        timeLabel: formatUsageDuration(value.foregroundSeconds),
        iconUri: installed?.iconUri,
        iconBase64: installed?.iconBase64,
      };
    })
    .sort((left, right) => right.foregroundSeconds - left.foregroundSeconds);
}

export function ChildTodayUsageSection({
  installedApps,
  usageAccessGranted = true,
  refreshKey,
}: ChildTodayUsageSectionProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [apps, setApps] = useState<ChildUsageApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsage = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setApps([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const granted =
        usageAccessGranted || (await isUsageAccessGranted());
      if (!granted) {
        setApps([]);
        setError('Turn on Usage access to see today’s app time.');
        return;
      }

      const records = await fetchDailyAppUsage(1);
      setApps(buildTimedApps(records, installedApps));
    } catch (loadError) {
      setApps([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load app usage.',
      );
    } finally {
      setLoading(false);
    }
  }, [installedApps, usageAccessGranted]);

  useFocusEffect(
    useCallback(() => {
      void loadUsage();
    }, [loadUsage, refreshKey]),
  );

  const usageItems = useMemo<HorizontalAppItem[]>(
    () =>
      apps.map(app => ({
        id: app.packageName,
        packageName: app.packageName,
        name: app.name,
        subtitle: app.timeLabel,
        iconUri: app.iconUri,
        iconBase64: app.iconBase64,
      })),
    [apps],
  );

  if (Platform.OS !== 'android') {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={styles.title}>Today’s usage</Text>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand.tealLight} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.section}>
        <Text style={styles.title}>Today’s usage</Text>
        <Text style={styles.hint}>{error}</Text>
      </View>
    );
  }

  return (
    <HorizontalAppsStrip
      emptyMessage="No timed app usage yet today. Open some apps, then sync or come back later."
      items={usageItems}
      title="Today’s usage"
    />
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    section: {
      gap: spacing.md,
    },
    title: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 18,
    },
    centered: {
      alignItems: 'center',
      minHeight: 88,
      justifyContent: 'center',
    },
    hint: {
      ...typography.body,
      color: colors.text.secondary,
      lineHeight: 20,
    },
  });
}
