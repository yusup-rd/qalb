module.exports = ({ config }) => {
  console.log("[app.config.js] Dynamic config is executing");
  console.log(
    "[app.config.js] Google Maps key present:",
    Boolean(process.env.GOOGLE_MAPS_API_KEY),
  );

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is missing");
  }

  return {
    ...config,
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
  };
};
