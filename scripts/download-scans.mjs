// Downloads the CC BY 4.0 skull scans used by scripts/blender/real_skulls.py
// into work/scans/ (git-ignored). Only the decimated, fitted meshes ship.
//   node scripts/download-scans.mjs
// Credits: see SKULL_CREDITS in scripts/build-species-models.mjs and
// docs/RIGHTS-AND-ATTRIBUTION.md.
import fs from 'node:fs';
const D = 'https://dataverse.openforestdata.pl/api/access/datafile/';
const H =
  'https://huggingface.co/datasets/allenai/objaverse/resolve/main/glbs/';
const files = [
  ['cat/skull.stl', D + '398'],
  ['cat/jaw.stl', D + '397'],
  ['rabbit/skull.glb', H + '000-101/6640c63cf58341758e99255cec1a8976.glb'],
  ['rabbit/jaw.glb', H + '000-048/65d078562ec44d5a802a7e18fac7b639.glb'],
  ['ferret/skull.stl', D + '382'],
  ['ferret/jaw.stl', D + '381'],
  ['guinea_pig/skull.glb', H + '000-013/385b2c21ad1b47b3a4f50eb875a917ef.glb'],
];
for (const [out, url] of files) {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) {
    console.log('FAIL', out, r.status);
    continue;
  }
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync('work/scans/' + out.split('/')[0], { recursive: true });
  fs.writeFileSync('work/scans/' + out, buf);
  console.log(out, (buf.length / 1e6).toFixed(1), 'MB');
}
