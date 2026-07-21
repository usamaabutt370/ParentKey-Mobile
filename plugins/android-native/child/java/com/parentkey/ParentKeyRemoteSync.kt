package com.parentkey

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

/**
 * Fetches latest parent rules from Supabase and applies them natively
 * (blocked packages + uninstall-allowed → device admin).
 */
object ParentKeyRemoteSync {
  private const val TAG = "ParentKeyRemoteSync"

  data class Result(
    val ok: Boolean,
    val blockedCount: Int = 0,
    val uninstallAllowed: Boolean = false,
    val message: String? = null,
  )

  fun syncNow(context: Context): Result {
    val creds = ParentKeySyncCredentials.read(context)
      ?: return Result(ok = false, message = "Missing sync credentials")

    return try {
      val session = ensureFreshSession(context, creds) ?: creds
      val packages = fetchBlockedPackages(session)
      AppBlockingPreferences.setBlockedPackages(context, packages)

      val uninstallAllowed = fetchUninstallAllowed(session)
      if (uninstallAllowed) {
        deactivateDeviceAdmin(context)
      }

      Result(ok = true, blockedCount = packages.size, uninstallAllowed = uninstallAllowed)
    } catch (error: Exception) {
      Log.e(TAG, "Remote sync failed", error)
      Result(ok = false, message = error.message)
    }
  }

  private fun ensureFreshSession(
    context: Context,
    creds: ParentKeySyncCredentials.Snapshot,
  ): ParentKeySyncCredentials.Snapshot? {
    // Refresh when we have a refresh token; ignore failures and try with current access token.
    if (creds.refreshToken.isBlank()) {
      return creds
    }

    return try {
      val body =
        JSONObject()
          .put("refresh_token", creds.refreshToken)
          .toString()
      val response =
        httpJson(
          method = "POST",
          url = "${creds.supabaseUrl}/auth/v1/token?grant_type=refresh_token",
          anonKey = creds.supabaseAnonKey,
          accessToken = null,
          body = body,
        )
      val access = response.optString("access_token", "")
      val refresh = response.optString("refresh_token", creds.refreshToken)
      if (access.isBlank()) {
        return creds
      }
      ParentKeySyncCredentials.updateAccessToken(context, access, refresh)
      creds.copy(accessToken = access, refreshToken = refresh)
    } catch (error: Exception) {
      Log.w(TAG, "Token refresh failed; using existing access token", error)
      creds
    }
  }

  private fun fetchBlockedPackages(creds: ParentKeySyncCredentials.Snapshot): Set<String> {
    val url =
      "${creds.supabaseUrl}/rest/v1/app_block_rules" +
        "?child_id=eq.${creds.childId}" +
        "&enabled=eq.true" +
        "&rule_type=eq.block" +
        "&select=package_name"
    val raw = httpRaw("GET", url, creds.supabaseAnonKey, creds.accessToken, null)
    val array = JSONArray(raw)
    val packages = linkedSetOf<String>()
    for (i in 0 until array.length()) {
      val name = array.getJSONObject(i).optString("package_name", "")
      if (name.isNotBlank()) {
        packages.add(name)
      }
    }
    return packages
  }

  private fun fetchUninstallAllowed(creds: ParentKeySyncCredentials.Snapshot): Boolean {
    val url =
      "${creds.supabaseUrl}/rest/v1/children" +
        "?profile_id=eq.${creds.childId}" +
        "&select=uninstall_allowed"
    val raw = httpRaw("GET", url, creds.supabaseAnonKey, creds.accessToken, null)
    val array = JSONArray(raw)
    if (array.length() == 0) {
      return false
    }
    return array.getJSONObject(0).optBoolean("uninstall_allowed", false)
  }

  private fun deactivateDeviceAdmin(context: Context) {
    val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    val component = ComponentName(context, ParentKeyDeviceAdminReceiver::class.java)
    if (dpm.isAdminActive(component)) {
      dpm.removeActiveAdmin(component)
    }
  }

  private fun httpJson(
    method: String,
    url: String,
    anonKey: String,
    accessToken: String?,
    body: String?,
  ): JSONObject = JSONObject(httpRaw(method, url, anonKey, accessToken, body))

  private fun httpRaw(
    method: String,
    url: String,
    anonKey: String,
    accessToken: String?,
    body: String?,
  ): String {
    val connection = (URL(url).openConnection() as HttpURLConnection).apply {
      requestMethod = method
      connectTimeout = 15_000
      readTimeout = 20_000
      setRequestProperty("apikey", anonKey)
      setRequestProperty("Authorization", "Bearer ${accessToken ?: anonKey}")
      setRequestProperty("Accept", "application/json")
      if (body != null) {
        doOutput = true
        setRequestProperty("Content-Type", "application/json")
      }
    }

    try {
      if (body != null) {
        OutputStreamWriter(connection.outputStream, StandardCharsets.UTF_8).use { it.write(body) }
      }
      val stream =
        if (connection.responseCode in 200..299) {
          connection.inputStream
        } else {
          connection.errorStream
        }
      val text =
        BufferedReader(InputStreamReader(stream, StandardCharsets.UTF_8)).use { it.readText() }
      if (connection.responseCode !in 200..299) {
        throw IllegalStateException("HTTP ${connection.responseCode}: $text")
      }
      return text
    } finally {
      connection.disconnect()
    }
  }
}
