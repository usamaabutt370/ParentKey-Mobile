package com.parentkey

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootCompletedReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != Intent.ACTION_BOOT_COMPLETED) {
      return
    }

    // Blocked packages are persisted locally. The accessibility service
    // resumes automatically when the user has already enabled it.
    AppBlockingPreferences.getBlockedPackages(context)

    // Resume remote sync so parent changes apply without opening the app.
    if (ParentKeySyncCredentials.read(context) != null) {
      ParentKeySyncWorker.schedulePeriodic(context)
      ParentKeySyncWorker.enqueueImmediate(context)
      ParentKeySyncForegroundService.start(context)
    }
  }
}
