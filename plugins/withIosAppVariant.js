/**
 * Applies parent/child iOS identity during Expo prebuild.
 * Complements scripts/apply-ios-variant.js for committed ios/ trees on EAS.
 */
const {
  withInfoPlist,
  withEntitlementsPlist,
  withXcodeProject,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const { getVariantConfig } = require('../appVariant.config');

const KNOWN_BUNDLE_IDS = [
  'org.reactjs.native.example.ParentKey',
  'com.parentkey.parent',
  'com.parentkey.child',
];

const KNOWN_APP_GROUPS = [
  'group.org.reactjs.native.example.ParentKey',
  'group.com.parentkey.parent',
  'group.com.parentkey.child',
];

function replaceKnownIds(contents, knownIds, nextId) {
  let result = contents;
  for (const id of knownIds) {
    if (id === nextId) {
      continue;
    }
    result = result.split(id).join(nextId);
  }
  return result;
}

function applyIosVariantFiles(projectRoot, variant) {
  const iosRoot = path.join(projectRoot, 'ios');
  if (!fs.existsSync(iosRoot)) {
    return;
  }

  const targets = [
    path.join(iosRoot, 'ParentKey', 'Info.plist'),
    path.join(iosRoot, 'ParentKey', 'ParentKey.entitlements'),
    path.join(iosRoot, 'ParentKey.xcodeproj', 'project.pbxproj'),
  ];

  for (const filePath of targets) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    let contents = fs.readFileSync(filePath, 'utf8');

    // App groups first so bundle-id rewrites cannot touch the group prefix twice.
    contents = replaceKnownIds(contents, KNOWN_APP_GROUPS, variant.iosAppGroup);
    contents = replaceKnownIds(contents, KNOWN_BUNDLE_IDS, variant.iosBundleId);

    contents = contents.replace(
      /PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g,
      `PRODUCT_BUNDLE_IDENTIFIER = ${variant.iosBundleId};`,
    );
    contents = contents.replace(
      /REACT_NATIVE_DEVICE_ACTIVITY_APP_GROUP = [^;]+;/g,
      `REACT_NATIVE_DEVICE_ACTIVITY_APP_GROUP = ${variant.iosAppGroup};`,
    );
    contents = contents.replace(
      /PRODUCT_NAME = [^;]+;/g,
      `PRODUCT_NAME = ${variant.productName};`,
    );

    if (filePath.endsWith('Info.plist')) {
      contents = contents.replace(
        /<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/,
        `<key>CFBundleDisplayName</key>\n\t<string>${variant.name}</string>`,
      );
      contents = contents.replace(
        /<key>REACT_NATIVE_DEVICE_ACTIVITY_APP_GROUP<\/key>\s*<string>[^<]*<\/string>/,
        `<key>REACT_NATIVE_DEVICE_ACTIVITY_APP_GROUP</key>\n\t<string>${variant.iosAppGroup}</string>`,
      );
      contents = contents.replace(
        /<string>parentkey(?:-child)?<\/string>/,
        `<string>${variant.urlScheme}</string>`,
      );
    }

    if (filePath.endsWith('ParentKey.entitlements')) {
      contents = contents.replace(
        /<string>group\.[^<]+<\/string>/g,
        `<string>${variant.iosAppGroup}</string>`,
      );

      const hasFamilyControls = contents.includes(
        'com.apple.developer.family-controls',
      );
      if (variant.key === 'child' && !hasFamilyControls) {
        contents = contents.replace(
          '<dict>',
          `<dict>
	<key>com.apple.developer.family-controls</key>
	<true/>`,
        );
      }
      if (variant.key === 'parent' && hasFamilyControls) {
        contents = contents.replace(
          /\t<key>com\.apple\.developer\.family-controls<\/key>\n\t<true\/>\n/,
          '',
        );
      }
    }

    fs.writeFileSync(filePath, contents);
  }
}

function withIosAppVariant(config) {
  const variant = getVariantConfig();

  config = withInfoPlist(config, config => {
    config.modResults.CFBundleDisplayName = variant.name;
    config.modResults.REACT_NATIVE_DEVICE_ACTIVITY_APP_GROUP =
      variant.iosAppGroup;
    config.modResults.CFBundleURLTypes = [
      {
        CFBundleURLSchemes: [variant.urlScheme],
      },
    ];
    return config;
  });

  config = withEntitlementsPlist(config, config => {
    config.modResults['com.apple.security.application-groups'] = [
      variant.iosAppGroup,
    ];
    if (variant.key === 'child') {
      config.modResults['com.apple.developer.family-controls'] = true;
    } else {
      delete config.modResults['com.apple.developer.family-controls'];
    }
    return config;
  });

  config = withXcodeProject(config, config => {
    const project = config.modResults;
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configurations)) {
      const buildSettings = configurations[key]?.buildSettings;
      if (!buildSettings) {
        continue;
      }
      if (buildSettings.PRODUCT_BUNDLE_IDENTIFIER) {
        buildSettings.PRODUCT_BUNDLE_IDENTIFIER = variant.iosBundleId;
      }
      if (buildSettings.PRODUCT_NAME) {
        buildSettings.PRODUCT_NAME = variant.productName;
      }
      if (buildSettings.REACT_NATIVE_DEVICE_ACTIVITY_APP_GROUP) {
        buildSettings.REACT_NATIVE_DEVICE_ACTIVITY_APP_GROUP =
          variant.iosAppGroup;
      }
    }
    return config;
  });

  config = withDangerousMod(config, [
    'ios',
    async config => {
      applyIosVariantFiles(config.modRequest.projectRoot, variant);
      return config;
    },
  ]);

  return config;
}

module.exports = withIosAppVariant;
module.exports.applyIosVariantFiles = applyIosVariantFiles;
