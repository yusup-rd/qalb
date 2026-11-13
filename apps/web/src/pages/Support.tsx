import { ArrowUpRight, Mail } from "lucide-react";
import { useLocation } from "react-router";
import { getSiteLocation } from "../content/language";

const email = "yusuprd@icloud.com";
const mailLink = `mailto:${email}?subject=Qalb%20Feedback`;

const supportCopy = {
  en: {
    title: "Qalb support",
    description:
      "Have a question, spotted a bug, or have an idea for Qalb? Write directly to the developer.",
    email: "Email support",
    action: "Send an email",
    tip: "If you’re reporting a bug, include your device model, Android or iOS version, and the steps that caused the issue.",
  },
  ru: {
    title: "Поддержка Qalb",
    description:
      "Есть вопрос, заметили ошибку или хотите предложить идею? Напишите разработчику напрямую.",
    email: "Почта поддержки",
    action: "Написать письмо",
    tip: "Если вы сообщаете об ошибке, укажите модель устройства, версию Android или iOS и опишите, как воспроизвести проблему.",
  },
};

export function meta({ location }: { location: { pathname: string } }) {
  const copy = supportCopy[getSiteLocation(location.pathname).lang];
  return [
    { title: copy.title },
    { name: "description", content: copy.description },
  ];
}

export default function Support() {
  const copy = supportCopy[getSiteLocation(useLocation().pathname).lang];

  return (
    <section className="wrap subpage">
      <div className="page-heading">
        <span className="feature-icon">
          <Mail size={22} aria-hidden="true" />
        </span>
        <h1 className="page-title">{copy.title}</h1>
        <p>{copy.description}</p>
      </div>
      <div className="support-panel">
        <div>
          <h2>{copy.email}</h2>
          <p>{email}</p>
        </div>
        <a className="button button-primary pressable" href={mailLink}>
          {copy.action} <ArrowUpRight size={18} aria-hidden="true" />
        </a>
      </div>
      <p className="support-tip">{copy.tip}</p>
    </section>
  );
}
