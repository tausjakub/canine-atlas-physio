# Cat and domestic-rabbit atlases

Derived from the dog model in this folder (MusculoskeletalDog, © 2025 Vittorio
La Barbera, MIT, see `LICENSE-MODEL.txt`) by retargeting it onto cat and rabbit
proportions in Blender (`scripts/blender/`). Each catalog records this in
`attribution`, `geometryOrigin` and `sources`.

Rebuild (Blender 5.3, Node >= 22.13; see the `build-species` skill):

    blender --background --factory-startup --python scripts/blender/build.py -- cat --render left oblique
    blender --background --factory-startup --python scripts/blender/build.py -- rabbit --render left oblique
    node scripts/build-species-models.mjs

## How the models are made

1. `dog_import.py` loads the dog's bones and muscles from `anatomy.bin`.
2. `retarget.py` measures landmarks on the dog bones (joint centres, scapula,
   toes, spine, skull) and maps each body segment onto the species proportions
   in `species_cat.py` / `species_rabbit.py` with length and girth scaling.
   Bones move rigidly with their segment; muscles blend between the segments
   of their own region. It also closes the dog's open mouth.
3. `species_edits.py` renames bones to species ids, removes the rabbit's extra
   caudal vertebrae, fuses its first tarsal and splits its radial and
   intermediate carpals, and gives every muscle its species name, layer and
   study card (`species_map.py`, `muscles_table.py`).
4. `species_additions.py` adds muscles the dog model lacks (cat: soleus,
   caudofemoralis, brachioradialis, palmaris longus; rabbit: soleus).
5. `polish.py` subdivides and smooths muscles, keeps them outside bone and
   applies a triangle budget (each `anatomy.bin` at or below 12 MB).

## Limits

Study models, not CT reconstructions or validated dissections. Shapes remain
partly canine: the rabbit skull and teeth, rib count (the dog's merged rib
cage keeps 13 pairs), sacrum and the cat's split trapezius, deltoid and
pectoral parts are not yet species-specific geometry; their names and study
texts are. Vessels, nerves, ligaments and organs are omitted. Independent
veterinary anatomical review remains outstanding.
