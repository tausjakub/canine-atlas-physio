# Private atlas study branch

Branch: `feature/private-dorn-library`.

The branch name is historical. The Dorn PDF, its previews and document links have
been removed. The nine 3D movement lessons and 22 study topics remain available
as standalone study material. The other library books and study images remain.

This branch uses a server-side gate. A password check in React, a hidden div,
or a JavaScript password/hash would leave the PDFs and anatomy downloads public.
The private worker authenticates **every request**, including static files,
before calling its internal assets binding. No database is needed.

## Local use

The requested password has already been configured on this machine. Its plaintext
is not saved in the repository. `.env.private.local` is ignored by Git and contains
only a PBKDF2-SHA256 salted verifier and a random HMAC session secret.

1. `npm run build:private`
2. `npm run preview:private` (or `npm run dev` / `npm start`)
3. Open `http://127.0.0.1:5174/`.

The protected preview serves the last build. Rebuild after source edits. It binds
only to loopback, supports PDF byte ranges, and uses an HttpOnly local session.
Production requires HTTPS and uses a Secure `__Host-` cookie. Sessions last eight
hours. Logout clears the browser cookie and cached files; rotating the signing
secret or password verifier invalidates existing sessions.

To change the password, use `npm run configure:private -- --rotate`. The command
prompts with hidden input. Treat the ignored environment file as server-private;
do not paste it into client code, commit it, or place it under `public/`.

## Deployment

**GitHub Pages and a raw static Sites upload cannot enforce this gate.**
Do not upload `dist/client` to either service for this branch. Existing public
deployments are not changed or protected by a local branch change.

The branch's manually triggered workflow deploys a Cloudflare Worker with
`assets.run_worker_first: true` and a login rate limiter. Configure the GitHub
environment `private-atlas` with these secrets:

- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` for the intended account.
- `ATLAS_PASSWORD_VERIFIER` and `ATLAS_SESSION_SECRET`, copied privately from
  the local environment file to server secret storage.

Alternatively configure the two atlas secrets with Wrangler and deploy using
`npm run deploy:private`. Deployment is not performed by this task. Missing or
malformed server secrets return 503 and never serve the atlas.

The generated static assets contain neither password nor password verifier.
Even known direct PDF/model/JavaScript URLs require a valid session. Source
repository access and files downloaded after a successful login are separate
from website access control.

## Checks

- `npm run check:private`: gate, signatures, session expiry/rotation, direct
  asset denial, CSRF origin checks, redirect sanitization, oversized bodies,
  throttling, and logout.
- `npm run build:private`: root-path static export, asset checks, maximum
  25 MiB per Worker asset, and worker-first deployment validation.
- `node scripts/validate-dorn-movements.mjs`: nine interactive 3D lessons,
  22 bilingual study topics, and absence of the removed document and previews.
- `node scripts/smoke-private.mjs` with `ATLAS_SMOKE_PASSWORD` supplied only to
  that process: authenticated HTML/JavaScript, retained PDF byte ranges, study
  images, removed-document 404s, logout, and no generated credential leakage.

Missing files return 404 after authentication. The Worker uses
`assets.not_found_handling: "none"`, so removed PDF and preview URLs do not fall
back to the atlas HTML. A fresh build removes stale exported assets before the
protected preview is restarted.

Authoritative hosting reference:
https://developers.cloudflare.com/workers/static-assets/routing/worker-script/
