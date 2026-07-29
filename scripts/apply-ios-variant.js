#!/usr/bin/env node
/**
 * EAS / local helper: rewrite committed ios/ identity for APP_VARIANT.
 * Needed because EAS skips expo prebuild when ios/ already exists.
 */
const path = require('path');
const { getVariantConfig } = require('../appVariant.config');
const { applyIosVariantFiles } = require('../plugins/withIosAppVariant');

const variant = getVariantConfig();
const projectRoot = path.join(__dirname, '..');

applyIosVariantFiles(projectRoot, variant);

console.log(
  `[apply-ios-variant] Applied ${variant.key} → ${variant.iosBundleId} (${variant.iosAppGroup})`,
);
