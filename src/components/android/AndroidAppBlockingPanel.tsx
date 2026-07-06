import React, { useCallback, useMemo, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { ChildDeviceAppsList } from './ChildDeviceAppsList';
import { AuthButton } from '../AuthButton';
import { InfoTipCard } from '../parent/InfoTipCard';
import { useTheme } from '../../context/ThemeContext';
import {
  isAndroidAppBlockingSupported,
  openAccessibilitySettings,
} from '../../lib/androidAppBlocking';
import { openUsageAccessSettings } from '../../lib/androidUsageStats';
import type { InstalledApp } from '../../types/installedApp';
import type { ColorPalette } from '../../theme/colors';
import { spacing, typography } from '../../theme';

type AndroidAppBlockingPanelProps = {
  accessibilityEnabled: boolean;
  usageAccessGranted: boolean;
  usageStatsSupported: boolean;
  appsLoading: boolean;
  blockedCount: number;
  blockedPackages: string[];
  installedApps: InstalledApp[];
  syncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  onRefreshAccessibility: () => Promise<void>;
  onRefreshUsageAccess: () => Promise<void>;
  onSyncNow: () => Promise<void>;
};

export function AndroidAppBlockingPanel({
  accessibilityEnabled,
  usageAccessGranted,
  usageStatsSupported,
  appsLoading,
  blockedCount,
  blockedPackages,
  installedApps,
  syncing,
  lastSyncedAt,
  error,
  onRefreshAccessibility,
  onRefreshUsageAccess,
  onSyncNow,
}: AndroidAppBlockingPanelProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [openingAccessibilitySettings, setOpeningAccessibilitySettings] =
    useState(false);
  const [openingUsageSettings, setOpeningUsageSettings] = useState(false);

  const handleOpenAccessibilitySettings = useCallback(async () => {
    setOpeningAccessibilitySettings(true);
    try {
      await openAccessibilitySettings();
    } finally {
      setOpeningAccessibilitySettings(false);
    }
  }, []);

  const handleOpenUsageSettings = useCallback(async () => {
    setOpeningUsageSettings(true);
    try {
      await openUsageAccessSettings();
    } finally {
      setOpeningUsageSettings(false);
    }
  }, []);

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void onRefreshAccessibility();
        void onRefreshUsageAccess();
      }
    });

    return () => subscription.remove();
  }, [onRefreshAccessibility, onRefreshUsageAccess]);

  if (!isAndroidAppBlockingSupported()) {
    return (
      <InfoTipCard message="Rebuild the Android app to enable native app blocking on this device." />
    );
  }

  return (
    <View style={styles.container}>
      {!accessibilityEnabled ? (
        <InfoTipCard message="Step 1: Enable ParentKey in Android Accessibility settings. Step 2: Keep this app signed in so blocked apps sync from your parent. Blocked apps stay open but show a lock overlay on top." />
      ) : null}

      {usageStatsSupported && !usageAccessGranted ? (
        <InfoTipCard message="Enable Usage access for ParentKey so your parent can see how long each app is used. Open Usage access settings, find ParentKey, and turn it on." />
      ) : null}

      <View style={styles.statusCard}>
        <StatusRow
          label="Accessibility service"
          value={accessibilityEnabled ? 'Enabled' : 'Required'}
          valueColor={accessibilityEnabled ? colors.success : colors.error}
        />
        {usageStatsSupported ? (
          <StatusRow
            label="Usage access"
            value={usageAccessGranted ? 'Enabled' : 'Required'}
            valueColor={usageAccessGranted ? colors.success : colors.error}
          />
        ) : null}
        <StatusRow
          label="Blocked apps on device"
          value={String(blockedCount)}
        />
        <StatusRow
          label="Last synced"
          value={
            lastSyncedAt
              ? new Date(lastSyncedAt).toLocaleString()
              : syncing
                ? 'Syncing...'
                : 'Not yet'
          }
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {!accessibilityEnabled ? (
        <AuthButton
          loading={openingAccessibilitySettings}
          onPress={() => void handleOpenAccessibilitySettings()}
          title="Enable app blocking"
        />
      ) : null}

      {usageStatsSupported && !usageAccessGranted ? (
        <AuthButton
          loading={openingUsageSettings}
          onPress={() => void handleOpenUsageSettings()}
          title="Enable usage tracking"
          variant="secondary"
        />
      ) : null}

      <AuthButton
        loading={syncing}
        onPress={() => void onSyncNow()}
        title="Sync apps and rules"
        variant="primary"
      />

      <ChildDeviceAppsList
        apps={installedApps}
        blockedPackages={blockedPackages}
        loading={appsLoading || syncing}
      />
    </View>
  );
}

type StatusRowProps = {
  label: string;
  value: string;
  valueColor?: string;
};

function StatusRow({ label, value, valueColor }: StatusRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStatusStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

function createStatusStyles(colors: ColorPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    label: {
      ...typography.caption,
      color: colors.text.secondary,
      flex: 1,
    },
    value: {
      ...typography.caption,
      color: colors.text.primary,
      fontWeight: '700',
      textAlign: 'right',
    },
  });
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      gap: spacing.md,
    },
    statusCard: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: 12,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.md,
    },
    errorText: {
      ...typography.caption,
      color: colors.error,
    },
  });
}
