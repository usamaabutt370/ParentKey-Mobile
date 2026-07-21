package com.parentkey

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent

/**
 * When a blocked app comes to the foreground, send the user to [BlockedActivity]
 * (a normal Activity — system Home/Back always work). We intentionally do NOT use a
 * full-screen TYPE_ACCESSIBILITY_OVERLAY because it can swallow navigation gestures
 * and trap the device.
 */
class AppBlockingService : AccessibilityService() {
  private val mainHandler = Handler(Looper.getMainLooper())
  private var cachedLauncherPackages: Set<String>? = null
  private var lastHandledPackage: String? = null
  private var lastHandledAtMs: Long = 0L

  override fun onServiceConnected() {
    super.onServiceConnected()
    cachedLauncherPackages = null
    // Clear any leftover overlay from older builds that could trap the user.
    AppBlockingCoordinator.forceClearAllOverlays()
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null) {
      return
    }

    when (event.eventType) {
      AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED,
      AccessibilityEvent.TYPE_WINDOWS_CHANGED,
      -> {
        val packageName = event.packageName?.toString() ?: return
        handleForegroundPackage(packageName)
      }
      else -> return
    }
  }

  override fun onInterrupt() {
    AppBlockingCoordinator.forceClearAllOverlays()
  }

  override fun onDestroy() {
    AppBlockingCoordinator.forceClearAllOverlays()
    super.onDestroy()
  }

  private fun handleForegroundPackage(packageName: String) {
    val selfPackage = applicationContext.packageName

    if (packageName == selfPackage || packageName == "com.android.systemui") {
      return
    }

    if (isHomeOrLauncher(packageName)) {
      lastHandledPackage = null
      return
    }

    if (AppBlockingCoordinator.shouldSuppressBlocking()) {
      return
    }

    val blockedPackages = AppBlockingPreferences.getBlockedPackages(applicationContext)
    if (!blockedPackages.contains(packageName)) {
      return
    }

    // Debounce: accessibility can fire many events for one app open.
    val now = android.os.SystemClock.elapsedRealtime()
    if (packageName == lastHandledPackage && now - lastHandledAtMs < 1_200L) {
      return
    }
    lastHandledPackage = packageName
    lastHandledAtMs = now

    // Suppress re-entry while we leave the blocked app.
    AppBlockingCoordinator.beginHomeEscape(2_000L)

    // 1) Kick to home so the blocked app is no longer interactive.
    performGlobalAction(GLOBAL_ACTION_HOME)

    // 2) Show a normal Activity explanation (Home/Back work here).
    mainHandler.postDelayed(
      {
        val intent =
          Intent(this, BlockedActivity::class.java).apply {
            addFlags(
              Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS,
            )
            putExtra(BlockedActivity.EXTRA_BLOCKED_PACKAGE, packageName)
          }
        try {
          startActivity(intent)
        } catch (_: Exception) {
          // Home already happened; failing to show the message is still safe.
        }
      },
      250L,
    )
  }

  private fun isHomeOrLauncher(packageName: String): Boolean {
    val launchers =
      cachedLauncherPackages ?: loadLauncherPackages().also { cachedLauncherPackages = it }
    if (launchers.contains(packageName)) {
      return true
    }
    return packageName.contains("launcher", ignoreCase = true) ||
      packageName == "com.miui.home" ||
      packageName == "com.huawei.android.launcher" ||
      packageName == "com.oppo.launcher" ||
      packageName == "com.vivo.launcher"
  }

  private fun loadLauncherPackages(): Set<String> {
    val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
    val resolved =
      packageManager.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
    return resolved.mapNotNull { it.activityInfo?.packageName }.toSet()
  }
}
