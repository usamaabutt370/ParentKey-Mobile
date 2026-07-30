import Constants from 'expo-constants';
import { NativeModules } from 'react-native';

export type AppVariant = 'parent' | 'child' | null;

type AppInfoModule = {
  flavor: string;
};

const appInfoModule = NativeModules.AppInfo as AppInfoModule | undefined;

function resolveConfiguredVariant(): AppVariant {
  const fromExtra = Constants.expoConfig?.extra?.appVariant;
  if (fromExtra === 'parent' || fromExtra === 'child') {
    return fromExtra;
  }
  return null;
}

function resolveAppVariant(): AppVariant {
  // Prefer native identity (Android BuildConfig.FLAVOR / iOS bundle id).
  // Metro-embedded expo config alone is wrong when parent+child share one
  // packager — both binaries would otherwise get the same APP_VARIANT.
  const flavor = appInfoModule?.flavor;
  if (flavor === 'parent' || flavor === 'child') {
    return flavor;
  }

  // Fallback: app.config.js extra (EAS release / when native module missing).
  return resolveConfiguredVariant();
}

export const APP_VARIANT: AppVariant = resolveAppVariant();

const DEFAULT_IOS_BUNDLE_IDS = {
  parent: 'com.parentkey.parent',
  child: 'com.parentkey.child',
} as const;

const DEFAULT_IOS_APP_GROUPS = {
  parent: 'group.com.parentkey.parent',
  child: 'group.com.parentkey.child',
} as const;

function resolveIosBundleId(): string | null {
  if (APP_VARIANT === 'parent' || APP_VARIANT === 'child') {
    return DEFAULT_IOS_BUNDLE_IDS[APP_VARIANT];
  }
  return typeof Constants.expoConfig?.extra?.iosBundleId === 'string'
    ? Constants.expoConfig.extra.iosBundleId
    : null;
}

function resolveIosAppGroup(): string | null {
  if (APP_VARIANT === 'parent' || APP_VARIANT === 'child') {
    return DEFAULT_IOS_APP_GROUPS[APP_VARIANT];
  }
  return typeof Constants.expoConfig?.extra?.iosAppGroup === 'string'
    ? Constants.expoConfig.extra.iosAppGroup
    : null;
}

export const IOS_BUNDLE_ID: string | null = resolveIosBundleId();

export const IOS_CONFIGURED_APP_GROUP: string | null = resolveIosAppGroup();
