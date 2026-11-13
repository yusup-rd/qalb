import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "react-router";
import logo from "./assets/qalb-mark.webp";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { getSiteLocation } from "./content/language";
import { navigation } from "./content/navigation";
import "./site.css";

export default function Root() {
  const { pathname } = useLocation();
  const { lang, page } = getSiteLocation(pathname);

  return (
    <html lang={lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0e1a" />
        <link rel="icon" type="image/webp" href={logo} />
        <Meta />
        <Links />
      </head>
      <body>
        <a className="skip-link" href="#main">
          {navigation[lang].skip}
        </a>
        <Header lang={lang} page={page} />
        <main id="main" tabIndex={-1}>
          <Outlet />
        </main>
        <Footer lang={lang} page={page} />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
