export function completeSnapshot() {
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
    translations: [...contentRows(85, "en"), ...contentRows(45, "ru")],
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
