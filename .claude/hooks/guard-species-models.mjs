// PreToolUse(Bash) hook: before `git commit`, if cat/rabbit model files are
// staged, enforce the download budget and run the species validator.
// Exit 2 blocks the commit and shows the reason to Claude.
import { spawnSync } from 'node:child_process';
import { statSync, existsSync } from 'node:fs';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const command = JSON.parse(input || '{}').tool_input?.command ?? '';
if (!/\bgit\b[^|;&]*\bcommit\b/.test(command)) process.exit(0);

const staged = spawnSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf8' }).stdout ?? '';
if (!/^public\/models\/(cat|rabbit)\//m.test(staged)) process.exit(0);

const BUDGET = 12 * 1024 * 1024;
for (const species of ['cat', 'rabbit']) {
  const bin = `public/models/${species}/anatomy.bin`;
  if (existsSync(bin) && statSync(bin).size > BUDGET) {
    process.stderr.write(`${bin} is ${(statSync(bin).size / 1048576).toFixed(1)} MB; budget is 12 MB. Decimate before committing.\n`);
    process.exit(2);
  }
}
// The validator needs Node >= 22.12 (require of ES modules).
const [major, minor] = process.versions.node.split('.').map(Number);
const args = major > 22 || (major === 22 && minor >= 12)
  ? [process.execPath, ['scripts/validate-species.mjs']]
  : ['npx', ['-y', 'node@22.21', 'scripts/validate-species.mjs']];
const r = spawnSync(args[0], args[1], { encoding: 'utf8', shell: process.platform === 'win32' && args[0] === 'npx' });
if (r.status !== 0) {
  process.stderr.write('validate-species failed; fix before committing:\n' + (r.stderr || r.stdout).split('\n').slice(-8).join('\n') + '\n');
  process.exit(2);
}
process.exit(0);
