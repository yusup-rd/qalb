import { ArrowRight } from "lucide-react";
import { Link, useLocation } from "react-router";
import { getSiteLocation, localizedPath } from "../content/language";

const copy = {
  en: {
    title: "Page not found",
    description: "That address may have changed.",
    action: "Back to Qalb",
  },
  ru: {
    title: "Страница не найдена",
    description: "Возможно, адрес страницы изменился.",
    action: "Вернуться на главную",
  },
};

export function meta({ location }: { location: { pathname: string } }) {
  const { lang } = getSiteLocation(location.pathname);
  return [
    { title: `${copy[lang].title} · Qalb` },
    { name: "robots", content: "noindex" },
  ];
}

export default function NotFound() {
  const { lang } = getSiteLocation(useLocation().pathname);
  const text = copy[lang];
  return (
    <section className="wrap subpage page-heading">
      <h1 className="page-title">{text.title}</h1>
      <p>{text.description}</p>
      <Link
        className="button button-secondary pressable"
        to={localizedPath("/", lang)}
      >
        {text.action} <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}
