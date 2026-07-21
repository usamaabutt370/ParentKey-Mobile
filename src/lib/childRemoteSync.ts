import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/env';
import { APP_VARIANT } from './appInfo';
import { getAndroidDeviceId } from './androidAppBlocking';
import { supabase } from './supabase';

type AppBlockingSyncModule = {
  persistSyncCredentials: (
    supabaseUrl: string,
    supabaseAnonKey: string,
    accessToken: string,
    refreshToken: string,
    childId: string,
    deviceId: string | null,
  ) => Promise<boolean>;
  clearSyncCredentials: () => Promise<boolean>;
  startBackgroundSync: () => Promise<boolean>;
  stopBackgroundSync: () => Promise<boolean>;
  runBackgroundSyncNow: () => Promise<number>;
  getFcmToken?: () => Promise<string | null>;
};

const appBlocking = NativeModules.AppBlocking as AppBlockingSyncModule | undefined;

function canUseNativeSync(): boolean {
  return (
    Platform.OS === 'android' &&
    APP_VARIANT === 'child' &&
    typeof appBlocking?.persistSyncCredentials === 'function'
  );
}

/**
 * Mirror the Supabase session into native prefs and start background sync
 * (foreground service + WorkManager) so parent rule changes apply without
 * bringing the child app to the foreground.
 */
export async function enableChildBackgroundSync(params: {
  childId: string;
  accessToken: string;
  refreshToken: string;
  deviceId?: string | null;
}): Promise<void> {
  if (!canUseNativeSync() || !appBlocking) {
    return;
  }

  await appBlocking.persistSyncCredentials(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    params.accessToken,
    params.refreshToken,
    params.childId,
    params.deviceId ?? null,
  );

  if (Platform.OS === 'android' && Platform.Version >= 33) {
    try {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
    } catch {
      // Notification permission is optional; sync still runs.
    }
  }

  await appBlocking.startBackgroundSync();
  await registerChildFcmToken(params.childId);
}

async function registerChildFcmToken(childId: string): Promise<void> {
  if (!appBlocking?.getFcmToken) {
    return;
  }

  try {
    const token = await appBlocking.getFcmToken();
    if (!token) {
      return;
    }

    const deviceKey = await getAndroidDeviceId();
    await upsertChildFcmToken({ childId, deviceKey, fcmToken: token });
  } catch (error) {
    console.warn('FCM token registration skipped:', error);
  }
}

export async function disableChildBackgroundSync(): Promise<void> {
  if (!canUseNativeSync() || !appBlocking) {
    return;
  }

  await appBlocking.stopBackgroundSync();
  await appBlocking.clearSyncCredentials();
}

export async function refreshChildBackgroundSyncFromSession(): Promise<void> {
  if (!canUseNativeSync()) {
    return;
  }

  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.user?.id || !session.access_token) {
    await disableChildBackgroundSync();
    return;
  }

  await enableChildBackgroundSync({
    childId: session.user.id,
    accessToken: session.access_token,
    refreshToken: session.refresh_token ?? '',
  });
}

/**
 * Upsert FCM token on child_devices when Firebase is configured.
 * No-op if native token helper is unavailable.
 */
export async function upsertChildFcmToken(params: {
  childId: string;
  deviceKey: string;
  fcmToken: string;
}): Promise<void> {
  const { error } = await supabase
    .from('child_devices')
    .update({
      fcm_token: params.fcmToken,
      last_seen_at: new Date().toISOString(),
    })
    .eq('child_id', params.childId)
    .eq('device_key', params.deviceKey);

  if (error) {
    console.warn('Failed to upsert FCM token:', error.message);
  }
}
