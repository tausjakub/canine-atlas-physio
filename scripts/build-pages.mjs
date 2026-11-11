// Static export used by both editions.
//   Public demo (GitHub Pages):  npm run build:demo
//   Private gated build:         npm run build:private (sets ATLAS_GATE_BUILD)
// The public demo never contains the licensed book library or Dorn course
// material; check-pages.mjs fails the build if any of it leaks in.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, renameSync, rmSync, writeFileSync } from 'node:fs';

const gated = process.env.ATLAS_GATE_BUILD === '1';
const library = gated && existsSync('private-assets/library');
const base = gated
  ? ''
  : (process.env.PAGES_BASE_PATH ?? '/canine-atlas-physio');
if (base && !/^\/[a-zA-Z0-9_.-]+$/.test(base))
  throw new Error(
    'PAGES_BASE_PATH must be empty or a single /repository-name.',
  );

rmSync('dist/client', { recursive: true, force: true });
const result = spawnSync(
  process.execPath,
  ['node_modules/vinext/dist/cli.js', 'build'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      PAGES_BASE_PATH: base,
      ATLAS_PRIVATE: gated ? '1' : '0',
      ATLAS_LIBRARY: library ? '1' : '0',
    },
  },
);
if (result.status !== 0) process.exit(result.status ?? 1);
// Pages mounts the artifact at the repository path, so remove the duplicate disk prefix.
if (base) renameSync('dist/client' + base + '/_next', 'dist/client/_next');
if (library)
  cpSync('private-assets/library', 'dist/client/library', { recursive: true });
writeFileSync('dist/client/.nojekyll', '');
writeFileSync(
  'dist/client/pages-build.json',
  JSON.stringify({
    basePath: base,
    edition: gated ? 'private' : 'demo',
    library,
  }),
);
if (gated && !library)
  console.warn(
    'NOTE: private-assets/library not found; the private build ships without the reading library.',
  );
const check = spawnSync(process.execPath, ['scripts/check-pages.mjs'], {
  stdio: 'inherit',
});
process.exit(check.status ?? 1);
