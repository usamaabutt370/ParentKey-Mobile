import { NativeModules, Platform } from 'react-native';
import {
  canDrawOverlays,
  isAccessibilityServiceEnabled,
  isAndroidAppBlockingSupported,
  openAccessibilitySettings,
  openOverlaySettings,
} from './androidAppBlocking';
import {
  isAndroidUsageStatsSupported,
  isUsageAccessGranted,
  openUsageAccessSettings,
} from './androidUsageStats';

type AppBlockingProtectionModule = {
  isIgnoringBatteryOptimizations: () => Promise<boolean>;
  openBatteryOptimizationSettings: () => Promise<boolean>;
  openAutostartSettings: () => Promise<boolean>;
  isDeviceAdminActive: () => Promise<boolean>;
  requestDeviceAdmin: () => Promise<boolean>;
  deactivateDeviceAdmin: () => Promise<boolean>;
};

const protectionModule = NativeModules.AppBlocking as
  | AppBlockingProtectionModule
  | undefined;

function hasProtectionApis(): boolean {
  return (
    isAndroidAppBlockingSupported() &&
    protectionModule != null &&
    typeof protectionModule.isIgnoringBatteryOptimizations === 'function' &&
    typeof protectionModule.requestDeviceAdmin === 'function'
  );
}

function isProtectionSupported(): boolean {
  return Platform.OS === 'android' && hasProtectionApis();
}

export async function isIgnoringBatteryOptimizations(): Promise<boolean> {
  if (!isProtectionSupported()) {
    return false;
  }

  return protectionModule!.isIgnoringBatteryOptimizations();
}

export async function openBatteryOptimizationSettings(): Promise<void> {
  if (!isProtectionSupported()) {
    return;
  }

  await protectionModule!.openBatteryOptimizationSettings();
}

export async function openAutostartSettings(): Promise<void> {
  if (!isProtectionSupported()) {
    return;
  }

  await protectionModule!.openAutostartSettings();
}

export async function isDeviceAdminActive(): Promise<boolean> {
  if (!isProtectionSupported()) {
    return false;
  }

  return protectionModule!.isDeviceAdminActive();
}

export async function requestDeviceAdmin(): Promise<void> {
  if (!isProtectionSupported()) {
    throw new Error(
      'Device admin is not available. Rebuild the child app and try again.',
    );
  }

  await protectionModule!.requestDeviceAdmin();
}

export async function deactivateDeviceAdmin(): Promise<void> {
  if (!isProtectionSupported()) {
    throw new Error(
      'Device admin is not available. Rebuild the child app and try again.',
    );
  }

  await protectionModule!.deactivateDeviceAdmin();
}

export type ChildPermissionKey =
  | 'usage'
  | 'accessibility'
  | 'overlay'
  | 'background'
  | 'deviceAdmin';

export type ChildPermissionStep = {
  key: ChildPermissionKey;
  icon: string;
  title: string;
  description: string;
  buttonTitle: string;
  secondaryButtonTitle?: string;
  isGranted: () => Promise<boolean>;
  openSettings: () => Promise<void>;
  openSecondarySettings?: () => Promise<void>;
};

export function getChildPermissionSteps(): ChildPermissionStep[] {
  const steps: ChildPermissionStep[] = [];

  if (isAndroidUsageStatsSupported()) {
    steps.push({
      key: 'usage',
      icon: '📊',
      title: 'Allow usage access',
      description:
        'ParentKey needs Usage access to see how long each app is used. Android requires you to turn this on in Settings.',
      buttonTitle: 'Open Usage settings',
      isGranted: isUsageAccessGranted,
      openSettings: openUsageAccessSettings,
    });
  }

  if (!isAndroidAppBlockingSupported()) {
    return steps;
  }

  steps.push(
    {
      key: 'accessibility',
      icon: '🔒',
      title: 'Enable app blocking',
      description:
        'ParentKey needs Accessibility access to block apps your parent chooses. Turn on ParentKey in the Accessibility list.',
      buttonTitle: 'Open Accessibility settings',
      isGranted: isAccessibilityServiceEnabled,
      openSettings: openAccessibilitySettings,
    },
    {
      key: 'overlay',
      icon: '🖥️',
      title: 'Allow display over apps',
      description:
        'ParentKey shows a lock screen over blocked apps. Allow display over other apps for ParentKey Child.',
      buttonTitle: 'Open Display settings',
      isGranted: canDrawOverlays,
      openSettings: openOverlaySettings,
    },
  );

  if (hasProtectionApis()) {
    steps.push(
      {
        key: 'background',
        icon: '🔋',
        title: 'Keep app running in background',
        description:
          'Disable battery restrictions for ParentKey so protection keeps working after reboot. On some phones, also enable autostart in the next screen.',
        buttonTitle: 'Disable battery restrictions',
        secondaryButtonTitle: 'Open autostart settings',
        isGranted: isIgnoringBatteryOptimizations,
        openSettings: openBatteryOptimizationSettings,
        openSecondarySettings: openAutostartSettings,
      },
      {
        key: 'deviceAdmin',
        icon: '🛡️',
        title: 'Protect against removal',
        description:
          'Turn on device admin for ParentKey Child. This helps prevent the app from being removed without your parent.',
        buttonTitle: 'Enable device admin',
        isGranted: isDeviceAdminActive,
        openSettings: requestDeviceAdmin,
      },
    );
  }

  return steps;
}

export async function areAllChildPermissionsGranted(): Promise<boolean> {
  const steps = getChildPermissionSteps();
  if (steps.length === 0) {
    return true;
  }

  const results = await Promise.all(steps.map(step => step.isGranted()));
  return results.every(Boolean);
}
