"""Clinical-anatomy layer for the dog (run inside Blender).

  blender --background --factory-startup --python scripts/blender/clinical.py [-- --render]

Palpable bony landmarks, rib numbers, heart auscultation areas, superficial
lymph nodes, major superficial vessels, limb nerves and spinal cord segment
regions. Everything is authored here as schematic markers and tubes placed
from the dog's own bones, muscles and skin; nothing is imported.

Writes work/clinical/geometry.bin + parts.json (packed by
scripts/build-organ-models.mjs; scripts/blender/build.py retargets it to the
cat and rabbit).
"""
import os
import sys
import json
import math
import struct
import importlib
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))

import bpy  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Vector  # noqa: E402
import common  # noqa: E402
import dog_import  # noqa: E402
import dog_edits  # noqa: E402
import organs as O  # noqa: E402
for m in (common, dog_import, dog_edits, O):
    importlib.reload(m)
from common import clear_scene, bvh_of, catmull, tri_arrays  # noqa: E402

OUT = os.path.join(ROOT, 'work', 'clinical')
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
LEFT, RIGHT = -1, 1  # sign of z: the dog's left side is -z


def verts(ob):
    return np.array([tuple(ob.matrix_world @ v.co) for v in ob.data.vertices])


def pick(vs, near_y, key, band=0.004):
    """Vertex in a horizontal band (y +- band) maximising key(vertex)."""
    sel = vs[np.abs(vs[:, 1] - near_y) < band]
    if len(sel) == 0:
        sel = vs[np.argsort(np.abs(vs[:, 1] - near_y))[:20]]
    return Vector(sel[np.argmax([key(v) for v in sel])])


def lo(vs):
    return vs.min(0)


def hi(vs):
    return vs.max(0)


def mirror(p, sign):
    """Points are authored on the left (-z); the right side mirrors them."""
    return Vector((p.x, p.y, p.z if sign == LEFT else -p.z))


class Builder:
    def __init__(self, col, skin=None):
        # With skin set, every sample of every tube is kept beneath it.
        self.col, self.parts, self.skin, self.depth = col, [], skin, 0.003

    def _mesh(self, name, bm, system, region, labels=None, rigid=None):
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        bm.free()
        ob = bpy.data.objects.new(name, me)
        self.col.objects.link(ob)
        if labels:
            ob['labels'] = json.dumps(labels)
        self.parts.append({'id': name, 'system': system, 'ob': ob, 'region': region, 'rigid': rigid})
        return ob

    def spheres(self, name, centres, radii, system, region, texts=None, rigid=None):
        """One part made of ellipsoids; texts label each one (rib numbers)."""
        bm = bmesh.new()
        labels = []
        for i, (c, r) in enumerate(zip(centres, radii)):
            if self.skin:
                c = under_skin(self.skin, c, depth=max(r) + 0.0008)
            start = len(bm.verts)
            res = bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=9, radius=1.0)
            for v in res['verts']:
                v.co = Vector((c.x + v.co.x * r[0], c.y + v.co.y * r[1], c.z + v.co.z * r[2]))
            if texts:
                labels.append([start, len(bm.verts) - start, texts[i]])
        return self._mesh(name, bm, system, region, labels, rigid)

    def _tube_into(self, bm, pts, radius, n=None, seg=8):
        path = catmull([Vector(p) for p in pts], n or max(24, len(pts) * 12))
        if self.skin:
            path = [under_skin(self.skin, q, depth=self.depth) for q in path]
        rings = []
        for i, p in enumerate(path):
            t = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
            a = t.cross(Vector((0, 1, 0)) if abs(t.y) < 0.9 else Vector((1, 0, 0))).normalized()
            b = t.cross(a).normalized()
            r = radius(i / (len(path) - 1)) if callable(radius) else radius
            rings.append([bm.verts.new(p + (a * math.cos(k * 2 * math.pi / seg) + b * math.sin(k * 2 * math.pi / seg)) * r)
                          for k in range(seg)])
        for r0, r1 in zip(rings, rings[1:]):
            for k in range(seg):
                bm.faces.new((r0[k], r0[(k + 1) % seg], r1[(k + 1) % seg], r1[k]))
        bm.faces.new(rings[0][::-1])
        bm.faces.new(rings[-1])

    def group(self, name, system, region, tubes=(), discs=(), marks=(), rigid=None):
        """One part from several tubes (pts, r), discs (centre, axis, radius,
        thickness) and labelled spheres (centre, r, text)."""
        bm = bmesh.new()
        for pts, r in tubes:
            self._tube_into(bm, pts, r)
        for c, axis, r, th in discs:
            a = Vector(axis).normalized()
            self._tube_into(bm, [c - a * th / 2, c + a * th / 2], r, n=2, seg=20)
        labels = []
        for c, r, text in marks:
            if self.skin:
                c = under_skin(self.skin, c, depth=r + 0.0008)
            start = len(bm.verts)
            res = bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=7, radius=r)
            for v in res['verts']:
                v.co += c
            if text:
                labels.append([start, len(bm.verts) - start, text])
        return self._mesh(name, bm, system, region, labels, rigid)

    def tube(self, name, pts, radius, system, region, n=None):
        path = catmull([Vector(p) for p in pts], n or max(24, len(pts) * 12))
        if self.skin:
            path = [under_skin(self.skin, q, depth=self.depth) for q in path]
        bm = bmesh.new()
        rings, seg = [], 8
        for i, p in enumerate(path):
            t = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
            a = t.cross(Vector((0, 1, 0)) if abs(t.y) < 0.9 else Vector((1, 0, 0))).normalized()
            b = t.cross(a).normalized()
            r = radius(i / (len(path) - 1)) if callable(radius) else radius
            rings.append([bm.verts.new(p + (a * math.cos(k * 2 * math.pi / seg) + b * math.sin(k * 2 * math.pi / seg)) * r)
                          for k in range(seg)])
        for r0, r1 in zip(rings, rings[1:]):
            for k in range(seg):
                bm.faces.new((r0[k], r0[(k + 1) % seg], r1[(k + 1) % seg], r1[k]))
        bm.faces.new(rings[0][::-1])
        bm.faces.new(rings[-1])
        return self._mesh(name, bm, system, region)


def to_skin(skin, p, sign, depth=0.002):
    """Project a point outward (laterally) onto the skin, just beneath it."""
    d = Vector((0, 0, sign))
    hit = skin.ray_cast(p, d, 0.2)[0]
    return hit - d * depth if hit else p


def under_skin(skin, p, depth=0.003):
    """A point at least depth beneath the skin: anything above or just under the
    surface moves inward along the skin normal."""
    q = Vector(p)
    loc, nor, _, _ = skin.find_nearest(q)
    if loc is None or (q - loc).dot(nor) < -depth:
        return q
    return loc - nor * depth


def inside_skin(skin, p, sign):
    return under_skin(skin, p)


def build(col):
    clear_scene()
    dog = dog_import.load_dog(ROOT, col, systems=('bone', 'muscle', 'surface'))
    by = {p['id']: p['ob'] for p in dog}
    canal = O.canal_line(by)
    dog = dog_edits.split_ribcage(dog)
    by = {p['id']: p['ob'] for p in dog}
    skin = bvh_of([by['skin']])
    B = Builder(col, skin)
    V = {k: verts(by[k]) for k in by if not k.startswith('m_') and k != 'skin'}

    for sign, tag in ((LEFT, 'L'), (RIGHT, 'R')):
        S = lambda n: V[f'{n}_{tag}']  # noqa: E731
        out = lambda v: abs(v[2])  # noqa: E731  lateral
        inn = lambda v: -abs(v[2])  # noqa: E731  medial
        scap, hum, rad, uln = S('Scapula'), S('humerus'), S('Radius'), S('Ulna')
        fem, tib, fib = S('Femoris'), S('Tibia'), S('Fibula')
        pel = V['Pelvis'][V['Pelvis'][:, 2] * sign > 0]
        lat = Vector((0, 0, sign))

        def mark(name, p, bone, region, push=0.003):
            c = verts(by[bone]).mean(0)
            d = (p - Vector(c)).normalized()
            B.spheres(f'lm_{name}_{tag}', [p + d * push], [(0.0045,) * 3], 'landmark', region, rigid=bone)

        # ---- palpable bony landmarks
        mark('scapular_spine', Vector(scap[np.argmax(np.abs(scap[:, 2]))]), f'Scapula_{tag}', 'Forelimb')
        low = scap[scap[:, 1] < lo(scap)[1] + 0.03]
        mark('acromion', Vector(low[np.argmax(np.abs(low[:, 2]))]), f'Scapula_{tag}', 'Forelimb')
        top = hum[hum[:, 1] > hi(hum)[1] - 0.02]
        mark('greater_tubercle', Vector(top[np.argmax(top[:, 0] + 0.5 * np.abs(top[:, 2]))]), f'humerus_{tag}', 'Forelimb')
        bot = hum[hum[:, 1] < lo(hum)[1] + 0.03]
        mark('lateral_epicondyle', Vector(bot[np.argmax(np.abs(bot[:, 2]))]), f'humerus_{tag}', 'Forelimb')
        mark('olecranon', Vector(uln[np.argmax(uln[:, 1])]), f'Ulna_{tag}', 'Forelimb')
        acc = verts(by[f'Carpal_accessory_{tag}'])
        mark('accessory_carpal', Vector(acc[np.argmin(acc[:, 0])]), f'Carpal_accessory_{tag}', 'Forelimb')
        mark('iliac_crest', Vector(pel[np.argmax(pel[:, 1])]), 'Pelvis', 'Hindlimb')
        cr = pel[pel[:, 0] > hi(pel)[0] - 0.012]
        mark('tuber_coxae', Vector(cr[np.argmax(np.abs(cr[:, 2]))]), 'Pelvis', 'Hindlimb')
        ca = pel[pel[:, 0] < lo(pel)[0] + 0.012]
        mark('tuber_ischiadicum', Vector(ca[np.argmax(np.abs(ca[:, 2]))]), 'Pelvis', 'Hindlimb')
        ft = fem[fem[:, 1] > hi(fem)[1] - 0.03]
        troch = Vector(ft[np.argmax(np.abs(ft[:, 2]))])
        mark('greater_trochanter', troch, f'Femoris_{tag}', 'Hindlimb')
        mark('patella', Vector(verts(by[f'Patella_{tag}']).mean(0)) + Vector((0.004, 0, 0)), f'Patella_{tag}', 'Hindlimb', 0.002)
        tt = tib[tib[:, 1] > hi(tib)[1] - 0.03]
        mark('tibial_tuberosity', Vector(tt[np.argmax(tt[:, 0])]), f'Tibia_{tag}', 'Hindlimb')
        fb = fib[fib[:, 1] < lo(fib)[1] + 0.01]
        mark('lateral_malleolus', Vector(fb[np.argmax(np.abs(fb[:, 2]))]), f'Fibula_{tag}', 'Hindlimb')
        calc = verts(by[f'Calcaneal_tuber_{tag}'])
        mark('calcaneal_tuber', Vector(calc[np.argmax(calc[:, 1])]), f'Calcaneal_tuber_{tag}', 'Hindlimb')
        c1 = V['C_1'][V['C_1'][:, 2] * sign > 0]
        mark('atlas_wing', Vector(c1[np.argmax(np.abs(c1[:, 2]))]), 'C_1', 'Neck & trunk')

        # ---- rib numbers: a marker on the most lateral point of each rib
        ribs = sorted((k for k in V if k.startswith('Rib_') and k.endswith('_' + tag)), key=lambda k: int(k.split('_')[1]))
        pts = []
        for k in ribs:
            rv = V[k]
            pts.append(Vector(rv[np.argmax(np.abs(rv[:, 2]))]) + lat * 0.004)
        B.spheres(f'lm_rib_numbers_{tag}', pts, [(0.0035,) * 3] * len(pts), 'landmark', 'Neck & trunk',
                  texts=[k.split('_')[1] for k in ribs])

        def ics(k, y):
            """Intercostal space k (between ribs k and k+1) at height y, on the skin."""
            a = pick(V[f'Rib_{k}_{tag}'], y, out, 0.006)
            b = pick(V[f'Rib_{k + 1}_{tag}'], y, out, 0.006)
            return to_skin(skin, (a + b) / 2, sign)

        # ---- heart auscultation areas (valve puncta maxima), schematic
        if sign == LEFT:
            for name, k, y in (('pulmonic', 3, 0.36), ('aortic', 4, 0.40), ('mitral', 5, 0.345)):
                B.spheres(f'ausc_{name}', [ics(k, y)], [(0.007, 0.007, 0.0025)], 'landmark', 'Neck & trunk')
        else:
            B.spheres('ausc_tricuspid', [ics(4, 0.35)], [(0.007, 0.007, 0.0025)], 'landmark', 'Neck & trunk')

        # ---- superficial lymph nodes (inside the skin)
        jaw = V['Jaw'][V['Jaw'][:, 2] * sign > 0]
        ang = jaw[jaw[:, 0] < lo(jaw)[0] + 0.025]
        angle = Vector(ang[np.argmin(ang[:, 1])])
        sl = scap[scap[:, 1] < lo(scap)[1] + 0.4 * (hi(scap)[1] - lo(scap)[1])]
        pre = Vector(sl[np.argmax(sl[:, 0])])
        hp = Vector(top.mean(0))
        cond = fem[fem[:, 1] < lo(fem)[1] + 0.02]
        pop = Vector(cond[np.argmin(cond[:, 0])])
        cran = V['Pelvis'][V['Pelvis'][:, 0] > (lo(V['Pelvis'])[0] + hi(V['Pelvis'])[0]) / 2]
        pub = Vector(cran[cran[:, 1] < lo(cran)[1] + 0.008].mean(0))
        nodes = {
            'mandibular': (angle + Vector((0.012, -0.006, 0)) + lat * 0.004, (0.007, 0.005, 0.004), 'Head'),
            'superficial_cervical': (pre + Vector((0.02, 0.0, 0)) + lat * 0.006, (0.009, 0.005, 0.004), 'Neck & trunk'),
            'axillary': (Vector((hp.x - 0.035, hp.y - 0.035, hp.z * 0.7)), (0.006, 0.005, 0.004), 'Forelimb'),
            'superficial_inguinal': (Vector((pub.x + 0.03, pub.y - 0.05, sign * 0.03)), (0.008, 0.004, 0.005), 'Hindlimb'),
            'popliteal': (pop + Vector((-0.018, 0.012, 0)), (0.006, 0.004, 0.004), 'Hindlimb'),
        }
        for name, (c, r, region) in nodes.items():
            B.spheres(f'ln_{name}_{tag}', [inside_skin(skin, c, sign)], [r], 'lymph', region)

        # ---- superficial vessels
        jug = [mirror(Vector(p), sign) for p in ((0.272, 0.6, -0.036), (0.245, 0.585, -0.032), (0.21, 0.53, -0.03),
                                                  (0.175, 0.475, -0.028), (0.15, 0.44, -0.022))]
        B.tube(f'v_external_jugular_{tag}', [inside_skin(skin, p, sign) for p in jug], 0.003, 'vessel', 'Neck & trunk')
        ry = np.linspace(lo(rad)[1] + 0.015, hi(rad)[1] - 0.01, 5)
        ceph = [pick(rad, y, lambda v: v[0]) + Vector((0.004, 0, 0)) for y in ry]
        ceph += [pick(hum, lo(hum)[1] + 0.03, lambda v: v[0]) + Vector((0.006, 0, 0)) + lat * 0.006,
                 pick(hum, (lo(hum)[1] + hi(hum)[1]) / 2, out) + lat * 0.008]
        B.tube(f'v_cephalic_{tag}', [inside_skin(skin, p, sign) for p in ceph], 0.0022, 'vessel', 'Forelimb')
        crus = np.vstack([tib, fib])
        sy = np.linspace(lo(calc)[1] + 0.03, lo(crus)[1] + 0.11, 5)
        saph = [pick(crus, y, out) + lat * 0.004 + Vector((-0.004 * i, 0, 0)) for i, y in enumerate(sy)]
        B.tube(f'v_lateral_saphenous_{tag}', [inside_skin(skin, p, sign) for p in saph], 0.0022, 'vessel', 'Hindlimb')
        fy = np.linspace(hi(fem)[1] - 0.03, lo(fem)[1] + 0.06, 5)
        femo = [pick(fem, y, inn) - lat * 0.009 + Vector((0.004, 0, 0)) for y in fy]
        B.tube(f'v_femoral_artery_{tag}', femo, 0.002, 'vessel', 'Hindlimb')

        # ---- limb nerves (schematic courses)
        hm = (lo(hum)[1] + hi(hum)[1]) / 2
        axilla = Vector(top.mean(0)) + Vector((-0.02, -0.03, 0)) - lat * 0.012
        nerves = {
            'radial': ([axilla, pick(hum, hm, lambda v: -v[0]) + Vector((-0.008, 0, 0)),
                        pick(hum, lo(hum)[1] + 0.05, out) + lat * 0.006,
                        pick(hum, lo(hum)[1] + 0.01, lambda v: v[0]) + Vector((0.006, 0, 0)) + lat * 0.004,
                        pick(rad, (lo(rad)[1] + hi(rad)[1]) / 2, lambda v: v[0] + abs(v[2])) + Vector((0.003, 0, 0)) + lat * 0.005],
                       'Forelimb'),
            'median': ([axilla, pick(hum, hm, inn) - lat * 0.006,
                        pick(hum, lo(hum)[1] + 0.01, inn) + Vector((0.004, 0, 0)) - lat * 0.006,
                        pick(rad, (lo(rad)[1] + hi(rad)[1]) / 2, inn) - lat * 0.005,
                        pick(rad, lo(rad)[1] + 0.02, inn) - lat * 0.004], 'Forelimb'),
            'ulnar': ([axilla, pick(hum, hm, inn) + Vector((-0.006, 0, 0)) - lat * 0.005,
                       pick(hum, lo(hum)[1] + 0.015, lambda v: -v[0]) + Vector((-0.004, 0, 0)) - lat * 0.006,
                       pick(uln, (lo(uln)[1] + hi(uln)[1]) / 2, lambda v: -v[0]) + Vector((-0.004, 0, 0)),
                       pick(uln, lo(uln)[1] + 0.02, lambda v: -v[0]) + Vector((-0.004, 0, 0))], 'Forelimb'),
            'musculocutaneous': ([axilla, pick(hum, hm, lambda v: v[0]) + Vector((0.006, 0, 0)) - lat * 0.004,
                                  pick(hum, lo(hum)[1] + 0.02, lambda v: v[0]) + Vector((0.006, 0, 0)) - lat * 0.003], 'Forelimb'),
        }
        l5 = V['L_5']
        sac = V['Sacrum']
        fm = (lo(fem)[1] + hi(fem)[1]) / 2
        sci_end = pick(fem, lo(fem)[1] + 0.04, lambda v: -v[0]) + Vector((-0.014, 0, 0))
        nerves['femoral'] = ([Vector((l5[:, 0].mean(), lo(l5)[1] - 0.01, sign * 0.015)),
                              Vector((pub.x + 0.03, pub.y + 0.02, sign * 0.035)),
                              pick(fem, hi(fem)[1] - 0.04, inn) + Vector((0.006, 0, 0)) - lat * 0.006,
                              pick(fem, hi(fem)[1] - 0.08, lambda v: v[0]) + Vector((0.008, 0, 0))], 'Hindlimb')
        nerves['sciatic'] = ([Vector((lo(sac)[0] + 0.01, sac[:, 1].mean(), sign * 0.02)),
                              Vector((troch.x + 0.02, troch.y + 0.03, troch.z * 0.75)),
                              Vector((troch.x - 0.022, troch.y, troch.z * 0.9)),
                              pick(fem, fm, lambda v: -v[0]) + Vector((-0.012, 0, 0)), sci_end], 'Hindlimb')
        nerves['tibial'] = ([sci_end, pick(tib, hi(tib)[1] - 0.03, lambda v: -v[0]) + Vector((-0.01, 0, 0)) - lat * 0.004,
                             pick(tib, (lo(tib)[1] + hi(tib)[1]) / 2, lambda v: -v[0]) + Vector((-0.008, 0, 0)) - lat * 0.003,
                             Vector(calc.mean(0)) + Vector((0.004, 0.012, 0)) - lat * 0.008], 'Hindlimb')
        nerves['common_peroneal'] = ([sci_end, pick(fib, hi(fib)[1] - 0.01, out) + lat * 0.004,
                                      pick(crus, (lo(tib)[1] + hi(tib)[1]) / 2, lambda v: abs(v[2]) + v[0]) + lat * 0.004,
                                      pick(tib, lo(tib)[1] + 0.03, lambda v: v[0]) + Vector((0.004, 0, 0))], 'Hindlimb')
        for name, (pts, region) in nerves.items():
            B.tube(f'n_{name}_{tag}', pts, 0.0019, 'nerve', region)

    extras(B, by, V, skin)

    # ---- spinal cord segment regions (functional regions, not vertebral levels)
    cx = lambda k: float(V[k][:, 0].mean())  # noqa: E731
    bounds = [((cx('C_4') + cx('C_5')) / 2), ((cx('T_1') + cx('T_2')) / 2), cx('L_3'), ((cx('L_5') + cx('L_6')) / 2)]
    regions = ['cord_C1_C5', 'cord_C6_T2', 'cord_T3_L3', 'cord_L4_S3', 'cord_caudal']
    edges = [math.inf] + bounds + [-math.inf]
    for i, name in enumerate(regions):
        seg = [p for p in canal if edges[i + 1] - 0.002 <= p.x <= edges[i] + 0.002]
        if len(seg) < 2:
            print('MISSING', name, flush=True)
            continue
        r = (lambda u: 0.0042 - 0.0024 * u) if name == 'cord_caudal' else 0.0055
        B.tube(name, seg[::2] if len(seg) > 6 else seg, r, 'nerve', 'Neck & trunk')
    return dog, B.parts


def principal(vs):
    c = vs.mean(0)
    _, _, w = np.linalg.svd(vs - c, full_matrices=False)
    return c, w[0]


def extras(B, by, V, skin):
    """Growth plates, body-surface regions and cranial nerves."""
    # ---- growth plates (physes): a disc across each long bone near its ends.
    # Fractions of bone length from the proximal (upper) or distal end.
    physes = {
        'humerus': (('proximal', 0.10), ('distal', 0.08)),
        'Radius': (('proximal', 0.06), ('distal', 0.07)),
        'Ulna': (('distal', 0.06),),
        'Femoris': (('proximal', 0.07), ('distal', 0.10)),
        'Tibia': (('proximal', 0.10), ('distal', 0.06)),
    }
    for bone, ends in physes.items():
        for tag in ('L', 'R'):
            vs = V[f'{bone}_{tag}']
            c, ax = principal(vs)
            if ax[1] < 0:
                ax = -ax  # axis points proximally (up)
            t = (vs - c) @ ax
            discs = []
            for end, f in ends:
                at = t.max() - f * (t.max() - t.min()) if end == 'proximal' else t.min() + f * (t.max() - t.min())
                sl = vs[np.abs(t - at) < 0.0015]
                if len(sl) < 6:
                    continue
                centre = Vector(sl.mean(0))
                off = sl - sl.mean(0)
                radial = off - np.outer(off @ ax, ax)
                r = float(np.percentile(np.linalg.norm(radial, axis=1), 80))  # max overshoots at styloid ridges
                discs.append((f'{end}', centre, ax, r))
            for end, centre, a, r in discs:
                key = {'humerus': 'humerus', 'Radius': 'radius', 'Ulna': 'ulna', 'Femoris': 'femur', 'Tibia': 'tibia'}[bone]
                B.group(f'gp_{key}_{end}_{tag}', 'landmark', 'Forelimb' if bone in ('humerus', 'Radius', 'Ulna') else 'Hindlimb',
                        discs=[(centre, a, r, 0.0016)], rigid=f'{bone}_{tag}')

    def to(p, d, depth=0.002):
        d = Vector(d).normalized()
        hit = skin.ray_cast(Vector(p) - d * 0.05, d, 0.3)[0]
        return hit - d * depth if hit else Vector(p)

    def top(k):
        v = V[k]
        return Vector(v[np.argmax(v[:, 1])])

    # ---- body-surface regions (numbered, left side and dorsal midline)
    skull = V['MergedSkull']
    poll = Vector(skull[np.argmax(skull[:, 1] - 2 * (skull[:, 0] - skull[:, 0].min()))])
    muzzle = Vector(skull[np.argmax(skull[:, 0] + 0.5 * skull[:, 1])])
    st = V['Sternum']
    brisket = Vector(st[np.argmin(st[:, 1])])
    hum = V['humerus_L'][V['humerus_L'][:, 1] > V['humerus_L'][:, 1].max() - 0.02]
    shoulder = Vector(hum[np.argmax(hum[:, 0])])
    olec = Vector(V['Ulna_L'][np.argmax(V['Ulna_L'][:, 1])])
    pat = Vector(V['Patella_L'].mean(0))
    calc = Vector(V['Calcaneal_tuber_L'][np.argmax(V['Calcaneal_tuber_L'][:, 1])])
    l3 = top('L_3')
    flank = Vector(((V['Rib_13_L'][:, 0].min() + V['Pelvis'][:, 0].max()) / 2, l3.y - 0.09, -0.02))
    regions = [
        (to(poll, (0, 1, 0)), '1'), (to(muzzle, (0, 1, 0.0)), '2'), (to(top('T_2'), (0, 1, 0)), '3'),
        (to(l3, (0, 1, 0)), '4'), (to(top('Sacrum'), (0, 1, 0)), '5'), (to(top('Ca_1'), (0, 1, 0)), '6'),
        (to(shoulder, (0.3, 0, -1)), '7'), (to(olec, (-1, 0, -0.3)), '8'), (to(brisket, (0, -1, 0)), '9'),
        (to(flank, (0, 0, -1)), '10'), (to(pat, (1, 0, -0.3)), '11'), (to(calc, (-1, 0, -0.2)), '12'),
    ]
    B.group('lm_body_regions', 'landmark', 'Neck & trunk', marks=[(p, 0.004, t) for p, t in regions])

    # ---- cranial nerves I-XII (schematic courses from the brain to their targets)
    with open(os.path.join(ROOT, 'work', 'organs', 'parts.json'), encoding='utf-8') as f:
        bparts = {q['id']: q for q in json.load(f)['parts']}
    stem_lo, stem_hi = (Vector(v) for v in bparts['brain_stem']['bounds'])
    bulb_hi = Vector(bparts['brain_olfactory_bulbs']['bounds'][1])
    sc = (stem_lo + stem_hi) / 2
    hw = (stem_hi.z - stem_lo.z) / 2
    jaw = V['Jaw']
    for sign, tag in ((LEFT, 'L'), (RIGHT, 'R')):
        m = lambda x, y, z: Vector((x, y, z * (1 if sign == LEFT else -1)))  # noqa: E731  author on the left
        eye = Vector(V[f'eye_{tag}'].mean(0)) if f'eye_{tag}' in V else m(0.358, 0.704, -0.026)
        js = jaw[jaw[:, 2] * sign > 0]
        angle = Vector(js[js[:, 0] < js[:, 0].min() + 0.025][np.argmin(js[js[:, 0] < js[:, 0].min() + 0.025][:, 1])])
        lat = m(sc.x, sc.y, -hw)
        nerves = [
            ('I', [m(bulb_hi.x - 0.004, bulb_hi.y - 0.004, -0.004), m(bulb_hi.x + 0.012, bulb_hi.y - 0.002, -0.004)]),
            ('II', [m(stem_hi.x + 0.01, stem_lo.y + 0.002, -0.004), (m(stem_hi.x + 0.01, stem_lo.y, -0.004) + eye) / 2, eye]),
            ('III', [lat + Vector((0.004, 0, 0)), (lat + eye) / 2 + Vector((0, -0.004, 0)), eye + Vector((0, -0.004, 0))]),
            ('IV', [lat + Vector((-0.004, 0.004, 0)), (lat + eye) / 2 + Vector((0, 0.004, 0)), eye + Vector((0, 0.005, 0))]),
            ('V', [lat, lat + m(0.0, -0.012, -0.01), angle + Vector((0.035, 0.012, 0))]),
            ('VI', [m(sc.x - 0.006, sc.y - 0.004, -0.004), (lat + eye) / 2 + Vector((0, -0.008, 0)), eye + Vector((0, -0.007, 0))]),
            ('VII', [lat + Vector((-0.008, 0, 0)), lat + m(-0.01, -0.006, -0.02), angle + Vector((0.02, 0.03, 0)) + m(0, 0, -0.006)]),
            ('VIII', [lat + Vector((-0.01, 0.002, 0)), lat + m(-0.012, 0.002, -0.016)]),
            ('IX', [m(stem_lo.x + 0.01, sc.y - 0.004, -0.006), m(0.265, 0.625, -0.012)]),
            ('X', [m(stem_lo.x + 0.008, sc.y - 0.006, -0.007), m(0.25, 0.61, -0.02), m(0.21, 0.53, -0.022),
                   m(0.155, 0.445, -0.02), m(0.10, 0.40, -0.02)]),
            ('XI', [m(stem_lo.x + 0.004, sc.y, -0.006), m(stem_lo.x - 0.02, sc.y - 0.01, -0.03), m(0.20, 0.62, -0.04)]),
            ('XII', [m(stem_lo.x + 0.012, sc.y - 0.008, -0.004), m(0.29, 0.62, -0.01), m(0.30, 0.625, -0.008)]),
        ]
        B.group(f'n_cranial_nerves_{tag}', 'nerve', 'Head', tubes=[(pts, 0.0012) for _, pts in nerves],
                marks=[(pts[-1], 0.0018, num) for num, pts in nerves])


def attachments(dog, path):
    """Where each muscle touches bone: the contact vertices split into its two
    ends along the muscle's long axis; ends ordered by height (a above b)."""
    bones = [p for p in dog if p['system'] == 'bone']
    trees = {p['id']: bvh_of([p['ob']]) for p in bones}
    out = {}
    for p in dog:
        if p['system'] != 'muscle':
            continue
        vs = verts(p['ob'])
        if len(vs) < 20:
            continue
        idx = np.linspace(0, len(vs) - 1, min(len(vs), 1500)).astype(int)
        sample = vs[idx]
        best = np.full(len(sample), np.inf)
        bone_of = np.empty(len(sample), dtype=object)
        for bid, tree in trees.items():
            lo = np.array(verts_lo[bid]) - 0.004
            hi = np.array(verts_hi[bid]) + 0.004
            near = np.all((sample > lo) & (sample < hi), axis=1)
            for i in np.nonzero(near)[0]:
                d = tree.find_nearest(Vector(sample[i]))[3]
                if d is not None and d < best[i]:
                    best[i], bone_of[i] = d, bid
        touch = best < 0.0025
        if touch.sum() < 6:
            continue
        c, ax = principal(vs)
        t = (sample - c) @ ax
        mid = (t.min() + t.max()) / 2
        ends = []
        for side in (t < mid, t >= mid):
            sel = touch & side
            if sel.sum() < 3:
                continue
            bs = list(bone_of[sel])
            ends.append({'at': [round(float(x), 5) for x in sample[sel].mean(0)], 'bone': max(set(bs), key=bs.count)})
        if len(ends) == 2:
            ends.sort(key=lambda e: -e['at'][1])
            out[p['id']] = {'a': ends[0]['at'], 'ab': ends[0]['bone'], 'b': ends[1]['at'], 'bb': ends[1]['bone']}
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(out, f)
    print(f'attachments: {len(out)} muscles', flush=True)


verts_lo, verts_hi = {}, {}


def labels_of(ob, pos):
    """Label anchors: the centre of each labelled sphere after any warping."""
    if 'labels' not in ob:
        return None
    out = []
    for start, n, text in json.loads(ob['labels']):
        c = np.array(pos).reshape(-1, 3)[start:start + n].mean(0)
        out.append({'text': text, 'at': [round(float(x), 5) for x in c]})
    return out


def export(parts):
    os.makedirs(OUT, exist_ok=True)
    chunks, cat, offset = [], [], 0
    for p in parts:
        pos, idx = tri_arrays(p['ob'])
        vb = struct.pack(f'<{len(pos)}f', *pos)
        ib = struct.pack(f'<{len(idx)}I', *idx)
        xs, ys, zs = pos[0::3], pos[1::3], pos[2::3]
        lo_, hi_ = [min(xs), min(ys), min(zs)], [max(xs), max(ys), max(zs)]
        entry = {'id': p['id'], 'system': p['system'], 'anatomicalRegion': p['region'], 'vertexOffset': offset,
                 'vertexCount': len(pos) // 3, 'indexOffset': offset + len(vb), 'indexCount': len(idx),
                 'center': [(a + b) / 2 for a, b in zip(lo_, hi_)], 'bounds': [lo_, hi_]}
        if p.get('rigid'):
            entry['rigid'] = p['rigid']
        lab = labels_of(p['ob'], pos)
        if lab:
            entry['labels'] = lab
            entry['labelVerts'] = json.loads(p['ob']['labels'])
        cat.append(entry)
        chunks += [vb, ib]
        offset += len(vb) + len(ib)
    with open(os.path.join(OUT, 'geometry.bin'), 'wb') as f:
        for c in chunks:
            f.write(c)
    with open(os.path.join(OUT, 'parts.json'), 'w', encoding='utf-8') as f:
        json.dump({'bytes': offset, 'parts': cat}, f)
    print(f'export: {len(cat)} clinical parts, {offset / 1e6:.2f} MB', flush=True)


if __name__ == '__main__':
    col = bpy.context.scene.collection
    dog, parts = build(col)
    export(parts)
    for q in dog:
        if q['system'] == 'bone':
            v = verts(q['ob'])
            verts_lo[q['id']], verts_hi[q['id']] = v.min(0), v.max(0)
    attachments(dog, os.path.join(OUT, 'attachments.json'))
    if '--render' in argv:
        for ob in bpy.data.objects:
            if ob.type == 'MESH' and any(ob.name == p['id'] for p in parts):
                ob['organ'] = 1
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'clinical.blend'))
