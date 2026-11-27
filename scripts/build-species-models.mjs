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
      title: 'MusculoskeletalDog (geometry source, MIT)',
      url: 'https://github.com/vittorione94/MusculoskeletalDog',
    },
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
      title: 'MusculoskeletalDog (geometry source, MIT)',
      url: 'https://github.com/vittorione94/MusculoskeletalDog',
    },
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
    [
      /^Ribcage$/,
      () =>
        pair(
          'Hrudní koš s hrudními obratli',
          'Rib cage with thoracic vertebrae',
        ),
    ],
    [
      /^Sesamoid_carpal$/,
      () => pair('Sezamská kost zápěstí', 'Carpal sesamoid bone'),
    ],
    [
      /^Femoris_fabella_(\d)$/,
      (m) => pair(`Fabela ${m[1]}`, `Fabella ${m[1]}`),
    ],
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
// Real skull and mandible scans (CC BY 4.0) replace the retargeted dog skull
// (scripts/blender/real_skulls.py).
const SKULL_CREDITS = {
  cat: {
    title:
      'Domestic cat (Felis catus) CT, courtesy of Dr Tobias Schwarz, prepared by Brian Mather, Royal (Dick) School of Veterinary Studies, The University of Edinburgh (CC BY 4.0)',
    url: 'https://sketchfab.com/3d-models/7c99ca836d834c39872ecf5e9b5e2087',
  },
  rabbit: {
    title:
      'Oryctolagus cuniculus MZB 97-0280, Museu de Ciències Naturals de Barcelona (CC BY 4.0); mandible placed on the articulated rabbit skull 178.05 of the RISD Nature Lab (CC BY 4.0)',
    url: 'https://sketchfab.com/3d-models/6640c63cf58341758e99255cec1a8976',
  },
  ferret: {
    title:
      'Mustela putorius (European polecat, wild form of the ferret) 27896, skull and mandible articulated, Mammal Research Institute PAS, Open Forest Data (CC BY 4.0)',
    url: 'https://doi.org/10.48370/OFD/RWXIPA',
  },
  guinea_pig: {
    title: 'Cavia porcellus 122.17, RISD Nature Lab (CC BY 4.0)',
    url: 'https://sketchfab.com/3d-models/385b2c21ad1b47b3a4f50eb875a917ef',
  },
};
// Ferret and guinea pig are built on the cat and rabbit templates.
const info = {
  cat: ['cat', 'Felis catus', 'kočka domácí', 'domestic cat'],
  rabbit: [
    'rabbit',
    'Oryctolagus cuniculus',
    'králík domácí',
    'domestic rabbit',
  ],
  ferret: ['cat', 'Mustela putorius furo', 'fretka domácí', 'domestic ferret'],
  guinea_pig: ['rabbit', 'Cavia porcellus', 'morče domácí', 'guinea pig'],
};
sources.ferret = sources.cat.slice(0, 2);
sources.guinea_pig = sources.rabbit.slice(0, 2);
for (const species of Object.keys(info)) {
  if (only && only !== species) continue;
  const [base, scientificName, nameCs, nameEn] = info[species];
  const rabbit = base === 'rabbit';
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
    const scan = SKULL_CREDITS[species];
    if (scan && (p.id === 'MergedSkull' || p.id === 'Jaw'))
      study.difference = pair(
        `${study.difference.cs} Tvar této kosti pochází z 3D skenu skutečného exempláře: ${scan.title}.`,
        `${study.difference.en} This bone's shape comes from a 3D scan of a real specimen: ${scan.title}.`,
      );
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
    sources: [
      ...sources[species],
      ...(SKULL_CREDITS[species] ? [SKULL_CREDITS[species]] : []),
    ],
    scientificName,
    scope: pair(
      `3D model vytvořený v Blenderu přenesením profesionálního psího modelu MusculoskeletalDog (MIT) na proporce druhu ${nameCs}${base !== species ? ` (přes šablonu: ${base === 'cat' ? 'kočka' : 'králík'})` : ''}: ${parts.length - muscles} kostních částí a ${muscles} samostatných svalů (obě strany) s druhovými názvy, vrstvami a doplněnými svaly, které pes nemá. Jde o studijní pomůcku, ne o CT, sken ani odborně ověřenou disekci; tvary kostí a svalů zůstávají částečně psí. Chybí cévy, nervy, vazy a orgány.`,
      `3D model built in Blender by retargeting the professional MusculoskeletalDog model (MIT) onto ${nameEn} proportions${base !== species ? ` (via the ${base} template)` : ''}: ${parts.length - muscles} skeletal pieces and ${muscles} separate muscles (both sides) with species names, layers and added muscles the dog lacks. This is a study aid, not a CT, scan or expert-validated dissection; bone and muscle shapes remain partly canine. Vessels, nerves, ligaments and organs are omitted.`,
    ),
    created: new Date().toISOString().slice(0, 10),
    geometryRevision: 4,
    geometryOrigin: pair(
      'Odvozeno z MusculoskeletalDog, © 2025 Vittorio La Barbera, licence MIT (models/LICENSE-MODEL.txt), přeneseno skripty scripts/blender. Anatomické zdroje určují názvy, vrstvy a úpony.',
      'Derived from MusculoskeletalDog, © 2025 Vittorio La Barbera, MIT licence (models/LICENSE-MODEL.txt), retargeted by scripts/blender. Anatomical references inform names, layers and attachments.',
    ),
    attribution:
      'MusculoskeletalDog by Vittorio La Barbera (MIT), https://github.com/vittorione94/MusculoskeletalDog' +
      (SKULL_CREDITS[species]
        ? `; skull and mandible: ${SKULL_CREDITS[species].title}, ${SKULL_CREDITS[species].url}`
        : ''),
  };
  const dir = new URL(`public/models/${species}/`, root);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(new URL('anatomy.bin', dir), geometry);
  fs.writeFileSync(new URL('catalog.json', dir), JSON.stringify(atlas));
  console.log(
    `${species}: ${parts.length} parts (${muscles} muscles), ${(raw.bytes / 1e6).toFixed(1)} MB`,
  );
}
