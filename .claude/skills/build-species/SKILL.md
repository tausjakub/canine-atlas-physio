---
name: build-species
description: Rebuild the cat and rabbit 3D atlases in Blender, pack them into public/models and verify them. Use after changing anything in scripts/blender/, the species mapping tables or scripts/build-species-models.mjs, or when asked to regenerate the cat/rabbit models.
---

# Rebuild the cat and rabbit atlases

Geometry is the dog model (`public/models/anatomy.bin`) retargeted onto each
species in Blender, plus species edits. Run from the repo root.

1. Build in Blender 5.3 (headless; `< /dev/null` stops Blender waiting on stdin):

   ```bash
   B="/c/Program Files/Blender Foundation/Blender 5.3/blender.exe"
   for s in cat rabbit; do "$B" --background --factory-startup --python scripts/blender/build.py -- $s --render left oblique < /dev/null 2>&1 | grep -E "WARN|MISSING|Error|Traceback|export"; done
   ```

   Output: `work/species/<species>/` (geometry.bin, parts.json, `<species>.blend`, preview PNGs).
   Any `Traceback` or `MISSING` line is a failure.

2. Pack: `node scripts/build-species-models.mjs` (writes `public/models/<species>/catalog.json` + `anatomy.bin`).

3. Verify: `npx -y node@22.21 scripts/validate-species.mjs` (Node 22.11 cannot load it).

4. Look: open the previews with Read. For a side-by-side with the dog run
   `"$B" --background --factory-startup --python scripts/blender/compare.py < /dev/null`
   and read `work/species/compare-*.png`, or delegate to the `model-qa` agent.

5. Budget: each `anatomy.bin` must stay at or below 12 MB (a commit hook enforces it).

If the Blender MCP add-on is connected (`get_addon_status` succeeds), you can open
`work/species/<species>/<species>.blend` there for interactive inspection; the
headless pipeline stays the source of truth.
