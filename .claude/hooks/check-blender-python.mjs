// PostToolUse(Edit|Write) hook: byte-compiles edited scripts/blender/*.py so a
// syntax error is reported immediately instead of after a 40 s Blender run.
// Exit 2 feeds the compiler message back to Claude; anything else never blocks.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const file = JSON.parse(input || '{}').tool_input?.file_path;
if (!file) process.exit(0);
const relative = path.relative(process.cwd(), file).split(path.sep).join('/');
if (!/^scripts\/blender\/.*\.py$/.test(relative)) process.exit(0);

for (const python of ['python3', 'python', 'py']) {
  const r = spawnSync(python, ['-c', 'import ast,sys;ast.parse(open(sys.argv[1],encoding="utf-8").read(),sys.argv[1])', relative], { encoding: 'utf8' });
  if (r.error) continue;
  if (r.status !== 0) {
    process.stderr.write(`Python syntax error in ${relative}:\n${r.stderr.trim().split('\n').slice(-4).join('\n')}\n`);
    process.exit(2);
  }
  process.exit(0);
}
process.exit(0);
