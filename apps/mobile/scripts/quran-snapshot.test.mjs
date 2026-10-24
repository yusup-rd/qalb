import assert from "node:assert/strict";
import test from "node:test";
import { getQuranBootstrapErrorKind } from "../src/lib/quran/bootstrap-error.ts";
import { validateQuranSnapshot } from "../src/lib/quran/snapshot-validation.ts";

import { completeSnapshot } from "./quran-snapshot-fixture.mjs";

test("accepts a complete first-install Quran snapshot", () => {
  assert.doesNotThrow(() => validateQuranSnapshot(completeSnapshot()));
});

test("rejects a missing required translation resource", () => {
  const snapshot = completeSnapshot();
  snapshot.translations = snapshot.translations.filter(
    (row) => row.resource_id !== 45,
  );
  assert.throws(() => validateQuranSnapshot(snapshot), /relationships/i);
});

test("rejects duplicate resource verses and missing audio metadata", () => {
  const duplicate = completeSnapshot();
  duplicate.translations[6236].verse_id = duplicate.translations[6235].verse_id;
  assert.throws(() => validateQuranSnapshot(duplicate));

  const missingAudio = completeSnapshot();
  missingAudio.ayahAudio.pop();
  assert.throws(() => validateQuranSnapshot(missingAudio));
});

test("rejects insecure or unrelated audio URLs", () => {
  const snapshot = completeSnapshot();
  snapshot.ayahAudio[0].url = "http://audio.example/1.mp3";
  assert.throws(() => validateQuranSnapshot(snapshot));
});

test("classifies network and insufficient-storage bootstrap failures", () => {
  assert.equal(
    getQuranBootstrapErrorKind({ kind: "network", message: "Offline" }),
    "network",
  );
  assert.equal(
    getQuranBootstrapErrorKind({
      code: "SQLITE_FULL",
      message: "database or disk is full",
    }),
    "storage",
  );
  assert.equal(
    getQuranBootstrapErrorKind(new Error("Invalid snapshot")),
    "generic",
  );
});
