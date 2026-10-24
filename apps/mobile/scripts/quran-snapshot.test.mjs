import assert from "node:assert/strict";
import test from "node:test";
import { getQuranBootstrapErrorKind } from "../src/lib/quran/bootstrap-error.ts";
import { validateQuranSnapshot } from "../src/lib/quran/snapshot-validation.ts";

function completeSnapshot() {
  const chapters = Array.from({ length: 114 }, (_, index) => ({
    id: index + 1,
    chapter_number: index + 1,
    name_simple: `Chapter ${index + 1}`,
    name_arabic: `سورة ${index + 1}`,
    name_complex: null,
    translated_name: null,
    revelation_place: null,
    revelation_order: null,
    verses_count: index < 80 ? 55 : 54,
  }));
  const verses = Array.from({ length: 6236 }, (_, index) => ({
    id: index + 1,
    chapter_id: (index % 114) + 1,
    verse_number: Math.floor(index / 114) + 1,
    verse_index: index + 1,
    verse_key: `${(index % 114) + 1}:${Math.floor(index / 114) + 1}`,
    text_uthmani: `verse ${index + 1}`,
  }));
  const contentRows = (resource_id, language) =>
    verses.map((verse) => ({
      id: verse.id + resource_id * 10_000,
      verse_id: verse.id,
      language,
      resource_id,
      text: `content ${verse.id}`,
      foot_notes: null,
    }));
  return {
    revision: "test-revision",
    syncedAt: "2026-10-24T00:00:00.000Z",
    chapters,
    verses,
    translations: [
      ...contentRows(85, "en"),
      ...contentRows(45, "ru"),
    ],
    transliterations: verses.map((verse) => ({
      id: verse.id + 570_000,
      verse_id: verse.id,
      resource_id: 57,
      text: `transliteration ${verse.id}`,
    })),
    reciters: [{ id: 6, name: "Reciter" }],
    ayahAudio: verses.map((verse) => ({
      id: verse.id + 600_000,
      verse_id: verse.id,
      reciter_id: 6,
      url: `https://audio.example/${verse.id}.mp3`,
      duration: null,
      format: "mp3",
      mime_type: "audio/mpeg",
      segments_json: null,
      updated_at: null,
    })),
    chapterAudio: [],
  };
}

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
  assert.equal(getQuranBootstrapErrorKind(new Error("Invalid snapshot")), "generic");
});
