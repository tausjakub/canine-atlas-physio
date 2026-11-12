"""Edits on the dog geometry before retargeting (dog space).

The dog skull and mandible meshes keep each tooth as a separate island, and
the rib cage keeps vertebrae, ribs, costal cartilages and sternebrae as
islands. That allows species dentition and individually selectable thoracic
bones.
"""
import bmesh
import bpy
from mathutils import Vector


def islands(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.verts.ensure_lookup_table()
    seen, out = set(), []
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
        cos = [bm.verts[i].co.copy() for i in comp]
        lo = Vector((min(c.x for c in cos), min(c.y for c in cos), min(c.z for c in cos)))
        hi = Vector((max(c.x for c in cos), max(c.y for c in cos), max(c.z for c in cos)))
        out.append({'verts': comp, 'centre': sum(cos, Vector()) / len(cos), 'lo': lo, 'hi': hi, 'n': len(comp)})
    bm.free()
    return out


def _keep_only(ob, keep_sets, name):
    """New object containing only the given vertex index sets of ob."""
    keep = set().union(*keep_sets)
    me = ob.data.copy()
    nob = bpy.data.objects.new(name, me)
    ob.users_collection[0].objects.link(nob)
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.index not in keep], context='VERTS')
    bm.to_mesh(me)
    bm.free()
    return nob


def _delete(ob, index_sets):
    drop = set().union(*index_sets) if index_sets else set()
    if not drop:
        return
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in drop], context='VERTS')
    bm.to_mesh(ob.data)
    bm.free()


# Dog teeth per side sorted rostral -> caudal:
# upper I1 I2 I3 C P1 P2 P3 P4 M1 M2 (10); lower I1 I2 I3 C P1 P2 P3 P4 M1 M2 M3 (11).
KEEP_TEETH = {
    # cat: upper I3 C1 P3 M1 (drop P1, M2); lower I3 C1 P2 M1 (drop P1, P2, M2, M3)
    'cat': {'MergedSkull': [0, 1, 2, 3, 5, 6, 7, 8], 'Jaw': [0, 1, 2, 3, 6, 7, 8]},
    # rabbit: no incisor-canine row (rabbit incisors are added later); cheek teeth
    # upper P2-M3 (6) and lower P3-M3 (5) take the dog's caudal cheek-tooth slots.
    'rabbit': {'MergedSkull': [4, 5, 6, 7, 8, 9], 'Jaw': [6, 7, 8, 9, 10]},
}


def edit_teeth(parts, species):
    by = {p['id']: p for p in parts}
    for name, expected in (('MergedSkull', 10), ('Jaw', 11)):
        ob = by[name]['ob']
        isl = islands(ob)
        main = max(isl, key=lambda i: i['n'])
        # Teeth: small islands off the midline (the skull keeps midline palate pieces).
        teeth = [i for i in isl if i is not main and abs(i['centre'].z) > 0.0015 and i['n'] < 1500]
        drop = []
        for sign in (1, -1):
            side = sorted((t for t in teeth if t['centre'].z * sign > 0), key=lambda t: -t['centre'].x)
            if len(side) != expected:
                print(f'WARN {name}: {len(side)} teeth on one side, expected {expected}; dentition unchanged', flush=True)
                return
            keep = KEEP_TEETH[species][name]
            drop += [t['verts'] for k, t in enumerate(side) if k not in keep]
        _delete(ob, drop)


def split_ribcage(parts):
    """Ribcage -> T_1..T_13, Rib_n_L/R (with costal cartilage) and Sternum."""
    rc = next(p for p in parts if p['id'] == 'Ribcage')
    ob = rc['ob']
    isl = islands(ob)
    big = [i for i in isl if abs(i['centre'].z) < 0.004 and i['n'] > 1000]
    verts = sorted(big, key=lambda i: -i['centre'].x)
    rest = [i for i in isl if i not in big]
    ribs = [i for i in rest if abs(i['centre'].z) > 0.015 and (i['hi'].y - i['lo'].y) > 0.08]
    midline = [i for i in rest if i not in ribs and abs(i['centre'].z) < 0.01]
    cart = [i for i in rest if i not in ribs and i not in midline]
    new = []
    for k, v in enumerate(verts):
        new.append((f'T_{k + 1}', [v['verts']]))
    for sign, tag in ((-1, 'L'), (1, 'R')):
        side = sorted((r for r in ribs if r['centre'].z * sign > 0), key=lambda r: -r['centre'].x)
        groups = {k: [r['verts']] for k, r in enumerate(side)}
        for c in (c for c in cart if c['centre'].z * sign > 0):
            top = Vector((c['centre'].x, c['hi'].y, c['centre'].z))
            k = min(range(len(side)), key=lambda k: (Vector((side[k]['centre'].x, side[k]['lo'].y, side[k]['centre'].z)) - top).length)
            groups[k].append(c['verts'])
        for k in range(len(side)):
            new.append((f'Rib_{k + 1}_{tag}', groups[k]))
    if midline:
        new.append(('Sternum', [m['verts'] for m in midline]))
    for name, sets in new:
        nob = _keep_only(ob, sets, name)
        parts.append({'id': name, 'system': 'bone', 'ob': nob, 'profile': None})
    parts.remove(rc)
    bpy.data.objects.remove(ob)
    print(f'ribcage: {len(verts)} vertebrae, {len(ribs)} ribs, {len(cart)} cartilages, {len(midline)} sternal pieces', flush=True)
    return parts
