// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/**", "coverage/**", ".expo/**", "android/**", "ios/**"],
  },
  {
    files: ["scripts/**/*.test.js"],
    // Jest transforms these scripts to CommonJS and provides its test runner.
    languageOptions: {
      globals: {
        __filename: "readonly",
        test: "readonly",
      },
    },
  },
  {
    files: ["src/i18n/index.ts"],
    rules: {
      "import/no-named-as-default-member": "off",
    },
  },
]);
