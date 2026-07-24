/**
 * Dynamic Expo config so EAS can target parent vs child package names.
 * APP_VARIANT is set per profile in eas.json (parent | child).
 * Defaults to parent for local/dev.
 */
const appJson = require('./app.json');

const variant = process.env.APP_VARIANT === 'child' ? 'child' : 'parent';

const androidPackage =
  variant === 'child' ? 'com.parentkey.child' : 'com.parentkey.parent';

const appName = variant === 'child' ? 'ParentKey Child' : 'ParentKey';

module.exports = {
  ...appJson,
  // Keep a stable Expo slug for both flavors — derived slugs like
  // "parentkey-child" break the linked EAS projectId (parentkey).
  slug: 'parentkey',
  name: appName,
  displayName: appName,
  android: {
    ...appJson.android,
    package: androidPackage,
  },
  extra: {
    ...appJson.extra,
    appVariant: variant,
  },
};
