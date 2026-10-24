module.exports = ({ config }) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
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

  if (process.env.EAS_BUILD_PROFILE === "production") {
    if (
      process.env.EAS_BUILD_PLATFORM === "ios" &&
      !config.ios?.bundleIdentifier
    ) {
      throw new Error(
        "Set an approved ios.bundleIdentifier in apps/mobile/app.json before creating an iOS production build. The fallback identifier is not a release identity.",
      );
    }

    if (!apiUrl) {
      throw new Error(
        "EXPO_PUBLIC_API_URL is required for production builds. Set it in the production EAS environment to the HTTPS base URL of the Qalb API.",
      );
    }
    let parsedApiUrl;
    try {
      parsedApiUrl = new URL(apiUrl);
    } catch {
      throw new Error(
        "EXPO_PUBLIC_API_URL must be a valid absolute HTTPS URL for production builds.",
      );
    }
    if (
      parsedApiUrl.protocol !== "https:" ||
      parsedApiUrl.username ||
      parsedApiUrl.password ||
      parsedApiUrl.search ||
      parsedApiUrl.hash
    ) {
      throw new Error(
        "EXPO_PUBLIC_API_URL must use HTTPS and must not contain credentials, a query, or a fragment.",
      );
    }
  }

  if (isAndroidBuild && !apiKey) {
    throw new Error(
      "GOOGLE_MAPS_API_KEY is required for Android builds. " +
        "Set it in apps/mobile/.env.local for local Android builds or in the relevant EAS environment.",
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
