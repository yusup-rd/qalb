import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  new Function("exports", "require", outputText)(exports, (name) => {
    if (name === "react" || name === "react/jsx-runtime") return require(name);
    assert.ok(name in modules, `Unexpected native dependency: ${name}`);
    return modules[name];
  });
  return exports;
}

const { SQLiteProvider } = loadModule(
  new URL("../../../node_modules/expo-sqlite/src/hooks.tsx", pathToFileURL(__filename).href),
  {
    "expo-asset": {},
    "./ExpoSQLite": {},
    "./SQLiteDatabase": {},
    "./pathUtils": {},
  },
);
const { default: QuranReadinessGate, QuranReadinessContext } = loadModule(
  new URL("../src/components/quran/QuranReadinessGate.tsx", pathToFileURL(__filename).href),
  {},
);

test("reproduces SDK 57 retaining a false child after database initialization", () => {
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
