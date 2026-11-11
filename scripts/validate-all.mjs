// Runs every content/logic validator and reports a compact pass/fail summary.
// Usage: node scripts/validate-all.mjs [--verbose]
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const checks = [
  ['validate.mjs', ['--experimental-strip-types']],
  ['validate-notes.mjs'],
  ['validate-i18n.mjs'],
  ['validate-exam.mjs'],
  ['validate-quiz.mjs'],
  ['validate-challenge.mjs'],
  ['validate-reading.mjs'],
  ['validate-theory.mjs'],
  ['validate-practice.mjs'],
  ['validate-poses.mjs'],
  ['validate-personal-plan.mjs'],
  ['validate-exam-day.mjs'],
  ['validate-dorn-3d.mjs'],
  ['validate-dorn-movements.mjs'],
  ['validate-themes.mjs'],
  ['validate-private.mjs'],
  ['validate-editions.mjs'],
];

const verbose = process.argv.includes('--verbose');
let failed = 0;
for (const [script, flags = []] of checks) {
  const file = `scripts/${script}`;
  if (!existsSync(file)) continue;
  const started = Date.now();
  const result = spawnSync(
    process.execPath,
    ['--no-warnings', ...flags, file],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  const ok = result.status === 0;
  if (!ok) failed++;
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${script}  (${seconds}s)`);
  if (!ok || verbose) {
    const output = `${result.stdout}\n${result.stderr}`.trim().split('\n');
    console.log(
      output
        .slice(-25)
        .map((line) => `      ${line}`)
        .join('\n'),
    );
  }
}
console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
