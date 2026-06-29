import { Platform } from 'react-native';
import {
  AuthorizationStatus,
  type DeviceActivityEvent,
} from 'react-native-device-activity';
import * as ReactNativeDeviceActivity from 'react-native-device-activity';
import {
  IOS_DEFAULT_DAILY_LIMIT_MINUTES,
  IOS_LIMIT_MONITOR_PREFIX,
  IOS_SCREEN_TIME_SELECTION_IDS,
  IOS_SHIELD_IDS,
} from '../constants/iosScreenTime';

export type IOSScreenTimeMode = 'block' | 'limit';

export type IOSScreenTimeAuthorizationStatus =
  | 'notDetermined'
  | 'denied'
  | 'approved'
  | 'unknown';

export type IOSSelectionSummary = {
  applicationCount: number;
  categoryCount: number;
  webDomainCount: number;
};

export function isIOSScreenTimeSupported(): boolean {
  return Platform.OS === 'ios' && ReactNativeDeviceActivity.isAvailable();
}

export function getSelectionId(mode: IOSScreenTimeMode): string {
  return IOS_SCREEN_TIME_SELECTION_IDS[mode];
}

export function getShieldId(mode: IOSScreenTimeMode): string {
  return IOS_SHIELD_IDS[mode];
}

export function getAuthorizationStatus(): IOSScreenTimeAuthorizationStatus {
  if (!isIOSScreenTimeSupported()) {
    return 'unknown';
  }

  const status = ReactNativeDeviceActivity.getAuthorizationStatus();
  if (status === AuthorizationStatus.approved) {
    return 'approved';
  }
  if (status === AuthorizationStatus.denied) {
    return 'denied';
  }
  if (status === AuthorizationStatus.notDetermined) {
    return 'notDetermined';
  }

  return 'unknown';
}

export async function requestChildAuthorization(): Promise<IOSScreenTimeAuthorizationStatus> {
  if (!isIOSScreenTimeSupported()) {
    return 'unknown';
  }

  await ReactNativeDeviceActivity.requestAuthorization('child');
  return getAuthorizationStatus();
}

/** For local development only — uses the signed-in adult Apple ID on the device. */
export async function requestIndividualAuthorization(): Promise<IOSScreenTimeAuthorizationStatus> {
  if (!isIOSScreenTimeSupported()) {
    return 'unknown';
  }

  await ReactNativeDeviceActivity.requestAuthorization('individual');
  return getAuthorizationStatus();
}

export function formatScreenTimeAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('child and teen') ||
    normalized.includes('child or teen')
  ) {
    return (
      'This iPhone must be signed in with a Child Apple ID from Apple Family Sharing. ' +
      'Signing into ParentKey as a child is not enough — go to Settings → Family on the ' +
      "parent's iPhone to create a child account, then sign that child into iCloud on this device."
    );
  }

  if (normalized.includes('not authorized') || normalized.includes('denied')) {
    return (
      'Screen Time access was denied. Open Settings → Screen Time → App & Website ' +
      'Activity and allow ParentKey.'
    );
  }

  return message;
}

export function getStoredSelectionSummary(
  mode: IOSScreenTimeMode,
): IOSSelectionSummary | null {
  if (!isIOSScreenTimeSupported()) {
    return null;
  }

  const selectionId = getSelectionId(mode);
  const selectionToken =
    ReactNativeDeviceActivity.getFamilyActivitySelectionId(selectionId);

  if (!selectionToken) {
    return null;
  }

  const metadata = ReactNativeDeviceActivity.activitySelectionMetadata({
    activitySelectionId: selectionId,
  });

  if (!metadata) {
    return null;
  }

  return {
    applicationCount: metadata.applicationCount,
    categoryCount: metadata.categoryCount,
    webDomainCount: metadata.webDomainCount,
  };
}

export function hasStoredSelection(mode: IOSScreenTimeMode): boolean {
  const summary = getStoredSelectionSummary(mode);
  if (!summary) {
    return false;
  }

  return (
    summary.applicationCount > 0 ||
    summary.categoryCount > 0 ||
    summary.webDomainCount > 0
  );
}

function configureShield(mode: IOSScreenTimeMode): void {
  const shieldId = getShieldId(mode);
  const shieldConfig =
    mode === 'block'
      ? {
          title: 'App blocked',
          subtitle: 'This app is blocked by ParentKey.',
          primaryButtonLabel: 'OK',
          iconSystemName: 'lock.fill',
        }
      : {
          title: 'Daily limit reached',
          subtitle: 'You have used your allowed time for this app today.',
          primaryButtonLabel: 'OK',
          iconSystemName: 'hourglass',
        };

  const shieldActions = {
    primary: {
      behavior: 'close' as const,
    },
  };

  ReactNativeDeviceActivity.updateShieldWithId(
    shieldConfig,
    shieldActions,
    shieldId,
  );
}

export function applyBlockRules(mode: IOSScreenTimeMode): void {
  if (!isIOSScreenTimeSupported()) {
    throw new Error('Screen Time is only available on a physical iPhone.');
  }

  const selectionId = getSelectionId(mode);
  const selectionToken =
    ReactNativeDeviceActivity.getFamilyActivitySelectionId(selectionId);

  if (!selectionToken) {
    throw new Error('Choose at least one app or category before saving.');
  }

  configureShield(mode);

  if (mode === 'block') {
    ReactNativeDeviceActivity.blockSelection(
      { activitySelectionId: selectionId },
      'parentkey-block',
    );
    return;
  }

  const monitorName = `${IOS_LIMIT_MONITOR_PREFIX}-${selectionId}`;

  ReactNativeDeviceActivity.configureActions({
    activityName: monitorName,
    callbackName: 'intervalDidStart',
    actions: [
      {
        type: 'unblockSelection',
        familyActivitySelectionId: selectionId,
      },
    ],
  });

  ReactNativeDeviceActivity.configureActions({
    activityName: monitorName,
    callbackName: 'eventDidReachThreshold',
    eventName: 'daily_limit_reached',
    actions: [
      {
        type: 'blockSelection',
        familyActivitySelectionId: selectionId,
        shieldId: getShieldId(mode),
      },
    ],
  });

  const limitEvent: DeviceActivityEvent = {
    eventName: 'daily_limit_reached',
    familyActivitySelection: selectionToken,
    threshold: { minute: IOS_DEFAULT_DAILY_LIMIT_MINUTES },
  };

  void ReactNativeDeviceActivity.startMonitoring(
    monitorName,
    {
      intervalStart: { hour: 0, minute: 0 },
      intervalEnd: { hour: 23, minute: 59 },
      repeats: true,
    },
    [limitEvent],
  );
}

export function clearRules(mode: IOSScreenTimeMode): void {
  if (!isIOSScreenTimeSupported()) {
    return;
  }

  const selectionId = getSelectionId(mode);

  ReactNativeDeviceActivity.unblockSelection(
    { activitySelectionId: selectionId },
    'parentkey-clear',
  );

  if (mode === 'limit') {
    ReactNativeDeviceActivity.stopMonitoring([
      `${IOS_LIMIT_MONITOR_PREFIX}-${selectionId}`,
    ]);
  }
}

export function isRestrictionActive(): boolean {
  if (!isIOSScreenTimeSupported()) {
    return false;
  }

  return ReactNativeDeviceActivity.isShieldActive();
}
