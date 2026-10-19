# Qalb legal documents site

The four Markdown files in `../docs/legal/` are the canonical policy and terms documents. `build.mjs` converts them to static HTML with `markdown-it`; raw HTML is disabled. The generated `dist/` directory is a build artifact and is not committed.

To build locally:

```sh
npm ci
npm run build
```

The site uses `/qalb/` as its base path for GitHub Pages project-site hosting. Expected routes after deployment are:

- `https://yusup-rd.github.io/qalb/`
- `https://yusup-rd.github.io/qalb/privacy/`
- `https://yusup-rd.github.io/qalb/privacy/ru/`
- `https://yusup-rd.github.io/qalb/terms/`
- `https://yusup-rd.github.io/qalb/terms/ru/`

Before the first deployment, enable GitHub Pages in the repository at **Settings → Pages** and select **GitHub Actions** as the build and deployment source. The workflow deploys when relevant files are pushed to `main`, or when started manually from the Actions tab. The URLs above are the intended addresses; they do not indicate that the site has been published.
