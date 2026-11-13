import type { Config } from "@react-router/dev/config";

export default {
  appDirectory: "src",
  buildDirectory: "dist",
  ssr: false,
  prerender: [
    "/",
    "/ru",
    "/support",
    "/support/ru",
    "/privacy",
    "/privacy/ru",
    "/terms",
    "/terms/ru",
    "/404",
    "/404/ru",
  ],
} satisfies Config;
