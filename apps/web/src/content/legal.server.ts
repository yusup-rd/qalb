import MarkdownIt from "markdown-it";
import type { Language } from "./language";

const markdown = new MarkdownIt({ html: false });

export function loadLegalDocument(
  language: string | undefined,
  sources: Record<Language, string>,
) {
  const lang = language === "ru" ? "ru" : "en";
  return { lang, html: markdown.render(sources[lang]) } as const;
}
