# Qalb website

Qalb’s bilingual site for app downloads, support, and legal documents. React Router and Vite pre-render each route for static hosting on Netlify.

## Local development

Use Node.js 24 and Yarn Classic. Run these commands from the repository root.

```sh
yarn install --frozen-lockfile
yarn workspace @qalb/web dev
```

Run `yarn workspace @qalb/web run check` for type checking. Run `yarn workspace @qalb/web build` to generate the production site and `yarn workspace @qalb/web preview` to serve it locally.

## Content updates

- **Legal documents** — Edit the English or Russian Markdown in [`docs/legal`](../../docs/legal). Changes appear on the next deploy.
- **Android preview** — Run `eas build --platform android --profile preview` from [`apps/mobile`](../mobile). Once the webhook is configured, a successful build updates the website download automatically.

## Deployment

Connect the repository to Netlify with `main` as the production branch and the repository root as the base directory. The root [`netlify.toml`](../../netlify.toml) publishes `apps/web/dist/client` and deploys `apps/web/netlify/functions`.

The mobile app uses `https://qalb.yusuprd.com` by default. Set `EXPO_PUBLIC_SITE_URL` in the mobile environment when testing against another site.

## Android preview webhook

1. In Netlify, set `EAS_BUILD_WEBHOOK_SECRET` to a randomly generated secret of at least 16 characters for the production Functions environment. Deploy the site after saving it.
2. From `apps/mobile`, run `eas webhook:create --event BUILD --url https://qalb.yusuprd.com/hooks/eas-build` and enter the same signing secret when prompted.
3. After a preview build finishes, check that [the download route](https://qalb.yusuprd.com/downloads/android-preview) redirects to its APK.

The function verifies Expo's webhook signature and checks that the Android preview APK can be downloaded publicly. It saves the newest build in Netlify Blobs. The download route uses that record immediately, with no scheduled job or site rebuild. If the current APK expires before another is published, the route reports that the preview is temporarily unavailable.
