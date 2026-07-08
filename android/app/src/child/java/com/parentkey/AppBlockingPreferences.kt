package com.parentkey

import android.content.Context

object AppBlockingPreferences {
  private const val PREFS_NAME = "parentkey_app_blocking"
  private const val BLOCKED_PACKAGES_KEY = "blocked_packages"

  fun setBlockedPackages(context: Context, packages: Set<String>) {
    context
      .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putStringSet(BLOCKED_PACKAGES_KEY, packages)
      .apply()
  }

  fun getBlockedPackages(context: Context): Set<String> {
    return context
      .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getStringSet(BLOCKED_PACKAGES_KEY, emptySet())
      ?.toSet()
      ?: emptySet()
  }
}
