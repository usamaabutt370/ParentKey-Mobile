import { NativeModules, Platform } from 'react-native';

type AppBlockingModule = {
  getDeviceId: () => Promise<string>;
  setBlockedPackages: (packages: string[]) => Promise<number>;
  getBlockedPackages: () => Promise<string[]>;
  isAccessibilityServiceEnabled: () => Promise<boolean>;
  openAccessibilitySettings: () => Promise<boolean>;
  canDrawOverlays: () => Promise<boolean>;
  openOverlaySettings: () => Promise<boolean>;
};

const appBlockingModule = NativeModules.AppBlocking as AppBlockingModule | undefined;

export function isAndroidAppBlockingSupported(): boolean {
  return Platform.OS === 'android' && appBlockingModule != null;
}

function requireModule(): AppBlockingModule {
  if (!isAndroidAppBlockingSupported()) {
    throw new Error(
      'App blocking is only available on Android. Rebuild the app and try again.',
    );
  }

  return appBlockingModule!;
}

export async function getAndroidDeviceId(): Promise<string> {
  return requireModule().getDeviceId();
}

export async function setNativeBlockedPackages(
  packageNames: string[],
): Promise<void> {
  await requireModule().setBlockedPackages(packageNames);
}

export async function getNativeBlockedPackages(): Promise<string[]> {
  return requireModule().getBlockedPackages();
}

export async function isAccessibilityServiceEnabled(): Promise<boolean> {
  if (!isAndroidAppBlockingSupported()) {
    return false;
  }

  return appBlockingModule!.isAccessibilityServiceEnabled();
}

export async function openAccessibilitySettings(): Promise<void> {
  await requireModule().openAccessibilitySettings();
}

export async function canDrawOverlays(): Promise<boolean> {
  if (!isAndroidAppBlockingSupported()) {
    return false;
  }

  return appBlockingModule!.canDrawOverlays();
}

export async function openOverlaySettings(): Promise<void> {
  await requireModule().openOverlaySettings();
}
