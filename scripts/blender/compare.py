"""Side-by-side renders of the shipped dog, cat and rabbit models for QA.

  blender --background --factory-startup --python scripts/blender/compare.py [-- --layers]

Loads public/models/{catalog.json,cat/,rabbit/} (same binary format), scales
each animal to the same height, places them left to right and writes
work/species/compare-<view>.png. With --layers it also renders the deepest
muscle layers only (superficial muscles hidden).
"""
import json
import os
import struct
import sys
import bpy
from mathutils import Vector, Matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'work', 'species')
os.makedirs(OUT, exist_ok=True)
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []

for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob)


def load(folder, catalog):
    path = os.path.join(ROOT, 'public', 'models', folder)
    with open(os.path.join(path, catalog), encoding='utf-8') as f:
        cat = json.load(f)
    with open(os.path.join(path, 'anatomy.bin'), 'rb') as f:
        blob = f.read()
    obs = []
    for p in cat['parts']:
        if p['system'] not in ('bone', 'muscle') or p.get('path'):
            continue
        n = p['vertexCount']
        pos = struct.unpack_from(f'<{n * 3}f', blob, p['vertexOffset'])
        idx = struct.unpack_from(f'<{p["indexCount"]}I', blob, p['indexOffset'])
        me = bpy.data.meshes.new(p['id'])
        me.from_pydata([pos[i:i + 3] for i in range(0, len(pos), 3)], [], [idx[i:i + 3] for i in range(0, len(idx), 3)])
        for poly in me.polygons:
            poly.use_smooth = True
        ob = bpy.data.objects.new(p['id'], me)
        ob['system'] = p['system']
        ob['layer'] = p.get('layer', -1)
        bpy.context.scene.collection.objects.link(ob)
        mat = bpy.data.materials.get(p['system']) or bpy.data.materials.new(p['system'])
        mat.diffuse_color = (0.86, 0.80, 0.66, 1) if p['system'] == 'bone' else (0.78, 0.42, 0.42, 1)
        me.materials.append(mat)
        obs.append(ob)
    return obs


animals = [load('', 'catalog.json'), load('cat', 'catalog.json'), load('rabbit', 'catalog.json')]
x = 0.0
for obs in animals:
    pts = [ob.matrix_world @ Vector(c) for ob in obs for c in ob.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    s = 1.0 / (hi.y - lo.y)
    m = Matrix.Translation((x - lo.x * s, -lo.y * s, 0)) @ Matrix.Scale(s, 4)
    for ob in obs:
        ob.matrix_world = m
    x += (hi.x - lo.x) * s + 0.25

scn = bpy.context.scene
try:
    scn.render.engine = 'BLENDER_WORKBENCH'
except TypeError:
    pass
scn.display.shading.light = 'STUDIO'
scn.display.shading.color_type = 'MATERIAL'
scn.display.shading.show_cavity = True
scn.render.resolution_x, scn.render.resolution_y = 2400, 800


def render(name, direction, hide=lambda ob: False):
    for obs in animals:
        for ob in obs:
            ob.hide_render = hide(ob)
    vis = [ob for obs in animals for ob in obs if not ob.hide_render]
    pts = [ob.matrix_world @ Vector(c) for ob in vis for c in ob.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    centre = (lo + hi) / 2
    cam_d = bpy.data.cameras.new('cam')
    cam_d.type = 'ORTHO'
    cam_d.ortho_scale = (hi.x - lo.x) * 1.05
    cam = bpy.data.objects.new('cam', cam_d)
    scn.collection.objects.link(cam)
    scn.camera = cam
    d = Vector(direction).normalized()
    cam.location = centre + d * 5
    look = -d
    right = look.cross(Vector((0, 1, 0))).normalized()
    up = right.cross(look).normalized()
    cam.rotation_euler = Matrix((right, up, -look)).transposed().to_euler()
    cam_d.clip_end = 20
    scn.render.filepath = os.path.join(OUT, f'compare-{name}.png')
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)


render('left', (0, 0.02, -1))
render('oblique', (0.5, 0.45, -1))
render('skeleton', (0, 0.02, -1), lambda ob: ob['system'] == 'muscle')
if '--layers' in argv:
    render('deep', (0, 0.02, -1), lambda ob: ob['system'] == 'muscle' and ob['layer'] >= 3)
print('compare: done', flush=True)
