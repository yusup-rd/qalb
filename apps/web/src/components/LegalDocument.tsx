import { Link } from "react-router";
import { localizedPath, type Language } from "../content/language";
import { navigation } from "../content/navigation";

export function LegalDocument({
  document,
  lang,
  html,
}: {
  document: "privacy" | "terms";
  lang: Language;
  html: string;
}) {
  const labels = navigation[lang];

  return (
    <div className="wrap subpage legal">
      <nav className="legal-nav" aria-label={labels.legal}>
        <Link
          className="nav-link pressable"
          to={localizedPath("/privacy", lang)}
          aria-current={document === "privacy" ? "page" : undefined}
        >
          {labels.privacy}
        </Link>
        <Link
          className="nav-link pressable"
          to={localizedPath("/terms", lang)}
          aria-current={document === "terms" ? "page" : undefined}
        >
          {labels.terms}
        </Link>
      </nav>
      <article
        className="legal-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
