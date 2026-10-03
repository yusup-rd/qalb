import { mkdir, readFile, rm } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { DatabaseSync } from "node:sqlite";
import { dirname, resolve } from "node:path";
import process from "node:process";

const ROOT = resolve(import.meta.dirname, "..");
const DATABASE_PATH = resolve(ROOT, "assets/database/quran.db");
const translations = [
  { id: 85, language: "en" },
  { id: 45, language: "ru" },
];
const transliteration = { id: 57, language: "en" };
const reciterId = Number(process.env.QURAN_RECITER_ID ?? 6);

const schema = `
PRAGMA foreign_keys = ON;
CREATE TABLE chapters (
  id INTEGER PRIMARY KEY, chapter_number INTEGER NOT NULL UNIQUE,
  name_simple TEXT NOT NULL, name_arabic TEXT NOT NULL, name_complex TEXT,
  translated_name TEXT, revelation_place TEXT, revelation_order INTEGER,
  verses_count INTEGER NOT NULL
);
CREATE TABLE verses (
  id INTEGER PRIMARY KEY, chapter_id INTEGER NOT NULL REFERENCES chapters(id),
  verse_number INTEGER NOT NULL, verse_index INTEGER, verse_key TEXT NOT NULL UNIQUE,
  text_uthmani TEXT NOT NULL, UNIQUE(chapter_id, verse_number)
);
CREATE TABLE translations (
  id INTEGER PRIMARY KEY, verse_id INTEGER NOT NULL REFERENCES verses(id),
  language TEXT NOT NULL, resource_id INTEGER NOT NULL, text TEXT NOT NULL,
  foot_notes TEXT, UNIQUE(verse_id, language, resource_id)
);
CREATE TABLE transliterations (
  id INTEGER PRIMARY KEY, verse_id INTEGER NOT NULL UNIQUE REFERENCES verses(id),
  text TEXT NOT NULL, resource_id INTEGER NOT NULL
);
CREATE TABLE reciters (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE ayah_audio (
  id INTEGER PRIMARY KEY, verse_id INTEGER NOT NULL REFERENCES verses(id),
  reciter_id INTEGER NOT NULL REFERENCES reciters(id), url TEXT NOT NULL,
  duration REAL, format TEXT, mime_type TEXT, segments_json TEXT, updated_at TEXT,
  UNIQUE(verse_id, reciter_id)
);
CREATE TABLE chapter_audio (
  id INTEGER PRIMARY KEY, chapter_id INTEGER NOT NULL REFERENCES chapters(id),
  reciter_id INTEGER NOT NULL REFERENCES reciters(id), url TEXT NOT NULL,
  duration REAL, format TEXT, mime_type TEXT, segments_json TEXT, updated_at TEXT,
  UNIQUE(chapter_id, reciter_id)
);
CREATE INDEX verses_chapter_id ON verses(chapter_id);
CREATE INDEX verses_key ON verses(verse_key);
CREATE INDEX translations_verse_id ON translations(verse_id);
CREATE INDEX translations_language ON translations(language);
CREATE INDEX ayah_audio_verse_id ON ayah_audio(verse_id);
CREATE INDEX ayah_audio_reciter_id ON ayah_audio(reciter_id);
CREATE INDEX chapter_audio_chapter_id ON chapter_audio(chapter_id);
CREATE INDEX chapter_audio_reciter_id ON chapter_audio(reciter_id);
`;

const loadEnv = async () => {
  for (const file of [".env", ".env.local"]) {
    try {
      const contents = await readFile(resolve(ROOT, file), "utf8");
      for (const line of contents.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (match && !process.env[match[1]]) {
          process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
        }
      }
    } catch {
      // Environment variables may be supplied by the shell or CI.
    }
  }
};

const value = (record, ...keys) =>
  keys
    .map((key) => record?.[key])
    .find((candidate) => candidate !== undefined && candidate !== null);
const toText = (candidate) => {
  if (candidate === undefined || candidate === null) return null;
  if (typeof candidate === "string" || typeof candidate === "number") {
    return candidate;
  }
  if (typeof candidate === "object") {
    return toText(
      candidate.name ??
        candidate.text ??
        candidate.translation ??
        candidate.value,
    );
  }
  return null;
};
const textValue = (record, ...keys) => toText(value(record, ...keys));
const recordsOf = (payload) => payload.records ?? payload.data?.records ?? [];
const normalizeUrl = (url) =>
  typeof url === "string" && url.startsWith("//") ? `https:${url}` : url;

const getEnvironment = () => process.env.QURAN_FOUNDATION_ENV ?? "production";
const getApiBase = () =>
  getEnvironment() === "prelive"
    ? "https://apis-prelive.quran.foundation/content/api/v4"
    : "https://apis.quran.foundation/content/api/v4";
const getOauthUrl = () =>
  getEnvironment() === "prelive"
    ? "https://prelive-oauth2.quran.foundation/oauth2/token"
    : "https://oauth2.quran.foundation/oauth2/token";

const token = async () => {
  const environment = getEnvironment();
  const oauthUrl = getOauthUrl();
  if (environment !== "production" && environment !== "prelive") {
    throw new Error(
      "QURAN_FOUNDATION_ENV must be either production or prelive.",
    );
  }
  const clientId = process.env.QURAN_FOUNDATION_CLIENT_ID;
  const clientSecret = process.env.QURAN_FOUNDATION_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "QURAN_FOUNDATION_CLIENT_ID and QURAN_FOUNDATION_CLIENT_SECRET are required in .env or .env.local.",
    );
  }
  let response;
  try {
    response = await fetch(oauthUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "content",
      }),
    });
  } catch (error) {
    throw new Error(
      `OAuth request could not be reached at ${oauthUrl}: ${error.message}`,
    );
  }
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `OAuth request failed (${response.status}): ${errorBody.slice(0, 300)}`,
    );
  }
  const body = await response.json();
  if (!body.access_token) throw new Error("OAuth response did not contain a token.");
  return body.access_token;
};

const snapshot = async (authToken, group, id) => {
  let response;
  try {
    response = await fetch(
      `${getApiBase()}/resources/snapshots/${group}/${id}`,
      {
      headers: {
        "x-auth-token": authToken,
        "x-client-id": process.env.QURAN_FOUNDATION_CLIENT_ID,
      },
      },
    );
  } catch (error) {
    throw new Error(
      `Snapshot ${group}:${id} could not be reached: ${error.message}`,
    );
  }
  if (!response.ok) {
    throw new Error(`Snapshot ${group}:${id} failed (${response.status}).`);
  }
  return response.json();
};

const coreChapter = (record) => ({
  id: Number(value(record, "id", "chapter_id")),
  chapterNumber: Number(value(record, "chapter_number", "chapterNumber")),
  nameSimple: textValue(record, "name_simple", "nameSimple"),
  nameArabic: textValue(record, "name_arabic", "nameArabic"),
  nameComplex: textValue(record, "name_complex", "nameComplex"),
  translatedName: textValue(record, "translated_name", "translatedName"),
  revelationPlace: textValue(record, "revelation_place", "revelationPlace"),
  revelationOrder: value(record, "revelation_order", "revelationOrder") ?? null,
  versesCount: Number(value(record, "verses_count", "versesCount")),
});

const coreVerse = (record) => ({
  id: Number(value(record, "id", "verse_id")),
  chapterId: Number(value(record, "chapter_id", "chapterId")),
  verseNumber: Number(value(record, "verse_number", "verseNumber")),
  verseIndex: value(record, "verse_index", "verseIndex") ?? null,
  verseKey: textValue(record, "verse_key", "verseKey"),
  textUthmani: textValue(record, "text_uthmani", "textUthmani", "text"),
});

const verseKeyFor = (record) =>
  value(record, "verse_key", "verseKey", "key") ??
  value(record, "verse", "verse_id");

const textFor = (record) => textValue(record, "text", "translation", "content");

const assertComplete = (db) => {
  const count = (table) => db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
  const chapters = count("chapters");
  const verses = count("verses");
  if (chapters !== 114 || verses !== 6236) {
    throw new Error(`Production validation failed: ${chapters} chapters, ${verses} verses.`);
  }
  for (const language of ["en", "ru"]) {
    const actual = db
      .prepare("SELECT COUNT(*) AS count FROM translations WHERE language = ?")
      .get(language).count;
    if (actual !== 6236) throw new Error(`${language} translation coverage is ${actual}/6236.`);
  }
  if (count("transliterations") !== 6236) {
    throw new Error("English transliteration coverage is incomplete.");
  }
};

const seed = async () => {
  await loadEnv();
  if (process.argv.includes("--schema-only")) {
    await mkdir(dirname(DATABASE_PATH), { recursive: true });
    await rm(DATABASE_PATH, { force: true });
    const db = new DatabaseSync(DATABASE_PATH);
    db.exec(schema);
    db.close();
    return;
  }

  const authToken = await token();
  const [core, ...translationSnapshots] = await Promise.all([
    snapshot(authToken, "quran_core", 1),
    ...translations.map(({ id }) => snapshot(authToken, "translations", id)),
    snapshot(authToken, "translations", transliteration.id),
    snapshot(authToken, "recitations", reciterId),
  ]);
  const coreRecords = recordsOf(core);
  const chapters = coreRecords
    .filter((record) => record.record_type === "chapter")
    .map(coreChapter);
  const verses = coreRecords
    .filter((record) => record.record_type === "verse")
    .map(coreVerse);
  if (!chapters.length || !verses.length) {
    throw new Error("quran_core:1 did not return chapter and verse records.");
  }

  await mkdir(dirname(DATABASE_PATH), { recursive: true });
  await rm(DATABASE_PATH, { force: true });
  const db = new DatabaseSync(DATABASE_PATH);
  db.exec(schema);
  const insertChapter = db.prepare("INSERT INTO chapters VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const insertVerse = db.prepare("INSERT INTO verses VALUES (?, ?, ?, ?, ?, ?)");
  db.exec("BEGIN");
  for (const chapter of chapters) {
    insertChapter.run(chapter.id, chapter.chapterNumber, chapter.nameSimple, chapter.nameArabic,
      chapter.nameComplex, chapter.translatedName, chapter.revelationPlace,
      chapter.revelationOrder, chapter.versesCount);
  }
  for (const verse of verses) {
    insertVerse.run(verse.id, verse.chapterId, verse.verseNumber, verse.verseIndex,
      verse.verseKey, verse.textUthmani);
  }
  db.exec("COMMIT");

  const insertTranslation = db.prepare(
    "INSERT INTO translations (verse_id, language, resource_id, text, foot_notes) VALUES (?, ?, ?, ?, ?)",
  );
  for (let index = 0; index < translations.length; index += 1) {
    for (const record of recordsOf(translationSnapshots[index])) {
      const key = verseKeyFor(record);
      const verse = db.prepare("SELECT id FROM verses WHERE verse_key = ?").get(key);
      if (verse && textFor(record)) insertTranslation.run(verse.id, translations[index].language,
        translations[index].id, textFor(record), textValue(record, "footnotes", "foot_notes"));
    }
  }
  const translitRecords = recordsOf(translationSnapshots[2]);
  const insertTransliteration = db.prepare(
    "INSERT INTO transliterations (verse_id, text, resource_id) VALUES (?, ?, ?)",
  );
  for (const record of translitRecords) {
    const verse = db.prepare("SELECT id FROM verses WHERE verse_key = ?").get(verseKeyFor(record));
    if (verse && textFor(record)) insertTransliteration.run(verse.id, textFor(record), transliteration.id);
  }
  const recitationRecords = recordsOf(translationSnapshots[3]);
  const reciter = recitationRecords.find((record) => value(record, "reciter", "reciter_id") === reciterId);
  db.prepare("INSERT INTO reciters (id, name) VALUES (?, ?)").run(
    reciterId,
    value(reciter, "reciter_name", "name") ?? `Reciter ${reciterId}`,
  );
  const insertAudio = db.prepare(
    "INSERT INTO ayah_audio (verse_id, reciter_id, url, duration, format, mime_type, segments_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const record of recitationRecords.filter((item) => item.record_type === "audio_file")) {
    const verse = db.prepare("SELECT id FROM verses WHERE verse_key = ?").get(verseKeyFor(record));
    const url = normalizeUrl(value(record, "url", "audio_url"));
    if (verse && url) insertAudio.run(verse.id, reciterId, url, value(record, "duration") ?? null,
      value(record, "format") ?? null, value(record, "mime_type", "mimeType") ?? null,
      JSON.stringify(value(record, "segments") ?? null), value(record, "updated_at") ?? null);
  }
  assertComplete(db);
  const counts = ["chapters", "verses", "translations", "transliterations", "ayah_audio", "chapter_audio"]
    .map((table) => `${table}: ${db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count}`)
    .join(", ");
  db.close();
  console.log(
    `Quran seed completed successfully. Environment: ${getEnvironment()}. ${counts}. Reciter: ${reciterId}. Chapter audio: unavailable.`,
  );
};

seed().catch((error) => {
  console.error(`Quran seed failed: ${error.message}`);
  process.exitCode = 1;
});
