import {spawnSync} from 'node:child_process';
import {writeFileSync,renameSync} from 'node:fs';
const base=process.env.PAGES_BASE_PATH??'/canine-atlas-physio';
if(base && !/^\/[a-zA-Z0-9_.-]+$/.test(base))throw new Error('PAGES_BASE_PATH must be empty or a single /repository-name.');
const result=spawnSync(process.execPath,['node_modules/vinext/dist/cli.js','build'],{stdio:'inherit',env:{...process.env,PAGES_BASE_PATH:base}});
if(result.status!==0)process.exit(result.status??1);
// Pages mounts the artifact at the repository path, so remove the duplicate disk prefix.
if(base)renameSync('dist/client'+base+'/_next','dist/client/_next');
writeFileSync('dist/client/.nojekyll','');
writeFileSync('dist/client/pages-build.json',JSON.stringify({basePath:base}));
const check=spawnSync(process.execPath,['scripts/check-pages.mjs'],{stdio:'inherit'});
process.exit(check.status??1);
