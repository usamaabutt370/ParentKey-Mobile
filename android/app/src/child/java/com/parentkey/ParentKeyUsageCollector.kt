package com.parentkey

import android.Manifest
import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import android.util.Log
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Reads today's foreground app usage via UsageStatsManager.
 * Shared by the RN bridge and native background upload paths.
 */
object ParentKeyUsageCollector {
  private const val TAG = "ParentKeyUsageCollector"

  // UsageEvents.Event types as raw ints: the resume/pause constants were renamed and
  // deprecated across API levels, and some are newer than our min SDK.
  private const val EVENT_ACTIVITY_RESUMED = 1
  private const val EVENT_ACTIVITY_PAUSED = 2
  private const val EVENT_SCREEN_INTERACTIVE = 15
  private const val EVENT_SCREEN_NON_INTERACTIVE = 16
  private const val EVENT_KEYGUARD_SHOWN = 17
  private const val EVENT_ACTIVITY_STOPPED = 23
  private const val EVENT_DEVICE_SHUTDOWN = 26

  data class Record(
    val packageName: String,
    val appName: String,
    val usageDate: String,
    val foregroundSeconds: Int,
  )

  data class HourlyRecord(
    val packageName: String,
    val appName: String,
    val usageDate: String,
    val hour: Int,
    val foregroundSeconds: Int,
  )

  fun hasUsageAccess(context: Context): Boolean {
    val appOps = context.getSystemService(AppOpsManager::class.java) ?: return false
    val mode =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        appOps.unsafeCheckOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          Process.myUid(),
          context.packageName,
        )
      } else {
        @Suppress("DEPRECATION")
        appOps.checkOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          Process.myUid(),
          context.packageName,
        )
      }

    return when (mode) {
      AppOpsManager.MODE_ALLOWED -> true
      AppOpsManager.MODE_DEFAULT ->
        context.checkCallingOrSelfPermission(Manifest.permission.PACKAGE_USAGE_STATS) ==
          PackageManager.PERMISSION_GRANTED
      else -> false
    }
  }

  fun collectToday(context: Context): List<Record> {
    if (!hasUsageAccess(context)) {
      return emptyList()
    }

    val usageStatsManager =
      context.getSystemService(UsageStatsManager::class.java) ?: return emptyList()
    val packageManager = context.packageManager
    val selfPackage = context.packageName
    val dateFormatter =
      SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getDefault()
      }

    val calendar = Calendar.getInstance()
    calendar.set(Calendar.HOUR_OF_DAY, 0)
    calendar.set(Calendar.MINUTE, 0)
    calendar.set(Calendar.SECOND, 0)
    calendar.set(Calendar.MILLISECOND, 0)
    val dayStart = calendar.timeInMillis
    val nowMs = System.currentTimeMillis()
    if (nowMs <= dayStart) {
      return emptyList()
    }

    val usageDate = dateFormatter.format(Date(dayStart))
    val maxDurationMs = nowMs - dayStart
    val usage =
      aggregateUsageMs(
        usageStatsManager,
        packageManager,
        dayStart,
        nowMs,
        maxDurationMs,
      )

    val records =
      usage
        .filterKeys { it != selfPackage }
        .map { (packageName, foregroundMs) ->
          Record(
            packageName = packageName,
            appName = resolveAppName(packageManager, packageName),
            usageDate = usageDate,
            foregroundSeconds = (foregroundMs / 1000L).toInt().coerceAtLeast(1),
          )
        }
        .sortedByDescending { it.foregroundSeconds }

    if (records.isNotEmpty()) {
      val preview =
        records.take(8).joinToString { "${it.appName}=${it.foregroundSeconds}s" }
      Log.i(TAG, "collectToday ${records.size} apps: $preview")
    } else {
      Log.w(TAG, "collectToday returned 0 apps (access granted)")
    }

    return records
  }

  /**
   * Foreground seconds per package per hour for today (local time).
   *
   * Mirrors [collectToday]: merge OEM UsageStats hour buckets with event
   * sessions so the hourly chart does not under-count apps that only show up
   * in UsageStats (common when UsageEvents are sparse or truncated).
   */
  fun collectTodayHourly(context: Context): List<HourlyRecord> {
    if (!hasUsageAccess(context)) {
      return emptyList()
    }

    val usageStatsManager =
      context.getSystemService(UsageStatsManager::class.java) ?: return emptyList()
    val packageManager = context.packageManager
    val selfPackage = context.packageName
    val dateFormatter =
      SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getDefault()
      }

    val calendar = Calendar.getInstance()
    calendar.set(Calendar.HOUR_OF_DAY, 0)
    calendar.set(Calendar.MINUTE, 0)
    calendar.set(Calendar.SECOND, 0)
    calendar.set(Calendar.MILLISECOND, 0)
    val dayStart = calendar.timeInMillis
    val nowMs = System.currentTimeMillis()
    if (nowMs <= dayStart) {
      return emptyList()
    }

    val usageDate = dateFormatter.format(Date(dayStart))
    val byPackageHour =
      aggregateHourlyUsageMs(usageStatsManager, packageManager, dayStart, nowMs)

    // If an app has daily UsageStats time but still no hour buckets (OEM quirk),
    // park the residual on its last-used hour so the parent chart is not blank.
    val daily =
      aggregateUsageMs(
        usageStatsManager,
        packageManager,
        dayStart,
        nowMs,
        nowMs - dayStart,
      )
    val hourCalendar = Calendar.getInstance()
    for ((packageName, dailyMs) in daily) {
      if (packageName == selfPackage || dailyMs <= 0L) {
        continue
      }
      var hourlySum = 0L
      for (hour in 0..23) {
        hourlySum += byPackageHour[packageName to hour] ?: 0L
      }
      if (hourlySum >= dailyMs) {
        continue
      }
      val residual = dailyMs - hourlySum
      val lastUsed =
        try {
          usageStatsManager
            .queryUsageStats(UsageStatsManager.INTERVAL_BEST, dayStart, nowMs)
            ?.firstOrNull { it.packageName == packageName }
            ?.lastTimeUsed
            ?: nowMs
        } catch (_: Exception) {
          nowMs
        }
      hourCalendar.timeInMillis = lastUsed.coerceIn(dayStart, nowMs)
      val hour = hourCalendar.get(Calendar.HOUR_OF_DAY)
      val key = packageName to hour
      byPackageHour[key] = (byPackageHour[key] ?: 0L) + residual
    }

    return byPackageHour
      .filterKeys { (packageName, _) -> packageName != selfPackage }
      .mapNotNull { (key, foregroundMs) ->
        val (packageName, hour) = key
        if (shouldExcludePackage(packageManager, packageName) || foregroundMs <= 0L) {
          return@mapNotNull null
        }
        HourlyRecord(
          packageName = packageName,
          appName = resolveAppName(packageManager, packageName),
          usageDate = usageDate,
          hour = hour,
          foregroundSeconds = (foregroundMs / 1000L).toInt().coerceAtLeast(1),
        )
      }
      .sortedWith(compareBy({ it.hour }, { -it.foregroundSeconds }))
  }

  /**
   * Hour buckets from UsageEvents.
   *
   * [UsageStatsManager] has no public INTERVAL_HOURLY; event streaming is the
   * supported way to split foreground time by hour of day.
   */
  private fun aggregateHourlyUsageMs(
    usageStatsManager: UsageStatsManager,
    packageManager: PackageManager,
    startMs: Long,
    endMs: Long,
  ): MutableMap<Pair<String, Int>, Long> {
    val totals = linkedMapOf<Pair<String, Int>, Long>()

    fun absorb(packageName: String?, hour: Int, durationMs: Long) {
      if (
        packageName.isNullOrBlank() ||
          durationMs <= 0L ||
          hour !in 0..23 ||
          shouldExcludePackage(packageManager, packageName)
      ) {
        return
      }
      val key = packageName to hour
      totals[key] = maxOf(totals[key] ?: 0L, durationMs)
    }

    for ((key, eventMs) in aggregateHourlyFromEvents(usageStatsManager, startMs, endMs)) {
      absorb(key.first, key.second, eventMs)
    }

    return totals
  }

  /**
   * Foreground milliseconds per package for a time range.
   *
   * Combines:
   * 1. UsageStats buckets (including [UsageStats.getTotalTimeVisible] on API 29+,
   *    which some OEMs/apps populate when [UsageStats.getTotalTimeInForeground] stays 0)
   * 2. The UsageEvents stream, which also covers the session still in the foreground
   */
  fun aggregateUsageMs(
    usageStatsManager: UsageStatsManager,
    packageManager: PackageManager,
    startMs: Long,
    endMs: Long,
    maxDurationMs: Long,
  ): Map<String, Long> {
    val totals = linkedMapOf<String, Long>()

    fun absorb(packageName: String?, durationMs: Long) {
      if (packageName.isNullOrBlank() || durationMs <= 0L) {
        return
      }
      totals[packageName] = maxOf(totals[packageName] ?: 0L, durationMs)
    }

    // queryAndAggregateUsageStats is more reliable for "today so far" than INTERVAL_DAILY
    // buckets on many OEMs.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      try {
        usageStatsManager.queryAndAggregateUsageStats(startMs, endMs).forEach { (packageName, stat) ->
          absorb(packageName, foregroundMsFromStat(stat))
        }
      } catch (error: Exception) {
        Log.w(TAG, "queryAndAggregateUsageStats failed", error)
      }
    }

    try {
      usageStatsManager
        .queryUsageStats(UsageStatsManager.INTERVAL_BEST, startMs, endMs)
        ?.forEach { stat -> absorb(stat.packageName, foregroundMsFromStat(stat)) }
    } catch (error: Exception) {
      Log.w(TAG, "queryUsageStats INTERVAL_BEST failed", error)
    }

    try {
      usageStatsManager
        .queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startMs, endMs)
        ?.forEach { stat -> absorb(stat.packageName, foregroundMsFromStat(stat)) }
    } catch (error: Exception) {
      Log.w(TAG, "queryUsageStats INTERVAL_DAILY failed", error)
    }

    for ((packageName, liveMs) in aggregateFromEvents(usageStatsManager, startMs, endMs)) {
      absorb(packageName, liveMs)
    }

    val result = linkedMapOf<String, Long>()
    for ((packageName, foregroundMs) in totals) {
      if (shouldExcludePackage(packageManager, packageName)) {
        continue
      }
      val capped = foregroundMs.coerceAtMost(maxDurationMs)
      if (capped > 0L) {
        result[packageName] = capped
      }
    }

    return result
  }

  private fun foregroundMsFromStat(stat: UsageStats): Long {
    var ms = stat.totalTimeInForeground
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      // Video-heavy apps (TikTok, etc.) often only increment visible time on some devices.
      ms = maxOf(ms, stat.totalTimeVisible)
    }
    return ms
  }

  /**
   * Single-foreground model: only one package is "open" at a time. When another app
   * resumes, the previous session is closed. This matches how users experience the phone
   * and avoids leaking time across apps when pause events are missing.
   */
  private fun aggregateFromEvents(
    usageStatsManager: UsageStatsManager,
    startMs: Long,
    endMs: Long,
  ): Map<String, Long> {
    val totals = linkedMapOf<String, Long>()
    var currentPackage: String? = null
    var currentSince = 0L

    fun closeCurrent(atMs: Long) {
      val packageName = currentPackage ?: return
      val since = currentSince
      currentPackage = null
      currentSince = 0L
      val elapsed = atMs - since
      if (elapsed > 0L) {
        totals[packageName] = (totals[packageName] ?: 0L) + elapsed
      }
    }

    val events =
      try {
        usageStatsManager.queryEvents(startMs, endMs)
      } catch (error: Exception) {
        Log.w(TAG, "queryEvents failed", error)
        null
      } ?: return totals

    val event = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      val packageName = event.packageName

      when (event.eventType) {
        EVENT_ACTIVITY_RESUMED -> {
          if (packageName.isNullOrBlank()) {
            continue
          }
          if (currentPackage != packageName) {
            closeCurrent(event.timeStamp)
            currentPackage = packageName
            currentSince = event.timeStamp
          }
        }
        EVENT_ACTIVITY_PAUSED,
        EVENT_ACTIVITY_STOPPED,
        -> {
          if (!packageName.isNullOrBlank() && packageName == currentPackage) {
            closeCurrent(event.timeStamp)
          }
        }
        EVENT_SCREEN_NON_INTERACTIVE,
        EVENT_KEYGUARD_SHOWN,
        EVENT_DEVICE_SHUTDOWN,
        -> closeCurrent(event.timeStamp)
        EVENT_SCREEN_INTERACTIVE -> {
          // Screen back on — wait for the next ACTIVITY_RESUMED to reopen a session.
        }
      }
    }

    // Whatever is still open is on screen right now; count it up to the query end.
    closeCurrent(endMs)

    return totals
  }

  /**
   * Same single-foreground session model as [aggregateFromEvents], but seconds are
   * attributed to local-time hour buckets (0–23).
   */
  private fun aggregateHourlyFromEvents(
    usageStatsManager: UsageStatsManager,
    startMs: Long,
    endMs: Long,
  ): Map<Pair<String, Int>, Long> {
    val totals = linkedMapOf<Pair<String, Int>, Long>()
    var currentPackage: String? = null
    var currentSince = 0L

    fun addRange(packageName: String, rangeStart: Long, rangeEnd: Long) {
      if (rangeEnd <= rangeStart) {
        return
      }
      var cursor = rangeStart
      val calendar = Calendar.getInstance()
      while (cursor < rangeEnd) {
        calendar.timeInMillis = cursor
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        calendar.set(Calendar.MILLISECOND, 0)
        val hour = calendar.get(Calendar.HOUR_OF_DAY)
        calendar.add(Calendar.HOUR_OF_DAY, 1)
        val hourEnd = calendar.timeInMillis
        val sliceEnd = minOf(rangeEnd, hourEnd)
        val elapsed = sliceEnd - cursor
        if (elapsed > 0L) {
          val key = packageName to hour
          totals[key] = (totals[key] ?: 0L) + elapsed
        }
        cursor = sliceEnd
      }
    }

    fun closeCurrent(atMs: Long) {
      val packageName = currentPackage ?: return
      val since = currentSince
      currentPackage = null
      currentSince = 0L
      addRange(packageName, since, atMs)
    }

    val events =
      try {
        usageStatsManager.queryEvents(startMs, endMs)
      } catch (error: Exception) {
        Log.w(TAG, "queryEvents (hourly) failed", error)
        null
      } ?: return totals

    val event = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      val packageName = event.packageName

      when (event.eventType) {
        EVENT_ACTIVITY_RESUMED -> {
          if (packageName.isNullOrBlank()) {
            continue
          }
          if (currentPackage != packageName) {
            closeCurrent(event.timeStamp)
            currentPackage = packageName
            currentSince = event.timeStamp
          }
        }
        EVENT_ACTIVITY_PAUSED,
        EVENT_ACTIVITY_STOPPED,
        -> {
          if (!packageName.isNullOrBlank() && packageName == currentPackage) {
            closeCurrent(event.timeStamp)
          }
        }
        EVENT_SCREEN_NON_INTERACTIVE,
        EVENT_KEYGUARD_SHOWN,
        EVENT_DEVICE_SHUTDOWN,
        -> closeCurrent(event.timeStamp)
        EVENT_SCREEN_INTERACTIVE -> {
          // Wait for ACTIVITY_RESUMED.
        }
      }
    }

    closeCurrent(endMs)
    return totals
  }

  private fun shouldExcludePackage(
    packageManager: PackageManager,
    packageName: String,
  ): Boolean {
    val lowered = packageName.lowercase(Locale.US)
    if (
      lowered.contains("launcher") ||
      lowered.contains("systemui") ||
      lowered == "com.android.settings" ||
      lowered == "com.google.android.settings" ||
      lowered == "com.android.permissioncontroller"
    ) {
      return true
    }

    return try {
      val applicationInfo = packageManager.getApplicationInfo(packageName, 0)
      (applicationInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0 &&
        packageManager.getLaunchIntentForPackage(packageName) == null
    } catch (_: Exception) {
      false
    }
  }

  private fun resolveAppName(
    packageManager: PackageManager,
    packageName: String,
  ): String {
    return try {
      val applicationInfo = packageManager.getApplicationInfo(packageName, 0)
      packageManager.getApplicationLabel(applicationInfo).toString()
    } catch (_: Exception) {
      packageName
    }
  }
}
