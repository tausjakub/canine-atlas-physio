# GitHub Pages setup

The project is ready for `https://tausjakub.github.io/canine-atlas-physio/`.
The repository root must contain `package.json`, `app/`, `public/`, and `.github/` (this directory, not its parent workspace).

## Publish from GitHub

1. Commit and push this project to `tausjakub/canine-atlas-physio`, branch `main`.
2. In the repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Open **Actions → Deploy atlas to GitHub Pages → Run workflow**, selecting `main`.
4. Wait for both build and deploy to succeed. The deployment shows the actual URL.

Deployment is manual: pushing alone does not publish. The workflow uses Node 22, `npm ci`, builds and validates the static export, then uploads `dist/client` with the official Pages actions. No personal access token is needed.

**Visibility:** GitHub Pages is normally public even for a private repository. This build includes the supplied PDF books. Do not publish this build if those books must remain private. Personal private repositories need a plan that supports Pages; do not change repository visibility just to enable it.

Official guides:
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## Build locally

Use Node 22.13 or newer:

```sh
npm ci
npm run build:pages
```

This defaults to `/canine-atlas-physio`. The workflow obtains the path from GitHub automatically, including an empty path for a custom domain or user site. To override locally, set `PAGES_BASE_PATH` to `/repository-name`, or to an empty string for a domain root.

`npm run check:pages` checks an existing Pages build. It verifies generated HTML asset paths, the 3D files, photographs and every PDF section. `node scripts/validate-reading.mjs` checks book-page offsets. `npm run dev` and `npm run build` retain the original root-path behavior for local/Sites hosting.

## What is handled

- JavaScript and CSS paths beneath the repository URL.
- 3D catalogue/binary, images, model licence and PDF section paths.
- Book links such as `/canine-atlas-physio/?book=canine-rehabilitation&page=53`.
- `.nojekyll`, so GitHub serves the `_next` directory.
- Native browser PDF controls and a separate PDF link for browsers without an embedded reader.

This vinext beta skips the homepage when `basePath` is used with static export. The Pages build uses `assetPrefix` and a shared `sitePath` helper instead, then moves only the generated `_next` directory out of its duplicate repository directory. The build check catches missing exports or mismatched paths.

Study progress is saved per browser origin. Progress from localhost or chatgpt.site does not automatically move to github.io. Books are split into sections under 20 MiB; the entire static artifact is roughly 450 MB, so the first Git push and deployment can take time. Keep the PDFs as ordinary Git files for this workflow; no Git LFS setup is included.

No GitHub repository settings were changed, and this preparation did not push or deploy anything.
