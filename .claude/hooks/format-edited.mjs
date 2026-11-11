// PostToolUse(Edit|Write) hook: formats the edited source file with the
// project's oxfmt config. Data JSON, Markdown and other files are left alone
// (validators fingerprint some JSON content). Never blocks.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const file = JSON.parse(input || '{}').tool_input?.file_path;
if (!file) process.exit(0);

const relative = path.relative(process.cwd(), file).split(path.sep).join('/');
if (/^(app|components|lib|scripts|security)\/.*\.(tsx?|mjs|css)$/.test(relative))
  spawnSync(process.execPath, ['node_modules/oxfmt/bin/oxfmt', relative], { stdio: 'ignore' });
process.exit(0);
