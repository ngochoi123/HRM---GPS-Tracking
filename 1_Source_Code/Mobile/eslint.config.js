/*
 * Copyright (c) 2026 ngochoi123 / HRM - GPS Tracking.
 * All rights reserved.
 */

// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
]);
