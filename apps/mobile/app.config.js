module.exports = ({ config }) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const isAndroidBuild = process.env.EAS_BUILD_PLATFORM === "android";

  if (isAndroidBuild && !apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is required for Android builds.");
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
