import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import * as errorModule from "../src/lib/quran/bootstrap-error.ts";
import * as progressModule from "../src/lib/quran/bootstrap-progress.ts";
import * as chapterCacheModule from "../src/lib/quran/chapter-cache.ts";
import * as validationModule from "../src/lib/quran/snapshot-validation.ts";
import { completeSnapshot } from "./quran-snapshot-fixture.js";

// Exercise the production orchestration with explicit API/native-boundary mocks.
// This verifies callback ordering, not native SQLite's commit/rollback behavior.
function loadSync(apiRequest) {
  const source = readFileSync(
    new URL("../src/lib/quran/sync.ts", pathToFileURL(__filename).href),
    "utf8",
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const exports = {};
  const modules = {
    "@/api/client": { apiRequest },
    "./snapshot-validation": validationModule,
    "./bootstrap-error": errorModule,
    "./bootstrap-progress": progressModule,
    "./chapter-cache": chapterCacheModule,
  };
  new Function("require", "exports", "__DEV__", outputText)(
    (name) => {
      assert.ok(name in modules, `Unexpected import: ${name}`);
      return modules[name];
    },
    exports,
    false,
  );
  return exports;
}

const counts = {
  chapters: 114,
  verses: 6236,
  english: 6236,
  russian: 6236,
  transliterations: 6236,
  audio: 6236,
};
function database({
  ready = false,
  failWrite = false,
  failValidation = false,
  failCommit = false,
  failRelationships = false,
  lastSuccessfulCheckAt = null,
  lastAttemptAt = null,
  revision = null,
  beforeCommit = () => {},
} = {}) {
  let writes = 0;
  let committed = false;
  let rolledBack = false;
  let updateCheckState =
    lastSuccessfulCheckAt || lastAttemptAt
      ? {
          last_successful_check_at: lastSuccessfulCheckAt,
          last_attempt_at: lastAttemptAt,
        }
      : null;
  return {
    get committed() {
      return committed;
    },
    get rolledBack() {
      return rolledBack;
    },
    async execAsync() {},
    async getFirstAsync(sql) {
      if (sql.includes("quran_update_check_state")) return updateCheckState;
      return sql.includes("SELECT revision")
        ? revision
          ? { revision }
          : null
        : ready
          ? counts
          : { ...counts, verses: 0 };
    },
    async runAsync(sql, ...values) {
      if (sql.includes("quran_update_check_state")) {
        updateCheckState = {
          last_successful_check_at: sql.includes(
            "last_successful_check_at, last_attempt_at",
          )
            ? values[0]
            : (updateCheckState?.last_successful_check_at ?? null),
          last_attempt_at: sql.includes(
            "last_successful_check_at, last_attempt_at",
          )
            ? values[1]
            : values[0],
        };
      }
    },
    async withExclusiveTransactionAsync(action) {
      try {
        await action({
          async execAsync() {},
          async prepareAsync() {
            return {
              async executeAsync() {
                writes++;
                if (failWrite && writes === 251)
                  throw new Error("database or disk is full");
              },
              async finalizeAsync() {},
            };
          },
          async runAsync() {},
          async getFirstAsync(sql) {
            if (sql === "PRAGMA foreign_key_check")
              return failRelationships ? { table: "verses", rowid: 1 } : null;
            return failValidation ? { ...counts, verses: 0 } : counts;
          },
        });
        await beforeCommit();
        if (failCommit) throw new Error("Commit failed");
        committed = true;
      } catch (error) {
        rolledBack = true;
        throw error;
      }
    },
  };
}

const successfulApi = async (path) =>
  path === "/api/quran/status"
    ? { available: true, revision: "test-revision" }
    : completeSnapshot();

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

test("seven-day check interval is due at the boundary and for missing timestamps", () => {
  const { isQuranUpdateCheckDue } = loadSync(successfulApi);
  assert.equal(isQuranUpdateCheckDue(null, null, now), true);
  assert.equal(
    isQuranUpdateCheckDue(new Date(now - 7 * DAY + 1).toISOString(), null, now),
    false,
  );
  assert.equal(
    isQuranUpdateCheckDue(new Date(now - 7 * DAY).toISOString(), null, now),
    true,
  );
  assert.equal(
    isQuranUpdateCheckDue(
      new Date(now - 30 * DAY).toISOString(),
      new Date(now).toISOString(),
      now,
    ),
    false,
  );
});

test("valid local Quran with a recent successful check makes no request", async () => {
  let requests = 0;
  const db = database({
    ready: true,
    lastSuccessfulCheckAt: new Date(now - DAY).toISOString(),
  });
  const { refreshQuranDatabase } = loadSync(async () => {
    requests++;
    return successfulApi("/api/quran/status");
  });
  assert.equal(await refreshQuranDatabase(db), false);
  assert.equal(requests, 0);
});

test("unchanged status after seven days records the successful content check", async () => {
  const db = database({
    ready: true,
    revision: "test-revision",
    lastSuccessfulCheckAt: new Date(now - 8 * DAY).toISOString(),
  });
  const requests = [];
  const { refreshQuranDatabase } = loadSync(async (path) => {
    requests.push(path);
    return successfulApi(path);
  });
  assert.equal(await refreshQuranDatabase(db), false);
  assert.deepEqual(requests, ["/api/quran/status"]);
});

test("failed status keeps the last success and suppresses reload retries for seven days", async () => {
  const lastSuccessfulCheckAt = new Date(now - 8 * DAY).toISOString();
  const db = database({ ready: true, lastSuccessfulCheckAt });
  let requests = 0;
  const { refreshQuranDatabase } = loadSync(async () => {
    requests++;
    throw new Error("HTTP 404");
  });
  await assert.rejects(refreshQuranDatabase(db), /404/);
  assert.equal(await refreshQuranDatabase(db), false);
  assert.equal(requests, 1);
  assert.equal(db.committed, false);
});

test("concurrent refresh invocations share the same Quran request", async () => {
  const db = database({
    ready: true,
    revision: "test-revision",
    lastSuccessfulCheckAt: new Date(now - 8 * DAY).toISOString(),
  });
  let resolveStatus;
  let requests = 0;
  const { refreshQuranDatabase } = loadSync(() => {
    requests++;
    return new Promise((resolve) => {
      resolveStatus = resolve;
    });
  });
  const first = refreshQuranDatabase(db);
  const second = refreshQuranDatabase(db);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests, 1);
  resolveStatus({
    available: true,
    revision: "test-revision",
    lastSuccessfulSyncAt: "2026-10-24T00:00:00Z",
  });
  assert.deepEqual(await Promise.all([first, second]), [false, false]);
});

test("relationship violations abort bootstrap before committing readiness", async () => {
  const db = database({ failRelationships: true });
  await assert.rejects(
    loadSync(successfulApi).initializeQuranDatabase(db),
    /invalid relationships/,
  );
  assert.equal(db.committed, false);
  assert.equal(db.rolledBack, true);
});

test("bootstrap reports real stages, bounded row progress and completion only after commit", async () => {
  const events = [];
  const db = database({
    beforeCommit() {
      assert.equal(events.at(-1).stage, "finishing");
      assert.ok(!events.some((event) => event.status === "complete"));
    },
  });
  await loadSync(successfulApi).initializeQuranDatabase(db, (event) =>
    events.push(event),
  );
  assert.deepEqual(
    [...new Set(events.map((event) => event.stage))],
    [
      "checking",
      "connecting",
      "downloading",
      "validating",
      "saving",
      "finishing",
      "complete",
    ],
  );
  const measured = events.filter((event) => event.rows);
  assert.equal(measured[0].rows.completed, 0);
  assert.equal(measured.at(-1).rows.completed, 31295);
  assert.equal(measured.at(-1).rows.total, 31295);
  for (let i = 1; i < measured.length; i++)
    assert.ok(measured[i].rows.completed > measured[i - 1].rows.completed);
  for (const event of events.filter((event) => event.stage !== "saving"))
    assert.equal(progressModule.getQuranWritingPercent(event), null);
  assert.equal(progressModule.getQuranWritingPercent(measured.at(-1)), 100);
  assert.equal(events.at(-1).status, "complete");
  assert.equal(db.committed, true);
});

test("failed download stops at download and a retry starts from checking with no stale percentage", async () => {
  const first = [];
  const db = database();
  let fail = true;
  const { initializeQuranDatabase } = loadSync(async (path) => {
    if (fail && path.includes("changes"))
      throw new Error("Network request failed");
    return successfulApi(path);
  });
  await assert.rejects(
    initializeQuranDatabase(db, (event) => first.push(event)),
  );
  assert.equal(first.at(-1).stage, "downloading");
  assert.equal(first.at(-1).status, "failed");
  assert.equal(db.committed, false);
  fail = false;
  const retry = [];
  await initializeQuranDatabase(db, (event) => retry.push(event));
  assert.equal(retry[0].stage, "checking");
  assert.equal(retry[0].status, "running");
  assert.equal(retry[0].rows, undefined);
  assert.equal(retry.at(-1).status, "complete");
});

test("invalid downloaded content never enters saving or completes", async () => {
  const events = [];
  const { initializeQuranDatabase } = loadSync(async (path) => {
    const result = await successfulApi(path);
    if (path.includes("changes")) result.translations.pop();
    return result;
  });
  const db = database();
  await assert.rejects(
    initializeQuranDatabase(db, (event) => events.push(event)),
  );
  assert.equal(events.at(-1).stage, "validating");
  assert.equal(events.at(-1).status, "failed");
  assert.ok(
    !events.some(
      (event) => event.stage === "saving" || event.status === "complete",
    ),
  );
  assert.equal(db.committed, false);
});

for (const failure of ["failWrite", "failValidation", "failCommit"]) {
  test(`${failure} clears measurable progress and never reports success`, async () => {
    const events = [];
    const db = database({ [failure]: true });
    await assert.rejects(
      loadSync(successfulApi).initializeQuranDatabase(db, (event) =>
        events.push(event),
      ),
    );
    assert.equal(events.at(-1).status, "failed");
    assert.equal(progressModule.getQuranWritingPercent(events.at(-1)), null);
    assert.equal(
      progressModule.getQuranStepState(events.at(-1), "saving"),
      "failed",
    );
    assert.ok(!events.some((event) => event.status === "complete"));
    assert.equal(db.committed, false);
    assert.equal(db.rolledBack, true);
  });
}

test("complete existing data skips all network and writing stages", async () => {
  const events = [];
  const db = database({ ready: true });
  await loadSync(() =>
    assert.fail("Existing content must not wait for network"),
  ).initializeQuranDatabase(db, (event) => events.push(event));
  assert.deepEqual(
    events.map((event) => event.stage),
    ["checking", "complete"],
  );
  assert.equal(db.committed, false);
});

test("an observer exception cannot abort a database transaction", async () => {
  const db = database();
  await loadSync(successfulApi).initializeQuranDatabase(db, () => {
    throw new Error("Broken UI observer");
  });
  assert.equal(db.committed, true);
});

test("separate foreground/background handles for one file share a sync before any SQL", async () => {
  const first = Object.assign(
    database({ ready: true, revision: "test-revision" }),
    { databasePath: "/quran.db" },
  );
  const second = {
    databasePath: "/quran.db",
    execAsync() {
      assert.fail("Follower must not prepare or write during active sync");
    },
  };
  let finish;
  let requests = 0;
  const { refreshQuranDatabase } = loadSync(() => {
    requests++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  const foreground = refreshQuranDatabase(first);
  const background = refreshQuranDatabase(second);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests, 1);
  finish({ available: true, revision: "test-revision" });
  assert.deepEqual(await Promise.all([foreground, background]), [false, false]);
});

test("schema preparation is shared per handle and failed preparation remains retryable", async () => {
  const { prepareQuranDatabase } = loadSync(successfulApi);
  let calls = 0;
  let fail = true;
  const db = {
    async execAsync() {
      calls++;
      if (fail) throw new Error("disk full");
    },
  };
  await assert.rejects(prepareQuranDatabase(db), /disk full/);
  assert.equal(calls, 1);
  fail = false;
  await Promise.all([prepareQuranDatabase(db), prepareQuranDatabase(db)]);
  assert.equal(calls, 3);
  await prepareQuranDatabase(db);
  assert.equal(calls, 3);
});

test("a busy update retries the rolled-back transaction without downloading again", async () => {
  const db = database();
  const transaction = db.withExclusiveTransactionAsync.bind(db);
  let attempts = 0;
  let requests = 0;
  db.withExclusiveTransactionAsync = async (action) => {
    attempts++;
    await transaction(async (txn) => {
      await action(txn);
      if (attempts === 1) throw new Error("Error code 5: database is locked");
    });
  };
  const { refreshQuranDatabase } = loadSync(async (path) => {
    requests++;
    return successfulApi(path);
  });
  assert.equal(await refreshQuranDatabase(db), true);
  assert.equal(attempts, 2);
  assert.equal(requests, 2);
  assert.equal(db.committed, true);
  assert.equal(db.rolledBack, true);
});

test("persistent lock contention stops after three transactions and keeps the old revision", async () => {
  const db = database({ ready: true, revision: "old-revision" });
  let attempts = 0;
  db.withExclusiveTransactionAsync = async () => {
    attempts++;
    throw new Error("database is locked");
  };
  const { refreshQuranDatabase } = loadSync(async (path) =>
    path.includes("status")
      ? { available: true, revision: "new-revision" }
      : {
          kind: "incremental",
          fromRevision: "old-revision",
          revision: "new-revision",
          syncedAt: new Date().toISOString(),
          changes: [],
        },
  );
  await assert.rejects(refreshQuranDatabase(db), /database is locked/);
  assert.equal(attempts, 3);
  assert.equal(db.committed, false);
  assert.deepEqual(await db.getFirstAsync("SELECT revision"), {
    revision: "old-revision",
  });
});

test("real SQLite keeps readers available during updates and rolls back invalid changes", async () => {
  const folder = mkdtempSync(join(tmpdir(), "qalb-sync-test-"));
  const file = join(folder, "quran.db");
  const base = new DatabaseSync(file);
  let reader;
  const adapt = (connection) => ({
    databasePath: file,
    async execAsync(sql) {
      connection.exec(sql);
    },
    async getFirstAsync(sql, ...args) {
      return connection.prepare(sql).get(...args) ?? null;
    },
    async runAsync(sql, ...args) {
      return connection.prepare(sql).run(...args);
    },
    async prepareAsync(sql) {
      const statement = connection.prepare(sql);
      return {
        async executeAsync(values) {
          statement.run(...values);
        },
        async finalizeAsync() {},
      };
    },
  });
  const db = {
    ...adapt(base),
    async withExclusiveTransactionAsync(action) {
      const connection = new DatabaseSync(file);
      try {
        connection.exec("BEGIN");
        await action(adapt(connection));
        connection.exec("COMMIT");
      } catch (error) {
        connection.exec("ROLLBACK");
        throw error;
      } finally {
        connection.close();
      }
    },
  };
  let next = completeSnapshot();
  const sync = loadSync(async (path) =>
    path.includes("status")
      ? { available: true, revision: next.revision }
      : next,
  );
  try {
    assert.equal(await sync.refreshQuranDatabase(db, undefined, true), true);
    assert.equal(base.prepare("PRAGMA journal_mode").get().journal_mode, "wal");
    reader = new DatabaseSync(file);
    reader.exec("BEGIN");
    const old = reader
      .prepare("SELECT text_uthmani FROM verses WHERE id = 1")
      .get().text_uthmani;
    next = {
      kind: "incremental",
      fromRevision: "test-revision",
      revision: "updated",
      syncedAt: new Date().toISOString(),
      changes: [
        {
          table: "verses",
          upserts: [
            {
              id: 1,
              chapter_id: 1,
              verse_number: 1,
              verse_key: "1:1",
              text_uthmani: "updated text",
            },
          ],
          deletes: [],
        },
      ],
    };
    assert.equal(await sync.refreshQuranDatabase(db, undefined, true), true);
    assert.equal(
      reader.prepare("SELECT text_uthmani FROM verses WHERE id = 1").get()
        .text_uthmani,
      old,
    );
    reader.exec("COMMIT");
    assert.equal(
      reader.prepare("SELECT text_uthmani FROM verses WHERE id = 1").get()
        .text_uthmani,
      "updated text",
    );
    assert.equal(
      base.prepare("SELECT revision FROM quran_sync_state").get().revision,
      "updated",
    );
    next = {
      ...next,
      fromRevision: "updated",
      revision: "invalid",
      changes: [{ table: "verses", upserts: [], deletes: [1] }],
    };
    await assert.rejects(
      sync.refreshQuranDatabase(db, undefined, true),
      /invalid relationships|FOREIGN KEY constraint failed/,
    );
    assert.equal(
      base.prepare("SELECT revision FROM quran_sync_state").get().revision,
      "updated",
    );
    assert.equal(
      base.prepare("SELECT COUNT(*) AS total FROM verses").get().total,
      6236,
    );
  } finally {
    reader?.close();
    base.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
