"""Build a species atlas in Blender.

  blender --background --factory-startup --python scripts/blender/build.py -- cat [--skeleton-only] [--render]

Writes work/species/<species>/geometry.bin + parts.json (packed into the
public catalog by scripts/build-species-models.mjs) and preview renders.
"""
import sys
import os
import json
import time
import importlib
import struct

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402
import common  # noqa: E402
from common import clear_scene, tri_arrays  # noqa: E402
import skeleton  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['cat']
species = argv[0]
OUT = os.path.join(ROOT, 'work', 'species', species)
os.makedirs(OUT, exist_ok=True)

for m in ('common', 'skeleton', 'skull', 'limbs', 'muscles', 'species_' + species, 'muscles_table'):
    if m in sys.modules:
        importlib.reload(sys.modules[m])
spec = importlib.import_module('species_' + species)
S = spec.S

clear_scene()
col = bpy.context.scene.collection
t0 = time.time()
PROCEDURAL = '--procedural' in argv
if not PROCEDURAL:
    # Default: retarget the dog's professional geometry onto this species.
    import dog_import
    import retarget
    import polish
    import species_edits
    import species_map
    import muscles_table
    for m in (muscles_table, species_map, dog_import, retarget, polish, species_edits):
        importlib.reload(m)
    dog = dog_import.load_dog(ROOT, col)
    src = retarget.dog_landmarks(dog)
    tgt = retarget.target_landmarks(S)
    segs = retarget.segments(src, tgt, S)
    for p in dog:
        p['region'] = retarget.region_of(p, segs)
    print(f'jaw closed by {retarget.close_jaw(dog, S['retarget'].get('jaw_close', 1.0)):.0f} deg', flush=True)
    retarget.warp(dog, segs)
    print(f'retarget: {len(dog)} parts in {time.time() - t0:.1f}s', flush=True)
    dog = species_edits.edit_bones(dog, S)
    dog = species_edits.label_muscles(dog, S)
    import species_additions
    importlib.reload(species_additions)
    dog = species_additions.add_muscles(dog, S, col)
    polish.polish(dog, S)
    print(f'polish: {time.time() - t0:.1f}s', flush=True)
    parts = [(p['id'], p['system'], p['region'], p['ob'], p.get('meta')) for p in dog]
    F = {'L': {'joints': {k: tgt['L'][k] for k in ('shoulder', 'elbow', 'carpus', 'hip', 'stifle', 'hock')}}}
    F['L']['joints']['foretoes'] = tgt['L']['fore_toe']
    F['L']['joints']['hindtoes'] = tgt['L']['hind_toe']
    F['Ca_1'] = type('P', (), {'a': tgt['spine']['Ca_1']})
else:
    bones, F, centres = skeleton.build_skeleton(S, col)
    print(f'skeleton: {len(bones)} bones in {time.time() - t0:.1f}s', flush=True)
    parts = [(pid, 'bone', region, ob, None) for pid, region, ob in bones]

if PROCEDURAL and '--skeleton-only' not in argv:
    import muscles
    t1 = time.time()
    built = muscles.build_muscles(S, F, [ob for _, _, ob in bones], col)
    print(f'muscles: {len(built)} in {time.time() - t1:.1f}s', flush=True)
    parts += built


def material(name, rgb):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    return m


bone_m = material('bone', (0.86, 0.80, 0.66))
for pid, system, region, ob, meta in parts:
    if system == 'bone':
        ob.data.materials.append(bone_m)
    else:
        h = (sum(map(ord, pid.rstrip('_LR'))) % 7) / 7
        ob.data.materials.append(material('m' + pid, (0.62 + 0.12 * h, 0.22 + 0.1 * (1 - h), 0.22)))


for _, _, _, ob, _ in parts:
    for p in ob.data.polygons:
        p.use_smooth = True


def render(name, view, hide=()):
    scn = bpy.context.scene
    try:
        scn.render.engine = 'BLENDER_WORKBENCH'
    except TypeError:
        pass
    sh = scn.display.shading
    sh.light = 'STUDIO'
    sh.color_type = 'MATERIAL'
    sh.show_cavity = True
    sh.show_shadows = False
    scn.render.resolution_x, scn.render.resolution_y = 1600, 1000
    vis = [o for o in scn.objects if o.type == 'MESH']
    for o in vis:
        o.hide_render = any(o.name.startswith(h) for h in hide)
    pts = [o.matrix_world @ Vector(c) for o in vis if not o.hide_render for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    c = (lo + hi) / 2
    cam_d = bpy.data.cameras.new('cam')
    cam_d.type = 'ORTHO'
    cam = bpy.data.objects.new('cam', cam_d)
    scn.collection.objects.link(cam)
    scn.camera = cam
    dirs = {'left': Vector((0, 0, -1)), 'left_close': Vector((0, 0, -1)), 'right': Vector((0, 0, 1)), 'dorsal': Vector((0, 1, 0.0001)),
            'ventral': Vector((0, -1, 0.0001)), 'cranial': Vector((1, 0, 0)), 'oblique': Vector((0.6, 0.45, -1))}
    d = dirs[view].normalized()
    cam.location = c + d * 2
    up = Vector((1, 0, 0)) if view in ('dorsal', 'ventral') else Vector((0, 1, 0))
    m = d.to_track_quat('Z', 'Y')
    look = (-d)
    right = look.cross(up).normalized()
    true_up = right.cross(look).normalized()
    from mathutils import Matrix
    rot = Matrix((right, true_up, -look)).transposed()
    cam.rotation_euler = rot.to_euler()
    ext = hi - lo
    span = max(abs(ext.dot(right)), abs(ext.dot(true_up)) * 1.6)
    cam_d.ortho_scale = span * 1.08
    cam_d.clip_end = 10
    scn.render.filepath = os.path.join(OUT, f'{name}-{view}.png')
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)
    for o in vis:
        o.hide_render = False


if '--render' in argv:
    for v in argv[argv.index('--render') + 1:] or ['left']:
        if v.startswith('--'):
            break
        view, _, mode = v.partition('+')
        hide = ()
        if mode == 'deep':
            hide = tuple(pid for pid, system, _, _, meta in parts if system == 'muscle' and meta and meta.get('depth') == 'superficial')
        elif mode == 'bones':
            hide = tuple(pid for pid, system, _, _, _ in parts if system == 'muscle')
        elif mode.startswith('R:'):
            # Only one anatomical region (bones and muscles), optionally deep only.
            reg_, _, deep = mode[2:].partition(':')
            hide = tuple(pid for pid, system, region, _, meta in parts if region != reg_ or (deep and system == 'muscle' and meta.get('depth') == 'superficial'))
            mode = mode.replace(':', '-')
        elif mode:
            # Only show parts whose id contains this token (plus bones).
            hide = tuple(pid for pid, system, _, _, _ in parts if system == 'muscle' and mode not in pid)
        render('preview' + ('-' + mode if mode else ''), view, hide)

# Export geometry.
chunks, catalog, offset = [], [], 0
for pid, system, region, ob, meta in parts:
    pos, idx = tri_arrays(ob)
    vb = struct.pack(f'<{len(pos)}f', *pos)
    ib = struct.pack(f'<{len(idx)}I', *idx)
    xs, ys, zs = pos[0::3], pos[1::3], pos[2::3]
    lo, hi = [min(xs), min(ys), min(zs)], [max(xs), max(ys), max(zs)]
    catalog.append({'id': pid, 'system': system, 'anatomicalRegion': region, 'vertexOffset': offset,
                    'vertexCount': len(pos) // 3, 'indexOffset': offset + len(vb), 'indexCount': len(idx),
                    'center': [(a + b) / 2 for a, b in zip(lo, hi)], 'bounds': [lo, hi], 'meta': meta})
    chunks += [vb, ib]
    offset += len(vb) + len(ib)
with open(os.path.join(OUT, 'geometry.bin'), 'wb') as f:
    for c in chunks:
        f.write(c)
J = F['L']['joints']
pose = {'joints': {k: list(J[k]) for k in ('shoulder', 'elbow', 'carpus', 'hip', 'stifle', 'hock')},
        'foretoes': list(J['foretoes']), 'hindtoes': list(J['hindtoes']),
        'tail': list(F['Ca_1'].a)}
with open(os.path.join(OUT, 'parts.json'), 'w', encoding='utf-8') as f:
    json.dump({'species': species, 'bytes': offset, 'parts': catalog, 'pose': pose}, f)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, f'{species}.blend'))
print(f'export: {len(catalog)} parts, {offset / 1e6:.1f} MB, total {time.time() - t0:.1f}s', flush=True)
