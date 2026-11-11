---
name: validate
description: Run the full quality gate for Canine Atlas (types, lint, format, all content validators, demo build with leak checks). Use before committing or when asked to check, test or verify the project.
---

Run in order and stop at the first failure; report the failing command's last lines verbatim.

```sh
npm run typecheck
npx oxlint            # must report 0 errors
npx oxfmt --check
npm run validate      # scripts/validate-all.mjs: every validator
npm run build:demo    # includes scripts/check-pages.mjs leak checks
```

Notes:
- Node must be 22.13 or newer. On older 22.x, npm skips native optional packages and builds fail with "Cannot find native binding".
- `validate-i18n` fails with "English notes changed" if English study notes changed: review the Czech translation, do not just update the fingerprint.
- Never run `oxfmt` on `app/*.json` (excluded in `.oxfmtrc.json`); reformatting data JSON changes content fingerprints.
- For UI changes also use the `mobile-qa` skill.
