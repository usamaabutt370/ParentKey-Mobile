package com.parentkey

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
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

  private fun deviceAdminComponent(): ComponentName =
    ComponentName(reactApplicationContext, ParentKeyDeviceAdminReceiver::class.java)

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

  @ReactMethod
  fun canDrawOverlays(promise: Promise) {
    try {
      val granted =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          Settings.canDrawOverlays(reactApplicationContext)
        } else {
          true
        }
      promise.resolve(granted)
    } catch (error: Exception) {
      promise.reject("OVERLAY_STATUS_ERROR", error.message, error)
    }
  }

  @ReactMethod
  fun openOverlaySettings(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        val intent =
          Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:${reactApplicationContext.packageName}"),
          )
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactApplicationContext.startActivity(intent)
      }
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("OPEN_OVERLAY_SETTINGS_ERROR", error.message, error)
    }
  }

  @ReactMethod
  fun isIgnoringBatteryOptimizations(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
        promise.resolve(true)
        return
      }

      val powerManager =
        reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
      promise.resolve(
        powerManager.isIgnoringBatteryOptimizations(reactApplicationContext.packageName),
      )
    } catch (error: Exception) {
      promise.reject("BATTERY_STATUS_ERROR", error.message, error)
    }
  }

  @ReactMethod
  fun openBatteryOptimizationSettings(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        val powerManager =
          reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
        if (!powerManager.isIgnoringBatteryOptimizations(reactApplicationContext.packageName)) {
          val intent =
            Intent(
              Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
              Uri.parse("package:${reactApplicationContext.packageName}"),
            )
          intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          reactApplicationContext.startActivity(intent)
          promise.resolve(true)
          return
        }
      }

      val fallback = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
      fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactApplicationContext.startActivity(fallback)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("OPEN_BATTERY_SETTINGS_ERROR", error.message, error)
    }
  }

  @ReactMethod
  fun openAutostartSettings(promise: Promise) {
    try {
      val packageName = reactApplicationContext.packageName
      val candidates =
        listOf(
          Intent().setComponent(
            ComponentName(
              "com.miui.securitycenter",
              "com.miui.permcenter.autostart.AutoStartManagementActivity",
            ),
          ),
          Intent().setComponent(
            ComponentName(
              "com.coloros.safecenter",
              "com.coloros.safecenter.startupapp.StartupAppListActivity",
            ),
          ),
          Intent().setComponent(
            ComponentName(
              "com.oppo.safe",
              "com.oppo.safe.permission.startup.StartupAppListActivity",
            ),
          ),
          Intent().setComponent(
            ComponentName(
              "com.vivo.permissionmanager",
              "com.vivo.permissionmanager.activity.BgStartUpManagerActivity",
            ),
          ),
          Intent().setComponent(
            ComponentName(
              "com.huawei.systemmanager",
              "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity",
            ),
          ),
          Intent().setComponent(
            ComponentName(
              "com.samsung.android.lool",
              "com.samsung.android.sm.battery.ui.BatteryActivity",
            ),
          ),
        )

      val packageManager = reactApplicationContext.packageManager
      for (intent in candidates) {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        if (intent.resolveActivity(packageManager) != null) {
          reactApplicationContext.startActivity(intent)
          promise.resolve(true)
          return
        }
      }

      val appDetails =
        Intent(
          Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
          Uri.parse("package:$packageName"),
        )
      appDetails.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactApplicationContext.startActivity(appDetails)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("OPEN_AUTOSTART_SETTINGS_ERROR", error.message, error)
    }
  }

  @ReactMethod
  fun isDeviceAdminActive(promise: Promise) {
    try {
      val devicePolicyManager =
        reactApplicationContext.getSystemService(Context.DEVICE_POLICY_SERVICE)
          as DevicePolicyManager
      promise.resolve(devicePolicyManager.isAdminActive(deviceAdminComponent()))
    } catch (error: Exception) {
      promise.reject("DEVICE_ADMIN_STATUS_ERROR", error.message, error)
    }
  }

  @ReactMethod
  fun requestDeviceAdmin(promise: Promise) {
    try {
      val activity = reactApplicationContext.currentActivity
      if (activity == null) {
        promise.reject(
          "REQUEST_DEVICE_ADMIN_ERROR",
          "Could not open device admin settings. Return to the app and try again.",
        )
        return
      }

      val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
      intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, deviceAdminComponent())
      intent.putExtra(
        DevicePolicyManager.EXTRA_ADD_EXPLANATION,
        "ParentKey needs device admin so this app cannot be removed without your parent's help.",
      )
      activity.startActivity(intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("REQUEST_DEVICE_ADMIN_ERROR", error.message, error)
    }
  }

  @ReactMethod
  fun deactivateDeviceAdmin(promise: Promise) {
    try {
      val devicePolicyManager =
        reactApplicationContext.getSystemService(Context.DEVICE_POLICY_SERVICE)
          as DevicePolicyManager
      val component = deviceAdminComponent()

      if (devicePolicyManager.isAdminActive(component)) {
        devicePolicyManager.removeActiveAdmin(component)
      }

      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("DEACTIVATE_DEVICE_ADMIN_ERROR", error.message, error)
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
