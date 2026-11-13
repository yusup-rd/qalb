import { useLoaderData } from "react-router";
import { LegalDocument } from "../components/LegalDocument";
import { loadLegalDocument } from "../content/legal.server";
import en from "../../../../docs/legal/terms-of-use.md?raw";
import ru from "../../../../docs/legal/terms-of-use.ru.md?raw";

export function loader({ params }: { params: { language?: string } }) {
  return loadLegalDocument(params.language, { en, ru });
}

export function meta({
  loaderData,
}: {
  loaderData?: Awaited<ReturnType<typeof loader>>;
}) {
  const title =
    loaderData?.lang === "ru" ? "Условия использования" : "Terms of Use";
  return [
    { title: `${title} · Qalb` },
    { name: "description", content: title },
  ];
}

export default function Terms() {
  const data = useLoaderData<typeof loader>();
  return <LegalDocument document="terms" {...data} />;
}
