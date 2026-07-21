package com.parentkey

/**
 * Shared state for block-flow debounce / escape. Overlay is no longer used to
 * trap the user; kept only to clear leftovers from older app versions.
 */
object AppBlockingCoordinator {
  @Volatile
  private var suppressBlockingUntilElapsedRealtime: Long = 0L

  fun shouldSuppressBlocking(): Boolean {
    return android.os.SystemClock.elapsedRealtime() < suppressBlockingUntilElapsedRealtime
  }

  fun beginHomeEscape(suppressMs: Long = 2_500L) {
    suppressBlockingUntilElapsedRealtime =
      android.os.SystemClock.elapsedRealtime() + suppressMs
  }

  fun forceClearAllOverlays() {
    suppressBlockingUntilElapsedRealtime = 0L
    AppBlockingOverlayManager.hide()
  }
}
