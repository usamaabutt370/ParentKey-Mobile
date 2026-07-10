const fs = require('fs');
const path = require('path');
const {
  withAppBuildGradle,
  withMainApplication,
  withDangerousMod,
} = require('@expo/config-plugins');
const {
  mergeContents,
} = require('@expo/config-plugins/build/utils/generateCode');

const FLAVOR_BLOCK = `    flavorDimensions "role"
    productFlavors {
        parent {
            dimension "role"
            applicationId "com.parentkey.parent"
            resValue "string", "app_name", "ParentKey"
        }
        child {
            dimension "role"
            applicationId "com.parentkey.child"
            resValue "string", "app_name", "ParentKey Child"
        }
    }
`;

function applyBuildGradleChanges(contents) {
  let next = contents.replace(
    /namespace\s+['"][^'"]*['"]/,
    "namespace 'com.parentkey'",
  );

  next = next.replace(/\n\s*applicationId\s+['"][^'"]*['"]\n/, '\n');

  if (!next.includes('productFlavors')) {
    next = next.replace(
      /\n(\s*)signingConfigs\s*\{/,
      `\n${FLAVOR_BLOCK}\n$1signingConfigs {`,
    );
  }

  return next;
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }

  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

function withAndroidFlavors(config) {
  config = withAppBuildGradle(config, config => {
    config.modResults.contents = applyBuildGradleChanges(
      config.modResults.contents,
    );
    return config;
  });

  config = withMainApplication(config, config => {
    const result = mergeContents({
      src: config.modResults.contents,
      newSrc:
        '          add(AppInfoPackage())\n          addAll(FlavorPackages.list())',
      tag: 'parentkey-flavor-packages',
      anchor: /PackageList\(this\)\.packages\.apply\s*\{/,
      offset: 1,
      comment: '//',
    });
    config.modResults.contents = result.contents;
    return config;
  });

  config = withDangerousMod(config, [
    'android',
    config => {
      const nativeRoot = path.join(
        config.modRequest.projectRoot,
        'plugins',
        'android-native',
      );
      const androidAppSrc = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
      );

      copyDirSync(
        path.join(nativeRoot, 'child'),
        path.join(androidAppSrc, 'child'),
      );
      copyDirSync(
        path.join(nativeRoot, 'parent'),
        path.join(androidAppSrc, 'parent'),
      );
      copyDirSync(
        path.join(nativeRoot, 'shared', 'java'),
        path.join(androidAppSrc, 'main', 'java'),
      );
      copyDirSync(
        path.join(nativeRoot, 'shared', 'res'),
        path.join(androidAppSrc, 'main', 'res'),
      );

      return config;
    },
  ]);

  return config;
}

module.exports = withAndroidFlavors;
