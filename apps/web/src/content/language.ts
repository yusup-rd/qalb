export type Language = "en" | "ru";
export type PagePath = "/" | "/support" | "/privacy" | "/terms" | "/404";

export function getSiteLocation(pathname: string) {
  const path = pathname.replace(/\/+$/, "") || "/";
  const lang: Language = path === "/ru" || path.endsWith("/ru") ? "ru" : "en";
  const barePath = lang === "ru" ? path.slice(0, -3) || "/" : path;
  const page =
    (["/", "/support", "/privacy", "/terms"] as const).find(
      (item) => item === barePath,
    ) ?? "/404";
  return { lang, page } as const;
}

export function localizedPath(page: PagePath, lang: Language) {
  return lang === "en" ? page : page === "/" ? "/ru" : `${page}/ru`;
}
