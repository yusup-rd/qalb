import MarkdownIt from "markdown-it";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(siteDirectory, "..");
const outputDirectory = path.join(siteDirectory, "dist");
const basePath = "/qalb";

const documents = [
  {
    slug: "privacy",
    source: "privacy-policy.md",
    language: "en",
    title: "Qalb Privacy Policy",
    navigationTitle: "Privacy Policy",
    switchPath: "/privacy/ru/",
  },
  {
    slug: "privacy/ru",
    source: "privacy-policy.ru.md",
    language: "ru",
    title: "Политика конфиденциальности Qalb",
    navigationTitle: "Политика конфиденциальности",
    switchPath: "/privacy/",
  },
  {
    slug: "terms",
    source: "terms-of-use.md",
    language: "en",
    title: "Qalb Terms of Use",
    navigationTitle: "Terms of Use",
    switchPath: "/terms/ru/",
  },
  {
    slug: "terms/ru",
    source: "terms-of-use.ru.md",
    language: "ru",
    title: "Условия использования Qalb",
    navigationTitle: "Условия использования",
    switchPath: "/terms/",
  },
];

const labels = {
  en: {
    skip: "Skip to content",
    home: "Legal documents",
    privacy: "Privacy Policy",
    terms: "Terms of Use",
    language: "Language",
    switchTo: "Русский",
    footer: "Qalb is an independent personal project.",
    repository: "Repository",
    homeDescription: "Privacy and terms for the Qalb app.",
  },
  ru: {
    skip: "Перейти к содержанию",
    home: "Юридические документы",
    privacy: "Политика конфиденциальности",
    terms: "Условия использования",
    language: "Язык",
    switchTo: "English",
    footer: "Qalb — независимый личный проект.",
    repository: "Репозиторий",
    homeDescription: "Политика конфиденциальности и условия использования приложения Qalb.",
  },
};

const markdown = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false,
});

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[character];
  });
}

function route(pathname) {
  return `${basePath}${pathname}`;
}

function pageShell({ language, title, description, body, currentPath, switchPath, home = false }) {
  const text = labels[language];
  const navigation = documents
    .filter((document) => document.language === language)
    .map((document) => {
      const href = route(`/${document.slug}/`);
      const current = currentPath === `/${document.slug}/` ? ' aria-current="page"' : "";
      return `<a href="${href}" lang="${document.language}"${current}>${escapeHtml(document.navigationTitle)}</a>`;
    })
    .join("\n            ");

  const languageSwitch = `<a class="language-switch" href="${route(switchPath)}" hreflang="${language === "en" ? "ru" : "en"}">${escapeHtml(text.switchTo)}</a>`;
  const homePath = language === "ru" ? "/ru/" : "/";

  return `<!doctype html>
<html lang="${language}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="description" content="${escapeHtml(description)}">
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="${route("/assets/site.css")}">
  </head>
  <body>
    <a class="skip-link" href="#main">${escapeHtml(text.skip)}</a>
    <header class="site-header">
      <a class="brand" href="${route(homePath)}" aria-label="Qalb — ${escapeHtml(text.home)}">Qalb<span aria-hidden="true"> · </span>${escapeHtml(text.home)}</a>
      ${languageSwitch}
    </header>
    <nav class="document-nav" aria-label="${escapeHtml(text.home)}">
      ${navigation}
    </nav>
    <main id="main" class="content${home ? " home-content" : ""}">
      ${body}
    </main>
    <footer class="site-footer">
      <span>${escapeHtml(text.footer)}</span>
      <a href="https://github.com/yusup-rd/qalb">${escapeHtml(text.repository)}</a>
    </footer>
  </body>
</html>
`;
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(path.join(outputDirectory, "assets"), { recursive: true });
await cp(path.join(siteDirectory, "site.css"), path.join(outputDirectory, "assets", "site.css"));

for (const document of documents) {
  const sourcePath = path.join(rootDirectory, "docs", "legal", document.source);
  const source = await readFile(sourcePath, "utf8");
  const targetPath = path.join(outputDirectory, document.slug, "index.html");
  const html = markdown.render(source);
  const page = pageShell({
    language: document.language,
    title: document.title,
    description: document.navigationTitle,
    body: `<article class="legal-document">${html}</article>`,
    currentPath: `/${document.slug}/`,
    switchPath: document.switchPath,
  });
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, page);
}

for (const language of ["en", "ru"]) {
  const text = labels[language];
  const links = documents
    .filter((document) => document.language === language)
    .map((document) => {
      const href = route(`/${document.slug}/`);
      return `<li><a href="${href}" lang="${document.language}">${escapeHtml(document.navigationTitle)}<span aria-hidden="true">↗</span></a></li>`;
    })
    .join("\n          ");
  const body = `<h1>${escapeHtml(text.home)}</h1><p class="intro">${escapeHtml(text.homeDescription)}</p><ul class="document-list">${links}</ul>`;
  const homepage = pageShell({
    language,
    title: `Qalb — ${text.home}`,
    description: text.homeDescription,
    body,
    switchPath: language === "en" ? "/ru/" : "/",
    home: true,
  });
  const targetPath = language === "en" ? "index.html" : "ru/index.html";
  const target = path.join(outputDirectory, targetPath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, homepage);
}

console.log(`Built four legal documents and two language-specific homepages in ${outputDirectory}`);
