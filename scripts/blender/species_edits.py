"""Species edits after retargeting: canonical ids, bone edits and muscle
labels for the cat and rabbit."""
import re
import bmesh
import bpy
from mathutils import Vector
import muscles_table
import species_map

ROMAN = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5}


def canonical_bone(pid):
    """Dog bone id -> species catalog id (side suffix last)."""
    rules = [
        (r'^Carpal_ulnar_(L|R)$', lambda s: f'Carpal_ulnare_{s}'),
        (r'^Carpal_accessory_(L|R)$', lambda s: f'Carpal_accessorium_{s}'),
        (r'^Carpal_(I|II|III|IV)_(L|R)$', None),
        (r'^Carpal_(L|R)$', lambda s: f'Carpal_intermedioradiale_{s}'),
        (r'^Carpal_Sesamoid_(L|R)$', lambda s: f'Sesamoid_carpal_{s}'),
    ]
    for pat, f in rules:
        mm = re.match(pat, pid)
        if mm:
            if f is None:
                return f'Carpal_{ROMAN[mm.group(1)]}_{mm.group(2)}'
            return f(mm.group(1))
    mm = re.match(r'^Os_metacarpale_(I|II|III|IV|V)_(L|R)(\.\d+)?$', pid)
    if mm:
        return f'Os_metacarpale_{ROMAN[mm.group(1)]}_{mm.group(2)}'
    mm = re.match(r'^(Phalanxpmxinutlis|Phalanx_media|Phalanx_distalis)_digiti_(I|II|III|IV|V)_(L|R)_?$', pid)
    if mm:
        d = ROMAN[mm.group(2)]
        level = {'Phalanxpmxinutlis': 1, 'Phalanx_media': 2, 'Phalanx_distalis': 3}[mm.group(1)]
        if d == 1:
            level = min(level, 2)
        return f'Phalanx_{d}_{level}_{mm.group(3)}'
    mm = re.match(r'^Metatarsi_(L|R)_(\d)$', pid)
    if mm:
        return f'Metatarsi_{int(mm.group(2)) + 1}_{mm.group(1)}'
    mm = re.match(r'^Phalanges_B(?:_(2|3))?_(L|R)_(\d)$', pid)
    if mm:
        return f'Phalanges_B_{int(mm.group(3)) + 1}_{int(mm.group(1) or 1)}_{mm.group(2)}'
    mm = re.match(r'^Tarsus_(L|R)_(I|II|III|IV)$', pid)
    if mm:
        return f'Tarsus_{ROMAN[mm.group(2)]}_{mm.group(1)}'
    mm = re.match(r'^Tarsus_central_(L|R)$', pid)
    if mm:
        return f'Tarsus_centrale_{mm.group(1)}'
    mm = re.match(r'^Femoris_fabellae_(L|R)_(\d)$', pid)
    if mm:
        return f'Femoris_fabella_{mm.group(2)}_{mm.group(1)}'
    return pid


def _join(target, others):
    """Merge mesh objects into target (fragments of one bone)."""
    bm = bmesh.new()
    bm.from_mesh(target.data)
    for o in others:
        bm.from_mesh(o.data)
        bpy.data.objects.remove(o)
    bm.to_mesh(target.data)
    bm.free()


def _bisect(ob, origin, normal, name):
    """Split ob by a plane; returns the new object on the +normal side."""
    copy = ob.copy()
    copy.data = ob.data.copy()
    copy.name = name
    ob.users_collection[0].objects.link(copy)
    for o, keep_pos in ((ob, False), (copy, True)):
        bm = bmesh.new()
        bm.from_mesh(o.data)
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=origin, plane_no=normal,
                               clear_outer=keep_pos is False, clear_inner=keep_pos is True)
        bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary])
        bm.to_mesh(o.data)
        bm.free()
    return copy


def edit_bones(parts, S):
    species = S['species']
    out, merged = [], {}
    for p in parts:
        if p['system'] != 'bone':
            out.append(p)
            continue
        cid = canonical_bone(p['id'])
        if cid in merged:
            _join(merged[cid]['ob'], [p['ob']])
            continue
        p['id'] = cid
        p['ob'].name = cid
        merged[cid] = p
        out.append(p)
    if species == 'rabbit':
        keep = []
        for p in out:
            m = re.match(r'^Ca_(\d+)$', p['id'])
            if m and int(m.group(1)) > S['vertebrae'][4]:
                bpy.data.objects.remove(p['ob'])
                continue
            m = re.match(r'^Tarsus_1_(L|R)$', p['id'])
            if m:
                # The rabbit has no separate first tarsal bone: fuse it with T2.
                t2 = next(q for q in out if q['id'] == f'Tarsus_2_{m.group(1)}')
                _join(t2['ob'], [p['ob']])
                continue
            keep.append(p)
        out = keep
        for side in ('L', 'R'):
            # Rabbit radial and intermediate carpals are separate bones.
            p = next(q for q in out if q['id'] == f'Carpal_intermedioradiale_{side}')
            c = sum((v.co for v in p['ob'].data.vertices), Vector()) / len(p['ob'].data.vertices)
            normal = Vector((0, 0, 1 if side == 'R' else -1))
            lateral = _bisect(p['ob'], c, normal, f'Carpal_intermedium_{side}')
            p['id'] = p['ob'].name = f'Carpal_radiale_{side}'
            out.append({'id': lateral.name, 'system': 'bone', 'ob': lateral, 'profile': None, 'region': 'Forelimb'})
    return out


def label_muscles(parts, S):
    """Rename dog muscles to species ids and attach species study texts."""
    species = S['species']
    entries = {m['id']: m for m in muscles_table.table(S, muscles_table.ROWS + species_map.MAP_ROWS, include_mapped=True)}
    used, out, missing = {}, [], set()
    for p in parts:
        if p['system'] != 'muscle':
            out.append(p)
            continue
        key = species_map.SPECIES_OVERRIDES[species].get(p.get('profile')) or species_map.DOG_TO_KEY.get(p.get('profile'))
        if not key or key not in entries:
            missing.add(p.get('profile') or p['id'])
            bpy.data.objects.remove(p['ob'])
            continue
        sd = 'L' if re.search(r'_L(?:[_\d.(]|$)', p['id']) else 'R' if re.search(r'_R(?:[_\d.(]|$)', p['id']) else ''
        base = f'm_{key}' + (f'_{sd}' if sd else '')
        n = used.get(base, 0) + 1
        used[base] = n
        pid = base if n == 1 else (f'm_{key}_{n}' + (f'_{sd}' if sd else ''))
        e = entries[key]
        p['id'] = pid
        p['ob'].name = pid
        p['region'] = e['region'] if e['region'] != 'Neck & trunk' or p.get('region') != 'Head' else p['region']
        p['meta'] = {'label': e['label'], 'action': e['action'], 'study': e['study'],
                     'layer': e['layer'], 'depth': e['study']['depth'], 'key': key}
        out.append(p)
    if missing:
        print('WARN unmapped dog muscles dropped:', ', '.join(sorted(missing)), flush=True)
    return out


# Dog muscles that are two (or more) named muscles in the species.
# (dog-derived key, method, parameter, key of the + side, key of the - side)
SPLITS = {
    'cat': [
        ('brachiocephalicus', 'axis', 0.45, 'clavotrapezius', 'clavobrachialis'),
        ('trapezius', 'vertebra', 'T_4', 'acromiotrapezius', 'spinotrapezius'),
        ('pectoralis_minor', 'xfrac', 0.3, 'pectoralis_minor', 'xiphihumeralis'),
    ],
    'rabbit': [
        ('brachiocephalicus', 'axis', 0.45, 'clavotrapezius', 'clavobrachialis'),
        ('trapezius', 'vertebra', 'T_4', 'acromiotrapezius', 'spinotrapezius'),
    ],
}
# The cranial of the two superficial pectoral pieces is the feline pectoantebrachialis.
RENAME_CRANIAL = {'cat': [('pectoralis_major', 'pectoantebrachialis')], 'rabbit': []}


def split_muscles(parts, S):
    import numpy as np
    species = S['species']
    entries = {m['id']: m for m in muscles_table.table(S, muscles_table.ROWS + species_map.MAP_ROWS, include_mapped=True)}

    def meta(key):
        e = entries[key]
        return {'label': e['label'], 'action': e['action'], 'study': e['study'],
                'layer': e['layer'], 'depth': e['study']['depth'], 'key': key}

    bones = {p['id']: p['ob'] for p in parts if p['system'] == 'bone'}
    for key, method, param, plus, minus in SPLITS[species]:
        for p in [q for q in parts if q.get('meta', {}).get('key') == key]:
            ob = p['ob']
            co = np.array([v.co[:] for v in ob.data.vertices])
            if method == 'axis':
                c = co.mean(0)
                w, vec = np.linalg.eigh(np.cov((co - c).T))
                d = Vector(vec[:, -1])
                if d.x < 0:
                    d = -d  # towards the head
                proj = (co - c) @ np.array(d[:])
                origin = Vector(c) + d * (proj.max() - param * (proj.max() - proj.min()))
                normal = d
            elif method == 'vertebra':
                vs = [v.co for v in bones[param].data.vertices]
                origin = sum(vs, Vector()) / len(vs)
                normal = Vector((1, 0, 0))
            else:
                x0, x1 = co[:, 0].min(), co[:, 0].max()
                origin = Vector((x0 + param * (x1 - x0), 0, 0))
                normal = Vector((1, 0, 0))
            sd = p['id'][-2:] if p['id'][-2:] in ('_L', '_R') else ''
            new = _bisect(ob, origin, normal, f'm_{plus}{sd}')
            for o, k in ((new, plus), (ob, minus)):
                o.name = f'm_{k}{sd}'
            p['id'], p['meta'] = ob.name, meta(minus)
            parts.append({'id': new.name, 'system': 'muscle', 'ob': new, 'profile': None,
                          'region': p['region'], 'meta': meta(plus)})
    for key, new_key in RENAME_CRANIAL[species]:
        for sd in ('_L', '_R'):
            pieces = [q for q in parts if q.get('meta', {}).get('key') == key and q['id'].endswith(sd)]
            if len(pieces) < 2:
                continue
            front = max(pieces, key=lambda q: sum((v.co.x for v in q['ob'].data.vertices)) / len(q['ob'].data.vertices))
            front['meta'] = meta(new_key)
            front['id'] = front['ob'].name = f'm_{new_key}{sd}'
            rest = [q for q in pieces if q is not front]
            for i, q in enumerate(rest):
                q['id'] = q['ob'].name = f'm_{key}{sd}' if i == 0 else f'm_{key}_{i + 1}{sd}'
    return parts
