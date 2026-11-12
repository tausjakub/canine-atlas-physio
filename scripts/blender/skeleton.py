"""Parametric skeleton for the cat and rabbit atlases.

Each bone is assembled from authored primitives (shafts, epiphyses,
processes), fused by voxel remeshing and smoothed. Every bone also records a
local frame so muscle attachments can be written as positions relative to
bone features (see Frame.p) instead of loose coordinates.
"""
import math
from mathutils import Vector
from common import V, Builder, remesh, subtract, catmull, lerp, decimate


class Frame:
    """Local frame: t runs along the bone axis; cr (cranial/dorsal), lat
    (outward) and ax offsets are in multiples of the bone's radius."""

    def __init__(self, a, b, r, side, up=None):
        self.a, self.b, self.r, self.side = V(a), V(b), r, side
        self.axis = (self.b - self.a)
        self.length = self.axis.length
        self.axis.normalize()
        out = V(0, 0, side if side else 1)
        self.lat = (out - self.axis * out.dot(self.axis)).normalized()
        if up is not None:
            u = V(up)
            self.cr = (u - self.axis * u.dot(self.axis) - self.lat * u.dot(self.lat)).normalized()
        else:
            self.cr = self.lat.cross(self.axis).normalized() * (1 if side >= 0 else -1)
            if self.cr.x < 0 and abs(self.axis.y) > 0.5:
                self.cr = -self.cr

    def p(self, t, cr=0.0, lat=0.0, ax=0.0):
        return (self.a + self.axis * (t * self.length + ax * self.r)
                + self.cr * (cr * self.r) + self.lat * (lat * self.r))


def ik(a, c, l1, l2, bend):
    """Two-segment chain from a to c; bend (+1 cranial / -1 caudal) picks the
    side of the middle joint in the sagittal plane."""
    a, c = V(a), V(c)
    d = (c - a)
    dist = min(d.length, (l1 + l2) * 0.999)
    cosA = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)
    ang = math.acos(max(-1, min(1, cosA)))
    base = math.atan2(d.y, d.x)
    th = base - bend * ang
    return V(a.x + l1 * math.cos(th), a.y + l1 * math.sin(th), a.z)


def build_skeleton(S, col):
    """Return (bones: list of (id, region, object), frames: dict)."""
    out, F = [], {}
    q = S['quality']

    def finish(b, pid, region, voxel, tris, cut=None):
        ob = b.obj(pid, col)
        if cut:
            subtract(ob, cut)
        remesh(ob, voxel, smooth=q['smooth'], factor=0.5, tris=tris)
        out.append((pid, region, ob))
        return ob

    sc = S['scale']
    # ---------------- spine ----------------
    counts = S['vertebrae']  # cervical, thoracic, lumbar, sacral, caudal
    spine = S['spine']  # dict of named control points
    regions = [('C', counts[0], spine['C1'], spine['C7']),
               ('T', counts[1], spine['T1'], spine['Tn']),
               ('L', counts[2], spine['L1'], spine['Ln'])]
    centres = {}
    path = catmull([spine[k] for k in ('C1', 'C4', 'C7', 'T1', 'Tmid', 'Tn', 'L1', 'Lmid', 'Ln', 'S')], 400)

    def along(p0, p1, i, n):
        # Interpolate between control points following the spine curve.
        a, b = V(p0), V(p1)
        best = min(range(len(path)), key=lambda k: (path[k] - a).length)
        end = min(range(len(path)), key=lambda k: (path[k] - b).length)
        k = round(lerp(best, end, i / max(1, n - 1)))
        return path[k]

    for tag, n, p0, p1 in regions:
        for i in range(n):
            centres[f'{tag}_{i + 1}'] = along(p0, p1, i, n)

    def vtx(name, c, nxt, prv, kind, i, n):
        b = Builder()
        axis = (V(nxt) - V(prv)).normalized() if nxt is not None else V(1, 0, 0)
        up = V(0, 1, 0)
        up = (up - axis * up.dot(axis)).normalized()
        lat = axis.cross(up).normalized()
        P = S['vert'][kind]
        rb, ln = P['body'][0] * sc, P['body'][1] * sc
        u = i / max(1, n - 1)
        b.tube([c - axis * ln / 2, c + axis * ln / 2], [rb * 1.05, rb * 0.9, rb * 1.05], seg=14, hint=up)
        # Neural arch around the canal.
        arch_c = c + up * rb * 1.55
        for s in (-1, 1):
            b.tube([c + up * rb * 0.6 + lat * s * rb * 0.75, arch_c + lat * s * rb * 0.9,
                    arch_c + up * rb * 0.75], [rb * 0.32, rb * 0.3, rb * 0.3], seg=8, hint=axis)
        # Spinous process: height and tilt vary along the region.
        h = lerp(P['spinous'][0], P['spinous'][1], u) * sc
        tilt = lerp(P['tilt'][0], P['tilt'][1], u)
        top = arch_c + up * (rb * 0.6 + h) + axis * (h * math.tan(math.radians(tilt)))
        b.tube([arch_c + up * rb * 0.5, top], [(rb * 0.16, rb * 0.45), (rb * 0.12, rb * 0.6)], seg=8, hint=lat)
        # Transverse processes.
        tl = lerp(P['transverse'][0], P['transverse'][1], u) * sc
        if tl > 0:
            for s in (-1, 1):
                tip = c + lat * s * (rb + tl) + up * (P['tdrop'] * tl) + axis * (P['tfwd'] * tl)
                b.tube([c + lat * s * rb * 0.6 + up * rb * 0.3, tip], [(rb * 0.2, rb * 0.4), (rb * 0.14, rb * 0.45)], seg=8, hint=up)
        # Articular processes.
        for s in (-1, 1):
            for d in (-1, 1):
                b.ellipsoid(arch_c + lat * s * rb * 0.7 + axis * d * ln * 0.45, (rb * 0.3, rb * 0.22, rb * 0.25), seg=10, rings=6)
        return b

    def atlas_axis(name, c, axis_dir):
        b = Builder()
        up, lat = V(0, 1, 0), V(0, 0, 1)
        P = S['vert']['C']
        rb = P['body'][0] * sc
        if name == 'C_1':
            # Ring with broad wings.
            ring = [c + up * rb * 1.0 + V(0, math.cos(a) * rb * 1.2, math.sin(a) * rb * 1.25) for a in
                    [k * math.pi / 6 for k in range(13)]]
            b.tube(ring, [rb * 0.35], seg=8, n=40)
            for s in (-1, 1):
                b.ellipsoid(c + up * rb + lat * s * rb * 2.0, (rb * 1.2, rb * 0.35, rb * 1.6), seg=14, rings=8)
        else:
            vb = vtx(name, c, c + axis_dir, c - axis_dir, 'C', 0, 1)
            b.add(vb.verts, vb.faces)
            # Long axis crest and dens.
            b.tube([c + up * rb * 2.3 - axis_dir * rb * 1.5, c + up * rb * 2.9 + axis_dir * rb * 1.2],
                   [(rb * 0.2, rb * 0.6)], seg=10, hint=lat)
            b.tube([c, c + axis_dir * rb * 2.2], [rb * 0.45, rb * 0.3], seg=10)
        return b

    keys = list(centres)
    for k_i, name in enumerate(keys):
        c = centres[name]
        nxt = centres[keys[k_i - 1]] if k_i else c + V(0.01, 0.002, 0)
        prv = centres[keys[k_i + 1]] if k_i + 1 < len(keys) else V(spine['S'])
        kind = name[0]
        n = counts['CTL'.index(kind)]
        i = int(name.split('_')[1]) - 1
        axis_dir = (nxt - prv).normalized() * S['vert']['C']['body'][1] * sc * 0.5
        b = atlas_axis(name, c, axis_dir) if name in ('C_1', 'C_2') else vtx(name, c, nxt, prv, kind, i, n)
        finish(b, name, 'Neck & trunk', q['vox_small'] * sc, q['tri_vert'])
        rb = S['vert'][kind]['body'][0] * sc
        F[name] = Frame(c, c + (nxt - prv).normalized() * rb, rb, 0, up=V(0, 1, 0))

    # Sacrum: fused vertebrae with a median crest and wings.
    sa, sb = V(spine['Ln']), V(spine['S'])
    sdir = (sb - sa).normalized()
    s0 = sa + sdir * S['vert']['L']['body'][1] * sc * 0.9
    s1 = sb
    b = Builder()
    rb = S['vert']['L']['body'][0] * sc * 0.9
    b.tube([s0, s1], [rb * 1.1, rb * 0.7], seg=14)
    b.tube([s0 + V(0, rb * 2.2, 0), s1 + V(0, rb * 1.6, 0)], [(rb * 0.25, rb * 0.6)], seg=8, hint=V(0, 0, 1))
    for s in (-1, 1):
        b.ellipsoid(lerp(s0, s1, 0.25) + V(0, rb * 0.3, s * rb * 1.9), (rb * 1.4, rb * 0.7, rb * 1.3))
        b.tube([s0 + V(0, rb * 0.2, s * rb * 1.2), s1 + V(0, 0, s * rb * 0.7)], [rb * 0.6, rb * 0.35], seg=8)
    finish(b, 'Sacrum', 'Neck & trunk', q['vox_small'] * sc, q['tri_vert'] * 2)
    F['Sacrum'] = Frame(s0, s1, rb, 0, up=V(0, 1, 0))

    # Tail.
    tail = catmull(S['tail'], 200)
    nC = counts[4]
    tl = sum((tail[i + 1] - tail[i]).length for i in range(len(tail) - 1))
    pos, acc, k = [], 0.0, 0
    for i in range(nC):
        target = tl * (i + 0.5) / nC
        while k < len(tail) - 2 and acc + (tail[k + 1] - tail[k]).length < target:
            acc += (tail[k + 1] - tail[k]).length
            k += 1
        pos.append(tail[k])
    for i, c in enumerate(pos):
        u = i / max(1, nC - 1)
        d = ((pos[min(i + 1, nC - 1)] - pos[max(i - 1, 0)]).normalized())
        r = lerp(S['tail_r'][0], S['tail_r'][1], u) * sc
        ln = tl / nC * 0.82
        b = Builder()
        b.tube([c - d * ln / 2, c + d * ln / 2], [r * 1.25, r, r * 1.25], seg=10)
        if u < 0.35:
            for s in (-1, 1):
                b.tube([c, c + V(0, 0, s * r * (2.2 - 3 * u))], [r * 0.45, r * 0.25], seg=6)
        finish(b, f'Ca_{i + 1}', 'Neck & trunk', max(q['vox_small'] * sc * 0.6, r * 0.25), q['tri_tail'])
        F[f'Ca_{i + 1}'] = Frame(c, c + d * r, r, 0, up=V(0, 1, 0))

    # ---------------- skull & mandibles ----------------
    skull_built = S['skull'](S, col, F)
    for pid, region, b, vox, tris, cut in skull_built:
        finish(b, pid, region, vox, tris, cut)

    # ---------------- thorax ----------------
    T = counts[1]
    st = S['sternum']
    st_path = catmull(st['path'], 120)
    nst = st['count']
    b = Builder()
    for i in range(nst):
        c = st_path[int((i + 0.5) / nst * 119)]
        nx = st_path[min(119, int((i + 0.9) / nst * 119))] - st_path[max(0, int((i + 0.1) / nst * 119))]
        nx.normalize()
        ln = (st_path[-1] - st_path[0]).length / nst * 0.78
        rr = st['r'] * sc * (1.25 if i == 0 else 1.0)
        b.tube([c - nx * ln / 2, c + nx * ln / 2], [rr, rr * 0.85, rr], seg=10)
    b.tube([st_path[-1], st_path[-1] + (st_path[-1] - st_path[-10]).normalized() * st['xiphoid'] * sc],
           [(st['r'] * sc * 0.3, st['r'] * sc * 1.4)], seg=10, hint=V(0, 1, 0))
    finish(b, 'Sternum', 'Neck & trunk', q['vox_small'] * sc, q['tri_vert'] * 2)
    F['Sternum'] = Frame(st_path[0], st_path[-1], st['r'] * sc, 0, up=V(0, 1, 0))
    F['_sternal_points'] = st_path

    rib = S['ribs']
    for i in range(T):
        u = i / (T - 1)
        v = centres[f'T_{i + 1}']
        hw = rib['width'](u) * sc
        depth = rib['depth'](u) * sc
        for side, tag in ((-1, 'L'), (1, 'R')):
            head = v + V(-0.002 * sc, -0.001 * sc, side * S['vert']['T']['body'][0] * sc * 1.1)
            tub = v + V(-0.002 * sc, 0.004 * sc, side * S['vert']['T']['body'][0] * sc * 2.0)
            mid = v + V(-rib['sweep'] * sc * 0.45, -depth * 0.35, side * hw)
            low = v + V(-rib['sweep'] * sc, -depth * 0.82, side * hw * 0.78)
            if i < rib['true']:
                # Costal cartilage curves forward to the sternum.
                sp = st_path[int(min(0.999, (i + 0.4) / rib['true']) * 119)]
                end = sp + V(0, 0, side * st['r'] * sc * 1.2)
                knee = lerp(low, end, 0.45) + V(0.004 * sc, -0.006 * sc, side * hw * 0.12)
                pts = [head, tub, mid, low, knee, end]
            elif i < T - rib['floating']:
                # Asternal ribs join the costal arch.
                end = low + V(rib['arch_fwd'] * sc, -depth * 0.12, -side * hw * 0.22)
                pts = [head, tub, mid, low, end]
            else:
                end = low + V(-0.004 * sc, -depth * 0.05, -side * hw * 0.05)
                pts = [head, tub, mid, lerp(mid, low, 0.7), end]
            b = Builder()
            r = rib['r'] * sc * (1.3 if i == 0 else 1.0)
            b.tube(pts, lambda t: (r * (1.15 - 0.4 * t), r * 0.7 * (1.2 - 0.3 * t)), seg=8, n=36,
                   hint=V(1, 0, 0))
            finish(b, f'Rib_{i + 1}_{tag}', 'Neck & trunk', max(q['vox_small'] * sc * 0.7, r * 0.45), q['tri_rib'])
            F[f'Rib_{i + 1}_{tag}'] = RibFrame(pts, side)

    # ---------------- limbs ----------------
    for side, tag in ((-1, 'L'), (1, 'R')):
        S['limbs'](S, side, tag, F, finish)
    return out, F, centres


class RibFrame:
    """Rib landmarks: t runs from head (0) to ventral end (1)."""

    def __init__(self, pts, side):
        self.path = catmull(pts, 60)
        self.side = side
        self.r = 0.002

    def p(self, t, out=0.0, *_):
        i = min(59, max(0, int(t * 59)))
        p = self.path[i]
        return p + V(0, 0, self.side * out * 0.002)
