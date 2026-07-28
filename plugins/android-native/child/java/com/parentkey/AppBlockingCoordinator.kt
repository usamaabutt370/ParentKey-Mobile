package com.parentkey

/**
 * Shared state for block-flow debounce / escape while leaving a blocked app.
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

  fun reset() {
    suppressBlockingUntilElapsedRealtime = 0L
  }
}
