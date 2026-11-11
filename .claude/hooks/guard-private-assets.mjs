// PreToolUse(Bash) guard: blocks git commands that would stage or commit
// licensed books, private assets or secrets, and refuses to publish a private
// build to GitHub Pages. Exit code 2 blocks the tool call and shows stderr.
import { execSync } from 'node:child_process';

const FORBIDDEN = /(\.pdf$|^private-assets\/|(^|\/)\.env|\.dev\.vars)/i;

let input = '';
for await (const chunk of process.stdin) input += chunk;
const command = JSON.parse(input || '{}').tool_input?.command ?? '';

const block = (message) => {
  process.stderr.write(`Blocked by .claude/hooks/guard-private-assets.mjs: ${message}\n`);
  process.exit(2);
};

if (/\bgit\s+add\b[^\n]*(-f|--force)\b/.test(command) && /pdf|private-assets|\.env|dev\.vars/i.test(command))
  block('force-adding licensed or secret files. They must stay untracked.');

if (/\bgit\s+(commit|push)\b/.test(command)) {
  let staged = '';
  try {
    staged = execSync('git diff --cached --name-only', { encoding: 'utf8' });
  } catch {
    process.exit(0);
  }
  const bad = staged.split('\n').filter((file) => FORBIDDEN.test(file));
  if (bad.length) block(`staged licensed/secret files: ${bad.join(', ')}. Unstage them (git restore --staged).`);
}

if (/ATLAS_GATE_BUILD=1/.test(command) && /gh-pages|upload-pages-artifact|pages deploy/i.test(command))
  block('the private edition must never be published to GitHub Pages.');

process.exit(0);
