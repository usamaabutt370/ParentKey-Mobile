package com.parentkey

import android.accessibilityservice.AccessibilityService

/**
 * Shared state between the accessibility service and the overlay so dismiss
 * does not depend on window events that the overlay itself can trigger.
 */
object AppBlockingCoordinator {
  @Volatile
  var shieldedPackage: String? = null

  fun isShieldActive(): Boolean {
    return shieldedPackage != null && AppBlockingOverlayManager.isVisible()
  }

  fun dismissShield() {
    shieldedPackage = null
    AppBlockingOverlayManager.hide()
  }
}
