import { readPreview } from "../lib/preview-store.mjs";

const headers = { "Cache-Control": "no-store" };

export default async function downloadAndroidPreview(request) {
  return respondToPreviewRequest(request, readPreview);
}

export async function respondToPreviewRequest(request, loadPreview) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  }

  const preview = await loadPreview();
  if (preview.expiresAt !== null && preview.expiresAt <= Date.now()) {
    return new Response(
      "The Android preview has expired. A new build will appear here when it is available.",
      { status: 503, headers },
    );
  }

  if (new URL(request.url).pathname === "/downloads/android-preview/info") {
    return Response.json(
      { version: preview.version ?? null, build: preview.build ?? null },
      { headers },
    );
  }

  return new Response(null, {
    status: 302,
    headers: { ...headers, Location: preview.url },
  });
}

export const config = {
  path: ["/downloads/android-preview", "/downloads/android-preview/info"],
};
