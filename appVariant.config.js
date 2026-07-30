/**
 * Shared parent/child app identity used by Expo config and native apply scripts.
 * Keep in sync with Android Gradle flavors (com.parentkey.parent / .child).
 */
const VARIANTS = {
  parent: {
    name: 'ParentKey',
    productName: 'ParentKey',
    androidPackage: 'com.parentkey.parent',
    iosBundleId: 'com.parentkey.parent',
    iosAppGroup: 'group.com.parentkey.parent',
    urlScheme: 'parentkey',
    icon: './assets/appicon/parent-icon-1024.png',
    adaptiveIconForeground:
      './assets/appicon/parent-icon-adaptive-foreground.png',
  },
  child: {
    name: 'ParentKey Child',
    productName: 'ParentKeyChild',
    androidPackage: 'com.parentkey.child',
    iosBundleId: 'com.parentkey.child',
    iosAppGroup: 'group.com.parentkey.child',
    urlScheme: 'parentkey-child',
    icon: './assets/appicon/child-icon-family-1024.png',
    adaptiveIconForeground:
      './assets/appicon/child-icon-family-adaptive-foreground.png',
  },
};

function resolveVariant(env = process.env) {
  return env.APP_VARIANT === 'child' ? 'child' : 'parent';
}

function getVariantConfig(env = process.env) {
  const key = resolveVariant(env);
  return { key, ...VARIANTS[key] };
}

function getIosAppExtensions(variantConfig) {
  const { iosBundleId, iosAppGroup } = variantConfig;
  const extensionNames = [
    'ShieldConfiguration',
    'ShieldAction',
    'ActivityMonitorExtension',
  ];

  return extensionNames.map(targetName => ({
    bundleIdentifier: `${iosBundleId}.${targetName}`,
    targetName,
    entitlements: {
      'com.apple.developer.family-controls': true,
      'com.apple.security.application-groups': [iosAppGroup],
    },
  }));
}

module.exports = {
  VARIANTS,
  resolveVariant,
  getVariantConfig,
  getIosAppExtensions,
};
