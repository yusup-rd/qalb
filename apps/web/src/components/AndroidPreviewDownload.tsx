import { ArrowDownToLine } from "lucide-react";
import { useEffect, useState } from "react";

const downloadPath = "/downloads/android-preview";

export function AndroidPreviewDownload({
  download,
  preview,
  build,
}: {
  download: string;
  preview: string;
  build: string;
}) {
  const [details, setDetails] = useState<{ version: string; build: string }>();

  useEffect(() => {
    const controller = new AbortController();

    async function loadDetails() {
      try {
        const response = await fetch(`${downloadPath}/info`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        if (
          typeof data?.version === "string" &&
          data.version &&
          typeof data.build === "string" &&
          data.build &&
          !controller.signal.aborted
        ) {
          setDetails({ version: data.version, build: data.build });
        }
      } catch {
        // The download link works independently of the version display.
      }
    }

    void loadDetails();
    return () => controller.abort();
  }, []);

  return (
    <div id="download" className="download">
      <a className="button button-primary pressable" href={downloadPath}>
        <ArrowDownToLine size={19} aria-hidden="true" /> {download}
      </a>
      <p>
        {preview}
        {details && (
          <>
            {" · "}v{details.version}
            {" · "}
            {build} {details.build}
          </>
        )}
      </p>
    </div>
  );
}
