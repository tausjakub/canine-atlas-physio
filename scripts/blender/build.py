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



def load_organs(species, col):
    """The dog organ layer (scripts/blender/organs.py), retargeted with the dog.
    Parts named *_rabbit replace their dog counterpart in the rabbit only."""
    src = os.path.join(ROOT, 'work', 'organs')
    if not os.path.exists(os.path.join(src, 'parts.json')):
        print('no organ layer: run scripts/blender/organs.py first', flush=True)
        return []
    with open(os.path.join(src, 'parts.json'), encoding='utf-8') as f:
        built = json.load(f)['parts']
    with open(os.path.join(src, 'geometry.bin'), 'rb') as f:
        blob = f.read()
    ids = {p['id'] for p in built}
    out = []
    for p in built:
        pid = p['id']
        if pid.endswith('_rabbit'):
            if species != 'rabbit':
                continue
            pid = pid[:-len('_rabbit')]
        elif species == 'rabbit' and pid + '_rabbit' in ids:
            continue
        n = p['vertexCount']
        pos = struct.unpack_from(f'<{n * 3}f', blob, p['vertexOffset'])
        idx = struct.unpack_from(f'<{p["indexCount"]}I', blob, p['indexOffset'])
        me = bpy.data.meshes.new(pid)
        me.from_pydata([pos[i:i + 3] for i in range(0, len(pos), 3)], [], [idx[i:i + 3] for i in range(0, len(idx), 3)])
        ob = bpy.data.objects.new(pid, me)
        col.objects.link(ob)
        out.append({'id': pid, 'system': 'organ', 'ob': ob, 'meta': {'sex': p['sex']} if 'sex' in p else None})
    return out


def fit_tongue(parts, organs):
    """Species edits reshape the mandible after the warp; keep the tongue above its
    ventral border and within its length so the root does not hang out of the jaw."""
    jaw = next(p['ob'] for p in parts if p['id'] == 'Jaw')
    tongue = next((p['ob'] for p in organs if p['id'] == 'organ_tongue'), None)
    if tongue is None:
        return
    jv = [v.co for v in jaw.data.vertices]
    lo_x, hi_x = min(v.x for v in jv), max(v.x for v in jv)
    for v in tongue.data.vertices:
        v.co.x = min(max(v.co.x, lo_x + 0.004), hi_x - 0.008)
        near = [w.y for w in jv if abs(w.x - v.co.x) < 0.003]
        if near and v.co.y < min(near) + 0.004:
            v.co.y = min(near) + 0.004
    tongue.data.update()


def pack(items, out_dir):
    """Write (id, system, region, ob, meta) items as geometry.bin; returns the catalog."""
    os.makedirs(out_dir, exist_ok=True)
    chunks, catalog, offset = [], [], 0
    for pid, system, region, ob, meta in items:
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
    with open(os.path.join(out_dir, 'geometry.bin'), 'wb') as f:
        for c in chunks:
            f.write(c)
    return catalog, offset


clear_scene()
col = bpy.context.scene.collection
organs = []
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
    import dog_edits
    importlib.reload(dog_edits)
    dog = dog_edits.split_ribcage(dog)
    dog_edits.edit_teeth(dog, species)
    src = retarget.dog_landmarks(dog)
    tgt = retarget.target_landmarks(S)
    segs = retarget.segments(src, tgt, S)
    trees = retarget.bone_trees(dog, segs)
    organs = load_organs(species, col)
    for p in dog + organs:
        p['region'] = retarget.region_of(p, segs, trees)
    print(f'jaw closed by {retarget.close_jaw(dog + organs, S['retarget'].get('jaw_close', 1.0)):.0f} deg', flush=True)
    retarget.warp(dog + organs, segs, trees=trees)
    print(f'retarget: {len(dog)} parts in {time.time() - t0:.1f}s', flush=True)
    dog = species_edits.edit_bones(dog, S)
    dog = species_edits.label_muscles(dog, S)
    dog = species_edits.split_midline(dog)
    dog = species_edits.split_muscles(dog, S)
    dog = species_edits.clip_tail(dog, S)
    import species_additions as _sa
    _sa.reshape_head(dog + organs, S)
    import species_additions
    importlib.reload(species_additions)
    dog = species_additions.add_muscles(dog, S, col)
    polish.polish(dog, S)
    species_additions.add_incisors(dog, S, col)
    fit_tongue(dog, organs)
    print(f'polish: {time.time() - t0:.1f}s', flush=True)
    parts = [(p['id'], p['system'], p['region'], p['ob'], p.get('meta')) for p in dog]
    F = {'L': {'joints': {k: tgt['L'][k] for k in ('shoulder', 'elbow', 'carpus', 'hip', 'stifle', 'hock')}}}
    # Toe pivots for the app's pose rig: metacarpo-/metatarsophalangeal joints.
    F['L']['joints']['foretoes'] = tgt['L']['carpus'].lerp(tgt['L']['fore_toe'], 0.6)
    F['L']['joints']['hindtoes'] = tgt['L']['hind_mtp']
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
        elif mode.startswith('B:'):
            # Bones of one region only.
            reg_ = mode[2:]
            hide = tuple(pid for pid, system, region, _, _ in parts if system != 'bone' or region != reg_)
            mode = mode.replace(':', '-')
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
catalog, offset = pack(parts, OUT)
if organs:
    oc, ob_ = pack([(p['id'], 'organ', p['region'], p['ob'], p['meta']) for p in organs], os.path.join(OUT, 'organs'))
    with open(os.path.join(OUT, 'organs', 'parts.json'), 'w', encoding='utf-8') as f:
        json.dump({'species': species, 'bytes': ob_, 'parts': oc}, f)
    print(f'organs: {len(oc)} parts, {ob_ / 1e6:.2f} MB', flush=True)
J = F['L']['joints']
pose = {'joints': {k: list(J[k]) for k in ('shoulder', 'elbow', 'carpus', 'hip', 'stifle', 'hock')},
        'foretoes': list(J['foretoes']), 'hindtoes': list(J['hindtoes']),
        'tail': list(F['Ca_1'].a)}
with open(os.path.join(OUT, 'parts.json'), 'w', encoding='utf-8') as f:
    json.dump({'species': species, 'bytes': offset, 'parts': catalog, 'pose': pose}, f)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, f'{species}.blend'))
print(f'export: {len(catalog)} parts, {offset / 1e6:.1f} MB, total {time.time() - t0:.1f}s', flush=True)
