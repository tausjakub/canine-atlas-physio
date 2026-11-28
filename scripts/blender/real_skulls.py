"""Replace the retargeted dog skull and mandible with scans of real specimens,
then bend the head's soft tissue onto them.

The scans (CC BY 4.0, see docs/RIGHTS-AND-ATTRIBUTION.md) are downloaded into
work/scans/<species>/ by scripts/download-scans.mjs. Each is decimated, turned
into the atlas frame (x rostral, y dorsal), scaled uniformly so its length
matches the retargeted skull and centred on it, so the true bone shape keeps
the warped head's size and position.

Scans of an articulated skull (mandible closed on the skull) keep that
articulation: the mandible is split off along the creases where the two bones
meet and takes the skull's fit. A mandible from a separate file is placed on
the retargeted mandible instead.

follow_skull() then moves the head's muscles, skin, organs and nerves by the
displacement between the retargeted (dog-derived) bone surfaces and the scan,
so they wrap the real skull instead of the old one.
"""
import os
import math
import bpy
import bmesh
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

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
    # Scans come with mixed triangle winding: make every island face outwards
    # (shading in the viewer and the inside test in follow_skull rely on it).
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()


def _bbox(vs):
    lo = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    hi = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    return lo, hi


def _orient(ob, up):
    """Turn a scan into the atlas frame: dorsal +y, long axis x, rostral +x.
    The rostral end is the one with the smaller cross-section (muzzle, incisors)."""
    if up == 'z':
        ob.data.transform(Matrix.Rotation(math.radians(-90), 4, 'X'))
    P = np.array([v.co[:] for v in ob.data.vertices])
    ext = P.max(0) - P.min(0)
    if ext[2] > ext[0]:  # long axis lies along z: turn it onto x
        ob.data.transform(Matrix.Rotation(math.radians(90), 4, 'Y'))
        P = np.array([v.co[:] for v in ob.data.vertices])
    x0, x1 = P[:, 0].min(), P[:, 0].max()

    def section(lo, hi):
        s = P[(P[:, 0] >= lo) & (P[:, 0] <= hi)]
        return np.ptp(s[:, 1]) * np.ptp(s[:, 2]) if len(s) > 10 else 0
    L = x1 - x0
    if section(x0, x0 + 0.12 * L) < section(x1 - 0.12 * L, x1):
        ob.data.transform(Matrix.Rotation(math.pi, 4, 'Y'))


def _components(bm):
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
    return comps


def _split_mandible(ob):
    """Scans with the mandible as separate islands: the mandible is the set of
    islands whose centre lies ventral to the cranium's main island."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.verts.ensure_lookup_table()
    comps = _components(bm)
    main = comps[0]
    ys = [bm.verts[i].co.y for i in main]
    cy, h = sum(ys) / len(ys), max(ys) - min(ys)
    jaw = [c for c in comps[1:] if len(c) > 0.05 * len(main) and sum(bm.verts[i].co.y for i in c) / len(c) < cy - 0.15 * h]
    bm.free()
    if not jaw:
        return None
    keep = set().union(*jaw)
    return _extract(ob, lambda i: i in keep)


def _extract(ob, take):
    """Move the vertices for which take(index) holds into a new object."""
    jo = bpy.data.objects.new('scan_jaw', ob.data.copy())
    bpy.context.scene.collection.objects.link(jo)
    for target, drop in ((jo, lambda i: not take(i)), (ob, take)):
        b = bmesh.new()
        b.from_mesh(target.data)
        b.verts.ensure_lookup_table()
        bmesh.ops.delete(b, geom=[v for v in b.verts if drop(v.index)], context='VERTS')
        b.to_mesh(target.data)
        b.free()
    return jo


def _crease_labels(ob, seeds, iters=3000):
    """Random-walker segmentation of one connected surface: each label's
    probability is harmonic over the mesh, fixed at its seed vertices. Edges
    across concave creases (where two bones touch) conduct little, so the
    labels meet there. seeds: list of boolean masks; returns a label per vertex."""
    me = ob.data
    n = len(me.vertices)
    P = np.array([v.co[:] for v in me.vertices])
    N = np.array([v.normal[:] for v in me.vertices])
    E = np.array([e.vertices[:] for e in me.edges])
    i, j = E[:, 0], E[:, 1]
    d = P[j] - P[i]
    L = np.ptp(P[:, 0])
    kappa = np.einsum('ij,ij->i', N[j] - N[i], d) / np.maximum(np.einsum('ij,ij->i', d, d), 1e-18)
    w = np.maximum(np.exp(np.minimum(kappa, 0) * L * 0.02), 1e-3)
    deg = np.bincount(i, w, n) + np.bincount(j, w, n) + 1e-12
    fixed = np.any(seeds, axis=0)
    free = ~fixed

    def lap(x):  # Laplacian times x, rows of fixed vertices zeroed
        y = deg * x - np.bincount(i, w * x[j], n) - np.bincount(j, w * x[i], n)
        y[fixed] = 0
        return y
    probs = []
    for mask in seeds:
        # Solve L_uu f_u = -L_us f_s with Jacobi-preconditioned conjugate gradients.
        fs = np.where(mask, 1.0, 0.0)
        b = -lap(fs)
        x = np.zeros(n)
        r = b.copy()
        z = r / deg
        p = z.copy()
        rz = r @ z
        for _ in range(iters):
            Ap = lap(p * free)
            a = rz / max(p @ Ap, 1e-30)
            x += a * p
            r -= a * Ap
            if np.sqrt(r @ r) < 1e-9 * np.sqrt(b @ b):
                break
            z = r / deg
            rz, rz_old = r @ z, rz
            p = z + (rz / rz_old) * p
        probs.append(np.where(free, x, fs))
    return np.argmax(probs, axis=0)


def _line_seeds(ob, line, margin=2.0):
    """Seeds from a side-view polyline z_cut(x) in the scan's own frame (before
    turning): vertices well below it are mandible, well above it skull."""
    xs = [x for x, _ in line]
    P = np.array([v.co[:] for v in ob.data.vertices])
    zc = np.interp(P[:, 0], xs, [z for _, z in line])
    return [P[:, 2] > zc + margin, P[:, 2] < zc - margin]


def _split_by_creases(ob, drop_caudal, seeds=None):
    """Articulated scans fused into one surface: label skull, mandible and (if
    asked) a fused atlas from seeds on the vault, the ventral border of the
    mandible and the caudal end; returns the mandible object."""
    P = np.array([v.co[:] for v in ob.data.vertices])
    lo, hi = P.min(0), P.max(0)
    H, L = hi[1] - lo[1], hi[0] - lo[0]
    seeds = seeds or [P[:, 1] > hi[1] - 0.1 * H,
                      (P[:, 1] < lo[1] + 0.04 * H) & (P[:, 0] > lo[0] + 0.25 * L)]
    if drop_caudal:
        seeds.append(P[:, 0] < lo[0] + 0.03 * L)
    lab = _crease_labels(ob, seeds)
    # Keep each bone's largest island; stray bits go to the skull.
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.verts.ensure_lookup_table()
    for k in range(1, len(seeds)):
        seen, comps = set(), []
        for v in bm.verts:
            if lab[v.index] != k or v.index in seen:
                continue
            stack, comp = [v], []
            seen.add(v.index)
            while stack:
                a = stack.pop()
                comp.append(a.index)
                for e in a.link_edges:
                    b = e.other_vert(a)
                    if lab[b.index] == k and b.index not in seen:
                        seen.add(b.index)
                        stack.append(b)
            comps.append(comp)
        comps.sort(key=len, reverse=True)
        for c in comps[1:]:
            lab[c] = 0
    bm.free()
    print('crease split:', [int((lab == k).sum()) for k in range(len(seeds))], flush=True)
    if drop_caudal:  # the atlas is not part of the skull part
        atlas = _extract(ob, lambda i: lab[i] == 2)
        bpy.data.objects.remove(atlas)
        lab = lab[lab != 2]
    return _extract(ob, lambda i: lab[i] == 1)


def _points(ob, n=3000):
    vs = ob.data.vertices
    step = max(1, len(vs) // n)
    return np.array([vs[i].co[:] for i in range(0, len(vs), step)])


def _icp(src, dst, scale, iters=40):
    """Similarity (or rigid) ICP of points src onto the surface of object dst;
    returns the 4x4 transform. Starts from matching bounding boxes."""
    tree = _tree(dst.data)
    D = np.array([v.co[:] for v in dst.data.vertices])
    s0 = np.ptp(D[:, 0]) / np.ptp(src[:, 0]) if scale else 1.0
    T = np.eye(4)
    T[:3, :3] *= s0
    T[:3, 3] = (D.min(0) + D.max(0)) / 2 - s0 * (src.min(0) + src.max(0)) / 2
    for _ in range(iters):
        cur = src @ T[:3, :3].T + T[:3, 3]
        tgt = np.array([tree.find_nearest(Vector(p))[0][:] for p in cur])
        mc, mt = cur.mean(0), tgt.mean(0)
        a, b = cur - mc, tgt - mt
        U, sig, Vt = np.linalg.svd(b.T @ a)
        d = np.sign(np.linalg.det(U @ Vt))
        R = U @ np.diag([1, 1, d]) @ Vt
        s = (sig * [1, 1, d]).sum() / (a * a).sum() if scale else 1.0
        step = np.eye(4)
        step[:3, :3] = s * R
        step[:3, 3] = mt - s * R @ mc
        T = step @ T
    return Matrix(T.tolist())


def _close_mouth(skull_ob, jaw_ob, max_deg=25):
    """Rotate the mandible about its condyle (the dorsal-most point of its
    caudal end) in 0.5 degree steps until the teeth meet the skull."""
    tree = _tree(skull_ob.data)
    J = _points(jaw_ob, 2500)
    L = np.ptp(J[:, 0])
    tail = J[J[:, 0] < J[:, 0].min() + 0.15 * L]
    pivot = tail[np.argmax(tail[:, 1])]
    front = J[J[:, 0] > pivot[0] + 0.25 * L]  # teeth and body, away from the joint
    eps = 0.006 * L

    def contacts(deg):
        R = np.array(Matrix.Rotation(math.radians(deg), 3, 'Z'))
        P = (front - pivot) @ R.T + pivot
        return sum(tree.find_nearest(Vector(p))[3] < eps for p in P)
    deg = 0.0
    while deg < max_deg and contacts(deg + 0.5) < 15:
        deg += 0.5
    jaw_ob.data.transform(Matrix.Translation(Vector(pivot)) @ Matrix.Rotation(math.radians(deg), 4, 'Z')
                          @ Matrix.Translation(-Vector(pivot)))
    print(f'mandible closed by {deg:.1f} deg', flush=True)


def _articulate(skull_ob, jaw_ob, cfg):
    """A skull and mandible scanned apart: register both onto a reference scan
    of an articulated skull (another specimen of the same group, used only for
    the placement) and bring the mandible into the skull's frame."""
    ref = _import(os.path.join(SCANS, cfg['reference']))
    _decimate(ref, 40000)
    _orient(ref, cfg.get('reference_up', cfg.get('up')))
    ref_jaw = _split_mandible(ref) or _split_by_creases(ref, False)
    Ts = _icp(_points(skull_ob), ref, scale=True)
    s = Ts.to_scale()[0]
    J = _points(jaw_ob) * s  # skull's scale; the jaw only moves rigidly
    Tj = _icp(J, ref_jaw, scale=False)
    jaw_ob.data.transform(Ts.inverted() @ Tj @ Matrix.Scale(s, 4))
    for o in (ref, ref_jaw):
        bpy.data.objects.remove(o)
    _close_mouth(skull_ob, jaw_ob)
    print('mandible articulated on reference', cfg['reference'], flush=True)


def _snap_to_atlas(by, meshes):
    """Seat the occipital condyles in the atlas: the condyles are the caudal-
    most bone in the ventral half of the skull's caudal face (beside the
    foramen magnum), the atlas' cranial articular foveae the cranial part of
    C1 near the midline. The skull and mandible move together by the offset."""
    if 'C_1' not in by:
        return
    P = np.array([v.co[:] for v in meshes[0].vertices])
    lo, hi = P.min(0), P.max(0)
    L, W = hi[0] - lo[0], hi[2] - lo[2]
    slab = P[(P[:, 0] < lo[0] + 0.1 * L) & (np.abs(P[:, 2] - (lo[2] + hi[2]) / 2) < 0.25 * W)]
    low = slab[slab[:, 1] < np.median(slab[:, 1])]
    cond = low[low[:, 0] < np.percentile(low[:, 0], 30)].mean(0)
    A = np.array([v.co[:] for v in by['C_1']['ob'].data.vertices])
    alo, ahi = A.min(0), A.max(0)
    fov = A[(A[:, 0] > ahi[0] - 0.3 * (ahi[0] - alo[0])) & (np.abs(A[:, 2] - (alo[2] + ahi[2]) / 2) < 0.35 * (ahi[2] - alo[2]))]
    if not len(fov):
        return
    d = fov.mean(0) - cond
    d[2] = 0.0  # both are on the midline
    for me in meshes:
        me.transform(Matrix.Translation(Vector(d)))
    print(f'skull seated on the atlas: moved {np.linalg.norm(d) * 1000:.1f} mm', flush=True)


def replace_skull(parts, S):
    """Returns the retargeted skull and mandible surfaces (for follow_skull), or None."""
    cfg = S.get('skull_scan')
    if not cfg:
        return None
    path = os.path.join(SCANS, cfg['skull'])
    if not os.path.exists(path):
        print(f'skull scan missing ({path}); keeping the retargeted skull', flush=True)
        return None
    by = {p['id']: p for p in parts}
    old = {pid: by[pid]['ob'].data.copy() for pid in ('MergedSkull', 'Jaw') if pid in by}
    skull_ob = _import(path)
    separate = bool(cfg.get('jaw'))
    seeds = None
    if not separate:
        _decimate(skull_ob, cfg.get('tris', 40000) + cfg.get('jaw_tris', 15000))
        if cfg.get('jaw_cut'):
            seeds = _line_seeds(skull_ob, cfg['jaw_cut'])
    _orient(skull_ob, cfg.get('up'))
    if separate:
        jaw_ob = _import(os.path.join(SCANS, cfg['jaw']))
        _orient(jaw_ob, cfg.get('up'))
        if cfg.get('reference'):
            _decimate(skull_ob, cfg.get('tris', 40000))
            _decimate(jaw_ob, cfg.get('jaw_tris', 15000))
            _articulate(skull_ob, jaw_ob, cfg)
            separate = False  # now articulated: the mandible takes the skull's fit
    else:
        jaw_ob = _split_mandible(skull_ob) or _split_by_creases(skull_ob, cfg.get('drop_caudal', False), seeds)
    skull_fit = None
    for pid, ob in (('MergedSkull', skull_ob), ('Jaw', jaw_ob)):
        if ob is None or pid not in by:
            continue
        _decimate(ob, cfg.get('tris', 40000) if pid == 'MergedSkull' else cfg.get('jaw_tris', 15000))
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
    _snap_to_atlas(by, [by[pid]['ob'].data for pid in ('MergedSkull', 'Jaw') if pid in by])
    return old


def fit_brain(organs, skull):
    """Fit the (dog-derived) brain into the real skull: find the cavity the
    caudal part of the scan encloses and map the brain's box onto it.
    Returns the map (old box, new centre, per-axis scale) for follow_skull."""
    import organs as O
    from common import bvh_of
    brain = [p for p in organs if p['id'].startswith('brain_')]
    if not brain:
        return None
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
        return None
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
    return (blo, bhi, bc, cc_, k)


def _tree(me):
    return BVHTree.FromPolygons([v.co for v in me.vertices], [p.vertices[:] for p in me.polygons])


def _tps(X, Y, lam):
    """3D thin-plate spline with an affine part mapping X to Y, smoothed by
    lam; returns a function of an (n, 3) array. The kernel is -r, which is
    conditionally positive definite, so adding lam to the diagonal stays stable."""
    n = len(X)
    K = -np.linalg.norm(X[:, None] - X[None], axis=2)
    P = np.hstack([np.ones((n, 1)), X])
    A = np.zeros((n + 4, n + 4))
    A[:n, :n] = K + lam * np.eye(n)
    A[:n, n:] = P
    A[n:, :n] = P.T
    sol = np.linalg.solve(A, np.vstack([Y, np.zeros((4, 3))]))
    w, a = sol[:n], sol[n:]

    def warp(Q):
        out = np.empty_like(Q)
        for s in range(0, len(Q), 20000):
            q = Q[s:s + 20000]
            out[s:s + 20000] = -np.linalg.norm(q[:, None] - X[None], axis=2) @ w + np.hstack([np.ones((len(q), 1)), q]) @ a
        return out
    return warp


def _head_warp(old, new, iters=8, lam_min=0.03):
    """Smooth space warp taking the retargeted skull and mandible onto the
    scans: non-rigid ICP with a thin-plate spline, matched both ways (old
    points to their nearest scan point, scan points to their nearest warped
    old point) and skull to skull, mandible to mandible; the stiffness drops
    over the iterations. Works in units of skull length."""
    rng = np.random.default_rng(0)
    olds, news, trees = [], [], []
    for pid in old:
        O = np.array([v.co[:] for v in old[pid].vertices])
        N = np.array([v.co[:] for v in new[pid].vertices])
        k = 260 if pid == 'MergedSkull' else 140
        olds.append(O[rng.choice(len(O), min(k, len(O)), replace=False)])
        news.append(N[rng.choice(len(N), min(k, len(N)), replace=False)])
        trees.append(_tree(new[pid]))
    allo = np.vstack(olds)
    c, L = allo.mean(0), np.ptp(allo[:, 0])
    norm = lambda A: (A - c) / L  # noqa: E731
    warp = lambda Q: Q  # noqa: E731
    for it in range(iters):
        X, Y = [], []
        for O, N, t in zip(olds, news, trees):
            Ow = warp(norm(O)) * L + c
            X.append(norm(O))
            Y.append(norm(np.array([t.find_nearest(Vector(p))[0][:] for p in Ow])))
            # Scan points pull the nearest warped old point onto them.
            near = np.argmin(np.linalg.norm(N[:, None] - Ow[None], axis=2), axis=1)
            X.append(norm(O[near]))
            Y.append(norm(N))
        X, Y = np.vstack(X), np.vstack(Y)
        X, keep = np.unique(np.round(X, 6), axis=0, return_index=True)
        Y = Y[keep]
        warp = _tps(X, Y, lam=max(lam_min, 0.5 * 0.6 ** it))
    return lambda Q: warp(norm(Q)) * L + c


def follow_skull(parts, old, brain_map=None):
    """Move the head's soft tissue with the bone: a smooth warp from the
    retargeted (dog-derived) skull and mandible to the scans, applied with a
    fall-off away from the head. Cranial nerves near the brain follow the
    brain's fit instead; muscle and skin that end up inside the new bone are
    pushed back to its surface."""
    by = {p['id']: p for p in parts}
    new = {pid: by[pid]['ob'].data for pid in old}
    warp = _head_warp(old, new)
    new_trees = [_tree(me) for me in new.values()]
    # Scan normals may face inwards: the sign of the enclosed volume tells.
    signs = []
    for me in new.values():
        P = np.array([v.co[:] for v in me.vertices])
        F = np.array([p.vertices[:3] for p in me.polygons])
        signs.append(1.0 if np.einsum('ij,ij->i', P[F[:, 0]], np.cross(P[F[:, 1]], P[F[:, 2]])).sum() >= 0 else -1.0)
    old_trees = [_tree(me) for me in old.values()]
    lo, hi = _bbox([v.co for me in old.values() for v in me.vertices])
    nose = max(v.co.x for me in new.values() for v in me.vertices) - 0.01 * (hi.x - lo.x)
    L = hi.x - lo.x
    r_in, r_out = 0.1 * L, 0.45 * L
    moved = 0
    for p in parts:
        if p['system'] == 'bone' or p['id'].startswith('brain_'):
            continue
        ob = p['ob']
        vs = ob.data.vertices
        if not len(vs):
            continue
        plo, phi = _bbox([v.co for v in vs])
        if plo.x > hi.x + r_out or phi.x < lo.x - r_out:
            continue
        r = np.array([min(t.find_nearest(v.co)[3] for t in old_trees) for v in vs])
        if (r >= r_out).all():
            continue
        t = np.clip((r_out - r) / (r_out - r_in), 0, 1)
        w = (t * t * (3 - 2 * t))[:, None]
        Q = np.array([v.co[:] for v in vs])
        T = Q + (warp(Q) - Q) * w
        # Dog face muscles run to the tip of a long muzzle; the warp would
        # carry them past a short real rostrum: keep head tissue behind it.
        if p['system'] in ('muscle', 'surface', 'connective'):
            head = w[:, 0] > 0.5
            T[head, 0] = np.minimum(T[head, 0], nose)
        if brain_map is not None and p['id'].startswith('n_cranial'):
            blo, bhi, bc, cc, k = (np.array(x[:]) for x in brain_map)
            gap = np.maximum(np.maximum(blo - Q, Q - bhi), 0).max(1)
            wb = np.clip(1 - gap / (0.15 * L), 0, 1)[:, None]
            T = T * (1 - wb) + (cc + (Q - bc) * k) * wb
        for v, q in zip(vs, T):
            v.co = Vector(q)
        if p['system'] in ('muscle', 'surface'):
            for v in vs:
                for tr, sg in zip(new_trees, signs):
                    hit, nrm, _, d = tr.find_nearest(v.co)
                    if hit is not None and d < 0.03 * L and (v.co - hit).dot(nrm) * sg < 0:
                        v.co = hit + nrm * sg * 0.0004
        ob.data.update()
        moved += 1
    print(f'follow skull: {moved} soft parts warped onto the scanned skull', flush=True)
