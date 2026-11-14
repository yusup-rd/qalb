import {
  ArrowRight,
  BookOpen,
  Clock3,
  Compass,
  Heart,
  MapPin,
  MoonStar,
  Scale,
} from "lucide-react";
import { Link, useLocation } from "react-router";
import logo from "../assets/qalb-mark.webp";
import { AndroidPreviewDownload } from "../components/AndroidPreviewDownload";
import { homeCopy } from "../content/home";
import { getSiteLocation, localizedPath } from "../content/language";

const featureIcons = [Clock3, BookOpen, Compass, Heart, MapPin, Scale];

export function meta({ location }: { location: { pathname: string } }) {
  const { lang } = getSiteLocation(location.pathname);
  const copy = homeCopy[lang];
  return [
    { title: copy.title },
    { name: "description", content: copy.summary },
  ];
}

export default function Home() {
  const { lang } = getSiteLocation(useLocation().pathname);
  const copy = homeCopy[lang];

  return (
    <>
      <section className="hero wrap" aria-labelledby="hero-title">
        <div className="hero-panel">
          <div className="hero-content">
            <p className="eyebrow">
              <MoonStar size={16} aria-hidden="true" /> {copy.eyebrow}
            </p>
            <h1 id="hero-title" className="display-title">
              {copy.heading}
              <br className="hidden sm:block" /> <span>{copy.emphasis}</span>
            </h1>
            <p className="hero-description">{copy.intro}</p>
            <AndroidPreviewDownload
              download={copy.download}
              preview={copy.preview}
              build={copy.build}
            />
          </div>
        </div>
      </section>

      <section className="wrap features" aria-labelledby="features-title">
        <h2 id="features-title" className="section-title">
          {copy.featuresTitle}
        </h2>
        <p className="section-description">{copy.featuresIntro}</p>
        <ul className="feature-grid">
          {copy.features.map(({ title, description }, index) => {
            const Icon = featureIcons[index];
            return (
              <li key={title}>
                <span className="feature-icon">
                  <Icon size={21} strokeWidth={1.65} aria-hidden="true" />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="wrap mission" aria-labelledby="mission-title">
        <div className="mission-panel">
          <img src={logo} width="50" height="52" alt="" />
          <div>
            <h2 id="mission-title">{copy.missionTitle}</h2>
            <p>{copy.mission}</p>
          </div>
          <Link
            className="button button-secondary pressable"
            to={localizedPath("/support", lang)}
          >
            {copy.contact} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
