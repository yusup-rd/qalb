import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { getDistanceMeters } from "../src/lib/mosque-distance.ts";
import { withTimeout } from "../src/lib/with-timeout.ts";

// Native APIs are mocked. These tests exercise production hook logic, not
// native permission dialogs, GPS, SQLite, or React's rendering lifecycle.
function load(file, modules) {
  const source = readFileSync(
    new URL(file, pathToFileURL(__filename).href),
    "utf8",
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  const exports = {};
  new Function("exports", "require", outputText)(exports, (name) => {
    assert.ok(name in modules, `Unexpected import: ${name}`);
    return modules[name];
  });
  return exports;
}

function hooks(overrides = {}) {
  const state = [];
  return {
    state,
    useState(initial) {
      const index = state.length;
      state.push(
        index in overrides
          ? overrides[index]
          : typeof initial === "function"
            ? initial()
            : initial,
      );
      return [
        state[index],
        (next) => {
          state[index] = typeof next === "function" ? next(state[index]) : next;
        },
      ];
    },
    useRef: (current) => ({ current }),
    useCallback: (callback) => callback,
    useEffect() {},
  };
}

test("native request timeout rejects and a later result cannot become success", async () => {
  let resolve;
  const native = new Promise((done) => {
    resolve = done;
  });
  await assert.rejects(withTimeout(native, 5), /timed out/);
  resolve("late");
  assert.equal(await withTimeout(Promise.resolve("retry"), 50), "retry");
});

test("failed mosque lookup records failure and retry clears it for a new attempt", async () => {
  const react = hooks();
  const effects = [];
  react.useEffect = (effect) => effects.push(effect);
  react.useMemo = (compute) => compute();
  const { useNearbyMosques } = load("../src/hooks/useNearbyMosques.ts", {
    react,
    "@/api/mosques-api": {
      fetchNearbyMosques: async () => {
        throw new Error("offline");
      },
    },
    "@/api/routing-api": {},
    "@/lib/mosque-distance": {},
    "@/store/locationStore": {
      useLocationStore: (select) =>
        select({ latitude: 12, longitude: 34, locationLoading: false }),
    },
    "@react-native-community/netinfo": {},
  });
  const result = useNearbyMosques();
  const cleanup = effects[0]();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(react.state[1], "12:34");
  assert.equal(react.state[3], "12:34");
  assert.equal(react.state[2], null);
  result.retry();
  assert.equal(react.state[0], 1);
  assert.equal(react.state[1], null);
  assert.equal(react.state[3], null);
  cleanup();
});

test("invalid polar times are never formatted as valid prayer times or scheduled", async () => {
  const i18n = { language: "en", options: {}, t: (key) => key };
  const format = load("../src/lib/format.ts", { "@/i18n": i18n });
  assert.equal(format.formatTime(new Date(NaN)), "—");
  assert.equal(format.formatDuration(NaN), "—");
  assert.equal(format.formatDurationClock(NaN), "—");
  const notifications = load("../src/lib/notifications.ts", {
    "@/i18n": i18n,
    "react-native": { Platform: { OS: "ios" } },
    "expo-notifications": {
      scheduleNotificationAsync() {
        assert.fail("Invalid date scheduled");
      },
    },
  });
  assert.equal(
    await notifications.scheduleNotification({
      title: "test",
      body: "test",
      date: new Date(NaN),
    }),
    null,
  );
});

test("location requests are single-flight and permission errors are localized", async () => {
  const react = hooks();
  let requests = 0;
  let resolvePermission;
  const permission = new Promise((resolve) => {
    resolvePermission = resolve;
  });
  const { useUserLocation } = load("../src/hooks/useUserLocation.ts", {
    react,
    "@/i18n": {
      __esModule: true,
      default: { t: (key) => `translated:${key}` },
    },
    "@/lib/mosque-distance": { getDistanceMeters },
    "@/lib/with-timeout": { withTimeout },
    "react-i18next": {
      useTranslation: () => ({ t: (key) => `translated:${key}` }),
    },
    "@react-native-async-storage/async-storage": {
      getItem: async () => "accepted",
    },
    "expo-location": {
      getForegroundPermissionsAsync: () => {
        requests++;
        return permission;
      },
    },
    "react-native": { AppState: { currentState: "active" } },
  });
  const hook = useUserLocation();
  const first = hook.retry();
  await hook.retry();
  assert.equal(requests, 1);
  resolvePermission({ granted: false, canAskAgain: false });
  await first;
  assert.equal(react.state[1], false);
  assert.equal(react.state[2], "blocked");
  assert.equal(
    react.state[3],
    "prayerTimes.locationError.permissionBlockedTitle",
  );
  await hook.retry();
  assert.equal(requests, 2);
});

test("database-open errors reach bootstrap UI and retry remounts the same database", async () => {
  const react = hooks({ 0: true, 1: true, 4: true });
  const component = () => null;
  const modules = {
    react,
    "react/jsx-runtime": {
      jsx: (type, props, key) => ({ type, props, key }),
      jsxs: (type, props, key) => ({ type, props, key }),
    },
    "@/global.css": {},
    "@/i18n": {},
    "@/lib/notifications": {},
    "@/lib/quran/sync": {},
    "@/lib/quran/bootstrap-progress": {
      initialQuranBootstrapProgress: { stage: "checking" },
    },
    "@/lib/quran/bootstrap-error": {
      getQuranBootstrapErrorKind: () => "storage",
    },
    "expo-font": { useFonts: () => [true, null] },
    "expo-splash-screen": { preventAutoHideAsync() {}, setOptions() {} },
    "expo-sqlite": { SQLiteProvider: "sqlite" },
    "@react-native-community/netinfo": {},
    "react-native": { View: "view" },
    "@/providers/ThemeProvider": { ThemeProvider: component },
    "@/providers/QuranAudioProvider": { QuranAudioProvider: component },
    "@/components/quran/QuranReadinessGate": {
      __esModule: true,
      default: component,
      QuranReadinessContext: { Provider: component },
    },
  };
  for (const name of [
    "ui/AppNavigator",
    "ui/AppStatusBar",
    "quran/QuranBootstrapScreen",
  ])
    modules[`@/components/${name}`] = { __esModule: true, default: name };
  for (const name of [
    "LocationInitializer",
    "NotificationInitializer",
    "QuranSyncInitializer",
  ])
    modules[`@/initializers/${name}`] = {
      __esModule: true,
      default: component,
    };
  // Font assets aren't loaded by this harness.
  const source = readFileSync(
    new URL("../src/app/_layout.tsx", pathToFileURL(__filename).href),
    "utf8",
  );
  for (const [, asset] of source.matchAll(/require\("([^"]+)"\)/g))
    modules[asset] = 1;
  const tree = load("../src/app/_layout.tsx", modules).default();
  function find(node, type) {
    if (!node || typeof node !== "object") return null;
    if (node.type === type) return node;
    for (const child of [node.props?.children].flat()) {
      const found = find(child, type);
      if (found) return found;
    }
    return null;
  }
  const sqlite = find(tree, "sqlite");
  assert.equal(sqlite.props.databaseName, "quran-v2.db");
  sqlite.props.onError(new Error("disk full"));
  await new Promise((resolve) => queueMicrotask(resolve));
  assert.equal(react.state[5], "storage");
  assert.equal(react.state[2], false);
  find(tree, "quran/QuranBootstrapScreen").props.onRetry();
  assert.equal(react.state[5], null);
  assert.equal(react.state[6], 1);
});
