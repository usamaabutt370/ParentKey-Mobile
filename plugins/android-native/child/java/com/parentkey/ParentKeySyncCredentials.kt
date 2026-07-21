package com.parentkey

import android.content.Context

/**
 * Session + config mirrored from JS so native sync can call Supabase
 * while the React Native UI is not in the foreground.
 */
object ParentKeySyncCredentials {
  private const val PREFS = "parentkey_remote_sync"
  private const val KEY_SUPABASE_URL = "supabase_url"
  private const val KEY_SUPABASE_ANON_KEY = "supabase_anon_key"
  private const val KEY_ACCESS_TOKEN = "access_token"
  private const val KEY_REFRESH_TOKEN = "refresh_token"
  private const val KEY_CHILD_ID = "child_id"
  private const val KEY_DEVICE_ID = "device_id"
  private const val KEY_FCM_TOKEN = "fcm_token"

  data class Snapshot(
    val supabaseUrl: String,
    val supabaseAnonKey: String,
    val accessToken: String,
    val refreshToken: String,
    val childId: String,
    val deviceId: String?,
  )

  fun save(
    context: Context,
    supabaseUrl: String,
    supabaseAnonKey: String,
    accessToken: String,
    refreshToken: String,
    childId: String,
    deviceId: String?,
  ) {
    context
      .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_SUPABASE_URL, supabaseUrl.trim().trimEnd('/'))
      .putString(KEY_SUPABASE_ANON_KEY, supabaseAnonKey)
      .putString(KEY_ACCESS_TOKEN, accessToken)
      .putString(KEY_REFRESH_TOKEN, refreshToken)
      .putString(KEY_CHILD_ID, childId)
      .putString(KEY_DEVICE_ID, deviceId)
      .apply()
  }

  fun clear(context: Context) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
  }

  fun read(context: Context): Snapshot? {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val url = prefs.getString(KEY_SUPABASE_URL, null)?.takeIf { it.isNotBlank() } ?: return null
    val anon = prefs.getString(KEY_SUPABASE_ANON_KEY, null)?.takeIf { it.isNotBlank() } ?: return null
    val access = prefs.getString(KEY_ACCESS_TOKEN, null)?.takeIf { it.isNotBlank() } ?: return null
    val refresh = prefs.getString(KEY_REFRESH_TOKEN, null).orEmpty()
    val childId = prefs.getString(KEY_CHILD_ID, null)?.takeIf { it.isNotBlank() } ?: return null
    val deviceId = prefs.getString(KEY_DEVICE_ID, null)?.takeIf { it.isNotBlank() }
    return Snapshot(url, anon, access, refresh, childId, deviceId)
  }

  fun updateAccessToken(context: Context, accessToken: String, refreshToken: String?) {
    val editor =
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
        .putString(KEY_ACCESS_TOKEN, accessToken)
    if (!refreshToken.isNullOrBlank()) {
      editor.putString(KEY_REFRESH_TOKEN, refreshToken)
    }
    editor.apply()
  }

  fun saveFcmToken(context: Context, token: String) {
    context
      .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_FCM_TOKEN, token)
      .apply()
  }

  fun getFcmToken(context: Context): String? =
    context
      .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .getString(KEY_FCM_TOKEN, null)
      ?.takeIf { it.isNotBlank() }
}
