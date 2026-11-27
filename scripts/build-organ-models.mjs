// Packs the Blender-built organ layers into the app's catalog format.
//
//   blender -b --factory-startup -P scripts/blender/organs.py          (dog)
//   blender -b --factory-startup -P scripts/blender/build.py -- cat    (retargets it)
//   blender -b --factory-startup -P scripts/blender/build.py -- rabbit
//   blender -b --factory-startup -P scripts/blender/clinical.py        (dog clinical layer)
//   node scripts/build-organ-models.mjs [dog|cat|rabbit|dog-clinical|cat-clinical|rabbit-clinical]
//
// The brain comes from the CC0 canine MRI atlas (Johnson & Barry 2019); all
// other organs are schematic shapes authored in scripts/blender/organs.py.
// The app merges each pack into its species atlas; each part names its own binary.
import fs from 'node:fs';
import { organStudy, organStudyFor } from './organs-study.mjs';
import { clinicalStudy, clinicalStudyFor } from './clinical-study.mjs';

const root = new URL('../', import.meta.url);
// CT-based organ models whose organs replace the schematic ones
// (scripts/blender/real_bones.py replace_organs marks them meta.scan).
const ORGAN_SCAN = {
  cat: 'Normal Feline Anatomy - Digestive System by pixelbeaker (Sketchfab ab92a2a9, CC BY 4.0), placed by one fit of the organ centroids',
};
const BRAIN =
  'Brain: Johnson PJ, Barry EF (2019) Cortical Atlas of the Canine Brain, Cornell eCommons, doi:10.7298/4t8z-aw34 (CC0).';
const packs = {
  dog: {
    work: 'work/organs/',
    out: 'public/models/organs/',
    cards: organStudy,
    attribution: `${BRAIN} Other organs: schematic shapes authored for Canine Atlas.`,
  },
  ...Object.fromEntries(
    ['cat', 'rabbit', 'ferret', 'guinea_pig'].map((sp) => [
      sp,
      {
        work: `work/species/${sp}/organs/`,
        out: `public/models/${sp}/organs/`,
        cards: organStudyFor(sp),
        attribution: `Dog organ layer retargeted to the ${sp.replace('_', ' ')}. ${BRAIN} ${ORGAN_SCAN[sp] ? `Liver, stomach, intestines, kidneys and bladder: ${ORGAN_SCAN[sp]}. ` : ''}Other organs: schematic shapes authored for Canine Atlas.`,
        scan: ORGAN_SCAN[sp],
      },
    ]),
  ),
  // Clinical layer: landmarks, lymph nodes, vessels, nerves (scripts/blender/clinical.py).
  'dog-clinical': {
    work: 'work/clinical/',
    out: 'public/models/clinical/',
    cards: clinicalStudy,
    attribution:
      'Schematic clinical-anatomy markers authored for Canine Atlas.',
  },
  ...Object.fromEntries(
    ['cat', 'rabbit', 'ferret', 'guinea_pig'].map((sp) => [
      `${sp}-clinical`,
      {
        work: `work/species/${sp}/clinical/`,
        out: `public/models/${sp}/clinical/`,
        cards: clinicalStudyFor(sp),
        attribution: `Dog clinical-anatomy markers retargeted to the ${sp.replace('_', ' ')}; authored for Canine Atlas.`,
      },
    ]),
  ),
};

const round = (v) => v.map((x) => Math.round(x * 1e5) / 1e5);
for (const name of process.argv[2] ? [process.argv[2]] : Object.keys(packs)) {
  const pack = packs[name];
  if (!pack) throw Error(`Unknown pack ${name}`);
  const work = new URL(pack.work, root);
  const built = JSON.parse(
    fs.readFileSync(new URL('parts.json', work), 'utf8'),
  );
  const geometry = fs.readFileSync(new URL('geometry.bin', work));
  if (geometry.length !== built.bytes)
    throw Error(`${name}: geometry.bin does not match parts.json`);
  const binaryPath = `/${pack.out.replace(/^public\//, '')}anatomy.bin`;
  // Repack only the parts that have a card (drops the dog build's rabbit variants).
  const chunks = [];
  let offset = 0;
  const parts = built.parts
    .filter((p) => pack.cards[p.id] || !p.id.endsWith('_rabbit'))
    .map((p) => {
      let card = pack.cards[p.id];
      if (!card) throw Error(`${name}: no study card for ${p.id}`);
      if (pack.scan && p.meta?.scan === 'organs') {
        const d = card.study.difference;
        card = {
          ...card,
          study: {
            ...card.study,
            difference: {
              cs: `${d.cs} Tvar orgánu pochází z modelu podle CT: ${pack.scan}.`,
              en: `${d.en} The organ's shape comes from a CT-based model: ${pack.scan}.`,
            },
          },
        };
      }
      const vb = geometry.subarray(
        p.vertexOffset,
        p.vertexOffset + p.vertexCount * 12,
      );
      const ib = geometry.subarray(
        p.indexOffset,
        p.indexOffset + p.indexCount * 4,
      );
      chunks.push(vb, ib);
      const { meta, rigid: _r, labelVerts: _l, ...rest } = p;
      const sex = p.sex ?? meta?.sex;
      const labels = p.labels ?? meta?.labels;
      const part = {
        ...rest,
        ...(sex ? { sex } : {}),
        ...(labels ? { labels } : {}),
        vertexOffset: offset,
        indexOffset: offset + vb.length,
        center: round(p.center),
        bounds: p.bounds.map(round),
        binaryPath,
        ...card,
      };
      offset += vb.length + ib.length;
      return part;
    });
  const missing = Object.keys(pack.cards).filter(
    (id) => !parts.some((p) => p.id === id),
  );
  if (missing.length)
    throw Error(`${name}: built model lacks ${missing.join(', ')}`);
  const out = new URL(pack.out, root);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(new URL('anatomy.bin', out), Buffer.concat(chunks));
  fs.writeFileSync(
    new URL('catalog.json', out),
    JSON.stringify({
      bytes: offset,
      binaryPath,
      attribution: pack.attribution,
      parts,
    }),
  );
  console.log(
    `${name} organs: ${parts.length} parts, ${(offset / 1e6).toFixed(2)} MB`,
  );
}
// Muscle attachment points computed from the dog model (scripts/blender/clinical.py).
const attach = new URL('work/clinical/attachments.json', root);
if (fs.existsSync(attach)) {
  fs.copyFileSync(attach, new URL('public/models/attachments.json', root));
  console.log('attachments copied');
}
