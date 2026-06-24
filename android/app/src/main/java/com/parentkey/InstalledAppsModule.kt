package com.parentkey

import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap

class InstalledAppsModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "InstalledApps"

  @ReactMethod
  fun getInstalledApps(promise: Promise) {
    try {
      val packageManager = reactApplicationContext.packageManager
      val installedApplications =
        packageManager.getInstalledApplications(PackageManager.GET_META_DATA)

      val apps = WritableNativeArray()
      val seenPackages = linkedSetOf<String>()

      for (applicationInfo in installedApplications) {
        val packageName = applicationInfo.packageName

        if (packageName == reactApplicationContext.packageName) {
          continue
        }

        if (!seenPackages.add(packageName)) {
          continue
        }

        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        if (launchIntent == null) {
          continue
        }

        val appName = packageManager.getApplicationLabel(applicationInfo).toString()
        val isSystemApp =
          (applicationInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0

        val app = WritableNativeMap()
        app.putString("packageName", packageName)
        app.putString("appName", appName)
        app.putBoolean("isSystemApp", isSystemApp)
        apps.pushMap(app)
      }

      promise.resolve(apps)
    } catch (error: Exception) {
      promise.reject("INSTALLED_APPS_ERROR", error.message, error)
    }
  }
}
