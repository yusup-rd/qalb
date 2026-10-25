const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");
 
/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite imports its WebAssembly module as an asset on web.
config.resolver.assetExts.push("wasm");
config.resolver.sourceExts = config.resolver.sourceExts.filter(
  (extension) => extension !== "wasm",
);

const nativewindConfig = withNativewind(config);
const nativewindResolveRequest = nativewindConfig.resolver.resolveRequest;

// expo-asset reads RN 0.88's AssetRegistry export. Nativewind's component
// shim does not expose that export, so resolve this package against React Native.
nativewindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === "react-native" &&
    /[\\/]node_modules[\\/]expo-asset[\\/]/.test(context.originModulePath)
  ) {
    return context.resolveRequest(context, moduleName, platform);
  }

  return nativewindResolveRequest(context, moduleName, platform);
};

module.exports = nativewindConfig;
