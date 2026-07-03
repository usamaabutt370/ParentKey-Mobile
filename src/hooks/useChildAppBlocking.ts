import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  getAndroidDeviceId,
  isAccessibilityServiceEnabled,
  isAndroidAppBlockingSupported,
  setNativeBlockedPackages,
} from '../lib/androidAppBlocking';
import {
  fetchChildBlockRules,
  registerChildDevice,
  syncChildInstalledApps,
} from '../lib/appRules';
import { fetchInstalledApps } from '../lib/installedApps';
import { resolveIconBase64ForSync } from '../lib/iconCache';
import { supabase } from '../lib/supabase';
import type { InstalledApp } from '../types/installedApp';

type ChildAppBlockingState = {
  supported: boolean;
  accessibilityEnabled: boolean;
  syncing: boolean;
  blockedCount: number;
  blockedPackages: string[];
  installedApps: InstalledApp[];
  appsLoading: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  refreshAccessibilityStatus: () => Promise<void>;
  syncNow: () => Promise<void>;
};

export function useChildAppBlocking(): ChildAppBlockingState {
  const { session } = useAuth();
  const childId = session?.user.id;
  const [supported] = useState(isAndroidAppBlockingSupported());
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [blockedPackages, setBlockedPackages] = useState<string[]>([]);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deviceIdRef = useRef<string | null>(null);

  const refreshAccessibilityStatus = useCallback(async () => {
    if (!supported) {
      return;
    }

    const enabled = await isAccessibilityServiceEnabled();
    setAccessibilityEnabled(enabled);
  }, [supported]);

  const loadInstalledApps = useCallback(async () => {
    if (!supported || Platform.OS !== 'android') {
      return;
    }

    setAppsLoading(true);

    try {
      const installedResult = await fetchInstalledApps();
      setInstalledApps(installedResult.apps);
    } catch {
      // Keep any apps already loaded from a previous sync.
    } finally {
      setAppsLoading(false);
    }
  }, [supported]);

  const applyBlockRules = useCallback(async () => {
    if (!childId || !supported) {
      return;
    }

    const rulesResult = await fetchChildBlockRules(childId);
    if (!rulesResult.ok) {
      setError(rulesResult.message);
      return;
    }

    const packageNames = rulesResult.rules.map(rule => rule.packageName);
    await setNativeBlockedPackages(packageNames);
    setBlockedPackages(packageNames);
    setBlockedCount(packageNames.length);
  }, [childId, supported]);

  const syncNow = useCallback(async () => {
    if (!childId || !supported || Platform.OS !== 'android') {
      return;
    }

    setSyncing(true);
    setError(null);

    try {
      const deviceKey = await getAndroidDeviceId();
      const deviceResult = await registerChildDevice({
        childId,
        deviceKey,
        platform: 'android',
        deviceLabel: 'Android device',
      });

      if (!deviceResult.ok) {
        setError(deviceResult.message);
        return;
      }

      deviceIdRef.current = deviceResult.device.id;

      const installedResult = await fetchInstalledApps();
      setInstalledApps(installedResult.apps);

      const appsWithIcons = await Promise.all(
        installedResult.apps.map(async app => ({
          packageName: app.packageName,
          appName: app.name,
          isSystemApp: app.isSystemApp,
          category: app.category,
          iconBase64: await resolveIconBase64ForSync(app),
        })),
      );

      const syncResult = await syncChildInstalledApps({
        childId,
        deviceId: deviceResult.device.id,
        apps: appsWithIcons,
      });

      if (!syncResult.ok) {
        setError(syncResult.message);
        return;
      }

      await applyBlockRules();
      setLastSyncedAt(new Date().toISOString());
    } catch (syncError) {
      const message =
        syncError instanceof Error
          ? syncError.message
          : 'Could not sync apps and rules.';
      setError(message);
    } finally {
      setSyncing(false);
    }
  }, [applyBlockRules, childId, supported]);

  useEffect(() => {
    void refreshAccessibilityStatus();
  }, [refreshAccessibilityStatus]);

  useEffect(() => {
    if (!childId || !supported) {
      return;
    }

    void loadInstalledApps();
    void syncNow();
  }, [childId, loadInstalledApps, supported, syncNow]);

  useEffect(() => {
    if (!childId || !supported) {
      return;
    }

    const channel = supabase
      .channel(`child-block-rules-${childId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_block_rules',
          filter: `child_id=eq.${childId}`,
        },
        () => {
          void applyBlockRules();
        },
      )
      .subscribe();

    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void refreshAccessibilityStatus();
        void loadInstalledApps();
        void applyBlockRules();
      }
    });

    return () => {
      void supabase.removeChannel(channel);
      subscription.remove();
    };
  }, [applyBlockRules, childId, loadInstalledApps, refreshAccessibilityStatus, supported]);

  return {
    supported,
    accessibilityEnabled,
    syncing,
    blockedCount,
    blockedPackages,
    installedApps,
    appsLoading,
    lastSyncedAt,
    error,
    refreshAccessibilityStatus,
    syncNow,
  };
}
