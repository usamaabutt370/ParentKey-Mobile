package com.parentkey

import android.app.ActivityOptions
import android.app.AppOpsManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.ReactApplicationContext

/**
 * Watches for a permission becoming granted while the user is in system Settings,
 * then brings ParentKey back to the foreground so setup can advance automatically.
 *
 * Usage access is special: users often spend longer in a multi-step Settings flow,
 * so Android background-activity limits block a plain startActivity. We prepare a
 * PendingIntent while still privileged and prefer same-task CLEAR_TOP returns.
 */
object PermissionReturnWatcher {
  private const val POLL_INTERVAL_MS = 400L
  private const val FIRST_CHECK_DELAY_MS = 500L
  private const val MAX_ATTEMPTS = 450 // ~3 minutes
  private const val RETURN_REQUEST_CODE = 11021

  private val handler = Handler(Looper.getMainLooper())
  private var pollRunnable: Runnable? = null
  private var returnPendingIntent: PendingIntent? = null
  private var appOpsListener: AppOpsManager.OnOpChangedListener? = null
  private var appOpsContext: Context? = null

  fun watch(
    reactContext: ReactApplicationContext,
    appOp: String? = null,
    isGranted: () -> Boolean,
  ) {
    stop()

    // Capture while we still have foreground privilege (settings opens right after).
    returnPendingIntent = createReturnPendingIntent(reactContext)

    if (appOp != null) {
      startAppOpsWatch(reactContext, appOp, isGranted)
    }

    var attempts = 0
    val runnable =
      object : Runnable {
        override fun run() {
          attempts += 1

          if (checkAndReturn(reactContext, isGranted)) {
            return
          }

          if (attempts >= MAX_ATTEMPTS) {
            stop()
            return
          }

          handler.postDelayed(this, POLL_INTERVAL_MS)
        }
      }

    pollRunnable = runnable
    handler.postDelayed(runnable, FIRST_CHECK_DELAY_MS)
  }

  fun stop() {
    pollRunnable?.let { handler.removeCallbacks(it) }
    pollRunnable = null
    stopAppOpsWatch()
    returnPendingIntent = null
  }

  private fun checkAndReturn(
    reactContext: ReactApplicationContext,
    isGranted: () -> Boolean,
  ): Boolean {
    val granted =
      try {
        isGranted()
      } catch (_: Exception) {
        false
      }

    if (!granted) {
      return false
    }

    val pendingIntent = returnPendingIntent
    bringAppToForeground(reactContext, pendingIntent)
    stop()
    return true
  }

  private fun startAppOpsWatch(
    reactContext: ReactApplicationContext,
    appOp: String,
    isGranted: () -> Boolean,
  ) {
    val appOps =
      reactContext.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager ?: return

    val listener =
      AppOpsManager.OnOpChangedListener { _, packageName ->
        if (
          !packageName.isNullOrBlank() &&
          packageName != reactContext.packageName
        ) {
          return@OnOpChangedListener
        }

        handler.post {
          checkAndReturn(reactContext, isGranted)
        }
      }

    appOpsListener = listener
    appOpsContext = reactContext.applicationContext
    try {
      appOps.startWatchingMode(appOp, reactContext.packageName, listener)
    } catch (_: Exception) {
      appOpsListener = null
      appOpsContext = null
    }
  }

  private fun stopAppOpsWatch() {
    val listener = appOpsListener ?: return
    val context = appOpsContext
    appOpsListener = null
    appOpsContext = null

    if (context == null) {
      return
    }

    try {
      val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager
      appOps?.stopWatchingMode(listener)
    } catch (_: Exception) {
      // Ignore.
    }
  }

  private fun createReturnPendingIntent(
    reactContext: ReactApplicationContext,
  ): PendingIntent? {
    val launchIntent = buildReturnIntent(reactContext) ?: return null
    val flags =
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

    return try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        val options =
          ActivityOptions.makeBasic().apply {
            setPendingIntentBackgroundActivityStartMode(
              ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED,
            )
          }
        PendingIntent.getActivity(
          reactContext,
          RETURN_REQUEST_CODE,
          launchIntent,
          flags,
          options.toBundle(),
        )
      } else {
        PendingIntent.getActivity(
          reactContext,
          RETURN_REQUEST_CODE,
          launchIntent,
          flags,
        )
      }
    } catch (_: Exception) {
      null
    }
  }

  private fun buildReturnIntent(reactContext: ReactApplicationContext): Intent? {
    val launchIntent =
      reactContext.packageManager.getLaunchIntentForPackage(reactContext.packageName)
        ?: Intent().setClassName(reactContext, "com.parentkey.MainActivity")

    launchIntent.addFlags(
      Intent.FLAG_ACTIVITY_NEW_TASK or
        Intent.FLAG_ACTIVITY_CLEAR_TOP or
        Intent.FLAG_ACTIVITY_SINGLE_TOP or
        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
        Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED,
    )
    return launchIntent
  }

  private fun bringAppToForeground(
    reactContext: ReactApplicationContext,
    pendingIntent: PendingIntent?,
  ) {
    handler.post {
      // 1) Privileged PendingIntent captured before Settings opened.
      if (pendingIntent != null) {
        try {
          pendingIntent.send()
          return@post
        } catch (_: Exception) {
          // Fall through.
        }
      }

      // 2) Same-task CLEAR_TOP via current activity (best for usage-access stack).
      val activity = reactContext.currentActivity
      if (activity != null) {
        try {
          val intent = Intent(activity, activity.javaClass)
          intent.addFlags(
            Intent.FLAG_ACTIVITY_CLEAR_TOP or
              Intent.FLAG_ACTIVITY_SINGLE_TOP or
              Intent.FLAG_ACTIVITY_REORDER_TO_FRONT,
          )
          activity.startActivity(intent)
          return@post
        } catch (_: Exception) {
          // Fall through.
        }
      }

      // 3) Launch intent fallback.
      val launchIntent = buildReturnIntent(reactContext) ?: return@post
      try {
        reactContext.startActivity(launchIntent)
      } catch (_: Exception) {
        // Best-effort; user can still return manually.
      }
    }
  }
}
