package com.parentkey

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * Sticky foreground service that periodically pulls parent rules while the
 * child app is not necessarily in the foreground. This is the primary
 * "instant-ish" sync path until FCM is configured.
 */
class ParentKeySyncForegroundService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private val syncRunnable =
    object : Runnable {
      override fun run() {
        Thread {
          ParentKeyRemoteSync.syncNow(applicationContext)
        }.start()
        handler.postDelayed(this, SYNC_INTERVAL_MS)
      }
    }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> {
        stopSelf()
        return START_NOT_STICKY
      }
      else -> {
        startAsForeground()
        handler.removeCallbacks(syncRunnable)
        // Immediate sync, then interval.
        handler.post(syncRunnable)
      }
    }
    return START_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(syncRunnable)
    super.onDestroy()
  }

  private fun startAsForeground() {
    ensureChannel()
    val launchIntent =
      packageManager.getLaunchIntentForPackage(packageName)?.apply {
        flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
      }
    val pending =
      PendingIntent.getActivity(
        this,
        0,
        launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )

    val notification: Notification =
      NotificationCompat.Builder(this, CHANNEL_ID)
        .setContentTitle("ParentKey protection")
        .setContentText("Syncing parent rules in the background")
        .setSmallIcon(android.R.drawable.ic_lock_lock)
        .setContentIntent(pending)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .build()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }
    val manager = getSystemService(NotificationManager::class.java) ?: return
    val channel =
      NotificationChannel(
        CHANNEL_ID,
        "ParentKey protection",
        NotificationManager.IMPORTANCE_LOW,
      ).apply {
        description = "Keeps parent block rules up to date"
        setShowBadge(false)
      }
    manager.createNotificationChannel(channel)
  }

  companion object {
    private const val TAG = "ParentKeySyncFGS"
    private const val CHANNEL_ID = "parentkey_sync"
    private const val NOTIFICATION_ID = 71001
    const val ACTION_STOP = "com.parentkey.action.STOP_SYNC_SERVICE"
    /** Near-instant while FGS is alive; FCM will replace this for kill-state wake. */
    private const val SYNC_INTERVAL_MS = 20_000L

    fun start(context: Context) {
      if (ParentKeySyncCredentials.read(context) == null) {
        Log.w(TAG, "Not starting sync service — no credentials")
        return
      }
      val intent = Intent(context, ParentKeySyncForegroundService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, ParentKeySyncForegroundService::class.java))
    }
  }
}
