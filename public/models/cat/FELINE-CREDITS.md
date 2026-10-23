# Feline Ecorche Dec

Author: **westerly**, published December 1, 2015.

Source: https://sketchfab.com/3d-models/feline-ecorche-dec-4c08824eb4914ff4b6e71b4dc2ba080e

License: **Creative Commons Attribution 4.0**
https://creativecommons.org/licenses/by/4.0/

The user supplied `feline_ecorche_dec.glb`. The author describes an artistic
practice study based on Eliot Goldfinger's *Animal Anatomy for Artists*, with
some minor deep muscles omitted. A particular feline species is not specified.

Changes: decoded the five technical mesh chunks, welded coincident export
vertices (six decimal places in world coordinates), extracted 398 connected
components, omitted four isolated single-triangle fragments, normalized size
and orientation, and assigned display materials. No source surface was replaced
by procedural ellipsoids, stretched dog meshes or fabricated anatomical detail.
451,198 source triangles are retained in `detailed-anatomy.bin`.

Connected components are **not equivalent to individual anatomical structures**.
Some span the midline or contain multiple structures. Tissue classifications
and the limited anatomical labels are provisional visual interpretations by
this project; they were not supplied or endorsed by the original author.
Unidentified parts retain stable numbered labels and no invented attachment,
innervation or clinical study notes. Poses are disabled pending rig validation.

Build from the authorized source with workspace Node:
1. `node scripts/inspect-feline.mjs <path-to-feline_ecorche_dec.glb>`
2. `node scripts/build-feline-atlas.mjs`
3. `node scripts/validate-feline.mjs`

Intermediate connected-component data is written to `../../work` relative to
the project directory. Existing procedural cat assets are retained separately;
the cat entry point now loads the detailed catalogue instead.
