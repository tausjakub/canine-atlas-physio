"""Replace the retargeted dog skull and mandible with scans of real specimens.

The scans (CC BY 4.0, see docs/RIGHTS-AND-ATTRIBUTION.md) are downloaded into
work/scans/<species>/ by scripts/download-scans.mjs. Each is decimated, turned
into the atlas frame (x rostral, y dorsal), scaled uniformly so its length
matches the retargeted skull and centred on it, so the true bone shape keeps
the warped head's size and position. The mandible takes the same scale and is
placed on the retargeted mandible.
"""
import os
import math
import bpy
import bmesh
from mathutils import Matrix, Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SCANS = os.path.join(ROOT, 'work', 'scans')


def _import(path):
    before = {o.name for o in bpy.data.objects}
    if path.endswith('.stl'):
        bpy.ops.wm.stl_import(filepath=path)
    else:
        bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o.name not in before]
    meshes = [o for o in new if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    # Importers parent meshes to empties: keep the world transform when detaching.
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    if len(meshes) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # Joined meshes are already gone; drop the importer's empties and leftovers.
    for o in [o for o in bpy.data.objects if o.name not in before and o != ob]:
        bpy.data.objects.remove(o)
    ob.parent = None
    return ob


def _decimate(ob, tris):
    # Scans exported in chunks split their vertices along seams; weld first so
    # the decimation keeps a closed surface.
    lo, hi = _bbox([v.co for v in ob.data.vertices])
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=(hi - lo).length * 2e-5)
    bm.to_mesh(ob.data)
    bm.free()
    n = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    if n > tris:
        m = ob.modifiers.new('d', 'DECIMATE')
        m.ratio = tris / n
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.modifier_apply(modifier=m.name)
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bm.to_mesh(me)
    bm.free()


def _bbox(vs):
    lo = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    hi = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    return lo, hi


def _split_mandible(ob):
    """Scans with the mandible attached: the mandible is the set of islands
    whose centre lies ventral to the cranium's main island."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.verts.ensure_lookup_table()
    seen, comps = set(), []
    for v in bm.verts:
        if v.index in seen:
            continue
        stack, comp = [v], []
        seen.add(v.index)
        while stack:
            a = stack.pop()
            comp.append(a.index)
            for e in a.link_edges:
                b = e.other_vert(a)
                if b.index not in seen:
                    seen.add(b.index)
                    stack.append(b)
        comps.append(comp)
    comps.sort(key=len, reverse=True)
    main = comps[0]
    cy = sum(bm.verts[i].co.y for i in main) / len(main)
    jaw = [c for c in comps[1:] if len(c) > 0.05 * len(main) and sum(bm.verts[i].co.y for i in c) / len(c) < cy - 0.15 * (
        max(bm.verts[i].co.y for i in main) - min(bm.verts[i].co.y for i in main))]
    bm.free()
    if not jaw:
        return None
    keep = set().union(*jaw)
    me = ob.data.copy()
    jo = bpy.data.objects.new('scan_jaw', me)
    bpy.context.scene.collection.objects.link(jo)
    for target, drop in ((jo, lambda i: i not in keep), (ob, lambda i: i in keep)):
        b = bmesh.new()
        b.from_mesh(target.data)
        b.verts.ensure_lookup_table()
        bmesh.ops.delete(b, geom=[v for v in b.verts if drop(v.index)], context='VERTS')
        b.to_mesh(target.data)
        b.free()
    return jo


def _cut_mandible(ob, line):
    """Scans where the mandible touches the skull (one connected mesh): split
    along a polyline z_cut(x) in the scan's side view (mm, before turning);
    faces below the line become the mandible."""
    xs, zs = zip(*line)

    def zcut(x):
        if x <= xs[0]:
            return zs[0]
        for (x0, z0), (x1, z1) in zip(line, line[1:]):
            if x <= x1:
                return z0 + (z1 - z0) * (x - x0) / (x1 - x0)
        return zs[-1]

    me = ob.data.copy()
    jo = bpy.data.objects.new('scan_jaw', me)
    bpy.context.scene.collection.objects.link(jo)
    for target, keep_low in ((jo, True), (ob, False)):
        b = bmesh.new()
        b.from_mesh(target.data)
        drop = [f for f in b.faces if (sum((v.co.z < zcut(v.co.x)) for v in f.verts) * 2 > len(f.verts)) != keep_low]
        bmesh.ops.delete(b, geom=drop, context='FACES')
        b.to_mesh(target.data)
        b.free()
    return jo


def replace_skull(parts, S):
    cfg = S.get('skull_scan')
    if not cfg:
        return False
    path = os.path.join(SCANS, cfg['skull'])
    if not os.path.exists(path):
        print(f'skull scan missing ({path}); keeping the retargeted skull', flush=True)
        return False
    by = {p['id']: p for p in parts}
    turn = Matrix.Rotation(math.radians(-90), 4, 'X') if cfg.get('up') == 'z' else Matrix.Identity(4)
    skull_ob = _import(path)
    separate = bool(cfg.get('jaw'))
    if cfg.get('jaw_cut'):
        _decimate(skull_ob, cfg.get('tris', 40000) + cfg.get('jaw_tris', 15000))
    jaw_ob = (_import(os.path.join(SCANS, cfg['jaw'])) if separate
              else _cut_mandible(skull_ob, cfg['jaw_cut']) if cfg.get('jaw_cut') else _split_mandible(skull_ob))
    skull_fit = None
    for pid, ob in (('MergedSkull', skull_ob), ('Jaw', jaw_ob)):
        if ob is None or pid not in by:
            continue
        _decimate(ob, cfg.get('tris', 40000) if pid == 'MergedSkull' else cfg.get('jaw_tris', 15000))
        ob.data.transform(Matrix.Scale(0.001, 4) @ turn)  # scans are in millimetres
        target = by[pid]['ob']
        tlo, thi = _bbox([target.matrix_world @ v.co for v in target.data.vertices])
        slo, shi = _bbox([v.co for v in ob.data.vertices])
        if pid == 'Jaw' and not separate:
            # Split from the same scan: already articulated with the skull.
            fit = skull_fit
        else:
            # Each scan is scaled by its own length (separate files may differ in units).
            scale = (thi.x - tlo.x) / (shi.x - slo.x)
            slo, shi = slo * scale, shi * scale
            if pid == 'Jaw':
                # Rostral tip on the retargeted mandible's tip; centred vertically and laterally.
                off = Vector((thi.x - shi.x, (tlo.y + thi.y - slo.y - shi.y) / 2, (tlo.z + thi.z - slo.z - shi.z) / 2))
            else:
                off = (tlo + thi - slo - shi) / 2
            fit = Matrix.Translation(off) @ Matrix.Scale(scale, 4)
        if pid == 'MergedSkull':
            skull_fit = fit
        ob.data.transform(fit)
        target.data = ob.data
        target.data.name = pid
        bpy.data.objects.remove(ob)
        print(f'{pid}: real scan {cfg["skull"]} fitted', flush=True)
    return True


def fit_brain(organs, skull):
    """Fit the (dog-derived) brain into the real skull: find the cavity the
    caudal part of the scan encloses and map the brain's box onto it."""
    import numpy as np
    import organs as O
    from common import bvh_of
    brain = [p for p in organs if p['id'].startswith('brain_')]
    if not brain:
        return
    tree = bvh_of([skull])
    vs = [skull.matrix_world @ v.co for v in skull.data.vertices]
    lo, hi = _bbox(vs)
    n = 56
    h = (hi.x - lo.x) / n
    g = O.Grid((lo.x, lo.y, lo.z), (lo.x + 0.62 * (hi.x - lo.x), hi.y, hi.z), h)
    # Cavity: points from which most of 14 rays hit bone and that are not in
    # the bone wall (scans have foramina and unreliable normals).
    dirs = [Vector(d).normalized() for d in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1),
                                            (1, 1, 1), (1, 1, -1), (1, -1, 1), (1, -1, -1), (-1, 1, 1), (-1, 1, -1),
                                            (-1, -1, 1), (-1, -1, -1))]
    reach = (hi - lo).length
    pts = g.centres().reshape(-1, 3)
    ok = np.zeros(len(pts), bool)
    for i, p in enumerate(pts):
        v = Vector(p)
        d = tree.find_nearest(v)[3]
        if d is None or d < 0.8 * h:
            continue
        hits = sum(tree.ray_cast(v, r, reach)[0] is not None for r in dirs)
        ok[i] = hits >= 13
    cc = ok.reshape(tuple(g.n))
    if cc.sum() < 50:
        print('brain fit: no cranial cavity found; brain left as warped', flush=True)
        return
    cc = O.largest_component(cc)
    clo, chi = (Vector(v) for v in O.bbox(cc, g))
    clo, chi = clo - Vector((h, h, h)) * 0.5, chi + Vector((h, h, h)) * 0.5
    bv = [p['ob'].matrix_world @ v.co for p in brain for v in p['ob'].data.vertices]
    blo, bhi = _bbox(bv)
    bc, cc_ = (blo + bhi) / 2, (clo + chi) / 2
    k = Vector([(c1 - c0) / max(b1 - b0, 1e-9) for c0, c1, b0, b1 in zip(clo, chi, blo, bhi)]) * 0.97
    for p in brain:
        for v in p['ob'].data.vertices:
            q = v.co - bc
            v.co = cc_ + Vector((q.x * k.x, q.y * k.y, q.z * k.z))
        p['ob'].data.update()
    print('brain fit: scale', tuple(round(x, 3) for x in k), 'cavity voxels', int(cc.sum()), flush=True)
