package com.parentkey

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView

object AppBlockingOverlayManager {
  private const val TAG = "ParentKeyOverlay"
  private val mainHandler = Handler(Looper.getMainLooper())
  private var overlayView: View? = null
  private var windowManager: WindowManager? = null
  private var shownForPackage: String? = null

  fun show(service: AccessibilityService, blockedPackage: String) {
    if (isVisible()) {
      return
    }

    mainHandler.post { showOnMainThread(service, blockedPackage) }
  }

  fun hide() {
    mainHandler.post { hideInternal() }
  }

  fun isVisible(): Boolean = overlayView?.isAttachedToWindow == true

  private fun showOnMainThread(
    service: AccessibilityService,
    blockedPackage: String,
  ) {
    if (isVisible()) {
      return
    }

    val windowManager = service.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    val container = buildOverlayView(service, blockedPackage)
    val layoutParams = createLayoutParams()

    try {
      windowManager.addView(container, layoutParams)
      this.windowManager = windowManager
      overlayView = container
      shownForPackage = blockedPackage
      Log.d(TAG, "Overlay shown for $blockedPackage")
    } catch (error: Exception) {
      Log.e(TAG, "Failed to show overlay for $blockedPackage", error)
      overlayView = null
      shownForPackage = null
      this.windowManager = null
      AppBlockingCoordinator.shieldedPackage = null
    }
  }

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

    overlayView = null
    shownForPackage = null
    windowManager = null
  }

  private fun createLayoutParams(): WindowManager.LayoutParams {
    val layoutParams =
      WindowManager.LayoutParams().apply {
        width = WindowManager.LayoutParams.MATCH_PARENT
        height = WindowManager.LayoutParams.MATCH_PARENT
        type = windowType()
        format = PixelFormat.TRANSLUCENT
        gravity = Gravity.TOP or Gravity.START
        flags =
          WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
            WindowManager.LayoutParams.FLAG_FULLSCREEN or
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
        title = "ParentKeyBlockedOverlay"
      }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      layoutParams.layoutInDisplayCutoutMode =
        WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
    }

    return layoutParams
  }

  private fun windowType(): Int {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
    } else {
      @Suppress("DEPRECATION")
      WindowManager.LayoutParams.TYPE_SYSTEM_ALERT
    }
  }

  private fun buildOverlayView(
    service: AccessibilityService,
    blockedPackage: String,
  ): View {
    val root =
      LinearLayout(service).apply {
        orientation = LinearLayout.VERTICAL
        gravity = Gravity.CENTER
        setBackgroundColor(Color.parseColor("#F2000000"))
        isClickable = true
        isFocusable = false
        setPadding(48, 48, 48, 48)
      }

    val lockIcon =
      TextView(service).apply {
        text = "🔒"
        textSize = 80f
        gravity = Gravity.CENTER
      }

    val title =
      TextView(service).apply {
        text = "App blocked"
        textSize = 30f
        setTextColor(Color.parseColor("#E6FFFB"))
        gravity = Gravity.CENTER
        setTypeface(typeface, Typeface.BOLD)
        setPadding(0, 28, 0, 0)
      }

    val subtitle =
      TextView(service).apply {
        text =
          "This app is blocked by ParentKey.\nAsk your parent if you need access."
        textSize = 17f
        setTextColor(Color.parseColor("#9FB8B2"))
        gravity = Gravity.CENTER
        setPadding(0, 16, 0, 0)
      }

    val packageLabel =
      TextView(service).apply {
        text = blockedPackage
        textSize = 12f
        setTextColor(Color.parseColor("#5F7A74"))
        gravity = Gravity.CENTER
        setPadding(0, 16, 0, 40)
      }

    val homeButton =
      TextView(service).apply {
        text = "Go to home screen"
        textSize = 16f
        gravity = Gravity.CENTER
        setTextColor(Color.parseColor("#0B1F24"))
        setTypeface(typeface, Typeface.BOLD)
        setBackgroundColor(Color.parseColor("#2DD4BF"))
        setPadding(40, 24, 40, 24)
        isClickable = true
        isFocusable = true
        setOnClickListener {
          AppBlockingCoordinator.dismissShield()
          service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME)
        }
      }

    root.addView(lockIcon)
    root.addView(title)
    root.addView(subtitle)
    root.addView(packageLabel)
    root.addView(homeButton)

    return root
  }
}
