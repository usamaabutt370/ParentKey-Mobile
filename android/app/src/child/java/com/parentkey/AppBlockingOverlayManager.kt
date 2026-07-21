package com.parentkey

import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.view.WindowManager

/**
 * Legacy overlay cleanup only. Older builds could leave a full-screen
 * TYPE_ACCESSIBILITY_OVERLAY that trapped Home gestures. New blocking uses
 * [BlockedActivity] instead — do not call [show].
 */
object AppBlockingOverlayManager {
  private const val TAG = "ParentKeyOverlay"
  private val mainHandler = Handler(Looper.getMainLooper())
  private var overlayView: View? = null
  private var windowManager: WindowManager? = null

  @Deprecated("Overlay trapping is removed; use BlockedActivity")
  fun show(service: android.accessibilityservice.AccessibilityService, blockedPackage: String) {
    Log.w(TAG, "show() ignored for $blockedPackage — overlay path disabled")
  }

  fun hide() {
    mainHandler.post { hideInternal() }
  }

  fun isVisible(): Boolean = overlayView?.isAttachedToWindow == true

  private fun hideInternal() {
    val view = overlayView
    val manager = windowManager

    if (view != null && manager != null) {
      try {
        if (view.isAttachedToWindow) {
          manager.removeView(view)
        }
      } catch (error: Exception) {
        Log.w(TAG, "Failed to remove overlay view", error)
      }
    }

    // Also try to clear any orphaned overlay by walking nothing — view ref may be lost
    // after process death; force-stop / a11y reconnect is the recovery path then.
    overlayView = null
    windowManager = null
  }
}
