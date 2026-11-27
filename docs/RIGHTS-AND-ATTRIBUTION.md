# Rights and attribution register

Status of every third-party asset, kept for the sales plan's "clear the content
and assets" step. Update the **Status** column when evidence is recorded.
Last reviewed: 2026-11-27. This is an engineering record, not legal advice.

| Asset | Where | Source and licence | Ships in | Status |
| --- | --- | --- | --- | --- |
| 3D bone/muscle meshes (425 pieces) | `public/models/anatomy.bin`, `catalog.json` | [MusculoskeletalDog](https://github.com/vittorione94/MusculoskeletalDog), © 2025 Vittorio La Barbera, MIT (`public/models/LICENSE-MODEL.txt`) | demo + private | **Pending**: see geometry provenance below |
| Cat and rabbit atlases (482 / 468 pieces: 197 / 189 bones, 285 / 279 muscle parts) | `public/models/cat/`, `public/models/rabbit/` | **Derived from the dog meshes above** (MusculoskeletalDog, MIT): retargeted to cat/rabbit proportions by `scripts/blender/` (Blender 5.3), plus a few muscles generated there. Attribution is in each catalog (`attribution`, `geometryOrigin`, `sources`) and shown in the Sources & scope dialog. Third-party cat/rabbit models (Sketchfab skeletons, CC BY-NC; Feline Ecorche, CC BY) were visual reference only and are not shipped | demo + private | **Pending, inherited**: same upstream provenance question as the dog meshes (leo3Dmodels). Resolve before selling. The branch `feature/feline-rabbit-atlas` (NC skeleton scans, book PDFs in its tree) was deleted from the remote on 2026-11-27; the blobs remain in old commit history |
| Dog brain (5 organ pieces) | `public/models/organs/` (`brain_*`) | Cortical Atlas of the Canine Brain, Johnson PJ & Barry EF (2019), Cornell eCommons, [doi:10.7298/4t8z-aw34](https://doi.org/10.7298/4t8z-aw34), **CC0 1.0** (authors request citation). Meshed from the population template masks and scaled into the dog skull by `scripts/blender/organs.py`; the raw download stays in `private-assets/organs/` | demo + private | Cleared (CC0); cited in the Sources dialog and each card |
| Other dog organs (29 pieces, incl. tongue and male/female reproductive organs) | `public/models/organs/` (`organ_*`) | Original schematic shapes authored in `scripts/blender/organs.py`, placed in cavities measured on the dog meshes (lung and liver outlines follow the dog ribcage, abdominal wall and diaphragm) | demo + private | Own work; outlines derived from the dog meshes, so they share the geometry provenance item below |
| Cat and rabbit organs (34 and 35 pieces) | `public/models/cat/organs/`, `public/models/rabbit/organs/` | The dog organ layer above retargeted by `scripts/blender/build.py`; the rabbit caecum and duplex uterus are authored in `scripts/blender/organs.py` | demo + private | Same status as the dog organs (CC0 brain, own-work schematic organs) |
| Clinical-anatomy layer (96 pieces per species, incl. growth plates, body regions and cranial nerves: landmarks, rib numbers, auscultation areas, lymph nodes, vessels, nerves, cord segment regions) | `public/models/clinical/`, `public/models/cat/clinical/`, `public/models/rabbit/clinical/` | Original schematic markers and tubes authored in `scripts/blender/clinical.py`, placed from the dog bones, muscles and skin; retargeted to the cat and rabbit by `scripts/blender/build.py` | demo + private | Own work; positions derived from the dog meshes, so they share the geometry provenance item below |
| Ferret and guinea pig atlases with organ and clinical packs | `public/models/ferret/`, `public/models/guinea_pig/` | MusculoskeletalDog retargeted by `scripts/blender/build.py` through the cat and rabbit templates (`species_ferret.py`, `species_guinea_pig.py`); ribs for ferret T14-T15 copied from the dog's last rib | demo + private | Same status as the cat and rabbit (MIT dog model, own-work transforms) |
| Cat skeleton model | Scapula, humerus, radius, ulna, pelvis, sacrum, femur, tibia, fibula, patella, vertebrae C1-L7 and cranial ribs (bones marked `meta.scan`) in `public/models/cat/anatomy.bin` | *Feline Skeleton Dec* by westerly, Sketchfab a5d0bb8f (via Objaverse), an artist's anatomical sculpt. **CC BY 4.0**; downloaded by `scripts/download-scans.mjs` into git-ignored `work/scans/`, each bone fitted onto the retargeted bone by `scripts/blender/real_bones.py` | demo + private | Cleared (CC BY 4.0); credited in the cat's Sources, catalog attribution and each replaced bone's card |
| Real skull and mandible scans (cat, rabbit, ferret via polecat, guinea pig) | `MergedSkull` and `Jaw` in `public/models/{cat,rabbit,ferret,guinea_pig}/anatomy.bin` | Cat: domestic cat CT, courtesy of Dr Tobias Schwarz, prepared by Brian Mather, Royal (Dick) School of Veterinary Studies, The University of Edinburgh (Sketchfab 7c99ca83, via Objaverse; the fused atlas is removed). Rabbit: *Oryctolagus cuniculus* MZB 97-0280, Museu de Ciències Naturals de Barcelona (Sketchfab 6640c63c / 65d07856, via Objaverse); the mandible is placed by registering both bones onto the articulated rabbit skull 178.05 of the RISD Nature Lab (Sketchfab 0f107289, via Objaverse; used for placement only, not shipped). Ferret: *Mustela putorius* 27896, MRI PAS, doi:10.48370/OFD/RWXIPA (wild form of the ferret; articulated Sketchfab version 062cc6aa, via Objaverse). Guinea pig: *Cavia porcellus* 122.17, RISD Nature Lab (Sketchfab 385b2c21, via Objaverse). All **CC BY 4.0**; downloaded by `scripts/download-scans.mjs` into git-ignored `work/scans/`, decimated and scaled by `scripts/blender/real_skulls.py` | demo + private | Cleared (CC BY 4.0); credited in each species' Sources, catalog attribution and the skull and mandible cards |
| Muscle attachment points | `public/models/attachments.json` | Computed from the dog muscle and bone meshes by `scripts/blender/clinical.py` | demo + private | Derived data; shares the geometry provenance item below |
| 17 ligament guides | `app/ligaments.ts` | Original, generated in code from source bone vertices | demo + private | Cleared (own work) |
| Skeleton photo | `public/study/dog-skeleton-museum.jpg` | Museum of Veterinary Anatomy FMVZ USP / Wagner Souza e Silva; edited by Rodrigo Tetsuo Argenton. CC BY-SA 4.0 | demo + private | Attribution shown in-app; see ShareAlike note |
| Knee photo | `public/study/dog-knee-museum.jpg` | Museum of Veterinary Anatomy FMVZ USP / Wagner Souza e Silva. CC BY-SA 4.0 | demo + private | Attribution shown in-app; see ShareAlike note |
| Numbered photo overlays | `app/study-visuals.tsx` | Adaptations of the two photos above, released CC BY-SA 4.0 | demo + private | ShareAlike applies to the overlay compositions |
| Concept diagrams (10) | `app/study-visuals.tsx` | Original SVG | demo + private | Cleared (own work) |
| Practical illustrations (3) | `public/study/practice/*.webp` | AI-generated (OpenAI), September 2026; see `public/study/practice/README.md` | demo + private | Check the generator's current commercial terms before sale |
| Study notes, quizzes, lessons | `app/*-data.ts`, `app/study-data*.json` | Original text with per-item references; includes `app/study-notes.ts` and the cat/rabbit muscle cards generated from `scripts/species-study.mjs` and `scripts/blender/muscles_table.py` | demo + private | Needs instructor review (sales plan step 4); cat/rabbit cards also need veterinary-anatomist review (see `docs/species-asset-candidates.md`) |
| Textbook PDFs (3 books, 69 sections) | `private-assets/library/` (ignored by Git) | User-supplied copyrighted books | **private only** | Never publish. Removed from Git tree on 2026-11-11; still present in history (see below) |
| Dorn course material | `app/dorn-*` | Original wording, structured after a course manual | **private only** | Keep out of commercial builds unless the course owner agrees |
| Personal exam plan | `app/personal-plan*` | Owner's own schedule | **private only** | Personal data; not for distribution |

## Geometry provenance (open item)

MusculoskeletalDog declares MIT for its repository. Its research paper (linked
from the repository README) credits earlier geometry: a "Pharaoh dog" model
from **leo3Dmodels** (a commercial 3D model seller) and the DeepMind
**dm_control** dog model (code under Apache 2.0; confirm the asset terms). An
MIT notice on a derived repository does not by itself grant rights the
upstream seller did not grant.

Before charging for access:

1. Identify the exact leo3Dmodels product and read its licence (editorial,
   royalty-free, redistribution in an interactive app, extraction of meshes).
2. Check dm_control's asset licence and NOTICE requirements.
3. Record the answer here. If redistribution in a paid browser app is not
   allowed, use cleared illustrations for the demo and replace the meshes.

Affected assets: `public/models/anatomy.bin`, `public/models/cat/anatomy.bin`,
`public/models/rabbit/anatomy.bin`, `public/models/organs/anatomy.bin`, `public/models/cat/organs/anatomy.bin`, `public/models/rabbit/organs/anatomy.bin` (organ outlines), and the three `clinical/anatomy.bin` packs (marker positions). Replacing or clearing the dog meshes also
means regenerating the cat and rabbit meshes with `scripts/blender/` and
`scripts/build-species-models.mjs`; the recorded answer must cover all three.

## CC BY-SA 4.0 obligations

- Credit creator, source, licence and changes wherever the photos appear (done
  in the study visuals and the Sources & scope dialog).
- Adaptations (the numbered overlays) must stay under CC BY-SA 4.0. That covers
  those images only, not the surrounding app.
- No additional restrictions (DRM or terms) may prevent re-use of those
  specific images. A login gate around the whole app is acceptable; do not
  claim exclusive rights over the photos.

## Book PDFs in Git history

The repository is public. The PDFs were committed in `7cf7251` and remain
downloadable from history even after removal from the tree. Removing them
completely requires rewriting history and force-pushing every branch, then
asking GitHub Support to purge cached views:

```sh
# Run in a fresh mirror clone, after warning every collaborator.
git clone --mirror https://github.com/tausjakub/canine-atlas-physio.git
cd canine-atlas-physio.git
git filter-repo --path public/library --invert-paths
git push --force --mirror
```

Faster alternative: make the repository private (Settings, General, Danger
Zone). That stops public history access immediately; on a free plan it also
disables GitHub Pages for the demo.
