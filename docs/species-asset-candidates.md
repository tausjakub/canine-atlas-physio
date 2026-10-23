# Replacement anatomy assets — 2026-09-19

## Implementation update — 2026-10-22

Feline: the supplied sculpt is the active model, with its original 451,198
retained triangles. Eleven provisionally identified skeletal components now
link to explicitly general anatomical study summaries and body-region filters.
Unidentified parts keep numbered labels and no invented muscle identity.

Rabbit: the authored model now uses original continuous implicit surfaces for
the skull, mandibles, scapulae and principal long bones. The skull includes
orbital, nasal and illustrative maxillary openings. Broad muscles use curved
fan-shaped sheets; other bellies use asymmetrical profiles and narrow ends.
This improves geometric differentiation but is not a specimen-accurate or
independently validated reconstruction. Teeth and other omitted structures
remain omitted. No scanned geometry or dog meshes were substituted.

Shape references consulted: University of Zaragoza's rabbit osteology course
(https://ocw.unizar.es/ocw/course/view.php?id=23&section=2), the university-hosted
rabbit muscular anatomy atlas (https://open.clemson.edu/rabbit/2/), and the
University of Minnesota carnivore anatomy materials. These sources inform
general shape and relationships, not measured vertex coordinates; their
illustrations are not redistributed or traced into model assets.

Both native viewers now offer directional camera fitting, focus in context,
restoration of hidden parts, clearer stages and region shortcuts. Feline poses
remain disabled until a suitable rig is validated. Rabbit poses retain their
existing continuity and finite-geometry checks.

## User requirement confirmed 2026-09-20

The user explicitly rejected a separate scan viewer and primitive teaching
geometry. The cat/rabbit entry points now open the native selectable atlas
directly; the scan viewer is no longer offered in the UI. Existing schematic
geometry remains labelled schematic. This navigation change does **not** meet
the requested anatomical fidelity.

Replacement acceptance criteria:
- Individually identifiable bones and muscles with species-specific surface
  geometry, including meaningful articular and attachment landmarks.
- A common spatial registration so the skeleton, superficial muscles and deep
  muscles form one coherent model; no stretched canine substitutes.
- Verified identities, laterality, provenance and redistribution license for
  each imported part. Triangle counts alone are not a quality criterion.
- Selection, isolation and visibility continue through the existing atlas
  renderer. Pose pivots and soft-tissue bindings must be revalidated against
  replacement geometry before poses are enabled for it.
- Visual review alongside anatomical references; artistic studies must not be
  presented as a validated veterinary atlas.

The Feline Ecorche Dec page was checked again on 2026-09-20 through its official
download button: download is blocked by a Sketchfab login dialog. The current
browser is not authenticated. The author describes a rough first practice
study of a feline, with some minor deep muscles omitted, based on Goldfinger's
Animal Anatomy for Artists. Domestic-cat identity, named segmentation and
anatomical adequacy remain unverified until the source asset can be inspected.
No complete suitable rabbit musculature asset has been obtained.

The procedural cat/rabbit models do not meet the requested visual fidelity.
Adding subdivisions or additional primitive parts is not a replacement for
anatomically shaped meshes. Do not describe them as equivalent to the dog.

Verified using Sketchfab's public model metadata. All three models are marked
downloadable, but the official download endpoints return HTTP 401 without an
authenticated account. The user subsequently supplied the cat ZIP and rabbit GLB. Their unchanged GLBs are now integrated as the default detailed skeleton mode, with original-texture and ivory-material options. See public/models/SCAN-CREDITS.md. The feline muscle study has not been supplied or integrated.

| Candidate | Scope | License |
| --- | --- | --- |
| [Cat skeleton](https://sketchfab.com/3d-models/7106115b299649e992476f2d3b4fc602) | Author-described full-skeleton photogrammetry; 74,235 triangles. Segmentation and specimen identity need inspection. | CC BY-NC-SA 4.0 |
| [Rabbit skeleton](https://sketchfab.com/3d-models/06b78bc7560d4f108441ee7e5975abe0) | Approximately 40 cm skeleton, photogrammetry; author manually reconstructed ribs and dorsal spines. 76,166 triangles. Species and segmentation need inspection. | CC BY-NC 4.0 |
| [Feline Ecorche Dec](https://sketchfab.com/3d-models/4c08824eb4914ff4b6e71b4dc2ba080e) | Artist's practice study with skeleton and superficial/deep muscles; some deep muscles omitted. 451,202 triangles. Not a validated veterinary atlas. | CC BY 4.0 |

Additional CT-based cat resource:
[3D Anatomy Studios](https://3danatomystudios.com/portfolio/digital-rendering-of-a-complete-cat-skeleton/)
links to [MorphoSource project 000344158](https://www.morphosource.org/projects/000344158).
MorphoSource returned an automated-access denial. The article's rendering
license must not be assumed to cover every downloadable CT dataset.

After the user supplies authorized downloads, inspect geometry and licenses
before integration: distinguish connected scan meshes from individually named
bones; establish specimen identity, scale and orientation; preserve attribution;
map only identified parts to study cards. Existing schematic pose transforms
cannot be assumed to fit replacement geometry. Rabbit muscle coverage remains
unresolved. Do not stretch dog anatomy and label it as a rabbit/cat reconstruction.
