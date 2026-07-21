import * as SplashScreen from 'expo-splash-screen';

// Must run before the first React render so the native splash is not
// auto-dismissed when CONTENT_APPEARED fires.
void SplashScreen.preventAutoHideAsync();

let hideRequested = false;

/**
 * Dismiss the native splash once the first real route is ready to paint.
 * Safe to call multiple times.
 */
export function hideSplashWhenReady(): void {
  if (hideRequested) {
    return;
  }
  hideRequested = true;
  void SplashScreen.hideAsync();
}

// Never leave the user stuck on splash if a gate fails to resolve.
setTimeout(() => {
  hideSplashWhenReady();
}, 8000);
