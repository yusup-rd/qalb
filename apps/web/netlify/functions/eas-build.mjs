import { createHmac, timingSafeEqual } from "node:crypto";
import { savePreview } from "../lib/preview-store.mjs";

const projectId = "4fc7edef-51b0-47f6-8203-66dd1d1ec294";
const apkUrl = /^https:\/\/expo\.dev\/artifacts\/eas\/[\w-]+\.apk$/;

export default async function easBuildWebhook(request) {
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }

  const secret = process.env.EAS_BUILD_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook secret missing", { status: 503 });

  const signature = request.headers.get("expo-signature") ?? "";
  if (!/^sha1=[a-f\d]{40}$/i.test(signature)) {
    return new Response(null, { status: 401 });
  }

  const body = Buffer.from(await request.arrayBuffer());
  const expected = createHmac("sha1", secret).update(body).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature.slice(5), "hex"))) {
    return new Response(null, { status: 401 });
  }

  let build;
  try {
    build = JSON.parse(body.toString("utf8"));
  } catch {
    return new Response(null, { status: 400 });
  }

  if (
    build?.appId !== projectId ||
    build.status !== "finished" ||
    build.platform !== "android" ||
    build.metadata?.buildProfile !== "preview"
  ) {
    return new Response(null, { status: 204 });
  }

  const url = build.artifacts?.buildUrl;
  const createdAt = Date.parse(build.createdAt);
  const expiresAt =
    build.expirationDate == null ? null : Date.parse(build.expirationDate);
  if (
    typeof url !== "string" ||
    !apkUrl.test(url) ||
    !Number.isFinite(createdAt)
  ) {
    return new Response("Missing or invalid APK data", { status: 422 });
  }
  if (expiresAt !== null && !Number.isFinite(expiresAt)) {
    return new Response("Invalid APK expiration", { status: 422 });
  }
  if (expiresAt !== null && expiresAt <= Date.now()) {
    return new Response(null, { status: 204 });
  }

  // EAS can retry if the artifact is still becoming available.
  try {
    const artifact = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(8000),
    });
    if (
      !artifact.ok ||
      !/\.apk(?=["';\s]|$)/i.test(
        artifact.headers.get("content-disposition") ?? "",
      )
    ) {
      return new Response("APK download unavailable", { status: 503 });
    }
    await savePreview({ url, createdAt, expiresAt });
  } catch (error) {
    console.error("Could not update the Android preview", error.name);
    return new Response("Could not update Android preview", { status: 503 });
  }

  return new Response(null, { status: 204 });
}

export const config = { path: "/hooks/eas-build" };
