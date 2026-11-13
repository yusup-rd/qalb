import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import {
  localizedPath,
  type Language,
  type PagePath,
} from "../content/language";
import { navigation } from "../content/navigation";
import { Brand } from "./Brand";

const repository = "https://github.com/yusup-rd/qalb";

export function Footer({ lang, page }: { lang: Language; page: PagePath }) {
  const labels = navigation[lang];
  const links = [
    ["/support", labels.support],
    ["/privacy", labels.privacy],
    ["/terms", labels.terms],
  ] as const;

  return (
    <footer className="wrap site-footer">
      <div className="footer-main">
        <Brand lang={lang} />
        <nav className="footer-links" aria-label={labels.footer}>
          {links.map(([href, label]) => (
            <Link
              className="nav-link pressable"
              key={href}
              to={localizedPath(href, lang)}
              aria-current={page === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
          <a className="nav-link pressable" href={repository}>
            {labels.github}
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </nav>
      </div>
      <p className="footer-credit">
        © {new Date().getFullYear()} Yusup Rejebov
      </p>
    </footer>
  );
}
