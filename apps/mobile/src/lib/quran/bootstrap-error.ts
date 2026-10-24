export type QuranBootstrapErrorKind = "network" | "storage" | "generic";

export function getQuranBootstrapErrorKind(
  error: unknown,
): QuranBootstrapErrorKind {
  const value = error as { code?: unknown; kind?: unknown } | null;
  const code = typeof value?.code === "string" ? value.code.toUpperCase() : "";
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (
    code.includes("SQLITE_FULL") ||
    code.includes("ENOSPC") ||
    /no space left|disk (is )?full|database (or disk )?is full/.test(message)
  ) {
    return "storage";
  }

  if (
    value?.kind === "network" ||
    value?.kind === "timeout" ||
    /network request failed|failed to fetch|network is unreachable|request timed out/.test(
      message,
    )
  ) {
    return "network";
  }

  return "generic";
}
