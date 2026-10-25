import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(pathToFileURL(__filename).href);
function loadModule(file, modules) {
  const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  const exports = {};
  const moduleRequire = createRequire(file instanceof URL ? file : pathToFileURL(file).href);
  new Function("exports", "require", outputText)(exports, (name) => {
    if (name === "react" || name === "react/jsx-runtime")
      return moduleRequire(name);
    if (name in modules) return modules[name];
    if (
      name === "react-native" ||
      name.startsWith("expo-") ||
      name.startsWith("@react-native/")
    ) {
      assert.fail("Unexpected native dependency: " + name);
    }
    try {
      return moduleRequire(name);
    } catch {
      assert.fail("Unexpected native dependency: " + name);
    }
  });
  return exports;
}

const sqlitePackagePath = require.resolve("expo-sqlite/package.json");
const sqliteHooksPath = join(dirname(sqlitePackagePath), "src", "hooks.tsx");
const { SQLiteProvider } = loadModule(sqliteHooksPath, {
  "expo-asset": {},
  "./ExpoSQLite": {},
  "./SQLiteDatabase": {},
  "./pathUtils": {},
});
const { default: QuranReadinessGate, QuranReadinessContext } = loadModule(
  new URL(
    "../src/components/quran/QuranReadinessGate.tsx",
    pathToFileURL(__filename).href,
  ),
  {},
);

test("reproduces SQLiteProvider retaining its child when only children change", () => {
  const previous = { databaseName: "quran-v2.db", children: false };
  const next = {
    ...previous,
    children: React.createElement("main", null, "Quran"),
  };
  assert.equal(SQLiteProvider.compare(previous, next), true);
});

test("retained readiness gate opens from context and keeps queries gated on failure/retry", () => {
  // Exercise the actual library comparison and actual gate. The provider may
  // keep this exact element across readiness changes; no native DB is opened.
  const child = React.createElement(
    QuranReadinessGate,
    null,
    React.createElement("main", null, "Quran"),
  );
  const previous = { databaseName: "quran-v2.db", children: child };
  const next = {
    ...previous,
    children: React.createElement(
      QuranReadinessGate,
      null,
      React.createElement("main", null, "Quran"),
    ),
  };
  const retainedChild = SQLiteProvider.compare(previous, next)
    ? previous.children
    : next.children;
  const render = (ready) =>
    renderToStaticMarkup(
      React.createElement(
        QuranReadinessContext.Provider,
        { value: ready },
        retainedChild,
      ),
    );
  assert.equal(render(false), "");
  assert.equal(render(true), "<main>Quran</main>");
  assert.equal(render(false), "");
});
