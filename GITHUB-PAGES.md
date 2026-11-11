# GitHub Pages (public demo)

GitHub Pages hosts the **public demo edition** only:
https://tausjakub.github.io/canine-atlas-physio/

- Workflow: `.github/workflows/demo-pages.yml` runs on every push to `main`
  and on manual dispatch. Settings, Pages, Source must be "GitHub Actions".
- Build: `npm run build:demo` (defaults to `/canine-atlas-physio`; the workflow
  passes the real base path). `PAGES_BASE_PATH=` builds for a domain root.
- Safety: the build fails if the artifact contains a PDF, a book-reader link,
  private session code or removed Dorn assets (`scripts/check-pages.mjs`).

The private edition (books, Dorn material, personal plan) must never be
uploaded to Pages; it needs the authentication Worker described in
[docs/PRIVATE-BRANCH.md](docs/PRIVATE-BRANCH.md).

Study progress is stored per browser origin, so progress on localhost or the
private host does not appear on github.io.
