package com.parentkey

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent

class AppBlockingService : AccessibilityService() {
  override fun onServiceConnected() {
    super.onServiceConnected()
    AppBlockingCoordinator.dismissShield()
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
      return
    }

    val packageName = resolveForegroundPackage(event) ?: return
    handleForegroundPackage(packageName)
  }

  override fun onInterrupt() {
    AppBlockingCoordinator.dismissShield()
  }

  override fun onDestroy() {
    AppBlockingCoordinator.dismissShield()
    super.onDestroy()
  }

  private fun resolveForegroundPackage(event: AccessibilityEvent): String? {
    val rootPackage = rootInActiveWindow?.packageName?.toString()
    if (!rootPackage.isNullOrBlank()) {
      return rootPackage
    }

    return event.packageName?.toString()
  }

  private fun handleForegroundPackage(packageName: String) {
    val selfPackage = applicationContext.packageName
    val blockedPackages = AppBlockingPreferences.getBlockedPackages(applicationContext)

    // Overlay is showing — ignore everything except an explicit trip to the launcher.
    // ParentKey window events are caused by the overlay itself and must not dismiss it.
    if (AppBlockingCoordinator.isShieldActive()) {
      if (isLauncher(packageName)) {
        AppBlockingCoordinator.dismissShield()
      }
      return
    }

    if (packageName == selfPackage || packageName == "com.android.systemui") {
      return
    }

    if (isLauncher(packageName)) {
      AppBlockingCoordinator.dismissShield()
      return
    }

    if (blockedPackages.contains(packageName)) {
      AppBlockingCoordinator.shieldedPackage = packageName
      AppBlockingOverlayManager.show(this, packageName)
      return
    }

    AppBlockingCoordinator.dismissShield()
  }

  private fun isLauncher(packageName: String): Boolean {
    return packageName.contains("launcher", ignoreCase = true)
  }
}
