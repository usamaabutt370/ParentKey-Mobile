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
  iconUri?: string | null;
  iconBase64?: string | null;
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
    iconUri: app.iconUri ?? null,
    iconBase64: app.iconBase64 ?? null,
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

export type AppIconData = {
  iconUri?: string | null;
  iconBase64?: string | null;
};

type AppWithPackage = {
  packageName: string;
  iconUri?: string | null;
  iconBase64?: string | null;
};

export async function mergeInstalledAppIcons<T extends AppWithPackage>(
  apps: T[],
): Promise<T[]> {
  if (Platform.OS !== 'android') {
    return apps;
  }

  try {
    const { apps: localApps } = await fetchInstalledApps();
    const localByPackage = new Map(
      localApps.map(app => [app.packageName, app]),
    );

    return apps.map(app => {
      const local = localByPackage.get(app.packageName);
      if (!local) {
        return app;
      }

      return {
        ...app,
        iconUri: app.iconUri ?? local.iconUri ?? null,
        iconBase64: app.iconBase64 ?? local.iconBase64 ?? null,
      };
    });
  } catch {
    return apps;
  }
}

export function buildAppIconLookup(
  apps: AppWithPackage[],
): Map<string, AppIconData> {
  return new Map(
    apps.map(app => [
      app.packageName,
      {
        iconUri: app.iconUri ?? null,
        iconBase64: app.iconBase64 ?? null,
      },
    ]),
  );
}
