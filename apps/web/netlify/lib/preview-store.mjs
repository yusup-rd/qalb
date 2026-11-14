import { getStore } from "@netlify/blobs";
import { androidPreview } from "./bootstrap-preview.mjs";

const key = "latest";
const store = () =>
  getStore({ name: "android-preview", consistency: "strong" });

export async function readPreview() {
  return (await store().get(key, { type: "json" })) ?? androidPreview;
}

export async function savePreview(preview) {
  const previews = store();

  // Concurrent deliveries can race. Re-read after a conditional write loses.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = await previews.getWithMetadata(key, { type: "json" });
    if (preview.createdAt <= (current?.data ?? androidPreview).createdAt)
      return;

    const options = current
      ? { onlyIfMatch: current.etag }
      : { onlyIfNew: true };
    if ((await previews.set(key, JSON.stringify(preview), options)).modified)
      return;
  }

  throw new Error("Could not store Android preview after concurrent updates");
}
