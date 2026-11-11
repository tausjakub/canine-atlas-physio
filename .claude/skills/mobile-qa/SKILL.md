---
name: mobile-qa
description: Check the atlas layout on phone, landscape, tablet and desktop with Playwright screenshots. Use after any CSS or layout change, or when asked about mobile/responsive behaviour.
---

1. `npm run build:demo`
2. `node scripts/mobile-check.mjs work/screens` (options: `--only=phone-small,phone`, `--views=explore,exam`). First run on a machine needs `npx playwright install chromium`.
3. Read `work/screens/phone-small-explore.png`, `phone-explore.png` and `phone-landscape-explore.png`, plus the views you changed.
4. Fix layout in `app/responsive.css` (loaded last; selectors are prefixed `.atlas-app` to win over older rules). Panes size with `--header-h`, measured from the real header in `app/page.tsx`; never hardcode header heights.
5. Re-run until the script prints PASS and the screenshots show no overlap or clipping.

Viewports: 320x640, 390x844, 844x390, 820x1180, 1440x900.
