import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function loadClient(fetch) {
  const source = readFileSync(
    new URL("../src/api/client.ts", pathToFileURL(__filename).href),
    "utf8",
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const exports = {};
  new Function("exports", "process", "fetch", "__DEV__", outputText)(
    exports,
    { env: { EXPO_PUBLIC_API_URL: "https://api.example" } },
    fetch,
    false,
  );
  return exports;
}

test("request events distinguish response availability from JSON completion and omit query/body", async () => {
  const events = [];
  let finishJson;
  const body = new Promise((resolve) => {
    finishJson = resolve;
  });
  const { apiRequest } = loadClient(async () => ({
    ok: true,
    status: 200,
    json: () => body,
  }));
  const request = apiRequest(
    "/api/quran/changes?revision=private-value",
    undefined,
    { onEvent: (event) => events.push(event) },
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(
    events.map((event) => event.type),
    ["start", "response"],
  );
  finishJson({ text: "not for logging" });
  assert.deepEqual(await request, { text: "not for logging" });
  assert.deepEqual(
    events.map((event) => event.type),
    ["start", "response", "complete"],
  );
  for (const event of events) {
    assert.equal(event.path, "/api/quran/changes");
    assert.equal(event.attempt, 1);
    assert.ok(event.elapsedMs >= 0);
  }
  assert.ok(!JSON.stringify(events).includes("private-value"));
  assert.ok(!JSON.stringify(events).includes("not for logging"));
});

test("malformed JSON emits invalid_response rather than JSON completion", async () => {
  const events = [];
  const { apiRequest } = loadClient(async () => ({
    ok: true,
    status: 200,
    async json() {
      throw new SyntaxError("Invalid JSON");
    },
  }));
  await assert.rejects(
    apiRequest("/api/quran/changes", undefined, {
      onEvent: (event) => events.push(event),
    }),
    /invalid JSON/,
  );
  assert.deepEqual(
    events.map((event) => event.type),
    ["start", "response", "invalid_response", "failure"],
  );
});

test("optional diagnostics cannot turn a successful request into a failure", async () => {
  const { apiRequest } = loadClient(async () => ({
    ok: true,
    status: 200,
    async json() {
      return { available: true };
    },
  }));
  assert.deepEqual(
    await apiRequest("/api/quran/status", undefined, {
      onEvent() {
        throw new Error("Observer failed");
      },
    }),
    { available: true },
  );
});

for (const [method, status] of [
  ["HEAD", 200],
  ["GET", 204],
  ["POST", 205],
]) {
  test(`${method} ${status} succeeds without parsing a body`, async () => {
    const { apiRequest } = loadClient(async () => ({
      ok: true,
      status,
      json() {
        assert.fail("A bodyless response must not be parsed");
      },
    }));
    assert.equal(await apiRequest("/api/example", { method }), undefined);
  });
}
