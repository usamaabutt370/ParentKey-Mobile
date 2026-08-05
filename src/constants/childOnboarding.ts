import type { ImageSourcePropType } from 'react-native';
import type { ChildPermissionKey } from '../lib/childPermissions';

export type ThemeableImageSource = {
  dark: ImageSourcePropType;
  light: ImageSourcePropType;
};

function themeable(
  dark: ImageSourcePropType,
  light: ImageSourcePropType,
): ThemeableImageSource {
  return { dark, light };
}

export const CHILD_ONBOARDING_IMAGES = {
  scanQr: themeable(
    require('../../assets/onboarding/child-scan-qr-dark.png'),
    require('../../assets/onboarding/child-scan-qr-light.png'),
  ),
  consent: themeable(
    require('../../assets/onboarding/child-consent-dark.png'),
    require('../../assets/onboarding/child-consent-light.png'),
  ),
  profile: themeable(
    require('../../assets/onboarding/child-profile-dark.png'),
    require('../../assets/onboarding/child-profile-light.png'),
  ),
  permissionUsage: themeable(
    require('../../assets/onboarding/child-permission-usage-dark.png'),
    require('../../assets/onboarding/child-permission-usage-light.png'),
  ),
  permissionBlocking: themeable(
    require('../../assets/onboarding/child-permission-blocking-dark.png'),
    require('../../assets/onboarding/child-permission-blocking-light.png'),
  ),
  permissionBattery: themeable(
    require('../../assets/onboarding/child-permission-battery-dark.png'),
    require('../../assets/onboarding/child-permission-battery-light.png'),
  ),
  permissionAdmin: themeable(
    require('../../assets/onboarding/child-permission-admin-dark.png'),
    require('../../assets/onboarding/child-permission-admin-light.png'),
  ),
  deviceReady: themeable(
    require('../../assets/onboarding/child-device-ready-dark.png'),
    require('../../assets/onboarding/child-device-ready-light.png'),
  ),
} as const;

export function pickThemeableImage(
  source: ThemeableImageSource,
  isDark: boolean,
): ImageSourcePropType {
  return isDark ? source.dark : source.light;
}

export function getChildPermissionImage(
  key: ChildPermissionKey,
): ThemeableImageSource {
  switch (key) {
    case 'usage':
      return CHILD_ONBOARDING_IMAGES.permissionUsage;
    case 'accessibility':
      return CHILD_ONBOARDING_IMAGES.permissionBlocking;
    case 'background':
      return CHILD_ONBOARDING_IMAGES.permissionBattery;
    case 'deviceAdmin':
      return CHILD_ONBOARDING_IMAGES.permissionAdmin;
  }
}
