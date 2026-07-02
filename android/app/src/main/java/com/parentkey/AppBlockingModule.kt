package com.parentkey

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

class AppBlockingModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AppBlocking"

  @ReactMethod
  fun getDeviceId(promise: Promise) {
    try {
      val androidId =
        Settings.Secure.getString(
          reactApplicationContext.contentResolver,
          Settings.Secure.ANDROID_ID,
        )
      promise.resolve(androidId ?: "unknown-device")
    } catch (error: Exception) {
      promise.reject("DEVICE_ID_ERROR", error.message, error)
    }
  }

  @ReactMethod
  fun setBlockedPackages(packages: ReadableArray, promise: Promise) {
    try {
      val blocked = linkedSetOf<String>()
      for (index in 0 until packages.size()) {
        val packageName = packages.getString(index)
        if (!packageName.isNullOrBlank()) {
          blocked.add(packageName)
        }
      }
      AppBlockingPreferences.setBlockedPackages(reactApplicationContext, blocked)
      promise.resolve(blocked.size)
    } catch (error: Exception) {
      promise.reject("SET_BLOCKED_PACKAGES_ERROR", error.message, error)
    }
  }

  @ReactMethod
  fun getBlockedPackages(promise: Promise) {
    try {
      val blocked = AppBlockingPreferences.getBlockedPackages(reactApplicationContext)
      promise.resolve(blocked.toTypedArray())
    } catch (error: Exception) {
      promise.reject("GET_BLOCKED_PACKAGES_ERROR", error.message, error)
    }
  }

  @ReactMethod
  fun isAccessibilityServiceEnabled(promise: Promise) {
    try {
      promise.resolve(isAccessibilityEnabled(reactApplicationContext))
    } catch (error: Exception) {
      promise.reject("ACCESSIBILITY_STATUS_ERROR", error.message, error)
    }
  }

  @ReactMethod
  fun openAccessibilitySettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactApplicationContext.startActivity(intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("OPEN_ACCESSIBILITY_SETTINGS_ERROR", error.message, error)
    }
  }

  private fun isAccessibilityEnabled(context: Context): Boolean {
    val expectedComponent =
      ComponentName(context.packageName, AppBlockingService::class.java.name).flattenToString()
    val enabledServices =
      Settings.Secure.getString(
        context.contentResolver,
        Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
      )
        ?: return false

    val splitter = TextUtils.SimpleStringSplitter(':')
    splitter.setString(enabledServices)
    while (splitter.hasNext()) {
      val component = splitter.next()
      if (component.equals(expectedComponent, ignoreCase = true)) {
        return true
      }
    }

    return false
  }
}
