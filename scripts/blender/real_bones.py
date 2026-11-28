"""Replace the main retargeted bones with the bones of a complete skeleton
model of the species (CC BY, see docs/RIGHTS-AND-ATTRIBUTION.md).

The model's bones are separate shells. After a similarity alignment of its
axial skeleton onto the atlas, each atlas bone is matched to one shell:
vertebrae by their order along the spine, ribs by their order on each side,
and girdle and long bones by position and size. Each matched shell is fitted
onto the retargeted bone it replaces (similarity ICP from the principal
axes), so the joints, the pose rig and the muscles keep their places while
the bone takes the real shape. Paws, sternum and small bones stay retargeted.
"""
import os
import math
import bpy
import bmesh
import numpy as np
from mathutils import Matrix, Vector
import real_skulls as R

LIMB_BONES = ('Scapula', 'humerus', 'Radius', 'Ulna', 'Femoris', 'Tibia', 'Fibula', 'Patella')


def _shells(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    lo, hi = R._bbox([v.co for v in ob.data.vertices])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=(hi - lo).length * 2e-5)
    bm.verts.ensure_lookup_table()
    comps = R._components(bm)
    P = np.array([v.co[:] for v in bm.verts])
    faces = [[v.index for v in f.verts] for f in bm.faces]
    bm.free()
    owner = np.empty(len(P), int)
    for k, c in enumerate(comps):
        owner[c] = k
    by = [[] for _ in comps]
    for f in faces:
        by[owner[f[0]]].append(f)
    out = []
    for k, c in enumerate(comps):
        if len(c) < 60:
            continue
        idx = {g: i for i, g in enumerate(c)}
        out.append({'P': P[c], 'F': [[idx[g] for g in f] for f in by[k]]})
    return out


def _similarity(a, b):
    """Least-squares similarity taking points a onto points b."""
    ma, mb = a.mean(0), b.mean(0)
    A, B = a - ma, b - mb
    U, sig, Vt = np.linalg.svd(B.T @ A)
    d = np.sign(np.linalg.det(U @ Vt))
    Rm = U @ np.diag([1, 1, d]) @ Vt
    s = (sig * [1, 1, d]).sum() / (A * A).sum()
    T = np.eye(4)
    T[:3, :3] = s * Rm
    T[:3, 3] = mb - s * Rm @ ma
    return T


def _axes(P):
    c = P.mean(0)
    w, v = np.linalg.eigh(np.cov((P - c).T))
    return c, v[:, ::-1], np.sqrt(np.maximum(w[::-1], 0))


def _fit(A, target, axes=False):
    """Similarity transform of shell points A onto the target bone mesh by ICP.
    The model is already aligned with the atlas, so the first start has no
    rotation (principal axes are ambiguous for vertebrae with long processes);
    with axes=True (limb bones, whose pose differs) the four proper matchings
    of the principal axes are tried as well. Returns the transform with the
    smallest mean two-way distance, and that distance."""
    tree = R._tree(target.data)
    Bp = np.array([v.co[:] for v in target.data.vertices])
    s0 = float(np.linalg.norm(np.ptp(Bp, 0)) / max(np.linalg.norm(np.ptp(A, 0)), 1e-9))
    sub = A[:: max(1, len(A) // 1500)]
    back = Bp[:: max(1, len(Bp) // 600)]
    starts = [np.eye(3)]
    if axes:
        _, va, _ = _axes(A)
        _, vb, _ = _axes(Bp)
        starts += [vb @ np.diag([x, y, x * y]) @ va.T for x, y in ((1, 1), (1, -1), (-1, 1), (-1, -1))]
    best = None
    for Rm in starts:
        T = np.eye(4)
        T[:3, :3] = s0 * Rm
        T[:3, 3] = Bp.mean(0) - s0 * Rm @ A.mean(0)
        for _ in range(30):
            cur = sub @ T[:3, :3].T + T[:3, 3]
            near = np.array([tree.find_nearest(Vector(p))[0][:] for p in cur])
            T = _similarity(cur, near) @ T
        cur = sub @ T[:3, :3].T + T[:3, 3]
        d1 = np.mean([tree.find_nearest(Vector(p))[3] for p in cur])
        d2 = np.mean(np.min(np.linalg.norm(back[:, None] - cur[None, ::4], axis=2), axis=1))
        if best is None or d1 + d2 < best[1]:
            best = (T, d1 + d2)
    return best


def _mesh(name, P, F, tris):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(p) for p in P], [], F)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    R._decimate(ob, tris)
    return ob


def replace_bones(parts, S):
    cfg = S.get('skeleton_scan')
    if not cfg:
        return
    path = os.path.join(R.SCANS, cfg['file'])
    if not os.path.exists(path):
        print(f'skeleton scan missing ({path}); keeping the retargeted bones', flush=True)
        return
    by = {p['id']: p for p in parts}
    src = R._import(path)
    # Model frame (x lateral, y caudal, z dorsal) -> atlas (x rostral, y dorsal, z lateral); a rotation.
    src.data.transform(Matrix(((0, -1, 0, 0), (0, 0, 1, 0), (-1, 0, 0, 0), (0, 0, 0, 1))))
    shells = _shells(src)
    bpy.data.objects.remove(src)
    for s in shells:
        s['c'] = s['P'].mean(0)
        s['ext'] = np.ptp(s['P'], 0)
        s['size'] = float(np.linalg.norm(s['ext']))
    # Global alignment on the axial skeleton: the spine shells (midline, dorsal).
    atlas_pts = lambda pid: np.array([v.co[:] for v in by[pid]['ob'].data.vertices])  # noqa: E731
    axial = [pid for pid in by if pid.split('_')[0] in ('C', 'T', 'L') or pid in ('Sacrum', 'Pelvis')]
    ap = np.vstack([atlas_pts(pid) for pid in axial])
    shell_mid = [s for s in shells if abs(s['c'][2]) < 0.15 * s['size'] + 0.02 * np.ptp(ap[:, 0])]
    big = max(shells, key=lambda s: len(s['P']))  # the skull (the atlas keeps its own scan)
    # Scale and offset from the span between the skull and the caudal end of the pelvis.
    pel = max((s for s in shells if s is not big), key=lambda s: s['ext'][2] * s['ext'][1] * s['ext'][0])
    atl_lo = atlas_pts('Pelvis')[:, 0].min()
    atl_hi = atlas_pts('C_1')[:, 0].max()
    mod_lo = pel['P'][:, 0].min()
    mod_hi = big['P'][:, 0].min()  # caudal end of the skull ~ C1
    scale = (atl_hi - atl_lo) / (mod_hi - mod_lo)
    for s in shells:
        s['P'] = s['P'] * scale
        s['c'] = s['c'] * scale
        s['ext'] = s['ext'] * scale
        s['size'] *= scale
    # Height: the vertebral columns meet (median of the spine shells against the
    # atlas vertebrae), so a different pelvis or limb pose does not shift it.
    dx = atl_lo - mod_lo * scale
    l3 = float(np.linalg.norm(np.ptp(atlas_pts('L_3'), 0)))
    col = [s['c'][1] for s in shell_mid if s is not big and s is not pel and s['size'] > 0.25 * l3
           and atl_lo < s['c'][0] + dx < big['P'][:, 0].min() + dx]
    vy = [atlas_pts(n)[:, 1].mean() for n in by if n.split('_')[0] in ('C', 'T', 'L') and n[2:].isdigit()]
    off = np.array([dx, float(np.median(vy) - np.median(col)), 0.0])
    for s in shells:
        s['P'] = s['P'] + off
        s['c'] = s['c'] + off
    used = {id(big), id(pel)}
    pairs = [('Pelvis', pel)]

    def take(pid, cands):
        cands = [s for s in cands if id(s) not in used]
        if not cands or pid not in by:
            return
        B = atlas_pts(pid)
        bc, bs = B.mean(0), float(np.linalg.norm(np.ptp(B, 0)))
        s = min(cands, key=lambda s: np.linalg.norm(s['c'] - bc) / bs + abs(math.log(s['size'] / bs)))
        used.add(id(s))
        pairs.append((pid, s))

    # Vertebrae by order along the spine (rostral to caudal), from C1 to L7.
    names = [f'C_{i}' for i in range(1, 8)] + [f'T_{i}' for i in range(1, 14)] + [f'L_{i}' for i in range(1, 8)]
    names = [n for n in names if n in by]
    top = np.median([atlas_pts(n)[:, 1].mean() for n in names])
    verts = sorted((s for s in shell_mid if id(s) not in used and s['c'][1] > top - 0.6 * np.ptp(atlas_pts('T_5')[:, 1])
                    and atl_lo - 0.02 < s['c'][0] < big['P'][:, 0].min() + 0.005),
                   key=lambda s: -s['c'][0])
    verts = [s for s in verts if s['size'] > 0.25 * float(np.linalg.norm(np.ptp(atlas_pts('L_3'), 0)))]
    for n, s in zip(names, verts):
        used.add(id(s))
        pairs.append((n, s))
    take('Sacrum', [s for s in shell_mid])
    # Girdle and long bones first, so a scapula is never taken for a rib.
    for b in LIMB_BONES:
        for side, sign in (('L', -1), ('R', 1)):
            take(f'{b}_{side}', [s for s in shells if s['c'][2] * sign > 0])
    # Ribs by order on each side, from rib-sized shells reaching up to the spine.
    for side, sign in (('L', -1), ('R', 1)):
        ribs = [f'Rib_{i}_{side}' for i in range(1, 14) if f'Rib_{i}_{side}' in by]
        if not ribs:
            continue
        sizes = [float(np.linalg.norm(np.ptp(atlas_pts(r), 0))) for r in ribs]
        r_lo = min(atlas_pts(r)[:, 0].min() for r in ribs) - 0.05
        r_hi = max(atlas_pts(r)[:, 0].max() for r in ribs) + 0.05
        # The model splits each rib into its bony part (reaching the spine) and
        # its cartilage; only bony parts qualify, ordered by the head's position.
        cands = sorted((s for s in shells if id(s) not in used and s['c'][2] * sign > 0.01 and r_lo < s['c'][0] < r_hi
                        and 0.25 * min(sizes) < s['size'] < 2.0 * max(sizes)
                        and s['P'][:, 1].max() > top - 0.2 * np.ptp(ap[:, 1])),
                       key=lambda s: -s['P'][np.argmax(s['P'][:, 1]), 0])
        print(f'ribs {side}: {len(cands)} candidates for {len(ribs)}', flush=True)
        for n, s in zip(ribs, cands):
            used.add(id(s))
            pairs.append((n, s))
    wanted = [pid for pid in by if pid.split('_')[0] in ('C', 'T', 'L', 'Rib') or pid in ('Sacrum', 'Pelvis')
              or pid.rsplit('_', 1)[0] in LIMB_BONES]
    matched = {pid for pid, _ in pairs}
    print('bone scan: unmatched', [pid for pid in wanted if pid not in matched], flush=True)
    replaced = 0
    for pid, s in pairs:
        target = by[pid]['ob']
        tris = cfg.get('tris', 1600) if pid not in ('Pelvis', 'Sacrum') else 3000
        ob = _mesh('scan_' + pid, s['P'], s['F'], tris)
        A = np.array([v.co[:] for v in ob.data.vertices])
        T, err = _fit(A, target, axes=pid.rsplit('_', 1)[0] in LIMB_BONES)
        size = float(np.linalg.norm(np.ptp(np.array([v.co[:] for v in target.data.vertices]), 0)))
        # Ribs are long and thin: their error relative to size runs higher.
        if err > cfg.get('max_error', 0.16) * size * (1.6 if pid.startswith('Rib') else 1.0):
            print(f'bone scan: {pid} rejected (fit error {err / size:.2f})', flush=True)
            bpy.data.objects.remove(ob)
            continue
        ob.data.transform(Matrix(T.tolist()))
        target.data = ob.data
        target.data.name = pid
        target['scan'] = 1
        by[pid]['meta'] = {**(by[pid].get('meta') or {}), 'scan': 'skeleton'}  # credited on the bone's card
        bpy.data.objects.remove(ob)
        replaced += 1
    print(f'bone scan: {replaced} of {len(pairs)} matched bones replaced by {cfg["file"]}', flush=True)


def replace_organs(organs, S):
    """Organs from a CT-based model of the species (CC BY), placed by one
    similarity that takes the model's organ centroids onto the atlas organs
    they replace. Materials name the organs; the kidneys are split by side."""
    cfg = S.get('organ_scan')
    if not cfg:
        return
    path = os.path.join(R.SCANS, cfg['file'])
    if not os.path.exists(path):
        print(f'organ scan missing ({path}); keeping the schematic organs', flush=True)
        return
    by = {p['id']: p for p in organs}
    before = {o.name for o in bpy.data.objects}
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o.name not in before]
    groups = {}
    for o in new:
        if o.type == 'MESH' and o.data.materials:
            groups.setdefault(o.data.materials[0].name, []).append(o)
    turn = Matrix(cfg['turn'])
    done, found = 0, []
    for key, (pids, tris) in cfg['map'].items():
        obs = [o for mat, g in groups.items() if key in mat for o in g]
        if not obs:
            continue
        P, F = [], []
        for o in obs:
            me = o.data.copy()
            me.transform(turn @ o.matrix_world)
            off = len(P)
            P += [v.co[:] for v in me.vertices]
            F += [[off + i for i in p.vertices] for p in me.polygons]
            bpy.data.meshes.remove(me)
        P = np.array(P)
        parts = [(pid, P, F) for pid in pids] if len(pids) == 1 else []
        if len(pids) == 2:  # left (-z) and right (+z) organ of a pair
            mid = np.median(P[:, 2])
            for pid, keep in ((pids[0], P[:, 2] < mid), (pids[1], P[:, 2] >= mid)):
                idx = np.flatnonzero(keep)
                remap = -np.ones(len(P), int)
                remap[idx] = np.arange(len(idx))
                parts.append((pid, P[idx], [[remap[i] for i in f] for f in F if keep[f[0]] and keep[f[1]] and keep[f[2]]]))
        for pid, Q, G in parts:
            if pid in by:
                found.append((pid, Q, G, tris))
    # One similarity for the whole model, from organ centroids to the atlas
    # organs: the real organs keep their shapes, sizes and relative positions.
    A = np.array([Q.mean(0) for _, Q, _, _ in found])
    B = np.array([np.array([v.co[:] for v in by[pid]['ob'].data.vertices]).mean(0) for pid, _, _, _ in found])
    T = Matrix(_similarity(A, B).tolist())
    for pid, Q, G, tris in found:
        ob = _mesh('scan_' + pid, Q, G, tris)
        ob.data.transform(T)
        target = by[pid]['ob']
        target.data = ob.data
        target.data.name = pid
        by[pid]['meta'] = {**(by[pid].get('meta') or {}), 'scan': 'organs'}
        bpy.data.objects.remove(ob)
        done += 1
    for o in new:
        if o.name in bpy.data.objects:
            bpy.data.objects.remove(o)
    print(f'organ scan: {done} organs replaced by {cfg["file"]}', flush=True)


def replace_single(parts, S):
    """Scans of single bones (S['bone_scans'] = {bone: file}), fitted onto the
    retargeted bone on both sides; the mirror image of the scan is tried as
    well, since a scan shows one side only, and the better fit wins."""
    scans = S.get('bone_scans') or {}
    by = {p['id']: p for p in parts}
    done = 0
    for bone, f in scans.items():
        path = os.path.join(R.SCANS, f)
        if not os.path.exists(path):
            print(f'bone scan missing ({path})', flush=True)
            continue
        src = R._import(path)
        R._decimate(src, 6000)
        P = np.array([v.co[:] for v in src.data.vertices])
        F = [list(p.vertices) for p in src.data.polygons]
        bpy.data.objects.remove(src)
        for side in ('L', 'R'):
            pid = f'{bone}_{side}'
            if pid not in by:
                continue
            target = by[pid]['ob']
            best = None
            for mirror in (1, -1):
                ob = _mesh('scan_' + pid, P * [1, 1, mirror], F, 1800)
                A = np.array([v.co[:] for v in ob.data.vertices])
                T, err = _fit(A, target, axes=True)
                if best is None or err < best[1]:
                    if best:
                        bpy.data.objects.remove(best[0])
                    best = (ob, err, T)
                else:
                    bpy.data.objects.remove(ob)
            ob, err, T = best
            ob.data.transform(Matrix(T.tolist()))
            target.data = ob.data
            target.data.name = pid
            target['scan'] = 1
            by[pid]['meta'] = {**(by[pid].get('meta') or {}), 'scan': 'bone'}
            bpy.data.objects.remove(ob)
            done += 1
    if scans:
        print(f'single bone scans: {done} bones replaced', flush=True)
