# Canine Atlas

An interactive canine musculoskeletal study app inspired by the interaction patterns of [Human Atlas](https://github.com/ashemag/human-atlas). Built using React, Three.js and a Sites/Vinext scaffold.

## Run

Use Node.js 22.13 or newer. Install with `npm ci`, then `npm run dev`. Build static output with `npm run build` into `dist/client`.

## Capabilities

- Orbit, zoom and select anatomical pieces; search the complete source catalogue.
- Toggle skeleton, muscle, connective tissue and surface layers.
- Isolate or hide pieces, restore hidden pieces, set muscle opacity and separate the anatomy into an exploded layout.
- Camera presets for left/right lateral, cranial, dorsal and oblique views.
- Regional browsing and 15 muscle-action recall cards with reference links.
- Detailed notes for all 425 pieces, with 168 distinct anatomical profiles. Each includes overview, location, attachments/articulations, function, nerve supply, physiotherapy relevance, a recall question and reference links.
- Side and source-piece annotations distinguish bilateral anatomy and fragments. Forty-three pieces carry explicit identity qualifications; uncertain labels are not silently converted into definitive anatomy.

## Anatomy provenance and limits

Geometry comes from [MusculoskeletalDog](https://github.com/vittorione94/MusculoskeletalDog), © 2025 Vittorio La Barbera, MIT. Its research paper documents base Pharaoh dog geometry from leo3Dmodels and dm_control. Model licence is preserved at `public/models/LICENSE-MODEL.txt`.

This is research-used anatomical modeling, **not a CT reconstruction or a clinically validated atlas**. It contains 425 selectable pieces; these are mesh pieces, not anatomical totals. Some source pieces combine several structures, some names are abbreviated or ambiguous, and muscles can have multiple pieces. The application does not contain organs or nerves. Source IDs remain visible; display names make modest spelling and abbreviation adjustments. Region groups are browsing aids, not anatomical segmentation.

Geometry is converted without decimation from STL and SKN. Body hierarchy translations and skin bind weights are applied in the MJCF reference pose, then axes are converted from Z-up to Y-up. Exploded mode translates pieces for inspection and preserves their shapes. It is not an anatomical movement simulation. Colors are illustrative.

Study notes are original educational summaries with references to [University of Minnesota Carnivore Dissection Labs](https://vanat.ahc.umn.edu/carnLabs/), its canine/cat dissection guide, Sheridan College skeletal anatomy, and relevant additional sources. References are provided per profile. Review the canine examples alongside your prescribed veterinary anatomy text. Notes have not undergone independent veterinary peer review. No treatment protocols, diagnoses, joint limits or exercise prescriptions are supplied.

Notes are authored in `scripts/notes/*.txt`; `python scripts/build_study_notes.py` produces the explicit `app/study-data.json` mapping. The generator fails on any missing piece or unreferenced profile. It distinguishes forelimb and hindlimb digital-flexor labels using the source pose, and retains qualification messages for unclear source names. Bilateral counterparts share core anatomy; side, vertebral level and fragment context are stored per piece.

The interface follows Human Atlas's patterns, with an independently implemented canine catalogue, renderer and study layer; no human geometry is reused.

## Reproduce geometry

Download the MusculoskeletalDog main-branch source. With Python and NumPy, run:

```
python scripts/convert_model.py /path/to/MusculoskeletalDog-main
```

The converter validates every index, finite coordinate, source format and supported transform. Unexpected rotations or malformed skinning cause an error rather than an approximate conversion.

## Validation

`node --experimental-strip-types scripts/validate.mjs` checks catalogue and geometry bounds, valid indices, finite coordinates, naming, visibility behavior and study-card mappings. `node scripts/validate-notes.mjs` checks all-part coverage, complete content fields, references, fore/hindlimb distinctions, muscle-head distinctions and required qualifications. `npx tsc --noEmit` checks types. The production static build must complete successfully. Browser interactions and physical touch devices have not been tested.
