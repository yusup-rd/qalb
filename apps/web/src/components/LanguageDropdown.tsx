import { Check, ChevronDown, Globe2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import {
  getSiteLocation,
  localizedPath,
  type Language,
} from "../content/language";
import { navigation } from "../content/navigation";

const languages = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
] as const;

export function LanguageDropdown({ lang }: { lang: Language }) {
  const { pathname, search, hash } = useLocation();
  const { page } = getSiteLocation(pathname);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;
    details.open = false;

    function closeOutside(event: PointerEvent) {
      if (
        details?.open &&
        event.target instanceof Node &&
        !details.contains(event.target)
      ) {
        details.open = false;
      }
    }

    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [pathname, search, hash]);

  return (
    <details
      className="language-dropdown"
      ref={detailsRef}
      onBlur={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget)
        ) {
          event.currentTarget.open = false;
        }
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !event.currentTarget.open) return;
        event.preventDefault();
        event.currentTarget.open = false;
        event.currentTarget.querySelector("summary")?.focus();
      }}
    >
      <summary
        className="button button-compact pressable"
        aria-label={navigation[lang].language}
      >
        <Globe2 size={17} aria-hidden="true" />
        <span className="language-code">{lang.toUpperCase()}</span>
        <ChevronDown size={13} aria-hidden="true" />
      </summary>
      <ul className="language-options" aria-label={navigation[lang].language}>
        {languages.map(({ code, label }) => (
          <li key={code}>
            <Link
              className="nav-link pressable"
              lang={code}
              hrefLang={code}
              aria-current={lang === code ? "true" : undefined}
              to={{ pathname: localizedPath(page, code), search, hash }}
              onClick={(event) => {
                if (
                  event.button !== 0 ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return;
                const details = detailsRef.current;
                if (details) {
                  details.open = false;
                  details.querySelector("summary")?.focus();
                }
              }}
            >
              {label}
              {lang === code && <Check size={16} aria-hidden="true" />}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
