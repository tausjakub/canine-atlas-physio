"""Retarget the dog's bones and muscles onto cat or rabbit proportions.

Each body segment (two cranial head segments, neck, thorax, lumbar, pelvis,
tail chain, and per side scapula, arm, forearm, manus, thigh, crus, pes) has a
frame in the dog (from landmarks measured on the dog bone meshes) and a frame
in the target species (from the authored proportions in species_*.py). A
point is carried from the dog frame to the target frame with the segment's
length and girth scale. Bones move rigidly with their own segment; muscles
and the skull blend nearby segments so tissue spanning a joint stays smooth.
"""
import math
import re
from mathutils import Vector, Matrix
from common import V, catmull
from skeleton import ik

# Dog joint centres in the source mesh (app/poses.ts poseJoints) and toe pivots.
DOG_JOINTS = {'shoulder': (0.2, 0.426), 'elbow': (0.145, 0.27), 'carpus': (0.147, 0.09),
              'hip': (-0.326, 0.465), 'stifle': (-0.35, 0.297), 'hock': (-0.532, 0.151)}


def _verts(ob):
    return [ob.matrix_world @ v.co for v in ob.data.vertices]


def _centre(ob):
    vs = _verts(ob)
    return sum(vs, Vector()) / len(vs)


def dog_landmarks(parts):
    by = {p['id']: p['ob'] for p in parts}
    L = {}
    z = {'fore': _centre(by['humerus_L']).z, 'carpus': _centre(by['Radius_L']).z,
         'hind': _centre(by['Femoris_L']).z, 'hock': _centre(by['Tibia_L']).z}
    for side, s in (('L', 1), ('R', -1)):
        def J(name, zz):
            x, y = DOG_JOINTS[name]
            return V(x, y, zz * s)
        L[side] = {
            'shoulder': J('shoulder', z['fore']), 'elbow': J('elbow', z['fore']), 'carpus': J('carpus', z['carpus']),
            'hip': J('hip', z['hind']), 'stifle': J('stifle', z['hind']), 'hock': J('hock', z['hock']),
        }
        sc = _verts(by[f'Scapula_{side}'])
        top = max(sc, key=lambda v: v.y)
        L[side]['scap_dorsal'] = top
        dist = [ob for i, ob in by.items() if re.match(rf'Phalanx_distalis_digiti_(III|IV)_{side}', i)]
        L[side]['fore_toe'] = sum((_centre(o) for o in dist), Vector()) / len(dist)
        hdist = [ob for i, ob in by.items() if re.match(rf'Phalanges_B_3_{side}_[23]$', i)]
        L[side]['hind_toe'] = sum((_centre(o) for o in hdist), Vector()) / len(hdist)
    sk = _verts(by['MergedSkull'])
    xmin, xmax = min(v.x for v in sk), max(v.x for v in sk)
    back = [v for v in sk if v.x < xmin + 0.012]
    front = [v for v in sk if v.x > xmax - 0.012]
    occ = sum(back, Vector()) / len(back)
    ros = sum(front, Vector()) / len(front)
    occ.z = ros.z = 0
    L['head'] = {'occiput': occ, 'orbit': occ.lerp(ros, 0.45), 'rostrum': ros}
    L['spine'] = {k: _centre(by[k]) for k in ('C_1', 'C_7', 'L_1', 'L_7')}
    L['spine']['Ca_1'] = _centre(by['Ca_1'])
    L['tail'] = [_centre(by[f'Ca_{i}']) for i in range(1, 22) if f'Ca_{i}' in by]
    for k in list(L['spine']):
        L['spine'][k].z = 0
    for p in L['tail']:
        p.z = 0
    return L


def target_landmarks(S):
    R = S['retarget']
    J = S['joints']
    L = {}
    for side, s in (('L', -1), ('R', 1)):
        def P(name):
            x, y, zz = J[name] if name in J else R[name]
            return V(x, y, s * zz)
        sh, ca, hip, hock = P('shoulder'), P('carpus'), P('hip'), P('hock')
        el = ik(sh, ca, S['len']['humerus'], S['len']['radius'], 1)
        el.z = s * J['elbow_z'][2]
        st = ik(hip, hock, S['len']['femur'], S['len']['tibia'], -1)
        st.z = s * J['stifle_z'][2]
        L[side] = {'shoulder': sh, 'elbow': el, 'carpus': ca, 'hip': hip, 'stifle': st, 'hock': hock,
                   'scap_dorsal': P('scap_dorsal'), 'fore_toe': P('fore_toe'), 'hind_toe': P('hind_toe')}
    h = S['head']
    occ, ros = V(h['occiput']), V(h['rostrum'])
    L['head'] = {'occiput': occ, 'orbit': occ.lerp(ros, R['orbit']), 'rostrum': ros}
    sp = S['spine']
    L['spine'] = {'C_1': V(sp['C1']), 'C_7': V(sp['C7']), 'L_1': V(sp['L1']), 'L_7': V(sp['Ln']), 'Ca_1': V(S['tail'][0])}
    # The dog has 21 caudal vertebrae; a shorter species tail maps the first n
    # onto its tail and compresses the rest into the tip (they are removed later).
    n = S['vertebrae'][4]
    main = catmull([V(p) for p in S['tail']], n)
    step = (main[-1] - main[-2]).normalized() * 0.0004
    L['tail'] = main + [main[-1] + step * (i + 1) for i in range(21 - n)]
    return L


class Segment:
    def __init__(self, name, sa, sb, ta, tb, girth, side=None, lateral=None, width=None):
        self.name, self.side = name, side
        self.radius = RADIUS.get(name.split('_')[0].rstrip('0123456789'), 0.01)
        self.sa, self.ta = V(sa), V(ta)
        self.sl, self.tl = (V(sb) - self.sa).length, (V(tb) - self.ta).length
        self.R_s = _frame(V(sb) - self.sa, lateral)
        self.R_t = _frame(V(tb) - self.ta, lateral)
        self.sb = V(sb)
        g = girth
        w = width if width is not None else g
        # Local axes: 0 along the segment, 1 dorsal-ish, 2 lateral.
        self.M = self.R_t @ Matrix.Diagonal((self.tl / self.sl, g, w)) @ self.R_s.transposed()

    def apply(self, p):
        return self.ta + self.M @ (p - self.sa)

    def distance(self, p):
        # Distance to a capsule (segment axis + body radius in the dog), so a
        # point inside the chest belongs to the thorax, not to the nearer limb.
        ab = self.sb - self.sa
        t = max(0.0, min(1.0, (p - self.sa).dot(ab) / ab.length_squared))
        return max(0.0, (p - (self.sa + ab * t)).length - self.radius)


def _frame(d, lateral=None):
    u = d.normalized()
    ref = V(0, 0, 1) if lateral is None else V(lateral)
    w = ref - u * ref.dot(u)
    if w.length < 1e-6:
        w = V(0, 1, 0) - u * u.y
    w.normalize()
    v = w.cross(u).normalized()
    return Matrix((u, v, w)).transposed()


def segments(src, tgt, S):
    G = S['retarget']['girth']
    k = (tgt['spine']['C_1'] - tgt['spine']['Ca_1']).length / (src['spine']['C_1'] - src['spine']['Ca_1']).length
    gw = S['retarget'].get('width', {})

    def g(name):
        return k * G.get(name, 1.0)

    def w(name):
        return k * gw.get(name, G.get(name, 1.0))

    sh, th = src['head'], tgt['head']
    ss, ts = src['spine'], tgt['spine']
    segs = [
        Segment('cranium', sh['occiput'], sh['orbit'], th['occiput'], th['orbit'], g('cranium'), width=w('cranium')),
        Segment('face', sh['orbit'], sh['rostrum'], th['orbit'], th['rostrum'], g('face'), width=w('face')),
        Segment('neck', ss['C_7'], ss['C_1'], ts['C_7'], ts['C_1'], g('neck'), width=w('neck')),
        Segment('thorax', ss['L_1'], ss['C_7'], ts['L_1'], ts['C_7'], g('thorax'), width=w('thorax')),
        Segment('lumbar', ss['L_7'], ss['L_1'], ts['L_7'], ts['L_1'], g('lumbar'), width=w('lumbar')),
        Segment('pelvis', ss['Ca_1'], ss['L_7'], ts['Ca_1'], ts['L_7'], g('pelvis'), width=w('pelvis')),
    ]
    st, tt = src['tail'], tgt['tail']
    idx = [0, 5, 10, 15, 20]
    for a, b in zip(idx, idx[1:]):
        segs.append(Segment(f'tail{a}', st[a], st[b], tt[a], tt[b], g('tail') * (1 - a / 30), width=w('tail') * (1 - a / 30)))
    for side in ('L', 'R'):
        s, t = src[side], tgt[side]
        for name, a, b in (('scap', 'scap_dorsal', 'shoulder'), ('arm', 'shoulder', 'elbow'), ('forearm', 'elbow', 'carpus'),
                           ('manus', 'carpus', 'fore_toe'), ('thigh', 'hip', 'stifle'), ('crus', 'stifle', 'hock'),
                           ('pes', 'hock', 'hind_toe')):
            segs.append(Segment(f'{name}_{side}', s[a], s[b], t[a], t[b], g(name), side=side, width=w(name)))
    return segs


# Approximate body radius around each dog segment axis (dog units, metres).
RADIUS = {'cranium': 0.04, 'face': 0.028, 'neck': 0.045, 'thorax': 0.105, 'lumbar': 0.065, 'pelvis': 0.055, 'tail': 0.008,
          'scap': 0.02, 'arm': 0.022, 'forearm': 0.014, 'manus': 0.008, 'thigh': 0.03, 'crus': 0.018, 'pes': 0.01}

RIGID = [
    (r'^C_\d', 'neck'), (r'^Ribcage', 'thorax'), (r'^L_\d', 'lumbar'), (r'^(Sacrum|Pelvis)', 'pelvis'),
    (r'^Scapula_', 'scap'), (r'^humerus_', 'arm'), (r'^(Radius|Ulna)_', 'forearm'),
    (r'^(Carpal|Os_metacarpale|Phalanx)', 'manus'), (r'^(Femoris|Patella)', 'thigh'),
    (r'^(Tibia|Fibula)_', 'crus'), (r'^(Tarsus|Calcaneal|Tibial_tarsal|Metatarsi|Phalanges_B)', 'pes'),
]


def side_of(pid):
    m = re.search(r'_(L|R)(?:[_\d.(]|$)', pid) or re.search(r'_(L|R)_', pid)
    return m.group(1) if m else None


def rigid_segment(pid, segs):
    by = {s.name: s for s in segs}
    if pid.startswith('Ca_'):
        n = int(pid[3:])
        key = max((a for a in (0, 5, 10, 15) if n - 1 >= a), default=0)
        return by[f'tail{key}']
    for pat, name in RIGID:
        if re.match(pat, pid):
            sd = side_of(pid)
            return by.get(f'{name}_{sd}') if name in ('scap', 'arm', 'forearm', 'manus', 'thigh', 'crus', 'pes') else by[name]
    return None


# Segments a part may blend between, by atlas region: trunk tissue follows the
# axial skeleton only (so it stays on the rigid ribcage), limb tissue follows
# its own limb chain plus the girdle it attaches to.
CANDIDATES = {
    'Head': {'cranium', 'face', 'neck'},
    'Neck & trunk': {'neck', 'thorax', 'lumbar', 'pelvis', 'tail', 'cranium'},
    'Forelimb': {'scap', 'arm', 'forearm', 'manus', 'neck', 'thorax'},
    'Hindlimb': {'thigh', 'crus', 'pes', 'lumbar', 'pelvis', 'tail'},
}


# Muscles linking trunk and limb must follow both (dog study-data profiles).
LIMB_GIRDLE = {
    'Forelimb': {'trapezius', 'rhomboideus', 'latissimus_dors', 'thoracis_serratus_ventr', 'pectorales_superficiales',
                 'thoracis_m_pectoralis_profundus', 'brachiocephalicus', 'omotransversarius'},
    'Hindlimb': {'psoas_major', 'iliacus', 'gluteus_superficialis_major', 'gluteus_medius', 'gluteus_profundus_minor',
                 'biceps_femoris', 'abductor_cruris', 'semitendinosus', 'semimembranosus', 'sartorius', 'gracilis',
                 'tensor_f.latae', 'piriformis', 'gemellus', 'obturatorius_int', 'obturatorius_ext', 'quadratus_femoris'},
}


def close_jaw(parts, fraction=1.0):
    """The dog dataset's rest pose has the mouth open. Rotate the mandible about
    the jaw joint until its rostral tip meets the upper jaw; head tissue nearer
    the mandible than the skull follows with a blended rotation."""
    from mathutils.bvhtree import BVHTree
    by = {p['id']: p for p in parts}
    jaw, skull = by['Jaw']['ob'], by['MergedSkull']['ob']
    jv = _verts(jaw)
    sv = _verts(skull)
    pivot = min(jv, key=lambda v: v.x - v.y)  # caudodorsal condyle
    pivot = Vector((pivot.x, pivot.y, 0))
    tip = max(jv, key=lambda v: v.x)
    upper = max(sv, key=lambda v: v.x - 2 * v.y)  # rostroventral upper jaw
    a0 = math.atan2(tip.y - pivot.y, tip.x - pivot.x)
    a1 = math.atan2(upper.y - pivot.y, upper.x - pivot.x)
    angle = (a1 - a0) * fraction
    if angle <= 0:
        return 0.0
    rot = Matrix.Translation(pivot) @ Matrix.Rotation(angle, 4, 'Z') @ Matrix.Translation(-pivot)

    def tree(ob):
        vs = _verts(ob)
        return BVHTree.FromPolygons(vs, [tuple(p.vertices) for p in ob.data.polygons])

    tj, ts = tree(jaw), tree(skull)
    for v in jaw.data.vertices:
        v.co = rot @ v.co
    jaw.data.update()
    for p in parts:
        if p['system'] != 'muscle' or p.get('region') != 'Head' and p['id'] != 'Jaw':
            continue
        for v in p['ob'].data.vertices:
            dj = tj.find_nearest(v.co)[3] or 0.0
            ds = ts.find_nearest(v.co)[3] or 0.0
            w = ds / (dj + ds + 1e-9)
            w = max(0.0, min(1.0, (w - 0.3) / 0.4))
            if w > 0:
                v.co = v.co.lerp(rot @ v.co, w)
        p['ob'].data.update()
    return math.degrees(angle)


def region_of(part, segs):
    """Atlas region from the nearest dog segment to the part's centre."""
    for region, names in LIMB_GIRDLE.items():
        if part.get('profile') in names:
            return region
    c = _centre(part['ob'])
    s = min(segs, key=lambda s: s.distance(c)).name.split('_')[0]
    if s in ('cranium', 'face'):
        return 'Head'
    if s in ('scap', 'arm', 'forearm', 'manus'):
        return 'Forelimb'
    if s in ('thigh', 'crus', 'pes'):
        return 'Hindlimb'
    return 'Neck & trunk'


def warp(parts, segs, power=4.0, eps=0.004):
    """Move every part into the target frame (in place)."""
    for p in parts:
        ob = p['ob']
        me = ob.data
        rig = rigid_segment(p['id'], segs) if p['system'] == 'bone' else None
        if rig is not None:
            for v in me.vertices:
                v.co = rig.apply(v.co)
            me.update()
            continue
        sd = side_of(p['id'])
        allowed = CANDIDATES[p.get('region', 'Neck & trunk')]
        cand = [s for s in segs if s.name.split('_')[0].rstrip('0123456789') in allowed
                and (s.side is None or sd is None or s.side == sd)]
        for v in me.vertices:
            co = v.co.copy()
            ws = sorted(((1.0 / (s.distance(co) + eps) ** power, s) for s in cand), key=lambda x: -x[0])[:3]
            tot = sum(w for w, _ in ws)
            v.co = sum((s.apply(co) * (w / tot) for w, s in ws), Vector())
        me.update()
