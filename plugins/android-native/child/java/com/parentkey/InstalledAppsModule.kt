package com.parentkey

import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.AdaptiveIconDrawable
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.os.Build
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream

class InstalledAppsModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    private const val ICON_SIZE_PX = 96
  }

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

        val bitmap = getAppIconBitmap(packageManager, applicationInfo)
        if (bitmap != null) {
          val iconUri = cacheAppIcon(packageName, bitmap)
          if (iconUri != null) {
            app.putString("iconUri", iconUri)
          }

          val iconBase64 = bitmapToBase64(bitmap)
          if (iconBase64 != null) {
            app.putString("iconBase64", iconBase64)
          }
        }

        apps.pushMap(app)
      }

      promise.resolve(apps)
    } catch (error: Exception) {
      promise.reject("INSTALLED_APPS_ERROR", error.message, error)
    }
  }

  private fun getAppIconBitmap(
    packageManager: PackageManager,
    applicationInfo: ApplicationInfo,
  ): Bitmap? {
    return try {
      val drawable = packageManager.getApplicationIcon(applicationInfo)
      drawableToBitmap(drawable, ICON_SIZE_PX)
    } catch (_: Exception) {
      null
    }
  }

  private fun cacheAppIcon(packageName: String, bitmap: Bitmap): String? {
    return try {
      val directory = File(reactApplicationContext.cacheDir, "app_icons")
      if (!directory.exists()) {
        directory.mkdirs()
      }

      val safeName = packageName.replace(Regex("[^a-zA-Z0-9._-]"), "_")
      val iconFile = File(directory, "$safeName.png")

      FileOutputStream(iconFile).use { output ->
        bitmap.compress(Bitmap.CompressFormat.PNG, 92, output)
      }

      "file://${iconFile.absolutePath}"
    } catch (_: Exception) {
      null
    }
  }

  private fun bitmapToBase64(bitmap: Bitmap): String? {
    return try {
      val output = ByteArrayOutputStream()
      bitmap.compress(Bitmap.CompressFormat.PNG, 85, output)
      Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP)
    } catch (_: Exception) {
      null
    }
  }

  private fun drawableToBitmap(drawable: Drawable, size: Int): Bitmap {
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)

    if (drawable is BitmapDrawable) {
      val source = drawable.bitmap
      if (source != null && !source.isRecycled) {
        val scaled = Bitmap.createScaledBitmap(source, size, size, true)
        canvas.drawBitmap(scaled, 0f, 0f, null)
        if (scaled !== source) {
          scaled.recycle()
        }
        return bitmap
      }
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && drawable is AdaptiveIconDrawable) {
      val expand = (size * 0.1f).toInt()
      drawable.setBounds(-expand, -expand, size + expand, size + expand)
      drawable.draw(canvas)
      return bitmap
    }

    val intrinsicWidth = drawable.intrinsicWidth.coerceAtLeast(1)
    val intrinsicHeight = drawable.intrinsicHeight.coerceAtLeast(1)
    val scale = minOf(
      size.toFloat() / intrinsicWidth,
      size.toFloat() / intrinsicHeight,
    )
    val scaledWidth = (intrinsicWidth * scale).toInt()
    val scaledHeight = (intrinsicHeight * scale).toInt()
    val left = (size - scaledWidth) / 2
    val top = (size - scaledHeight) / 2

    drawable.setBounds(left, top, left + scaledWidth, top + scaledHeight)
    drawable.draw(canvas)
    return bitmap
  }
}
