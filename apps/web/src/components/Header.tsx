import { ArrowUpRight, Download } from "lucide-react";
import { Link } from "react-router";
import {
  localizedPath,
  type Language,
  type PagePath,
} from "../content/language";
import { navigation } from "../content/navigation";
import { Brand } from "./Brand";
import { LanguageDropdown } from "./LanguageDropdown";

export function Header({ lang, page }: { lang: Language; page: PagePath }) {
  const labels = navigation[lang];
  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <Brand lang={lang} />
        <nav className="header-nav" aria-label={labels.main}>
          <Link
            className="nav-link pressable"
            to={localizedPath("/support", lang)}
            aria-current={page === "/support" ? "page" : undefined}
          >
            {labels.support}
          </Link>
          <Link
            className="button button-compact pressable header-download"
            to={{ pathname: localizedPath("/", lang), hash: "#download" }}
            aria-label={labels.download}
          >
            <span>{labels.download}</span>
            <ArrowUpRight
              className="header-download-arrow"
              size={15}
              aria-hidden="true"
            />
            <Download
              className="header-download-icon"
              size={18}
              aria-hidden="true"
            />
          </Link>
          <LanguageDropdown lang={lang} />
        </nav>
      </div>
    </header>
  );
}
