/**
 * Dynamic Expo config so EAS can target parent vs child apps.
 * APP_VARIANT is set per profile in eas.json (parent | child).
 * Defaults to parent for local/dev.
 */
const appJson = require('./app.json');
const {
  getVariantConfig,
  getIosAppExtensions,
} = require('./appVariant.config');

const variant = getVariantConfig();

const cameraPermission =
  variant.key === 'child'
    ? 'ParentKey Child needs camera access to scan the QR code from your parent\'s phone.'
    : 'ParentKey needs camera access for pairing-related features.';

const photosPermission =
  'ParentKey Child needs photo library access so you can choose a profile picture.';

const profileCameraPermission =
  'ParentKey Child needs camera access so you can take a profile picture.';

const plugins = [
  ...(variant.key === 'child'
    ? [
        [
          'react-native-device-activity',
          {
            appGroup: variant.iosAppGroup,
          },
        ],
      ]
    : []),
  [
    'expo-camera',
    {
      cameraPermission,
    },
  ],
  [
    'expo-image-picker',
    {
      photosPermission,
      cameraPermission: profileCameraPermission,
      microphonePermission: false,
    },
  ],
  './plugins/withAndroidFlavors.js',
  './plugins/withIosAppVariant.js',
  'expo-splash-screen',
];

const easExtra = {
  ...(appJson.extra?.eas ?? {}),
  build: {
    ...(appJson.extra?.eas?.build ?? {}),
    experimental: {
      ...(appJson.extra?.eas?.build?.experimental ?? {}),
      ios:
        variant.key === 'child'
          ? {
              appExtensions: getIosAppExtensions(variant),
            }
          : undefined,
    },
  },
};

module.exports = {
  ...appJson,
  // Keep a stable Expo slug for both flavors — derived slugs like
  // "parentkey-child" break the linked EAS projectId (parentkey).
  slug: 'parentkey',
  name: variant.name,
  displayName: variant.name,
  icon: variant.icon,
  ios: {
    ...appJson.ios,
    bundleIdentifier: variant.iosBundleId,
    icon: variant.icon,
    supportsTablet: true,
  },
  android: {
    ...appJson.android,
    package: variant.androidPackage,
    adaptiveIcon: {
      ...(appJson.android?.adaptiveIcon ?? {}),
      foregroundImage: variant.adaptiveIconForeground,
      backgroundColor: '#FFFFFF',
    },
  },
  plugins,
  extra: {
    ...appJson.extra,
    eas: easExtra,
    appVariant: variant.key,
    iosAppGroup: variant.iosAppGroup,
    iosBundleId: variant.iosBundleId,
  },
};
