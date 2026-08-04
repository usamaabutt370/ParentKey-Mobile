package com.parentkey

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
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Uploads today's UsageStats to Supabase without requiring the RN UI.
 * Throttled so Accessibility / FGS / WorkManager can call it often safely.
 */
object ParentKeyUsageSync {
  private const val TAG = "ParentKeyUsageSync"
  private const val PREFS = "parentkey_usage_sync"
  private const val KEY_LAST_UPLOAD_MS = "last_upload_ms"
  /** Near real-time while Accessibility / FGS keep the process alive. */
  private const val MIN_INTERVAL_MS = 60 * 1000L

  data class Result(
    val ok: Boolean,
    val uploadedCount: Int = 0,
    val skipped: Boolean = false,
    val message: String? = null,
  )

  fun syncNow(context: Context, force: Boolean = false): Result {
    val creds = ParentKeySyncCredentials.read(context)
      ?: return Result(ok = false, message = "Missing sync credentials")
    val deviceId = creds.deviceId
      ?: return Result(ok = false, message = "Missing device id")

    if (!ParentKeyUsageCollector.hasUsageAccess(context)) {
      return Result(ok = false, message = "Usage access not granted")
    }

    if (!force && !shouldUpload(context)) {
      return Result(ok = true, skipped = true)
    }

    return try {
      var session = refreshSession(context, creds) ?: creds
      var trackingStartedAt = ParentKeySyncCredentials.getUsageTrackingStartedAt(context)

      if (trackingStartedAt.isNullOrBlank()) {
        trackingStartedAt = utcIsoNow()
        markUsageTrackingStarted(session, deviceId, trackingStartedAt)
        ParentKeySyncCredentials.saveUsageTrackingStartedAt(context, trackingStartedAt)
      }

      val records = ParentKeyUsageCollector.collectToday(context)
      val hourlyRecords = ParentKeyUsageCollector.collectTodayHourly(context)
      val today = localDateString()
      val capped =
        records
          .filter { it.usageDate == today && it.foregroundSeconds > 0 }
          .map { record ->
            record.copy(
              foregroundSeconds =
                capSeconds(record.foregroundSeconds, trackingStartedAt!!, today),
            )
          }
          .filter { it.foregroundSeconds > 0 }

      val cappedHourly =
        hourlyRecords
          .filter { it.usageDate == today && it.foregroundSeconds > 0 }
          .map { record ->
            record.copy(
              foregroundSeconds =
                capSeconds(record.foregroundSeconds, trackingStartedAt!!, today),
            )
          }
          .filter { it.foregroundSeconds > 0 }

      if (capped.isNotEmpty()) {
        upsertRows(session, deviceId, capped)
        val preview =
          capped
            .sortedByDescending { it.foregroundSeconds }
            .take(8)
            .joinToString { "${it.appName}=${it.foregroundSeconds}s" }
        Log.i(TAG, "Uploaded ${capped.size} apps: $preview")
      } else {
        Log.w(TAG, "No usage rows to upload for $today")
      }

      if (cappedHourly.isNotEmpty()) {
        upsertHourlyRows(session, deviceId, cappedHourly)
        Log.i(TAG, "Uploaded ${cappedHourly.size} hourly buckets")
      }

      // Keep parent Online / Last synced honest even when only native sync runs.
      touchLastSeen(session, deviceId)

      markUploaded(context)
      Result(ok = true, uploadedCount = capped.size)
    } catch (error: Exception) {
      Log.e(TAG, "Usage sync failed", error)
      Result(ok = false, message = error.message)
    }
  }

  private fun shouldUpload(context: Context): Boolean {
    val last =
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .getLong(KEY_LAST_UPLOAD_MS, 0L)
    return System.currentTimeMillis() - last >= MIN_INTERVAL_MS
  }

  private fun markUploaded(context: Context) {
    context
      .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putLong(KEY_LAST_UPLOAD_MS, System.currentTimeMillis())
      .apply()
  }

  private fun localDateString(): String {
    val formatter =
      SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getDefault()
      }
    return formatter.format(Date())
  }

  private fun utcIsoNow(): String {
    val formatter =
      SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
      }
    return formatter.format(Date())
  }

  private fun parseIsoToMillis(value: String): Long? {
    val patterns =
      arrayOf(
        "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
        "yyyy-MM-dd'T'HH:mm:ss'Z'",
        "yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'",
      )
    for (pattern in patterns) {
      try {
        val formatter =
          SimpleDateFormat(pattern, Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
          }
        return formatter.parse(value)?.time
      } catch (_: Exception) {
        // try next
      }
    }
    return null
  }

  private fun capSeconds(seconds: Int, trackingStartedAt: String, today: String): Int {
    var capped = seconds
    val trackingMs = parseIsoToMillis(trackingStartedAt)
    if (trackingMs != null) {
      val trackingDate =
        SimpleDateFormat("yyyy-MM-dd", Locale.US)
          .apply { timeZone = TimeZone.getDefault() }
          .format(Date(trackingMs))
      if (today < trackingDate) {
        return 0
      }
      if (today == trackingDate) {
        val maxSince = ((System.currentTimeMillis() - trackingMs) / 1000L).toInt()
        capped = minOf(capped, maxOf(0, maxSince))
      }
    }

    val startOfDay =
      java.util.Calendar.getInstance().apply {
        set(java.util.Calendar.HOUR_OF_DAY, 0)
        set(java.util.Calendar.MINUTE, 0)
        set(java.util.Calendar.SECOND, 0)
        set(java.util.Calendar.MILLISECOND, 0)
      }.timeInMillis
    val maxToday = ((System.currentTimeMillis() - startOfDay) / 1000L).toInt()
    return minOf(capped, maxOf(0, maxToday))
  }

  /** Shared with rule sync so both paths rotate the refresh token at most once. */
  private fun refreshSession(
    context: Context,
    creds: ParentKeySyncCredentials.Snapshot,
  ): ParentKeySyncCredentials.Snapshot? =
    ParentKeyRemoteSync.ensureFreshSession(context, creds)

  private fun markUsageTrackingStarted(
    creds: ParentKeySyncCredentials.Snapshot,
    deviceId: String,
    startedAt: String,
  ) {
    val url = "${creds.supabaseUrl}/rest/v1/child_devices?id=eq.$deviceId"
    val body = JSONObject().put("usage_tracking_started_at", startedAt).toString()
    httpRaw("PATCH", url, creds.supabaseAnonKey, creds.accessToken, body, prefer = "return=minimal")
  }

  private fun touchLastSeen(
    creds: ParentKeySyncCredentials.Snapshot,
    deviceId: String,
  ) {
    try {
      val url = "${creds.supabaseUrl}/rest/v1/child_devices?id=eq.$deviceId"
      val body = JSONObject().put("last_seen_at", utcIsoNow()).toString()
      httpRaw("PATCH", url, creds.supabaseAnonKey, creds.accessToken, body, prefer = "return=minimal")
    } catch (error: Exception) {
      Log.w(TAG, "Failed to touch last_seen_at", error)
    }
  }

  private fun upsertRows(
    creds: ParentKeySyncCredentials.Snapshot,
    deviceId: String,
    records: List<ParentKeyUsageCollector.Record>,
  ) {
    val syncedAt = utcIsoNow()
    val array = JSONArray()
    for (record in records) {
      array.put(
        JSONObject()
          .put("child_id", creds.childId)
          .put("device_id", deviceId)
          .put("package_name", record.packageName)
          .put("app_name", record.appName)
          .put("usage_date", record.usageDate)
          .put("foreground_seconds", record.foregroundSeconds)
          .put("synced_at", syncedAt),
      )
    }
    // Upsert on the (device, package, date) key so a partial upload never wipes
    // today's rows and the parent never sees usage briefly drop to zero.
    val url =
      "${creds.supabaseUrl}/rest/v1/child_app_usage_daily" +
        "?on_conflict=device_id,package_name,usage_date"
    httpRaw(
      "POST",
      url,
      creds.supabaseAnonKey,
      creds.accessToken,
      array.toString(),
      prefer = "resolution=merge-duplicates,return=minimal",
    )
  }

  private fun upsertHourlyRows(
    creds: ParentKeySyncCredentials.Snapshot,
    deviceId: String,
    records: List<ParentKeyUsageCollector.HourlyRecord>,
  ) {
    val syncedAt = utcIsoNow()
    val array = JSONArray()
    for (record in records) {
      array.put(
        JSONObject()
          .put("child_id", creds.childId)
          .put("device_id", deviceId)
          .put("package_name", record.packageName)
          .put("app_name", record.appName)
          .put("usage_date", record.usageDate)
          .put("hour", record.hour)
          .put("foreground_seconds", record.foregroundSeconds)
          .put("synced_at", syncedAt),
      )
    }
    val url =
      "${creds.supabaseUrl}/rest/v1/child_app_usage_hourly" +
        "?on_conflict=device_id,package_name,usage_date,hour"
    httpRaw(
      "POST",
      url,
      creds.supabaseAnonKey,
      creds.accessToken,
      array.toString(),
      prefer = "resolution=merge-duplicates,return=minimal",
    )
  }

  private fun httpRaw(
    method: String,
    url: String,
    anonKey: String,
    accessToken: String?,
    body: String?,
    prefer: String? = null,
  ): String {
    val connection = (URL(url).openConnection() as HttpURLConnection).apply {
      requestMethod = method
      connectTimeout = 15_000
      readTimeout = 20_000
      setRequestProperty("apikey", anonKey)
      setRequestProperty("Authorization", "Bearer ${accessToken ?: anonKey}")
      setRequestProperty("Accept", "application/json")
      if (prefer != null) {
        setRequestProperty("Prefer", prefer)
      }
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
      return text.ifBlank { "{}" }
    } finally {
      connection.disconnect()
    }
  }
}
