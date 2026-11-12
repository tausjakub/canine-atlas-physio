"""Individual muscles built from attachment landmarks, deep layers first.

Shapes:
  belly - lofted belly along origin -> via -> insertion, with tendons and
          an elliptical cross-section flattened against what lies beneath.
  sheet - ruled surface between the origin line and insertion line,
          projected onto deeper structures and given thickness (flat muscles).
  fan   - a sheet converging on a small insertion (temporalis, gluteals).
Each muscle is then pushed out of bones and previously built muscles so the
layers stack instead of interpenetrating. The left side is built and the
right side mirrored.
"""
import math
import bpy
from mathutils import Vector
from common import V, Builder, catmull, lerp, bvh_of, push_out, smooth, decimate, smoothstep, remesh

GAP = 0.00025


def resolve(spec, F, tag, s):
    """Attachment spec -> point. See muscles_table.py for the notation."""
    if isinstance(spec, Vector):
        return spec
    if isinstance(spec, str):
        spec = (spec,)
    key, *a = spec
    lm = F[tag]['lm']
    if key.startswith('@'):  # bone frame: (@bone, t, cr, lat)
        fr = F[tag][key[1:]]
        return fr.p(*(list(a) + [0, 0, 0])[:3])
    if key.startswith('#'):  # vertebra: (#T_5, dorsal, lateral, cranial) in body radii
        fr = F[key[1:]]
        d, l, c = (list(a) + [0, 0, 0])[:3]
        return fr.a + Vector((0, 1, 0)) * (d * fr.r) + Vector((0, 0, s)) * (l * fr.r) + fr.axis * (c * fr.r)
    if key.startswith('%'):  # rib: (%n, t, out)
        n = int(key[1:])
        fr = F[f'Rib_{n if n > 0 else F["_nribs"] + 1 + n}_{tag}']
        return fr.p(a[0] if a else 0.5, a[1] if len(a) > 1 else 1.0)
    if key == '$':  # sternum: ($, t, lateral, ventral) in sternal radii
        pts = F['_sternal_points']
        t = a[0] if a else 0.5
        p = pts[min(len(pts) - 1, int(t * (len(pts) - 1)))]
        r = F['Sternum'].r
        return p + Vector((0, 0, s * (a[1] if len(a) > 1 else 0) * r)) + Vector((0, -1, 0)) * ((a[2] if len(a) > 2 else 0) * r)
    if key == 'lin':  # ventral midline (linea alba): (lin, t 0 xiphoid -> 1 pubis)
        pts = F['_linea']
        p = pts[min(len(pts) - 1, int((a[0] if a else 0.5) * (len(pts) - 1)))]
        return p + Vector((0, 0, s * 0.0008))
    p = lm[key].copy()
    if a:  # metric offsets: dx (cranial), dy (dorsal), dz (lateral, outward)
        p += Vector((a[0], a[1] if len(a) > 1 else 0, s * (a[2] if len(a) > 2 else 0)))
    return p


def expand(points, F, tag, s):
    out = []
    for p in points:
        if isinstance(p, tuple) and p and p[0] == 'spine':
            # ('spine', first, last, dorsal, lateral, n)
            _, a, b, d, l, *n = p
            names = list(F['_order'])
            ia, ib = names.index(a), names.index(b)
            step = 1 if ib >= ia else -1
            seq = names[ia:ib + step:step]
            k = n[0] if n else len(seq)
            for i in range(k):
                nm = seq[round(i * (len(seq) - 1) / max(1, k - 1))]
                out.append(resolve(('#' + nm, d, l), F, tag, s))
        elif isinstance(p, tuple) and p and p[0] == 'ribs':
            # ('ribs', first, last, t, out)
            _, a, b, t, o = p
            a, b = (x if x > 0 else F['_nribs'] + 1 + x for x in (a, b))
            for i in range(a, b + (1 if b >= a else -1), 1 if b >= a else -1):
                out.append(resolve((f'%{i}', t, o), F, tag, s))
        else:
            out.append(resolve(p, F, tag, s))
    return out


def polyline(points, n):
    if len(points) == 1:
        return [points[0].copy() for _ in range(n)]
    return catmull(points, n)


def outward(tree, p, fallback):
    if tree is None:
        return fallback
    loc, nor, _, _ = tree.find_nearest(p)
    if loc is None:
        return fallback
    return nor.normalized()


def build_belly(m, O, I, via, tree, s, mm):
    n, seg = 34, 18
    c0 = sum(O, Vector()) / len(O)
    c1 = sum(I, Vector()) / len(I)
    path = catmull([c0] + via + [c1], n)
    def across(span, tan):
        # Only the part of an attachment line across the muscle widens it; a
        # line running along the muscle would otherwise twist the belly.
        if span is None:
            return None
        p = span - tan * span.dot(tan)
        return p if p.length > 0.35 * span.length else None

    spanO = across((O[-1] - O[0]) if len(O) > 1 else None, (path[1] - path[0]).normalized())
    spanI = across((I[-1] - I[0]) if len(I) > 1 else None, (path[-1] - path[-2]).normalized())
    w, h = m['w'] * mm, m['h'] * mm
    tr = m.get('tendon', 0.7) * mm
    b0, b1 = m.get('belly', (0.12, 0.85))
    lat = Vector((0, 0, s))
    verts, faces = [], []
    prev_a = None
    for k, c in enumerate(path):
        t = k / (n - 1)
        tan = (path[min(n - 1, k + 1)] - path[max(0, k - 1)]).normalized()
        nout = outward(tree, c, lat)
        nout = (nout - tan * nout.dot(tan))
        nout = nout.normalized() if nout.length > 1e-6 else lat
        # Width axis: blend attachment spans, else tangent x outward normal.
        a = tan.cross(nout)
        hint = None
        if spanO is not None and spanI is not None:
            hint = spanO.lerp(spanI, smoothstep(t))
        elif spanO is not None:
            hint = spanO * (1 - smoothstep(t)) + a * spanO.length * smoothstep(t)
        elif spanI is not None:
            hint = spanI * smoothstep(t) + a * spanI.length * (1 - smoothstep(t))
        if hint is not None:
            hint = hint - tan * hint.dot(tan)
            if hint.length > 1e-7:
                a = hint.normalized()
        a = (a - tan * a.dot(tan)).normalized()
        if prev_a is not None and a.dot(prev_a) < 0:
            a = -a
        prev_a = a
        nn = tan.cross(a).normalized()
        if nn.dot(nout) < 0:
            nn = -nn
        # Profile: tendon -> belly -> tendon, widened at broad attachments.
        if b0 <= t <= b1:
            prof = math.sin(math.pi * (t - b0) / (b1 - b0)) ** m.get('fullness', 0.6)
        else:
            prof = 0.0
        wo = spanO.length if spanO is not None else tr
        wi = spanI.length if spanI is not None else tr
        base = lerp(wo, wi, t)
        ww = max(base, tr) + (max(w, base) - max(base, tr)) * prof
        hh = tr * 0.8 + (h - tr * 0.8) * prof
        if spanO is not None and t < b0:
            hh = max(hh, h * 0.25)
        if spanI is not None and t > b1:
            hh = max(hh, h * 0.25)
        centre = c + nn * (hh * 0.5 * m.get('lift', 0.9))
        for j in range(seg):
            ang = 2 * math.pi * j / seg
            ca, sa = math.cos(ang), math.sin(ang)
            ex = 2 / m.get('square', 2.1)
            x = math.copysign(abs(ca) ** ex, ca) * ww * 0.5
            y = math.copysign(abs(sa) ** ex, sa) * hh * 0.5 * (1.0 if sa > 0 else 0.7)
            verts.append(centre + a * x + nn * y)
    for k in range(n - 1):
        for j in range(seg):
            i0, i1 = k * seg + j, k * seg + (j + 1) % seg
            faces.append((i0, i1, i1 + seg, i0 + seg))
    e0, e1 = len(verts), len(verts) + 1
    verts += [path[0], path[-1]]
    for j in range(seg):
        faces.append((e0, (j + 1) % seg, j))
        faces.append((e1, (n - 1) * seg + j, (n - 1) * seg + (j + 1) % seg))
    return Builder().add(verts, faces)


def build_sheet(m, O, I, via, tree, s, mm):
    U, T = m.get('grid', (14, 26))
    h = m['h'] * mm
    Oc, Ic = polyline(O, U), polyline(I, U)
    lat = Vector((0, 0, s))
    # Optional centre-line deviation from via points.
    dev = None
    if via:
        base = [lerp(Oc[U // 2], Ic[U // 2], k / (T - 1)) for k in range(T)]
        cur = catmull([Oc[U // 2]] + via + [Ic[U // 2]], T)
        dev = [cur[k] - base[k] for k in range(T)]
    grid = []
    for k in range(T):
        t = k / (T - 1)
        row = []
        for i in range(U):
            u = i / (U - 1)
            p = lerp(Oc[i], Ic[i], t)
            if dev:
                p = p + dev[k] * (1 - abs(2 * u - 1) ** 2 * 0.5)
            row.append(p)
        grid.append(row)
    # Conform the mid-surface to deeper structures, then relax it.
    thick = []
    for k in range(T):
        t = k / (T - 1)
        row = []
        for i in range(U):
            u = i / (U - 1)
            edge = math.sin(math.pi * u) ** 0.35 if U > 2 else 1
            end = 0.35 + 0.65 * math.sin(math.pi * min(1, max(0, (t - 0.0) / 1.0))) ** m.get('fullness', 0.5)
            if m['shape'] == 'fan':
                end = 0.35 + 0.65 * smoothstep(min(1, t * 1.6)) * (1 - smoothstep((t - 0.85) / 0.15) * 0.6)
            row.append(max(h * 0.3, h * edge * end))
        thick.append(row)
    for it in range(m.get('conform', 2)):
        for k in range(T):
            for i in range(U):
                p = grid[k][i]
                if tree is None:
                    continue
                loc, nor, _, _ = tree.find_nearest(p)
                if loc is None:
                    continue
                target = loc + nor * (GAP + thick[k][i] * 0.5)
                pull = m.get('pull', 1.0)
                d = (p - loc).dot(nor)
                if d < GAP + thick[k][i] * 0.5 or pull >= 1.0:
                    grid[k][i] = p.lerp(target, 1.0 if d < 0 else pull)
        # Laplacian relax (keeps attachment edges fixed).
        for _ in range(2):
            new = [r[:] for r in grid]
            for k in range(1, T - 1):
                for i in range(1, U - 1):
                    avg = (grid[k - 1][i] + grid[k + 1][i] + grid[k][i - 1] + grid[k][i + 1]) / 4
                    new[k][i] = grid[k][i].lerp(avg, 0.5)
            grid = new
    verts, faces = [], []

    def nrm(k, i):
        du = grid[k][min(U - 1, i + 1)] - grid[k][max(0, i - 1)]
        dt = grid[min(T - 1, k + 1)][i] - grid[max(0, k - 1)][i]
        n = du.cross(dt)
        n = n.normalized() if n.length > 1e-12 else lat
        ref = outward(tree, grid[k][i], lat)
        return n if n.dot(ref) >= 0 else -n

    for layer in (-1, 1):
        for k in range(T):
            for i in range(U):
                verts.append(grid[k][i] + nrm(k, i) * (layer * thick[k][i] * 0.5))
    L = U * T

    def idx(l, k, i):
        return l * L + k * U + i

    for k in range(T - 1):
        for i in range(U - 1):
            a, b, c, d = idx(0, k, i), idx(0, k, i + 1), idx(0, k + 1, i + 1), idx(0, k + 1, i)
            faces.append((a, d, c, b))
            a, b, c, d = idx(1, k, i), idx(1, k, i + 1), idx(1, k + 1, i + 1), idx(1, k + 1, i)
            faces.append((a, b, c, d))
    for k in range(T - 1):
        for i in (0, U - 1):
            a, b = idx(0, k, i), idx(0, k + 1, i)
            c, d = idx(1, k + 1, i), idx(1, k, i)
            faces.append((a, b, c, d) if i == 0 else (a, d, c, b))
    for k in (0, T - 1):
        for i in range(U - 1):
            a, b = idx(0, k, i), idx(0, k, i + 1)
            c, d = idx(1, k, i + 1), idx(1, k, i)
            faces.append((a, b, c, d) if k == 0 else (a, d, c, b))
    return Builder().add(verts, faces)


def mirror(ob, name, col):
    me = ob.data.copy()
    for v in me.vertices:
        v.co.z = -v.co.z
    me.flip_normals()
    o2 = bpy.data.objects.new(name, me)
    col.objects.link(o2)
    return o2


def build_muscles(S, F, bones, col):
    import muscles_table
    table = muscles_table.table(S)
    F['_order'] = [k for k in F if '_' in k and k.split('_')[0] in ('C', 'T', 'L') and k.split('_')[1].isdigit()]
    F['_nribs'] = S['vertebrae'][1]
    F['_linea'] = catmull([V(p) for p in S['linea']], 80)
    mm = 0.001 * S.get('muscle_scale', 1.0)
    built, deeper = [], []
    left_bones = [b for b in bones if not b.name.endswith('_R')]
    hull = guide_hull(S, F, col)
    s, tag = -1, 'L'
    order = sorted(range(len(table)), key=lambda k: (table[k]['layer'], k))
    tree_cache, bone_trees = {}, {}
    for k in order:
        m = table[k]
        try:
            O = expand(m['o'], F, tag, s)
            I = expand(m['i'], F, tag, s)
            via = expand(m.get('via', []), F, tag, s)
        except KeyError as e:
            print('MISSING landmark', m['id'], e, flush=True)
            continue
        use_hull = m.get('hull', True)
        key = (len(deeper), use_hull)
        if key not in tree_cache:
            tree_cache = {k2: v2 for k2, v2 in tree_cache.items() if k2[1] == len(deeper)}
            tree_cache[key] = bvh_of(left_bones + deeper + (hull if use_hull else []))
        tree = tree_cache[key]
        mmk = mm * m.get('scale', 1.0)
        ctree = tree
        if m['shape'] != 'belly' and m.get('conform_to', 'body' if m['region'] == 'Neck & trunk' else 'all') == 'body':
            bkey = ('body', len(deeper))
            if bkey not in tree_cache:
                tree_cache[bkey] = bvh_of(deeper + hull)
            ctree = tree_cache[bkey]
        b = (build_belly if m['shape'] == 'belly' else build_sheet)(m, O, I, via, ctree, s, mmk)
        ob = b.obj(f"m_{m['id']}_L", col)
        if m.get('push', True):
            # Bellies only clear bone (neighbouring bellies may touch, as in a
            # dissection); sheets also clear the deeper muscles they drape over.
            ptree = tree
            if m['shape'] == 'belly':
                bk = ('bones', use_hull)
                if bk not in bone_trees:
                    bone_trees[bk] = bvh_of(left_bones + (hull if use_hull else []))
                ptree = bone_trees[bk]
            push_out(ob, ptree, GAP, iterations=2)
        smooth(ob, 3, 0.45)
        decimate(ob, m.get('tris', 1800))
        # Sanity check: a muscle should not extend far beyond its attachments.
        pts = O + I + via
        span = max((a - b).length for a in pts for b in pts) if len(pts) > 1 else 0.01
        vs = [v.co for v in ob.data.vertices]
        ext = max((max(v[i] for v in vs) - min(v[i] for v in vs)) for i in range(3))
        if ext > span * 1.6 + 0.012:
            print(f'WARN {m["id"]}: extent {ext * 1000:.0f} mm vs span {span * 1000:.0f} mm', flush=True)
        deeper.append(ob)
        meta = {k2: m[k2] for k2 in ('label', 'action', 'study') if k2 in m}
        meta['depth'] = 'deep' if m['layer'] < 3 else 'superficial'
        meta['layer'] = m['layer']
        built.append((ob.name, 'muscle', m['region'], ob, meta))
    for o in hull:
        bpy.data.objects.remove(o)
    out = []
    for name, system, region, ob, meta in built:
        out.append((name, system, region, ob, meta))
        out.append((name[:-2] + '_R', system, region, mirror(ob, name[:-2] + '_R', col), meta))
    return out


def guide_hull(S, F, col):
    """Hidden trunk and neck volume so flat muscles drape over a body shape
    where no bone lies beneath (abdominal wall, ventral neck). Not exported."""
    g = S['hull']
    b = Builder()
    for path, radii in g:
        b.tube([V(p) for p in path], [tuple(r) for r in radii], seg=24, hint=V(0, 1, 0), n=40)
    ob = b.obj('hull', col)
    return [ob]
