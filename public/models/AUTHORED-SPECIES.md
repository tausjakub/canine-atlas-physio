# Cat and domestic-rabbit atlases

Original 3D models built for this project in Blender from parameters
(`scripts/blender/`). No scans, third-party sculpts or dog meshes are used,
copied, fitted or relabelled.

Rebuild (Blender 5.3, Node >= 22.13):

    blender --background --factory-startup --python scripts/blender/build.py -- cat --render left oblique
    blender --background --factory-startup --python scripts/blender/build.py -- rabbit --render left oblique
    node scripts/build-species-models.mjs

`build.py` writes geometry, a `.blend` file and preview renders to
`work/species/<species>/`; the Node step packs `catalog.json` and `anatomy.bin`
here. Catalog offsets are bytes; positions are float32 XYZ (x cranial, y dorsal,
z lateral, left side negative) and triangle indices are uint32.

## Contents

- Felis catus: 197 skeletal pieces and 234 muscles (117 per side).
- Oryctolagus cuniculus: 191 skeletal pieces and 222 muscles (111 per side).
- Every muscle is a separate, selectable mesh with bilingual name, origin,
  insertion, action, innervation, layer (0 deepest to 4 most superficial) and a
  recall question. Species-specific muscles and names are included (for
  example clavotrapezius, xiphihumeralis, caudofemoralis and tenuissimus in the
  cat; trapezius parts, cleidobrachialis and abductor cruris caudalis in the
  rabbit).

## How the shapes are made

Bones are assembled from shafts, epiphyses and processes, fused by voxel
remeshing and smoothed. Each bone records named landmarks (tubercles,
epicondyles, fossae, crests). Muscles are generated from those attachments,
deepest layer first:

- bellies are lofted along origin, via points and insertion, with tendons and
  an elliptical cross-section flattened against what lies beneath;
- flat muscles are ruled surfaces between their origin and insertion lines,
  draped over deeper muscles and a hidden body-shape guide;
- each muscle is pushed clear of bone so layers stack on the skeleton.

## Limits

These are study models, not CT reconstructions, scans or validated dissection
records. Attachment areas, muscle volumes and proportions are authored
approximations of standard veterinary descriptions. Vessels, nerves, ligaments,
organs, cutaneous, facial and small intrinsic paw muscles are omitted or
grouped. Poses are illustrative. Independent veterinary anatomical review
remains outstanding; do not use the geometry to infer palpation or treatment
locations.
