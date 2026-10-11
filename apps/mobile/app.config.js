module.exports = ({ config }) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const args = process.argv.slice(2);
  const command = args[0];
  const platformIndex = args.findIndex(
    (arg) => arg === "--platform" || arg === "-p",
  );
  const requestedPlatform =
    platformIndex >= 0 ? args[platformIndex + 1] : undefined;
  const isAndroidBuild =
    process.env.EAS_BUILD_PLATFORM === "android" ||
    command === "run:android" ||
    (command === "prebuild" && requestedPlatform !== "ios");

  if (isAndroidBuild && !apiKey) {
    throw new Error(
      "GOOGLE_MAPS_API_KEY is required for Android builds. " +
        "Set it in apps/mobile/.env.local or your EAS environment.",
    );
  }

  return {
    ...config,
    ...(apiKey
      ? {
          android: {
            ...config.android,
            config: {
              ...config.android?.config,
              googleMaps: {
                ...config.android?.config?.googleMaps,
                apiKey,
              },
            },
          },
        }
      : {}),
  };
};
