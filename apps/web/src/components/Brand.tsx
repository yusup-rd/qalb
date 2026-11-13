import { Link } from "react-router";
import logo from "../assets/qalb-mark.webp";
import { localizedPath, type Language } from "../content/language";

export function Brand({ lang }: { lang: Language }) {
  return (
    <Link className="brand pressable" to={localizedPath("/", lang)}>
      <img src={logo} width="28" height="29" alt="" />
      <span>Qalb</span>
    </Link>
  );
}
