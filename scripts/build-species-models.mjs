// Packs the Blender-built cat and rabbit atlases into the app's catalog format.
//
//   blender -b --factory-startup -P scripts/blender/build.py -- cat
//   blender -b --factory-startup -P scripts/blender/build.py -- rabbit
//   node scripts/build-species-models.mjs [cat|rabbit]
//
// Geometry is authored parametrically in scripts/blender (no scans, sculpts or
// dog meshes). Muscle study text comes from scripts/blender/muscles_table.py;
// bone study text from scripts/species-study.mjs.
import fs from 'node:fs';
import { studyFor } from './species-study.mjs';

const root = new URL('../', import.meta.url);
const pair = (cs, en) => ({ cs, en });

const sources = {
  cat: [
    {
      title: 'University of Minnesota · Carnivore anatomy (dog and cat)',
      url: 'https://vanat.ahc.umn.edu/carnLabs/',
    },
    {
      title: 'Penn State · Cat muscle dissection',
      url: 'https://sites.psu.edu/catmuscles/',
    },
  ],
  rabbit: [
    {
      title: 'Mukhopadhyay & Wagner · Rabbit muscular anatomy (Clemson)',
      url: 'https://open.clemson.edu/rabbit/2/',
    },
    {
      title: 'Universidad de Zaragoza · Rabbit osteology',
      url: 'https://ocw.unizar.es/ocw/course/view.php?id=23&section=2',
    },
    {
      title: 'Skeletal muscle architecture of the rabbit hindlimb',
      url: 'https://pubmed.ncbi.nlm.nih.gov/2921772/',
    },
    {
      title: 'Biology of the Rabbit · comparative anatomy',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5129783/',
    },
  ],
};

const side = (id) =>
  id.endsWith('_L')
    ? pair(' · vlevo', ' · left')
    : id.endsWith('_R')
      ? pair(' · vpravo', ' · right')
      : pair('', '');

function boneLabel(id) {
  const n = id.replace(/_[LR]$/, '');
  const rules = [
    [/^MergedSkull$/, () => pair('Lebka', 'Skull')],
    [/^Jaw$/, () => pair('Polovina dolní čelisti', 'Hemimandible')],
    [
      /^C_(\d+)$/,
      (m) => pair(`Krční obratel C${m[1]}`, `Cervical vertebra C${m[1]}`),
    ],
    [
      /^T_(\d+)$/,
      (m) => pair(`Hrudní obratel T${m[1]}`, `Thoracic vertebra T${m[1]}`),
    ],
    [
      /^L_(\d+)$/,
      (m) => pair(`Bederní obratel L${m[1]}`, `Lumbar vertebra L${m[1]}`),
    ],
    [
      /^Ca_(\d+)$/,
      (m) => pair(`Ocasní obratel ${m[1]}`, `Caudal vertebra ${m[1]}`),
    ],
    [/^Sacrum$/, () => pair('Křížová kost', 'Sacrum')],
    [/^Sternum$/, () => pair('Hrudní kost', 'Sternum')],
    [/^Rib_(\d+)$/, (m) => pair(`Žebro ${m[1]}`, `Rib ${m[1]}`)],
    [/^Scapula$/, () => pair('Lopatka', 'Scapula')],
    [/^Clavicle$/, () => pair('Klíční kost', 'Clavicle')],
    [/^humerus$/, () => pair('Pažní kost', 'Humerus')],
    [/^Radius$/, () => pair('Vřetenní kost', 'Radius')],
    [/^Ulna$/, () => pair('Loketní kost', 'Ulna')],
    [
      /^Carpal_(.+)$/,
      (m) => pair(`Kost zápěstní · ${m[1]}`, `Carpal bone · ${m[1]}`),
    ],
    [/^Pelvis$/, () => pair('Pánevní kost', 'Hip bone')],
    [/^Femoris$/, () => pair('Stehenní kost', 'Femur')],
    [/^Patella$/, () => pair('Čéška', 'Patella')],
    [/^Tibia$/, () => pair('Holenní kost', 'Tibia')],
    [/^Fibula$/, () => pair('Lýtková kost', 'Fibula')],
    [/^Tibial_tarsal$/, () => pair('Hlezenní kost · talus', 'Talus')],
    [/^Calcaneal_tuber$/, () => pair('Patní kost · calcaneus', 'Calcaneus')],
    [
      /^Tarsus_centrale$/,
      () => pair('Centrální kost zánártní', 'Central tarsal bone'),
    ],
    [
      /^Tarsus_(\d)$/,
      (m) => pair(`Kost zánártní ${m[1]}`, `Tarsal bone ${m[1]}`),
    ],
    [
      /^Os_metacarpale_(\d)$/,
      (m) => pair(`Záprstní kost ${m[1]}`, `Metacarpal ${m[1]}`),
    ],
    [
      /^Metatarsi_(\d)$/,
      (m) => pair(`Nártní kost ${m[1]}`, `Metatarsal ${m[1]}`),
    ],
    [
      /^Phalanx_(\d)_(\d)$/,
      (m) =>
        pair(
          `Prst ${m[1]} hrudní končetiny · článek ${m[2]}`,
          `Forelimb digit ${m[1]} · phalanx ${m[2]}`,
        ),
    ],
    [
      /^Phalanges_B_(\d)_(\d)$/,
      (m) =>
        pair(
          `Prst ${m[1]} pánevní končetiny · článek ${m[2]}`,
          `Hindlimb digit ${m[1]} · phalanx ${m[2]}`,
        ),
    ],
  ];
  for (const [re, f] of rules) {
    const m = n.match(re);
    if (m) {
      const l = f(m),
        s = side(id);
      return pair(l.cs + s.cs, l.en + s.en);
    }
  }
  throw Error('No label for bone ' + id);
}

// Solve illustrative sitting/lying poses: two-bone chains keep their segment
// lengths. A teaching pose, not measured joint range or a movement prescription.
function solvePoses(J, rabbit) {
  const v = (p) => p.slice(0, 2);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const direction = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  const { shoulder, elbow, carpus, hip, stifle, hock } = Object.fromEntries(
    Object.entries(J.joints).map(([k, p]) => [k, v(p)]),
  );
  const toe = v(J.foretoes),
    hindtoe = v(J.hindtoes);
  const ground = Math.min(toe[1], hindtoe[1]);
  const out = {};
  for (const pose of ['sitting', 'lying']) {
    const trunk = pose === 'sitting' ? (rabbit ? 0.45 : 0.62) : 0;
    const lower = pose === 'lying' ? J.lower : 0;
    const transform = (p) => [
      shoulder[0] +
        (p[0] - shoulder[0]) * Math.cos(trunk) -
        (p[1] - shoulder[1]) * Math.sin(trunk),
      shoulder[1] +
        (p[0] - shoulder[0]) * Math.sin(trunk) +
        (p[1] - shoulder[1]) * Math.cos(trunk) -
        lower,
    ];
    const solve = (origin, mid, end, target, sign) => {
      const base = transform(origin),
        l1 = dist(origin, mid),
        l2 = dist(mid, end),
        d = dist(base, target);
      const theta =
        direction(base, target) +
        sign *
          Math.acos(
            Math.max(
              -1,
              Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)),
            ),
          );
      const joint = [
        base[0] + l1 * Math.cos(theta),
        base[1] + l1 * Math.sin(theta),
      ];
      return [
        theta - direction(origin, mid) - trunk,
        direction(joint, target) -
          direction(mid, end) -
          (theta - direction(origin, mid)),
      ];
    };
    const h = transform(hip);
    const targetHock = [h[0] + 0.025, ground + (rabbit ? 0.025 : 0.04)];
    const hind = solve(hip, stifle, hock, targetHock, 1);
    const targetCarpus =
      pose === 'lying' ? [shoulder[0] + 0.2, ground + 0.025] : carpus;
    const fore =
      pose === 'lying'
        ? solve(shoulder, elbow, carpus, targetCarpus, -1)
        : [-trunk, 0];
    const footAngle = (a, b, height) =>
      Math.asin(Math.max(-1, Math.min(1, (ground - height) / dist(a, b)))) -
      direction(a, b);
    const forefoot =
      footAngle(carpus, toe, targetCarpus[1]) - trunk - fore[0] - fore[1];
    const hindfoot =
      footAngle(hock, hindtoe, targetHock[1]) - trunk - hind[0] - hind[1];
    out[pose] = {
      trunk,
      arm: fore[0],
      forearm: fore[1],
      forefoot,
      foretoes: -(trunk + fore[0] + fore[1] + forefoot),
      thigh: hind[0],
      shank: hind[1],
      hindfoot,
      hindtoes: -(trunk + hind[0] + hind[1] + hindfoot),
      tail: -trunk,
    };
  }
  return out;
}

const only = process.argv[2];
for (const species of ['cat', 'rabbit']) {
  if (only && only !== species) continue;
  const rabbit = species === 'rabbit';
  const work = new URL(`work/species/${species}/`, root);
  const raw = JSON.parse(fs.readFileSync(new URL('parts.json', work), 'utf8'));
  const geometry = fs.readFileSync(new URL('geometry.bin', work));
  if (geometry.length !== raw.bytes)
    throw Error(species + ': geometry size mismatch');
  const parts = raw.parts.map(({ meta, ...p }) => {
    if (p.system === 'muscle') {
      const { label, action, study, layer } = meta;
      const s = side(p.id);
      return {
        ...p,
        label: pair(label.cs + s.cs, label.en + s.en),
        action,
        study,
        layer,
      };
    }
    const study = studyFor(p.id, p.system, p.anatomicalRegion, species);
    return { ...p, label: boneLabel(p.id), action: study.connections, study };
  });
  const J = raw.pose;
  const shoulderY = J.joints.shoulder[1];
  const poseConfig = { ...J, lower: shoulderY * 0.42 };
  poseConfig.angles = solvePoses(poseConfig, rabbit);
  const muscles = parts.filter((p) => p.system === 'muscle').length;
  const atlas = {
    species,
    parts,
    bytes: raw.bytes,
    binaryPath: `/models/${species}/anatomy.bin`,
    poseConfig,
    sources: sources[species],
    scientificName: rabbit ? 'Oryctolagus cuniculus' : 'Felis catus',
    scope: pair(
      `Vlastní 3D model vytvořený pro tento atlas v Blenderu: ${parts.length - muscles} kostních částí a ${muscles} samostatných svalů (obě strany), seřazených od nejhlubší vrstvy po povrchovou. Tvary svalů vycházejí z úponů na modelovaných kostech; jde o studijní pomůcku, ne o CT, sken ani odborně ověřenou disekci. Chybí cévy, nervy, vazy, orgány, kožní a mimické svaly a drobné svaly tlapek.`,
      `Original 3D model built in Blender for this atlas: ${parts.length - muscles} skeletal pieces and ${muscles} separate muscles (both sides), layered from deepest to most superficial. Muscle shapes are derived from attachments on the modelled bones; this is a study aid, not a CT, scan or expert-validated dissection. Vessels, nerves, ligaments, organs, cutaneous and facial muscles and small paw muscles are omitted.`,
    ),
    created: new Date().toISOString().slice(0, 10),
    geometryRevision: 3,
    geometryOrigin: pair(
      'Parametrická geometrie z Blenderu (scripts/blender); anatomické zdroje určují názvy, vrstvy a úpony, nikoli souřadnice.',
      'Parametric Blender geometry (scripts/blender); anatomical references inform names, layers and attachments, not coordinates.',
    ),
  };
  const dir = new URL(`public/models/${species}/`, root);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(new URL('anatomy.bin', dir), geometry);
  fs.writeFileSync(new URL('catalog.json', dir), JSON.stringify(atlas));
  console.log(
    `${species}: ${parts.length} parts (${muscles} muscles), ${(raw.bytes / 1e6).toFixed(1)} MB`,
  );
}
