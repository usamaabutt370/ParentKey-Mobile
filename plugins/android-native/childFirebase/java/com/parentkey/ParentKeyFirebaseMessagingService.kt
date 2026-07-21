package com.parentkey

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

/**
 * Receives silent FCM data messages and immediately refreshes parent rules
 * into SharedPreferences — works even when the RN UI is not running.
 *
 * Requires `android/app/google-services.json` for package `com.parentkey.child`.
 */
class ParentKeyFirebaseMessagingService : FirebaseMessagingService() {
  override fun onNewToken(token: String) {
    Log.i(TAG, "FCM token refreshed")
    ParentKeySyncCredentials.saveFcmToken(applicationContext, token)
    Thread { uploadTokenToSupabase(token) }.start()
    ParentKeySyncWorker.enqueueImmediate(applicationContext)
  }

  override fun onMessageReceived(message: RemoteMessage) {
    Log.i(TAG, "FCM sync ping received: ${message.data}")
    ParentKeySyncWorker.enqueueImmediate(applicationContext)
    ParentKeySyncForegroundService.start(applicationContext)
    ParentKeyRemoteSync.syncNow(applicationContext)
  }

  private fun uploadTokenToSupabase(token: String) {
    val creds = ParentKeySyncCredentials.read(applicationContext) ?: return
    val deviceId = creds.deviceId ?: return
    try {
      val url = URL("${creds.supabaseUrl}/rest/v1/child_devices?id=eq.$deviceId")
      val connection = (url.openConnection() as HttpURLConnection).apply {
        requestMethod = "PATCH"
        connectTimeout = 15_000
        readTimeout = 15_000
        doOutput = true
        setRequestProperty("apikey", creds.supabaseAnonKey)
        setRequestProperty("Authorization", "Bearer ${creds.accessToken}")
        setRequestProperty("Content-Type", "application/json")
        setRequestProperty("Prefer", "return=minimal")
      }
      val body = JSONObject().put("fcm_token", token).toString()
      OutputStreamWriter(connection.outputStream, StandardCharsets.UTF_8).use { it.write(body) }
      val code = connection.responseCode
      Log.i(TAG, "Uploaded FCM token HTTP $code")
      connection.disconnect()
    } catch (error: Exception) {
      Log.w(TAG, "Failed to upload FCM token", error)
    }
  }

  companion object {
    private const val TAG = "ParentKeyFCM"
  }
}
