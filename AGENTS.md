# Expo changes frequently

- For Expo and React Native work, read the exact versioned Expo docs matching the SDK in `apps/mobile/package.json` before writing code. The current app targets Expo SDK 58: https://docs.expo.dev/versions/v58.0.0/.
- For SDK upgrades, also read the target SDK release notes and upgrade walkthrough. Align Expo package versions with `yarn workspace qalb expo install --fix`, then run `npx expo-doctor` from `apps/mobile` and the mobile workspace checks documented in `apps/mobile/README.md`.
- Expo Router native tabs are stable in SDK 58. Import `NativeTabs` from `expo-router/native-tabs`, not `expo-router/unstable-native-tabs`.
- Keep `web.output` explicit in `apps/mobile/app.json`; SDK 58 Expo Router defaults to server output when it is omitted. To preserve SDK 57 static web behavior, set the Expo Router config plugin's `apiRoutes` option to `true`.
- Add a package's config plugin only when its native config changes or plugin options are needed; native module autolinking does not require a matching entry in `plugins`.
