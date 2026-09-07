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
- Short movement notes for selected major muscles; other pieces explicitly state that detailed notes are unavailable.

## Anatomy provenance and limits

Geometry comes from [MusculoskeletalDog](https://github.com/vittorione94/MusculoskeletalDog), © 2025 Vittorio La Barbera, MIT. Its research paper documents base Pharaoh dog geometry from leo3Dmodels and dm_control. Model licence is preserved at `public/models/LICENSE-MODEL.txt`.

This is research-used anatomical modeling, **not a CT reconstruction or a clinically validated atlas**. It contains 425 selectable pieces; these are mesh pieces, not anatomical totals. Some source pieces combine several structures, some names are abbreviated or ambiguous, and muscles can have multiple pieces. The application does not contain organs or nerves. Source IDs remain visible; display names make modest spelling and abbreviation adjustments. Region groups are browsing aids, not anatomical segmentation.

Geometry is converted without decimation from STL and SKN. Body hierarchy translations and skin bind weights are applied in the MJCF reference pose, then axes are converted from Z-up to Y-up. Exploded mode translates pieces for inspection and preserves their shapes. It is not an anatomical movement simulation. Colors are illustrative.

Study summaries are brief educational notes linked to [University of Minnesota Carnivore Dissection Labs](https://vanat.ahc.umn.edu/carnLabs/), especially labs 3, 5, 6, 7 and 9. Review the canine examples alongside your prescribed veterinary anatomy text. No treatment protocols, diagnoses, joint limits or exercise prescriptions are supplied.

The interface follows Human Atlas's patterns, with an independently implemented canine catalogue, renderer and study layer; no human geometry is reused.

## Reproduce geometry

Download the MusculoskeletalDog main-branch source. With Python and NumPy, run:

```
python scripts/convert_model.py /path/to/MusculoskeletalDog-main
```

The converter validates every index, finite coordinate, source format and supported transform. Unexpected rotations or malformed skinning cause an error rather than an approximate conversion.

## Validation

`node --experimental-strip-types scripts/validate.mjs` checks catalogue and geometry bounds, valid indices, finite coordinates, naming, visibility behavior and study-card mappings. `npx tsc --noEmit` checks types. The production static build must complete successfully. Browser interactions and physical touch devices have not been tested.
