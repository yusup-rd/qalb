import tailwindcss from "@tailwindcss/vite";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, type Connect, type Plugin } from "vite";
import {
  config as previewRoutes,
  respondToPreviewRequest,
} from "./netlify/functions/android-preview.mjs";
import { androidPreview } from "./netlify/lib/bootstrap-preview.mjs";

function localAndroidPreview(): Plugin {
  const register = ({ middlewares }: { middlewares: Connect.Server }) => {
    middlewares.use(async (request, response, next) => {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (!previewRoutes.path.includes(url.pathname)) return next();

      try {
        const result = await respondToPreviewRequest(
          new Request(url, { method: request.method }),
          () => androidPreview,
        );
        response.statusCode = result.status;
        result.headers.forEach((value, key) => response.setHeader(key, value));
        response.end(
          request.method === "HEAD" ? undefined : await result.text(),
        );
      } catch (error) {
        next(error);
      }
    });
  };

  return {
    name: "qalb-local-android-preview",
    configureServer: register,
    configurePreviewServer: register,
  };
}

export default defineConfig({
  plugins: [localAndroidPreview(), tailwindcss(), reactRouter()],
});
