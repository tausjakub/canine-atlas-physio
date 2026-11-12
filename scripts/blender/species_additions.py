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
        'hum.lat_dist': lerp_axis(hum, 0.72) + lat * 0.005 + Vector((0.003, 0, 0)),
        'hum.med_epi': min(hum, key=lambda v: v.y * 0.2 + s * v.z) + Vector((0, 0.002, 0)),
        'rad.dist_med': min(rad, key=lambda v: v.y - s * v.z * 0.5),
        'rad.mid_cr': lerp_axis(rad, 0.45) + Vector((0.006, 0, 0)),
        'uln.mid_cd': lerp_axis(rad, 0.5) + Vector((-0.007, 0, 0)) - lat * 0.002,
        'carp.palm': c(acc) + Vector((-0.002, -0.004, 0)),
        'pat.lat': c(pat) + lat * 0.004,
        'fem.lat_mid': lerp_axis(fem, 0.5) + lat * 0.012 + Vector((-0.008, 0, 0)),
        'tail.base': c(_verts(bones['Ca_3'])) + lat * 0.004,
        'tail.base2': c(_verts(bones['Ca_5'])) + lat * 0.003,
    }
    return L


ADD = {
    'cat': [
        ('soleus', ['fib.head'], ['calc.tuber'], ['tib.cd_mid'], 5, 3),
        ('brachioradialis', ['hum.lat_dist'], ['rad.dist_med'], ['rad.mid_cr'], 3.5, 1.8),
        ('palmaris_longus', ['hum.med_epi'], ['carp.palm'], ['uln.mid_cd'], 5, 2.5),
        ('caudofemoralis', ['tail.base', 'tail.base2'], ['pat.lat'], ['fem.lat_mid'], 7, 2),
    ],
    'rabbit': [
        ('soleus', ['fib.head'], ['calc.tuber'], ['tib.cd_mid'], 5, 3),
    ],
}


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
