package com.parentkey

import android.content.Context
import android.util.Log
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

class ParentKeySyncWorker(
  context: Context,
  params: WorkerParameters,
) : Worker(context, params) {
  override fun doWork(): Result {
    val sync = ParentKeyRemoteSync.syncNow(applicationContext)
    return if (sync.ok) Result.success() else Result.retry()
  }

  companion object {
    private const val TAG = "ParentKeySyncWorker"
    private const val UNIQUE_PERIODIC = "parentkey_remote_sync_periodic"
    private const val UNIQUE_ONCE = "parentkey_remote_sync_once"

    fun enqueueImmediate(context: Context) {
      val request =
        OneTimeWorkRequestBuilder<ParentKeySyncWorker>()
          .setConstraints(
            Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build(),
          )
          .build()
      WorkManager.getInstance(context).enqueueUniqueWork(
        UNIQUE_ONCE,
        ExistingWorkPolicy.REPLACE,
        request,
      )
    }

    fun schedulePeriodic(context: Context) {
      val request =
        PeriodicWorkRequestBuilder<ParentKeySyncWorker>(15, TimeUnit.MINUTES)
          .setConstraints(
            Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build(),
          )
          .build()
      WorkManager.getInstance(context).enqueueUniquePeriodicWork(
        UNIQUE_PERIODIC,
        ExistingPeriodicWorkPolicy.UPDATE,
        request,
      )
      Log.i(TAG, "Scheduled periodic remote sync")
    }

    fun cancelAll(context: Context) {
      WorkManager.getInstance(context).cancelUniqueWork(UNIQUE_PERIODIC)
      WorkManager.getInstance(context).cancelUniqueWork(UNIQUE_ONCE)
    }
  }
}
