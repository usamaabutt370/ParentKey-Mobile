import { NativeModules, Platform } from 'react-native';

export type NativeDailyAppUsage = {
  packageName: string;
  appName: string;
  usageDate: string;
  foregroundSeconds: number;
};

type UsageStatsModule = {
  isUsageAccessGranted: () => Promise<boolean>;
  openUsageAccessSettings: () => Promise<boolean>;
  getDailyAppUsage: (daysBack: number) => Promise<NativeDailyAppUsage[]>;
};

const usageStatsModule = NativeModules.UsageStats as UsageStatsModule | undefined;

export function isAndroidUsageStatsSupported(): boolean {
  return Platform.OS === 'android' && usageStatsModule != null;
}

function requireModule(): UsageStatsModule {
  if (!isAndroidUsageStatsSupported()) {
    throw new Error(
      'Usage stats are only available on Android. Rebuild the app and try again.',
    );
  }

  return usageStatsModule!;
}

export async function isUsageAccessGranted(): Promise<boolean> {
  if (!isAndroidUsageStatsSupported()) {
    return false;
  }

  return usageStatsModule!.isUsageAccessGranted();
}

export async function openUsageAccessSettings(): Promise<void> {
  await requireModule().openUsageAccessSettings();
}

export async function fetchDailyAppUsage(
  daysBack = 1,
): Promise<NativeDailyAppUsage[]> {
  const records = await requireModule().getDailyAppUsage(daysBack);

  return records.map(record => ({
    packageName: record.packageName,
    appName: record.appName,
    usageDate: record.usageDate,
    foregroundSeconds: Math.max(0, Math.round(record.foregroundSeconds)),
  }));
}
