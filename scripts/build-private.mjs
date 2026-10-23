import {spawnSync} from 'node:child_process';
import {statSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const config=JSON.parse(readFileSync('wrangler.private.jsonc','utf8'));
if(config.assets?.run_worker_first!==true)throw Error('Private deployments must authenticate before every asset request.');
const build=spawnSync(process.execPath,['scripts/build-pages.mjs'],{stdio:'inherit',env:{...process.env,PAGES_BASE_PATH:'',ATLAS_GATE_BUILD:'1'}});if(build.status!==0)process.exit(build.status??1);
const sizes={};
function inspect(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())inspect(file);else{const size=statSync(file).size;if(size>25*1024*1024)throw Error(`Split this asset before Workers deployment: ${file}`);if(/(?:^|[\\/])(?:\.env[^\\/]*|\.dev\.vars[^\\/]*|wrangler[^\\/]*|security)(?:$|[\\/])/.test(file))throw Error('Server configuration leaked into public assets.');sizes['/'+path.relative('dist/client',file).split(path.sep).join('/')]=size;}}}
inspect('dist/client');writeFileSync('dist/private-asset-sizes.json',JSON.stringify(sizes));console.log('PASS: private build ready for worker-first deployment. Serve with npm run preview:private; never publish dist/client directly.');
