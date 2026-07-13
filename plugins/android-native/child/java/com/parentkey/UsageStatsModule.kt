package com.parentkey

import android.Manifest
import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class UsageStatsModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "UsageStats"

  @ReactMethod
  fun isUsageAccessGranted(promise: Promise) {
    try {
      promise.resolve(hasUsageAccess())
    } catch (error: Exception) {
      promise.reject("USAGE_ACCESS_STATUS_ERROR", error.message, error)
    }
  }

  @ReactMethod
  fun openUsageAccessSettings(promise: Promise) {
    try {
      // Prepare return watcher before leaving the app — usage access is a slow,
      // multi-step Settings flow and needs a privileged PendingIntent.
      PermissionReturnWatcher.watch(
        reactApplicationContext,
        appOp = AppOpsManager.OPSTR_GET_USAGE_STATS,
      ) { hasUsageAccess() }

      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
      intent.putExtra(Intent.EXTRA_PACKAGE_NAME, reactApplicationContext.packageName)

      val activity = reactApplicationContext.currentActivity
      if (activity != null) {
        // Same task so CLEAR_TOP can dismiss Settings when access is granted.
        activity.startActivity(intent)
      } else {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactApplicationContext.startActivity(intent)
      }

      promise.resolve(true)
    } catch (error: Exception) {
      PermissionReturnWatcher.stop()
      promise.reject("OPEN_USAGE_ACCESS_SETTINGS_ERROR", error.message, error)
    }
  }

  @ReactMethod
  fun getDailyAppUsage(daysBack: Int, promise: Promise) {
    try {
      if (!hasUsageAccess()) {
        promise.reject(
          "USAGE_ACCESS_DENIED",
          "Usage access is not granted. Enable ParentKey in Usage access settings.",
        )
        return
      }

      val safeDays = daysBack.coerceIn(1, 14)
      val usageStatsManager =
        reactApplicationContext.getSystemService(UsageStatsManager::class.java)
          ?: throw IllegalStateException("UsageStatsManager is unavailable.")

      val packageManager = reactApplicationContext.packageManager
      val selfPackage = reactApplicationContext.packageName
      val dateFormatter = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getDefault()
      }
      val calendar = Calendar.getInstance()
      resetToStartOfDay(calendar)
      val nowMs = System.currentTimeMillis()

      val records = WritableNativeArray()
      val seenKeys = linkedSetOf<String>()

      for (dayOffset in 0 until safeDays) {
        val dayStartCalendar = calendar.clone() as Calendar
        dayStartCalendar.add(Calendar.DAY_OF_YEAR, -dayOffset)
        val dayStart = dayStartCalendar.timeInMillis

        val dayEndCalendar = dayStartCalendar.clone() as Calendar
        dayEndCalendar.add(Calendar.DAY_OF_YEAR, 1)
        val dayEnd = minOf(dayEndCalendar.timeInMillis - 1, nowMs)

        if (dayEnd <= dayStart) {
          continue
        }

        val usageDate = dateFormatter.format(Date(dayStart))
        val maxDurationMs = dayEnd - dayStart
        val usageByPackage =
          aggregateForegroundUsage(usageStatsManager, packageManager, dayStart, dayEnd, maxDurationMs)

        for ((packageName, foregroundMs) in usageByPackage) {
          if (
            packageName.isBlank() ||
            packageName == selfPackage ||
            shouldExcludePackage(packageManager, packageName) ||
            foregroundMs <= 0L
          ) {
            continue
          }

          val dedupeKey = "$usageDate:$packageName"
          if (!seenKeys.add(dedupeKey)) {
            continue
          }

          val record = WritableNativeMap()
          record.putString("packageName", packageName)
          record.putString("appName", resolveAppName(packageManager, packageName))
          record.putString("usageDate", usageDate)
          record.putDouble("foregroundSeconds", foregroundMs / 1000.0)
          records.pushMap(record)
        }
      }

      promise.resolve(records)
    } catch (error: Exception) {
      promise.reject("USAGE_STATS_ERROR", error.message, error)
    }
  }

  private fun hasUsageAccess(): Boolean {
    val appOps =
      reactApplicationContext.getSystemService(AppOpsManager::class.java)
        ?: return false

    val mode =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        appOps.unsafeCheckOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          Process.myUid(),
          reactApplicationContext.packageName,
        )
      } else {
        @Suppress("DEPRECATION")
        appOps.checkOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          Process.myUid(),
          reactApplicationContext.packageName,
        )
      }

    return when (mode) {
      AppOpsManager.MODE_ALLOWED -> true
      AppOpsManager.MODE_DEFAULT ->
        reactApplicationContext.checkCallingOrSelfPermission(
          Manifest.permission.PACKAGE_USAGE_STATS,
        ) == PackageManager.PERMISSION_GRANTED
      else -> false
    }
  }

  private fun aggregateForegroundUsage(
    usageStatsManager: UsageStatsManager,
    packageManager: PackageManager,
    startMs: Long,
    endMs: Long,
    maxDurationMs: Long,
  ): Map<String, Long> {
    val stats =
      usageStatsManager.queryUsageStats(
        UsageStatsManager.INTERVAL_DAILY,
        startMs,
        endMs,
      ) ?: return emptyMap()

    val usage = linkedMapOf<String, Long>()

    for (stat in stats) {
      val packageName = stat.packageName ?: continue
      if (shouldExcludePackage(packageManager, packageName)) {
        continue
      }

      val foregroundMs =
        stat.totalTimeInForeground.coerceAtMost(maxDurationMs)

      if (foregroundMs <= 0L) {
        continue
      }

      usage[packageName] = foregroundMs
    }

    return usage
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
        !hasLaunchIntent(packageManager, packageName)
    } catch (_: Exception) {
      false
    }
  }

  private fun hasLaunchIntent(
    packageManager: PackageManager,
    packageName: String,
  ): Boolean {
    return packageManager.getLaunchIntentForPackage(packageName) != null
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

  private fun resetToStartOfDay(calendar: Calendar) {
    calendar.set(Calendar.HOUR_OF_DAY, 0)
    calendar.set(Calendar.MINUTE, 0)
    calendar.set(Calendar.SECOND, 0)
    calendar.set(Calendar.MILLISECOND, 0)
  }
}
