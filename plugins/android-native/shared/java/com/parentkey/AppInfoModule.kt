package com.parentkey

import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AppInfoModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AppInfo"

  override fun getConstants(): Map<String, Any> = mapOf("flavor" to BuildConfig.FLAVOR)

  @ReactMethod
  fun getDeviceModelLabel(promise: Promise) {
    try {
      promise.resolve(resolveDeviceModelLabel())
    } catch (error: Exception) {
      promise.reject("DEVICE_MODEL_LABEL_ERROR", error.message, error)
    }
  }

  private fun resolveDeviceModelLabel(): String {
    // OEM marketing names (Realme/Oppo/Xiaomi/etc.) — e.g. "realme C75"
    val marketName =
      listOf(
          "ro.product.marketname",
          "ro.vendor.product.marketname",
          "ro.oppo.market.name",
          "ro.product.nickname",
          "ro.config.marketing_name",
        )
        .firstNotNullOfOrNull { readSystemProperty(it) }

    if (!marketName.isNullOrBlank()) {
      return marketName.trim()
    }

    // User/OEM device name from system settings — often "Galaxy S24" / "Pixel 8"
    val settingsName =
      listOf(
          Settings.Global.DEVICE_NAME,
          "bluetooth_name",
        )
        .firstNotNullOfOrNull { key ->
          runCatching {
              Settings.Global.getString(reactApplicationContext.contentResolver, key)
                ?: Settings.Secure.getString(reactApplicationContext.contentResolver, key)
            }
            .getOrNull()
            ?.trim()
            ?.takeIf { isUsefulDeviceName(it) }
        }

    if (!settingsName.isNullOrBlank()) {
      return settingsName
    }

    val manufacturer = Build.MANUFACTURER?.trim().orEmpty()
    val brand = Build.BRAND?.trim().orEmpty()
    val model = Build.MODEL?.trim().orEmpty()
    val displayBrand =
      when {
        brand.isNotEmpty() -> prettyBrand(brand)
        manufacturer.isNotEmpty() -> prettyBrand(manufacturer)
        else -> null
      }

    if (model.isNotEmpty()) {
      if (
        displayBrand != null &&
          !model.contains(displayBrand, ignoreCase = true) &&
          !model.contains(brand, ignoreCase = true)
      ) {
        return "$displayBrand $model"
      }
      return model
    }

    return displayBrand ?: "Android device"
  }

  private fun isUsefulDeviceName(value: String): Boolean {
    val normalized = value.trim()
    if (normalized.length < 2) {
      return false
    }

    val blocked =
      setOf(
        "android",
        "android device",
        "phone",
        "mobile",
        "unknown",
        "localhost",
      )

    if (normalized.lowercase() in blocked) {
      return false
    }

    // Skip MAC-like Bluetooth defaults.
    if (normalized.matches(Regex("^[0-9A-Fa-f:]{11,}$"))) {
      return false
    }

    return true
  }

  private fun prettyBrand(raw: String): String {
    val lower = raw.lowercase()
    val known =
      mapOf(
        "samsung" to "Samsung",
        "google" to "Google",
        "xiaomi" to "Xiaomi",
        "redmi" to "Redmi",
        "realme" to "realme",
        "oppo" to "OPPO",
        "oneplus" to "OnePlus",
        "vivo" to "vivo",
        "huawei" to "HUAWEI",
        "honor" to "HONOR",
        "motorola" to "Motorola",
        "nokia" to "Nokia",
        "sony" to "Sony",
        "lg" to "LG",
        "asus" to "ASUS",
        "nothing" to "Nothing",
        "tecno" to "TECNO",
        "infinix" to "Infinix",
      )

    return known[lower]
      ?: raw.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
  }

  private fun readSystemProperty(key: String): String? {
    return try {
      val clazz = Class.forName("android.os.SystemProperties")
      val method = clazz.getMethod("get", String::class.java, String::class.java)
      val value = method.invoke(null, key, "") as? String
      value?.trim()?.takeIf { it.isNotEmpty() }
    } catch (_: Exception) {
      null
    }
  }
}
