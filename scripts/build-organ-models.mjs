// Packs the Blender-built dog organ layer into the app's catalog format.
//
//   blender -b --factory-startup -P scripts/blender/organs.py
//   node scripts/build-organ-models.mjs
//
// The brain comes from the CC0 canine MRI atlas (Johnson & Barry 2019); all
// other organs are schematic shapes authored in scripts/blender/organs.py.
// The app merges these parts into the dog atlas; each part names its own binary.
import fs from 'node:fs';
import { organStudy } from './organs-study.mjs';

const root = new URL('../', import.meta.url);
const work = new URL('work/organs/', root);
const out = new URL('public/models/organs/', root);
const binaryPath = '/models/organs/anatomy.bin';

const built = JSON.parse(fs.readFileSync(new URL('parts.json', work), 'utf8'));
const geometry = fs.readFileSync(new URL('geometry.bin', work));
if (geometry.length !== built.bytes)
  throw Error('geometry.bin does not match parts.json');

const round = (v) => v.map((x) => Math.round(x * 1e5) / 1e5);
const parts = built.parts.map((p) => {
  const card = organStudy[p.id];
  if (!card) throw Error(`No study card for ${p.id}`);
  return {
    ...p,
    center: round(p.center),
    bounds: p.bounds.map(round),
    binaryPath,
    ...card,
  };
});
const missing = Object.keys(organStudy).filter(
  (id) => !parts.some((p) => p.id === id),
);
if (missing.length) throw Error(`Built model lacks: ${missing.join(', ')}`);

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(new URL('anatomy.bin', out), geometry);
fs.writeFileSync(
  new URL('catalog.json', out),
  JSON.stringify({
    bytes: geometry.length,
    binaryPath,
    attribution:
      'Brain: Johnson PJ, Barry EF (2019) Cortical Atlas of the Canine Brain, Cornell eCommons, doi:10.7298/4t8z-aw34 (CC0). Other organs: schematic shapes authored for Canine Atlas.',
    parts,
  }),
);
console.log(
  `organs: ${parts.length} parts, ${(geometry.length / 1e6).toFixed(2)} MB`,
);
