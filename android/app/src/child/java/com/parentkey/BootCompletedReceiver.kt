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
  }
}
