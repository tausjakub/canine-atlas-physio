# Canine Atlas

Bilingual (CZ/EN) 3D canine anatomy atlas and exam-prep companion for qualification 43-001-R. React 19 + Three.js, Vinext static export. Business context: being sold as a cohort licence to physiotherapy course providers (see docs/RIGHTS-AND-ATTRIBUTION.md for asset clearance).

## Hard rules
- Never commit or publish `*.pdf`, `private-assets/`, `.env*`, `.dev.vars*`. The repo is public. A hook blocks this.
- Two editions, fixed at build time (`app/edition.ts`, `vite.config.ts`): `build:demo` (public, GitHub Pages) has no book library, reader links, Dorn material, personal plan or logout. `build:private` is served only behind the Worker in `security/`. Gate new private-only views with an inline `process.env.NEXT_PUBLIC_ATLAS_PRIVATE !== '0'` / `..._LIBRARY` check so the bundler drops them.
- Do not reformat `app/*.json` or `scripts/*.json`: validators fingerprint content.
- Content is a study aid: no treatment prescriptions, device settings or diagnostic claims.

## Commands (Node >= 22.13)
- `npm run typecheck`, `npx oxlint`, `npx oxfmt --check`, `npm run validate`, `npm run build:demo`
- `node scripts/mobile-check.mjs work/screens` for responsive screenshots.
- Skills: `validate`, `mobile-qa`, `release-demo`. Agents: `mobile-qa`, `rights-auditor`, `content-reviewer`.

## Layout
- `app/page.tsx` shell and tabs; `app/scene.tsx` Three.js viewer; `app/*-data.ts` bilingual content; `app/i18n.ts` + `app/*.cs.json` Czech strings.
- CSS: `app/globals.css` (base), `app/theme-*.css` (themes), `app/responsive.css` (loaded last; all mobile fixes go here, use `--header-h`).
- `scripts/validate-*.mjs` load TS via `ts.transpileModule`; keep modules importable without a bundler.

## Working style
- Read before editing; do not re-read unchanged files.
- Concise output. Simplest working change. No speculative features.
- Do not guess APIs, versions or URLs; verify in code or docs.
- Plain hyphens and straight quotes in code and docs.
