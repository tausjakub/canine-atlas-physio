# Rights and attribution register

Status of every third-party asset, kept for the sales plan's "clear the content
and assets" step. Update the **Status** column when evidence is recorded.
Last reviewed: 2026-11-11. This is an engineering record, not legal advice.

| Asset | Where | Source and licence | Ships in | Status |
| --- | --- | --- | --- | --- |
| 3D bone/muscle meshes (425 pieces) | `public/models/anatomy.bin`, `catalog.json` | [MusculoskeletalDog](https://github.com/vittorione94/MusculoskeletalDog), © 2025 Vittorio La Barbera, MIT (`public/models/LICENSE-MODEL.txt`) | demo + private | **Pending**: see geometry provenance below |
| Cat and rabbit atlases (bones + 260/254 muscles) | `public/models/cat/`, `public/models/rabbit/` | **Derived from the dog meshes above** (MusculoskeletalDog, MIT): retargeted to cat/rabbit proportions by `scripts/blender/` (Blender 5.3), plus a few muscles generated there. Attribution is in each catalog (`attribution`, `geometryOrigin`, `sources`). Third-party cat/rabbit models (Sketchfab skeletons, CC BY-NC; Feline Ecorche, CC BY) were visual reference only and are not shipped | demo + private | **Pending, inherited**: same upstream provenance question as the dog meshes (leo3Dmodels). Resolve before selling. The NC skeleton scans remain in the history of branch `feature/feline-rabbit-atlas` |
| 17 ligament guides | `app/ligaments.ts` | Original, generated in code from source bone vertices | demo + private | Cleared (own work) |
| Skeleton photo | `public/study/dog-skeleton-museum.jpg` | Museum of Veterinary Anatomy FMVZ USP / Wagner Souza e Silva; edited by Rodrigo Tetsuo Argenton. CC BY-SA 4.0 | demo + private | Attribution shown in-app; see ShareAlike note |
| Knee photo | `public/study/dog-knee-museum.jpg` | Museum of Veterinary Anatomy FMVZ USP / Wagner Souza e Silva. CC BY-SA 4.0 | demo + private | Attribution shown in-app; see ShareAlike note |
| Numbered photo overlays | `app/study-visuals.tsx` | Adaptations of the two photos above, released CC BY-SA 4.0 | demo + private | ShareAlike applies to the overlay compositions |
| Concept diagrams (10) | `app/study-visuals.tsx` | Original SVG | demo + private | Cleared (own work) |
| Practical illustrations (3) | `public/study/practice/*.webp` | AI-generated (OpenAI), September 2026; see `public/study/practice/README.md` | demo + private | Check the generator's current commercial terms before sale |
| Study notes, quizzes, lessons | `app/*-data.ts`, `app/study-data*.json` | Original text with per-item references | demo + private | Needs instructor review (sales plan step 4) |
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
