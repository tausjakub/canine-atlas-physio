---
name: release-demo
description: Publish the public demo edition to GitHub Pages safely, and verify no licensed or private material is live. Use when asked to deploy, publish or release the demo.
---

1. Run the `validate` skill. All checks must pass.
2. Confirm `git ls-files | grep -iE '\.pdf$|private-assets'` prints nothing.
3. Push to `main`. `.github/workflows/demo-pages.yml` builds `npm run build:demo` and deploys. Or run it manually: `gh workflow run demo-pages.yml --ref main`.
4. Watch: `gh run watch $(gh run list --workflow demo-pages.yml -L1 --json databaseId -q '.[0].databaseId')`.
5. Verify live:
   ```sh
   curl -sI https://tausjakub.github.io/canine-atlas-physio/ | head -1                                          # 200
   curl -sI https://tausjakub.github.io/canine-atlas-physio/library/canine-rehabilitation-1-50.pdf | head -1  # 404
   ```

Never upload a private build (`npm run build:private`) to Pages; the private edition is deployed only behind the Worker (`.github/workflows/private-deploy.yml` or `npm run deploy:private`).
