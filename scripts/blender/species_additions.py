"""Muscles the species has but the dog model lacks, generated between
landmarks measured on the retargeted bones, then given the same polish."""
import muscles_table
import species_map
from mathutils import Vector
from common import Builder, bvh_of
from muscles import build_belly


def _verts(ob):
    return [ob.matrix_world @ v.co for v in ob.data.vertices]


def _lm(bones, side):
    """Named landmarks from extreme points of the retargeted bones (one side)."""
    def ob(name):
        return bones[f'{name}_{side}']
    s = -1 if side == 'L' else 1
    fib, tib, cal = _verts(ob('Fibula')), _verts(ob('Tibia')), _verts(ob('Calcaneal_tuber'))
    hum, rad, fem = _verts(ob('humerus')), _verts(ob('Radius')), _verts(ob('Femoris'))
    pat = _verts(ob('Patella'))
    acc = _verts(bones[f'Carpal_accessorium_{side}'])

    def c(vs):
        return sum(vs, Vector()) / len(vs)

    def lerp_axis(vs, t):
        top, bot = max(vs, key=lambda v: v.y), min(vs, key=lambda v: v.y)
        return top.lerp(bot, t)

    lat = Vector((0, 0, s))
    L = {
        'fib.head': max(fib, key=lambda v: v.y) + lat * 0.002,
        'calc.tuber': max(cal, key=lambda v: v.y),
        'tib.cd_mid': lerp_axis(tib, 0.45) + Vector((-0.006, 0, 0)) + lat * 0.004,
        'hum.lat_dist': lerp_axis(hum, 0.72) + lat * 0.002,
        'hum.med_epi': min(hum, key=lambda v: v.y * 0.2 + s * v.z) + Vector((0, 0.002, 0)),
        'rad.dist_med': min(rad, key=lambda v: v.y - s * v.z * 0.5),
        'rad.mid_cr': lerp_axis(rad, 0.45) + Vector((0.0025, 0, 0)),
        'uln.mid_cd': lerp_axis(rad, 0.5) + Vector((-0.004, 0, 0)) - lat * 0.002,
        'carp.palm': c(acc) + Vector((-0.002, -0.004, 0)),
        'pat.lat': c(pat) + lat * 0.004,
        'fem.lat_mid': lerp_axis(fem, 0.5) + lat * 0.012 + Vector((-0.008, 0, 0)),
        'tail.base': c(_verts(bones['Ca_2'])) + lat * 0.004,
        'tail.base2': c(_verts(bones['Ca_3'])) + lat * 0.003,
    }
    # Spine and girdle landmarks for the deep epaxial muscles and piriformis.

    def spinous_base(name, out=0.004):
        vs = _verts(bones[name])
        cc = c(vs)
        top = max(v.y for v in vs)
        return Vector((cc.x, cc.y + 0.55 * (top - cc.y), 0)) + lat * out

    for n in range(1, 14):
        if f'T_{n}' in bones:
            L[f'T{n}.sp'] = spinous_base(f'T_{n}')
    for n in range(1, 8):
        L[f'L{n}.sp'] = spinous_base(f'L_{n}', 0.005)
    for n in (2, 4, 6):
        L[f'C{n}.d'] = spinous_base(f'C_{n}', 0.006)
    sac = _verts(bones['Sacrum'])
    L['sac.dl'] = c(sac) + Vector((0, 0.004, 0)) + lat * 0.006
    L['sac.lat'] = c(sac) + lat * 0.009
    pel = [v for v in _verts(bones['Pelvis']) if v.z * s > 0]
    L['pel.tc'] = max(pel, key=lambda v: v.x + 0.5 * v.y) + lat * 0.002
    L['fem.gt'] = max(fem, key=lambda v: v.y) + lat * 0.003
    sk = _verts(bones['MergedSkull'])
    occ = min(sk, key=lambda v: v.x - 0.5 * v.y)
    L['occ'] = Vector((occ.x + 0.003, occ.y, 0)) + lat * 0.007
    for n in (2, 4, 6, 9, 12):
        rv = [v for v in _verts(bones[f'Rib_{n}_{side}'])]
        topy = max(v.y for v in rv)
        L[f'rib{n}.angle'] = max((v for v in rv if v.y > topy - 0.012), key=lambda v: s * v.z) + lat * 0.003
    return L


ADD = {
    'cat': [
        ('soleus', ['fib.head'], ['calc.tuber'], ['tib.cd_mid'], 5, 3),
        ('brachioradialis', ['hum.lat_dist'], ['rad.dist_med'], ['rad.mid_cr'], 3.5, 1.8),
        ('palmaris_longus', ['hum.med_epi'], ['carp.palm'], ['uln.mid_cd'], 5, 2.5),
        ('caudofemoralis', ['tail.base', 'tail.base2'], ['pat.lat'], ['fem.lat_mid'], 7, 2),
    ] + [
        # Deep epaxial muscles and piriformis are absent from the dog model.
        ('multifidus', ['sac.dl'], ['T6.sp'], ['L6.sp', 'L4.sp', 'L2.sp', 'T12.sp', 'T9.sp'], 5, 4),
        ('iliocostalis', ['pel.tc'], ['rib2.angle'], ['rib12.angle', 'rib9.angle', 'rib6.angle', 'rib4.angle'], 6, 3),
        ('semispinalis_capitis', ['T2.sp'], ['occ'], ['C6.d', 'C4.d', 'C2.d'], 7, 4),
        ('piriformis', ['sac.lat'], ['fem.gt'], [], 7, 3),
    ],
    'rabbit': [
        ('soleus', ['fib.head'], ['calc.tuber'], ['tib.cd_mid'], 5, 3),
        ('multifidus', ['sac.dl'], ['T6.sp'], ['L6.sp', 'L4.sp', 'L2.sp', 'T12.sp', 'T9.sp'], 5, 4),
        ('iliocostalis', ['pel.tc'], ['rib2.angle'], ['rib12.angle', 'rib9.angle', 'rib6.angle', 'rib4.angle'], 6, 3),
        ('semispinalis_capitis', ['T2.sp'], ['occ'], ['C6.d', 'C4.d', 'C2.d'], 7, 4),
        ('piriformis', ['sac.lat'], ['fem.gt'], [], 7, 3),
    ],
}


def add_incisors(parts, S, col):
    """Rabbit: two pairs of upper incisors (large and peg teeth) and one lower
    pair, curving from the premaxilla and mandible tips (gnawing incisors)."""
    if S['species'] != 'rabbit':
        return
    by = {p['id']: p['ob'] for p in parts}
    h = S['head']
    ax = (Vector(h['rostrum']) - Vector(h['occiput'])).normalized()
    up = (Vector((0, 1, 0)) - ax * ax.y).normalized()
    sk, jw = by['MergedSkull'], by['Jaw']
    tip = max(_verts(sk), key=lambda v: v.dot(ax) - 0.3 * v.dot(up))
    ltip = max(_verts(jw), key=lambda v: v.dot(ax) + 0.3 * v.dot(up))
    tip.z = ltip.z = 0.0
    print('incisors: tip', tuple(round(c, 4) for c in tip), 'ltip', tuple(round(c, 4) for c in ltip), 'ax', tuple(round(c, 3) for c in ax), 'up', tuple(round(c, 3) for c in up), flush=True)
    import bmesh
    import bpy
    # (object, base point, [(z, control points as (along ax, along up) metres, half-width, half-depth)])
    upper = [(0.0024, [(-0.006, 0.003), (0.0015, -0.003), (-0.001, -0.012)], 0.0022, 0.0016),
             (0.0046, [(-0.007, 0.002), (-0.002, -0.002), (-0.003, -0.005)], 0.0007, 0.0006)]
    lower = [(0.0020, [(-0.011, -0.003), (0.0, 0.001), (-0.0018, 0.008)], 0.0018, 0.0014)]
    for ob, base, teeth in ((sk, tip, upper), (jw, ltip, lower)):
        b = Builder()
        for z, pts, rx, ry in teeth:
            for s in (-1, 1):
                ctrl = [base + ax * a + up * u + Vector((0, 0, s * z)) for a, u in pts]
                b.tube(ctrl, lambda t, rx=rx, ry=ry: (rx * (1 - 0.2 * t), ry * (1 - 0.3 * t)), seg=12, n=18, hint=Vector((0, 0, 1)))
        tmp = b.obj('incisors', col)
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        bm.from_mesh(tmp.data)
        bm.to_mesh(ob.data)
        bm.free()
        bpy.data.objects.remove(tmp)


def add_muscles(parts, S, col):
    species = S['species']
    entries = {m['id']: m for m in muscles_table.table(S, muscles_table.ROWS + species_map.MAP_ROWS, include_mapped=True)}
    bones = {p['id']: p['ob'] for p in parts if p['system'] == 'bone'}
    tree = bvh_of([p['ob'] for p in parts])
    k = S.get('addition_scale', 1.0) * 0.001
    for side in ('L', 'R'):
        L = _lm(bones, side)
        s = -1 if side == 'L' else 1
        for key, o, i, via, w, h in ADD[species]:
            e = entries[key]
            m = dict(e, w=w, h=h, belly=(0.06, 0.8))
            b = build_belly(m, [L[x] for x in o], [L[x] for x in i], [L[x] for x in via], tree, s, k)
            ob = b.obj(f'm_{key}_{side}', col)
            parts.append({'id': ob.name, 'system': 'muscle', 'ob': ob, 'profile': None, 'region': e['region'],
                          'meta': {'label': e['label'], 'action': e['action'], 'study': e['study'],
                                   'layer': e['layer'], 'depth': e['study']['depth'], 'key': key}})
    return parts
