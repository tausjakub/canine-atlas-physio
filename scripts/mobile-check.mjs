// Responsive QA for a built artifact (npm run build:demo or build:private).
// Serves dist/client, opens every main view at several viewport sizes, saves
// screenshots and fails on horizontal page overflow.
//   node scripts/mobile-check.mjs [outDir] [--only=phone] [--views=explore,exam]
// Requires: npx playwright install chromium
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const outDir = path.resolve(
  args.find((a) => !a.startsWith('--')) ?? 'work/screens',
);
const opt = (name) =>
  args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const root = path.resolve('dist/client');
const { basePath = '' } = JSON.parse(
  readFileSync(path.join(root, 'pages-build.json'), 'utf8'),
);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.bin': 'application/octet-stream',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
};
const server = createServer((req, res) => {
  let url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (basePath && url.startsWith(basePath)) url = url.slice(basePath.length);
  let file = path.join(root, url);
  if (!file.startsWith(root)) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory())
    file = path.join(file, 'index.html');
  if (!existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, {
    'content-type': types[path.extname(file)] ?? 'application/octet-stream',
  });
  res.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}${basePath}/`;

const viewports = [
  { name: 'phone-small', width: 320, height: 640, mobile: true },
  { name: 'phone', width: 390, height: 844, mobile: true },
  { name: 'phone-landscape', width: 844, height: 390, mobile: true },
  { name: 'tablet', width: 820, height: 1180, mobile: true },
  { name: 'desktop', width: 1440, height: 900, mobile: false },
].filter((v) => !opt('only') || opt('only').split(',').includes(v.name));
// View query parameters supported by app/page.tsx.
const views = [
  { name: 'explore', query: '' },
  { name: 'exam', query: 'view=exam' },
  { name: 'topics', query: 'view=topics' },
  { name: 'exam-day', query: 'view=exam-day' },
  { name: 'practical', query: 'view=practical' },
].filter((v) => !opt('views') || opt('views').split(',').includes(v.name));

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
});
const problems = [];
for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.mobile ? 2 : 1,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
  });
  for (const view of views) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(origin + (view.query ? `?${view.query}` : ''), {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(view.name === 'explore' ? 2500 : 600);
    const report = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      const overflow =
        Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ) - width;
      const offenders = [];
      const small = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (
          style.visibility === 'hidden' ||
          style.display === 'none' ||
          r.width === 0
        )
          continue;
        if (
          r.right > width + 1 &&
          !el.closest('[data-scroll-x], .table-scroll, table, pre')
        ) {
          let p = el.parentElement,
            clipped = false;
          while (p) {
            const ps = getComputedStyle(p);
            if (/(auto|scroll|hidden|clip)/.test(ps.overflowX)) {
              clipped = true;
              break;
            }
            p = p.parentElement;
          }
          if (!clipped)
            offenders.push(
              `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} right=${Math.round(r.right)}`,
            );
        }
        if (
          el.matches('button, a[href], input, select, [role=button]') &&
          r.top < window.innerHeight * 3
        ) {
          if (r.height < 32 || r.width < 32)
            small.push(
              `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} ${Math.round(r.width)}x${Math.round(r.height)} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}"`,
            );
        }
      }
      return {
        overflow,
        offenders: [...new Set(offenders)].slice(0, 8),
        small: [...new Set(small)].slice(0, 12),
      };
    });
    const file = path.join(outDir, `${vp.name}-${view.name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    const status = report.overflow > 1 || errors.length ? 'FAIL' : 'ok  ';
    if (status === 'FAIL') problems.push(`${vp.name}/${view.name}`);
    console.log(
      `${status} ${vp.name.padEnd(15)} ${view.name.padEnd(10)} overflow=${report.overflow}px`,
    );
    if (report.offenders.length)
      console.log('     overflowing:', report.offenders.join(' | '));
    if (vp.mobile && report.small.length)
      console.log('     small targets:', report.small.join(' | '));
    if (errors.length) console.log('     page errors:', errors.join(' | '));
    await page.close();
  }
  await context.close();
}
await browser.close();
server.close();
console.log(`\nScreenshots: ${outDir}`);
console.log(
  problems.length
    ? `FAIL: ${problems.join(', ')}`
    : 'PASS: no horizontal overflow or page errors.',
);
process.exit(problems.length ? 1 : 0);
