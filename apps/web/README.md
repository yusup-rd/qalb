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
- **Android preview** — Build from [`apps/mobile`](../mobile) with `eas build --platform android --profile preview`. Test the APK on Android, then update its public EAS URL, app version, and build number in [`android-preview.ts`](src/content/android-preview.ts).

## Deployment

Connect the repository to Netlify with `main` as the production branch and the repository root as the base directory. [`netlify.toml`](../../netlify.toml) defines the build command and publishes `apps/web/dist/client`.

For the initial launch, use the assigned `*.netlify.app` URL as `EXPO_PUBLIC_LEGAL_SITE_URL` in EAS. Verify the replacement app’s legal links before removing the old GitHub Pages site.

To connect `qalb.yusuprd.com`, add it in Netlify and point a DNS-only Cloudflare CNAME for `qalb` to the Netlify hostname. After HTTPS is active, use the custom domain for app and store links.
