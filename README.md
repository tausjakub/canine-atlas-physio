# Canine Atlas

An interactive canine musculoskeletal study app inspired by the interaction patterns of [Human Atlas](https://github.com/ashemag/human-atlas). Built using React, Three.js and a Sites/Vinext scaffold.

## Run

Use Node.js 22.13 or newer. Install with `npm ci`, then `npm run dev`. Build static output with `npm run build` into `dist/client`.

## Capabilities

- Orbit, zoom and select anatomical pieces; search the complete source catalogue.
- Toggle skeleton, muscle, schematic ligament, connective tissue and surface layers. The Bones + ligaments preset reveals 17 additional teaching guides with bilingual notes.
- Isolate or hide pieces, restore hidden pieces, set muscle opacity and separate the anatomy into an exploded layout.
- Camera presets for left/right lateral, cranial, dorsal and oblique views.
- Regional browsing and 15 muscle-action recall cards with reference links.
- Detailed notes for all 425 pieces, with 168 distinct anatomical profiles. Each includes overview, location, attachments/articulations, function, nerve supply, physiotherapy relevance, a recall question and reference links.
- Side and source-piece annotations distinguish bilateral anatomy and fragments. Forty-three pieces carry explicit identity qualifications; uncertain labels are not silently converted into definitive anatomy.
- Exam preparation in Czech and English: 13 topic modules mapped to 58 criteria, 26 original recall questions, rehearsal prompts, references, anatomy links and device-local review progress.

## Exam preparation and ligament additions

The study route follows [NSK qualification 43-001-R](https://www.narodnikvalifikace.cz/kvalifikace-1879-Fyzioterapeut_a_rehabilitacni_pracovnik_fyzioterapeutka_a_rehabilitacni_pracovnice_malych_zvirat), valid from 21 October 2022 and checked on 8 September 2026. It includes dogs and cats. Criterion letters refer to the corresponding competency in the official standard. The concise explanations are a study overview, not the official question bank or complete course. Clinical procedures need supervised instruction; there are no universal device settings or patient treatment prescriptions. Content and translation have not undergone independent veterinary peer review.

`app/exam-data.ts` keeps paired English/Czech content together. `app/exam-study.tsx` provides topic search, accessible recall disclosures and review progress stored only in this browser. The FMS versus EMS/FES terminology discrepancy in the official standard is explicitly retained for clarification with the assessor.

`app/ligaments.ts` supplements the 425 original pieces with 17 procedural guides (442 selectable objects total): bilateral stifle cruciates, collaterals, patellar ligaments, elbow collateral guides and sacrotuberous ligaments, plus a midline nuchal guide. The source binary is unchanged. Guide endpoints lie at nearby source bone vertices, but anatomical footprints, course, shape and thickness are approximate and not independently validated. Elbow branches are simplified. These guides are clearly labeled and are not a complete ligament atlas. The source piece `m_Ligament` retains its existing identity qualification.

`node scripts/validate-exam.mjs` checks criterion counts, bilingual content, source and anatomy links, real lesson rendering, search/progress handlers, finite Three.js geometry, mirrored sides, endpoint proximity and layer visibility. The existing language test also renders all new ligament inspector notes in both languages.

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

## Languages

The CZ / ENG header switch changes all app-owned interface text, accessible labels, structure names, detailed notes, piece annotations, reference titles and all 15 study cards. The preference is stored locally; changing it preserves exploration state. Search accepts English, Czech and original model names, including Czech queries without diacritics. Latin terminology and original identifiers remain available; external source pages and the original model licence retain their published language.

Czech content is bundled in `app/study-data.cs.json`, `app/ui.cs.json` and `app/cards.cs.json`; no translation service is called by the deployed app. `scripts/cs-anatomy-terms.txt` and `scripts/cs-note-corrections.json` retain the terminology and field-level editorial corrections used in preparing the Czech text. The notes and translation have not undergone independent veterinary review. `node scripts/validate-i18n.mjs` checks coverage, source consistency, anatomical distinctions, actual localization helpers, search and representative page rendering in both languages. An English-content fingerprint prevents silently stale Czech notes after English changes; review translations before updating that fingerprint.

## Validation checks

`node --experimental-strip-types scripts/validate.mjs` checks catalogue and geometry bounds, valid indices, finite coordinates, naming, visibility behavior and study-card mappings. `node scripts/validate-notes.mjs` checks all-part coverage, complete content fields, references, fore/hindlimb distinctions, muscle-head distinctions and required qualifications. `npx tsc --noEmit` checks types. The production static build must complete successfully. Browser interactions and physical touch devices have not been tested.
