# Child background sync (Android)

Parent changes (block apps, allow uninstall) apply on the child device **without opening the child app UI**.

## What ships today

1. **Foreground sync service** — sticky notification; pulls rules ~every **20 seconds**.
2. **WorkManager** — periodic sync every **15 minutes** + on boot.
3. **FCM** (when `android/app/google-services.json` exists for **`com.parentkey.child`**) — silent push wakes native sync immediately.

## Critical: Firebase package name

Your child app id is **`com.parentkey.child`**.

In Firebase Console → Project settings → Your apps:

1. Add an Android app with package name **`com.parentkey.child`** (not `com.parentkey`)
2. Download the new `google-services.json`
3. Replace **both**:
   - `android/app/google-services.json`
   - (optional) root `google-services.json`

If the JSON only lists `com.parentkey`, the child build will fail or FCM tokens will not work.

## Enable FCM push end-to-end

1. Fix `google-services.json` for `com.parentkey.child` (above).
2. Apply SQL migrations:
   - `supabase/migrations/015_child_fcm_token.sql`
   - `supabase/migrations/016_notify_child_sync_triggers.sql`
3. Deploy Edge Function:

```bash
supabase functions deploy notify-child-sync
supabase secrets set FCM_SERVER_KEY=your_legacy_server_key
```

Firebase Console → Project settings → Cloud Messaging → Cloud Messaging API (Legacy) server key  
(or migrate the function to HTTP v1 later).

4. Database Webhook (Dashboard → Database → Webhooks) POST to the function on:
   - `app_block_rules` INSERT/UPDATE/DELETE
   - `children` UPDATE

5. Rebuild child app: `yarn android:child`  
   Open child once so it registers the FCM token on `child_devices`.

## Flow

1. Child gets FCM token → saves to `child_devices.fcm_token`
2. Parent changes a rule → webhook → Edge Function
3. Function sends data message to that token
4. Child native receiver syncs rules into SharedPreferences → blocking applies
