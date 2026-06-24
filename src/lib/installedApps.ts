import { NativeModules, Platform } from 'react-native';
import { detectAppCategory } from '../constants/appCategories';
import type {
  AppCategory,
  AppCategoryFilter,
  InstalledApp,
  InstalledAppsResult,
} from '../types/installedApp';

type NativeInstalledApp = {
  packageName: string;
  appName: string;
  isSystemApp?: boolean;
};

type InstalledAppsModule = {
  getInstalledApps: () => Promise<NativeInstalledApp[]>;
};

const installedAppsModule = NativeModules.InstalledApps as
  | InstalledAppsModule
  | undefined;

function mapNativeApp(app: NativeInstalledApp): InstalledApp {
  return {
    id: app.packageName,
    name: app.appName,
    packageName: app.packageName,
    isSystemApp: app.isSystemApp ?? false,
    category: detectAppCategory(app.packageName, app.appName),
  };
}

export async function fetchInstalledApps(): Promise<InstalledAppsResult> {
  if (Platform.OS === 'ios') {
    return {
      apps: [],
      platform: 'ios',
      iosRequiresFamilyPicker: true,
    };
  }

  if (!installedAppsModule?.getInstalledApps) {
    throw new Error(
      'Installed apps module is unavailable. Rebuild the Android app and try again.',
    );
  }

  const apps = await installedAppsModule.getInstalledApps();

  return {
    apps: apps
      .map(mapNativeApp)
      .sort((left, right) => left.name.localeCompare(right.name)),
    platform: 'android',
    iosRequiresFamilyPicker: false,
  };
}

export function filterInstalledApps(
  apps: InstalledApp[],
  query: string,
  category: AppCategoryFilter = 'all',
): InstalledApp[] {
  const normalizedQuery = query.trim().toLowerCase();

  return apps.filter(app => {
    const matchesCategory = category === 'all' || app.category === category;
    if (!matchesCategory) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const name = app.name.toLowerCase();
    const packageName = app.packageName.toLowerCase();
    return (
      name.includes(normalizedQuery) || packageName.includes(normalizedQuery)
    );
  });
}

export function getAppsByCategory(
  apps: InstalledApp[],
  category: AppCategory,
): InstalledApp[] {
  return apps.filter(app => app.category === category);
}

export function getSocialApps(apps: InstalledApp[]): InstalledApp[] {
  return getAppsByCategory(apps, 'social');
}
