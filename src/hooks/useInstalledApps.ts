import { useCallback, useEffect, useState } from 'react';
import { fetchInstalledApps } from '../lib/installedApps';
import type { InstalledApp } from '../types/installedApp';

type UseInstalledAppsState = {
  apps: InstalledApp[];
  loading: boolean;
  error: string | null;
  iosRequiresFamilyPicker: boolean;
  refresh: () => Promise<void>;
};

export function useInstalledApps(): UseInstalledAppsState {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iosRequiresFamilyPicker, setIosRequiresFamilyPicker] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchInstalledApps();
      setApps(result.apps);
      setIosRequiresFamilyPicker(result.iosRequiresFamilyPicker);

      if (result.iosRequiresFamilyPicker) {
        setError(
          'iOS does not allow listing installed apps. App selection must use Apple Screen Time on the child device.',
        );
      }
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Could not load installed apps.';
      setError(message);
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    apps,
    loading,
    error,
    iosRequiresFamilyPicker,
    refresh,
  };
}
