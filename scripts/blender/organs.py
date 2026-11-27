"""Dog organs for the atlas (run inside Blender).

  blender --background --factory-startup --python scripts/blender/organs.py [-- --render]

Brain: the CC0 canine MRI population atlas (Johnson & Barry 2019, Cornell
eCommons, doi:10.7298/4t8z-aw34) read from private-assets/organs/, meshed
and fitted into the dog's cranial cavity. Every other organ is authored here
as a schematic study shape: the thoracic and abdominal cavities are found as
the empty space the dog's bones and muscles enclose, and each organ is a
voxel mask placed at a textbook position inside them, then meshed.

Writes work/organs/geometry.bin + parts.json (packed by
scripts/build-organ-models.mjs) and preview renders.
"""
import os
import sys
import json
import math
import time
import struct
import importlib
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402
import common  # noqa: E402
import nifti  # noqa: E402
import dog_import  # noqa: E402
for m in (common, nifti, dog_import):
    importlib.reload(m)
from common import clear_scene, bvh_of, remesh, smooth, decimate, tri_arrays, catmull  # noqa: E402

OUT = os.path.join(ROOT, 'work', 'organs')
BRAIN = os.path.join(ROOT, 'private-assets', 'organs', 'brain-johnson2019', 'unpacked', 'Johnson_etal_2019_Canine_Atlas')
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []


class Grid:
    """Axis-aligned voxel grid in atlas coordinates."""

    def __init__(self, lo, hi, h):
        self.lo, self.h = np.array(lo, float), h
        self.n = np.ceil((np.array(hi, float) - self.lo) / h).astype(int) + 1

    def centres(self):
        ax = [self.lo[i] + self.h * np.arange(self.n[i]) for i in range(3)]
        return np.stack(np.meshgrid(*ax, indexing='ij'), -1)

    def zeros(self):
        return np.zeros(tuple(self.n), bool)


def mask_to_mesh(mask, grid, name, col, tris=4000, smooth_it=6):
    """Boundary quads of a voxel mask, then voxel remesh + smoothing."""
    m = np.pad(mask, 1)
    verts, faces, index = [], [], {}

    def vid(c):
        k = (int(c[0]), int(c[1]), int(c[2]))
        if k not in index:
            index[k] = len(verts)
            verts.append(grid.lo + grid.h * (np.array(k) - 1.5))
        return index[k]

    for axis in range(3):
        d = np.diff(m.astype(np.int8), axis=axis)
        for sign in (1, -1):
            for c in np.argwhere(d == sign):
                c = c.copy()
                c[axis] += 1
                u, v = [(axis + 1) % 3, (axis + 2) % 3]
                q = []
                for du, dv in ((0, 0), (1, 0), (1, 1), (0, 1)):
                    p = c.copy()
                    p[u] += du
                    p[v] += dv
                    q.append(vid(p))
                faces.append(q if sign == -1 else q[::-1])
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.validate()
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    remesh(ob, grid.h * 0.7, smooth=0)
    smooth(ob, smooth_it, 0.5)
    decimate(ob, tris)
    ob['organ'] = 1
    return ob


def inside(tree, pts):
    """Points inside the tissue surface, judged by the nearest face normal."""
    out = np.zeros(len(pts), bool)
    for i, p in enumerate(pts):
        loc, nor, _, d = tree.find_nearest(Vector(p))
        out[i] = loc is not None and (Vector(p) - loc).dot(nor) < 0
    return out


def enclosed(tree, pts, dirs, reach):
    """Points from which a ray in every direction hits tissue within reach."""
    ok = np.ones(len(pts), bool)
    for i, p in enumerate(pts):
        v = Vector(p)
        for d in dirs:
            if tree.ray_cast(v, d, reach)[0] is None:
                ok[i] = False
                break
    return ok


def cavity(grid, tree, dirs, reach, region=None):
    c = grid.centres().reshape(-1, 3)
    sel = np.ones(len(c), bool) if region is None else region(c)
    idx = np.nonzero(sel)[0]
    e = enclosed(tree, c[idx], dirs, reach)
    idx = idx[e]
    idx = idx[~inside(tree, c[idx])]
    m = np.zeros(len(c), bool)
    m[idx] = True
    return m.reshape(tuple(grid.n))


def largest_component(mask, frac=None):
    """Keep the largest 6-connected component (flood fill, no scipy), or with frac
    every component of at least frac times its size."""
    lab = np.zeros(mask.shape, np.int32)
    best, best_n, cur, sizes = 0, 0, 0, [0]
    for seed in map(tuple, np.argwhere(mask)):
        if lab[seed]:
            continue
        cur += 1
        stack, n = [seed], 0
        lab[seed] = cur
        while stack:
            p = stack.pop()
            n += 1
            for a in range(3):
                for s in (-1, 1):
                    q = list(p)
                    q[a] += s
                    q = tuple(q)
                    if 0 <= q[a] < mask.shape[a] and mask[q] and not lab[q]:
                        lab[q] = cur
                        stack.append(q)
        sizes.append(n)
        if n > best_n:
            best, best_n = cur, n
    if frac is not None:
        return (np.array(sizes) >= frac * best_n)[lab] & mask
    return lab == best


def dilate(mask, k=1):
    # shortcut: np.roll wraps at the grid edge; masks here never touch it.
    m = mask.copy()
    for _ in range(k):
        n = m.copy()
        for a in range(3):
            n |= np.roll(m, 1, a) | np.roll(m, -1, a)
        m = n
    return m


def erode(mask, k=1):
    return ~dilate(~mask, k)


def bbox(mask, grid):
    i = np.argwhere(mask)
    return grid.lo + grid.h * i.min(0), grid.lo + grid.h * i.max(0)


def blur(m):
    """3x3x3 box blur of a mask (as float), edges padded."""
    f = np.pad(m.astype(np.float32), 1, mode='edge')
    n = m.shape
    return sum(f[i:i + n[0], j:j + n[1], k:k + n[2]] for i in range(3) for j in range(3) for k in range(3)) / 27


def sample(g, field, G):
    """Trilinear sample of a coarse float field at another grid's centres."""
    f = (G.centres() - g.lo) / g.h
    f = np.clip(f, 0, np.array(field.shape) - 1)
    return trilinear(field, f[..., 0], f[..., 1], f[..., 2])


def fine_mask(g, fn, allowed, h=0.0015, pad=0.006):
    """Evaluate the shape fn(grid) on a finer grid around its coarse footprint,
    clipped to a smoothly interpolated allowed mask, so organs mesh without
    coarse-voxel stair steps."""
    coarse = fn(g) & allowed
    if coarse.sum() == 0:
        return g, coarse
    lo, hi = bbox(coarse, g)
    fg = Grid(lo - pad, hi + pad, h)
    return fg, fn(fg) & (sample(g, blur(allowed), fg) > 0.5)


# ---------------------------------------------------------------- brain

def brain_parts(cav_lo, cav_hi, grid):
    """Johnson 2019 masks resampled into the cranial cavity box (atlas frame)."""
    L = lambda f: nifti.load(os.path.join(BRAIN, f))[0]
    lab = L('whole_atlas_cortical_subcortical.nii.gz')
    brain = (L('TSMs/gm_mask.nii.gz') > 0.5) | (L('TSMs/wm_mask.nii.gz') > 0.5)
    cere = np.isin(lab, (223, 224))
    olf = np.isin(lab, (231, 232))
    # Voxel axes: i lateral (left low), j dorsal, k rostral.
    bi = np.argwhere(brain)
    b0, b1 = bi.min(0), bi.max(0)
    ci = np.argwhere(cere)
    k_cere = ci[:, 2].max()
    j_stem = ci[:, 1].min() + 0.35 * (ci[:, 1].max() - ci[:, 1].min())
    i_mid = (b0[0] + b1[0]) / 2
    K, J, I = np.meshgrid(*(np.arange(s) for s in brain.shape[::-1]), indexing='ij')
    I, J, K = I.transpose(2, 1, 0), J.transpose(2, 1, 0), K.transpose(2, 1, 0)
    # Medulla and pons under the cerebellum, tapering rostrally into the
    # midbrain under the cerebrum (a sloped cut instead of a box).
    half_w = 0.2 * (b1[0] - b0[0])
    stem = brain & ~cere & ~olf & (J < j_stem - 0.45 * np.maximum(0, K - k_cere)) & (K < k_cere + 30) & (np.abs(I - (b0[0] + b1[0]) / 2) < half_w)
    cerebrum = brain & ~cere & ~olf & ~stem
    masks = {'brain_cerebrum_L': cerebrum & (I < i_mid), 'brain_cerebrum_R': cerebrum & (I >= i_mid),
             'brain_cerebellum': cere, 'brain_stem': stem, 'brain_olfactory_bulbs': olf}
    # Map atlas-frame grid centres to voxel indices (fit brain box to cavity box).
    c = grid.centres()
    lo, hi = np.array(cav_lo), np.array(cav_hi)
    t = (c - lo) / (hi - lo)  # 0..1 in x (rostral), y (dorsal), z (left..right)
    t = np.clip(t, 0, 1)
    fi = b0[0] + t[..., 2] * (b1[0] - b0[0])
    fj = b0[1] + t[..., 1] * (b1[1] - b0[1])
    fk = b0[2] + t[..., 0] * (b1[2] - b0[2])
    out = {}
    for name, m in masks.items():
        # Trilinear sampling of the binary mask, thresholded at 0.5: smooth
        # boundaries instead of nearest-voxel staircases.
        out[name] = trilinear(m.astype(np.float32), fi, fj, fk) > 0.5
    return out


def trilinear(vol, fi, fj, fk):
    i0 = np.clip(np.floor(fi).astype(int), 0, vol.shape[0] - 2)
    j0 = np.clip(np.floor(fj).astype(int), 0, vol.shape[1] - 2)
    k0 = np.clip(np.floor(fk).astype(int), 0, vol.shape[2] - 2)
    di, dj, dk = fi - i0, fj - j0, fk - k0
    r = 0
    for a in (0, 1):
        for b in (0, 1):
            for c in (0, 1):
                w = (di if a else 1 - di) * (dj if b else 1 - dj) * (dk if c else 1 - dk)
                r = r + w * vol[i0 + a, j0 + b, k0 + c]
    return r


def hits(tree, origin, d, reach):
    """All surface crossings along a ray, as distances."""
    out, o, travelled = [], Vector(origin), 0.0
    while travelled < reach:
        loc, nor, _, dist = tree.ray_cast(o, d, reach - travelled)
        if loc is None:
            break
        travelled += dist
        out.append(travelled)
        o = loc + d * 1e-5
        travelled += 1e-5
    return out


def canal_line(by):
    """Vertebral canal centre line: a downward ray at the midline crosses the
    spinous process and arch, then the canal (empty), then the body."""
    import bmesh  # noqa: F401
    vert = [n for n in by if n.startswith(('C_', 'L_')) or n in ('Ribcage', 'Sacrum')]
    tree = bvh_of([by[n] for n in vert])
    xs = np.arange(0.27, -0.29, -0.004)
    pts = []
    down = Vector((0, -1, 0))
    for x in xs:
        h = hits(tree, (x, 0.75, 0.0), down, 0.5)
        for a, b in zip(h[1::2], h[2::2]):  # exit of a solid, entry of the next
            gap = b - a
            if 0.004 < gap < 0.025:
                pts.append((x, 0.75 - (a + b) / 2))
                break
    pts = np.array(pts)
    # Robust smoothing: running median then mean.
    y = np.array([np.median(pts[max(0, i - 4):i + 5, 1]) for i in range(len(pts))])
    y = np.convolve(np.pad(y, 3, mode='edge'), np.ones(7) / 7, mode='valid')
    return [Vector((x, yy, 0)) for x, yy in zip(pts[:, 0], y)]


def tube_mask(grid, pts, radius, n=None):
    """Voxels within radius(u) of a Catmull-Rom path through pts."""
    path = catmull([Vector(p) for p in pts], n or max(40, len(pts) * 20))
    c = grid.centres()
    m = grid.zeros()
    for i, p in enumerate(path):
        r = radius(i / (len(path) - 1)) if callable(radius) else radius
        lo = np.maximum(0, np.floor((np.array(p) - r - grid.lo) / grid.h).astype(int))
        hi = np.minimum(grid.n, np.ceil((np.array(p) + r - grid.lo) / grid.h).astype(int) + 1)
        sub = c[lo[0]:hi[0], lo[1]:hi[1], lo[2]:hi[2]]
        m[lo[0]:hi[0], lo[1]:hi[1], lo[2]:hi[2]] |= ((sub - np.array(p)) ** 2).sum(-1) <= r * r
    return m


def ellipsoid_mask(grid, c, r, axes=None):
    q = grid.centres() - np.array(c)
    if axes is not None:
        q = q @ np.array(axes).T
    return ((q / np.array(r)) ** 2).sum(-1) <= 1


def hull2d(p):
    """Convex hull (monotone chain) of 2D points, counter-clockwise."""
    p = sorted(set(map(tuple, np.round(p, 5))))
    if len(p) < 3:
        return np.array(p)

    def half(pts):
        h = []
        for q in pts:
            while len(h) >= 2 and (h[-1][0] - h[-2][0]) * (q[1] - h[-2][1]) - (h[-1][1] - h[-2][1]) * (q[0] - h[-2][0]) <= 0:
                h.pop()
            h.append(q)
        return h[:-1]
    return np.array(half(p) + half(p[::-1]))


def in_hull(h, q):
    if len(h) < 3:
        return np.zeros(len(q), bool)
    ok = np.ones(len(q), bool)
    for a, b in zip(h, np.roll(h, -1, 0)):
        ok &= (b[0] - a[0]) * (q[:, 1] - a[1]) - (b[1] - a[1]) * (q[:, 0] - a[0]) >= 0
    return ok


def hull_cavity(grid, clouds, ceiling):
    """Per x slice: inside the convex hull (y, z) of the given vertex clouds
    and below `ceiling(x)` (the vertebral bodies)."""
    c = grid.centres()
    m = grid.zeros()
    for i in range(grid.n[0]):
        x = grid.lo[0] + grid.h * i
        pts = np.concatenate([v[np.abs(v[:, 0] - x) < 0.006][:, 1:] for v in clouds] + [np.zeros((0, 2))])
        if len(pts) < 8:
            continue
        q = c[i].reshape(-1, 3)
        m[i] = (in_hull(hull2d(pts), q[:, 1:]) & (q[:, 1] < ceiling(x))).reshape(m[i].shape)
    return m


def surface_x(tree, Y, Z, x_from, fallback):
    """x of the first surface met by a caudal-going ray from x_from at (y, z)."""
    out = np.full(Y.shape, fallback, float)
    d = Vector((-1, 0, 0))
    for idx in np.ndindex(Y.shape):
        loc = tree.ray_cast(Vector((x_from, Y[idx], Z[idx])), d, 1.0)[0]
        if loc is not None:
            out[idx] = loc.x
    return out


def verts_of(obs):
    return np.concatenate([np.array([ob.matrix_world @ v.co for v in ob.data.vertices]) for ob in obs])


def trunk(by, tissue, col, organs, t0):
    canal = canal_line(by)
    print('canal', len(canal), canal[0].to_tuple(3), canal[-1].to_tuple(3), flush=True)
    def canal_y(x):
        return float(np.interp(x, [p.x for p in canal][::-1], [p.y for p in canal][::-1]))

    def spine_floor(x):  # ventral surface of the vertebral bodies, below the canal
        return canal_y(x) - 0.03

    g = Grid((-0.4, 0.29, -0.095), (0.27, 0.66, 0.095), 0.0035)
    abd_ids = [n for n in by if any(k in n for k in ('obliquus_ext_abd', 'obliquus_int_abd', 'tranversus_abd', 'rectus_abd',
                                                     'abdominis_Aponeurosis', 'psoas', 'iliacus'))]
    rib = verts_of([by['Ribcage']])
    thorax_hull = hull_cavity(g, [rib], lambda x: canal_y(x) - 0.022)
    abd_hull = hull_cavity(g, [verts_of([by[n] for n in abd_ids]), rib, verts_of([by['Pelvis']])], lambda x: canal_y(x) - 0.022)
    c = g.centres()
    X, Y, Z = c[..., 0], c[..., 1], c[..., 2]
    hull = erode(thorax_hull | abd_hull, 1)
    flat = c[hull]
    keep = ~inside(tissue, flat)
    cav = g.zeros()
    cav[hull] = keep
    cav = largest_component(cav)
    # Split along the dog model's own diaphragm (analytic dome outside its footprint).
    dia_tree = bvh_of([by['m_diaphragma']])
    xd2 = surface_x(dia_tree, Y[0], Z[0], 0.2, np.nan)
    fallback = 0.02 - np.where(Y[0] > 0.41, 16.0, 7.0) * (Y[0] - 0.41) ** 2 - 20.0 * Z[0] ** 2
    xd2 = np.where(np.isnan(xd2), fallback, xd2)
    xd = np.broadcast_to(xd2, X.shape)
    T = cav & (X > xd + 0.004)
    A = cav & (X < xd - 0.004)
    print('cavities thorax', int(T.sum()), 'abdomen', int(A.sum()), bbox(T, g), bbox(A, g), f'{time.time() - t0:.1f}s', flush=True)

    def add(name, mask, tris=3000, it=6, allowed=None):
        """mask: a coarse voxel mask, or a shape function of a grid (meshed finer)."""
        allowed = g.zeros() | True if allowed is None else allowed
        grid, m = fine_mask(g, mask, allowed) if callable(mask) else (g, mask & allowed)
        m = largest_component(m, 0.2)  # drop clipping debris; keeps paired lobes
        if m.sum() < 8:
            print('MISSING', name, flush=True)
            return
        organs.append((name, mask_to_mesh(m, grid, name, col, tris=tris, smooth_it=it)))

    # ---- thorax
    heart_ax = Vector((-0.45, -0.85, -0.25)).normalized()
    side = heart_ax.cross(Vector((0, 0, 1))).normalized()
    third = heart_ax.cross(side).normalized()
    hc = (0.095, 0.375, -0.008)
    heart = ellipsoid_mask(g, hc, (0.058, 0.045, 0.04), axes=(heart_ax, side, third)) & T
    base = Vector(hc) - heart_ax * 0.045
    sx = lambda x: Vector((x, spine_floor(x) - 0.012, -0.01))
    aorta_f = lambda G: tube_mask(G, [base, base + Vector((0.02, 0.035, -0.004)), sx(0.08), sx(0.0), sx(-0.1), sx(-0.2)], 0.0075)
    cvc_f = lambda G: tube_mask(G, [Vector(hc) + Vector((-0.03, 0.0, 0.02)), Vector((0.0, 0.41, 0.022)),
                                    Vector((-0.08, spine_floor(-0.08) - 0.03, 0.018)), Vector((-0.2, spine_floor(-0.2) - 0.02, 0.012))], 0.008)
    aorta, cvc = aorta_f(g), cvc_f(g)
    carina = Vector((0.105, spine_floor(0.105) - 0.035, 0))
    trachea_pts = [Vector((0.245, 0.605, 0)), Vector((0.225, 0.565, 0)), Vector((0.19, 0.495, 0)), Vector((0.155, 0.445, 0)), carina]
    airway_f = lambda G: (tube_mask(G, trachea_pts, 0.009) | tube_mask(G, [carina, carina + Vector((-0.03, -0.01, -0.03))], 0.006)
                          | tube_mask(G, [carina, carina + Vector((-0.03, -0.01, 0.03))], 0.006))
    trachea = tube_mask(g, trachea_pts, 0.009)
    bronchi = airway_f(g) & ~trachea
    oes_pts = [Vector((0.255, 0.628, -0.004)), Vector((0.225, 0.585, -0.008)), Vector((0.18, 0.505, -0.01)),
               Vector((0.1, spine_floor(0.1) - 0.014, -0.012)), Vector((0.0, spine_floor(0.0) - 0.03, -0.015))]
    jy, jz = np.argmin(np.abs(Y[0][:, 0] - 0.44)), np.argmin(np.abs(Z[0][0] + 0.02))
    cardia = Vector((float(xd2[jy, jz]) - 0.012, 0.44, -0.025))
    oes_f = lambda G: tube_mask(G, oes_pts + [cardia], 0.0065)
    oesophagus = oes_f(g)
    mediast = heart | dilate(aorta | cvc | trachea | bronchi | oesophagus, 1)
    lungs = T & ~dilate(mediast, 1) & ~(np.abs(Z) < 0.004)
    soft = lambda m: (lambda G: sample(g, blur(m), G) > 0.5)  # coarse mask, meshed without stair steps
    add('organ_heart', lambda G: ellipsoid_mask(G, hc, (0.058, 0.045, 0.04), axes=(heart_ax, side, third)), 5000, allowed=T)
    add('organ_aorta', aorta_f, 2000, allowed=~heart)
    add('organ_caudal_vena_cava', cvc_f, 1500, allowed=~heart & ~aorta)
    add('organ_lung_L', soft(lungs & (Z < 0)), 6000, it=12)
    add('organ_lung_R', soft(lungs & (Z > 0)), 6000, it=12)

    # ---- abdomen (organs claim voxels in priority order; each stays in A)
    def at_dia(y, z):
        jy, jz = np.argmin(np.abs(Y[0][:, 0] - y)), np.argmin(np.abs(Z[0][0] - z))
        return float(xd2[jy, jz])

    taken = g.zeros()

    def claim(name, mask, tris=3000, it=8, region=None, avoid=None, reserve=True):
        """Shared organs reserve their voxels in priority order; sex- and species-specific
        variants (reserve=False) may overlap one another."""
        allowed = (A if region is None else region) & ~(taken if avoid is None else avoid)
        m = (mask(g) if callable(mask) else mask) & allowed
        if reserve:
            taken[...] |= m
        add(name, mask, tris, it, allowed=allowed)
        return m

    ell = lambda c, r: (lambda G: ellipsoid_mask(G, c, r))
    tube = lambda pts, r, n=None: (lambda G: tube_mask(G, pts, r, n))
    l1 = by['L_1'].matrix_world @ sum((v.co for v in by['L_1'].data.vertices), Vector()) / len(by['L_1'].data.vertices)
    l3 = by['L_3'].matrix_world @ sum((v.co for v in by['L_3'].data.vertices), Vector()) / len(by['L_3'].data.vertices)
    ky = spine_floor(l1.x) - 0.022
    kr_x, kl_x = l1.x + 0.006, l3.x + 0.005  # right ~T13-L2, left ~L2-L4
    claim('organ_kidney_R', ell((kr_x, ky, 0.034), (0.034, 0.02, 0.017)), 2500)
    claim('organ_kidney_L', ell((kl_x, ky, -0.034), (0.034, 0.02, 0.017)), 2500)
    claim('organ_adrenal_R', ell((l1.x + 0.036, ky + 0.004, 0.02), (0.009, 0.005, 0.004)), 600, 4)
    claim('organ_adrenal_L', ell((kl_x + 0.036, ky + 0.004, -0.02), (0.009, 0.005, 0.004)), 600, 4)
    # Liver: a slab against the diaphragm, thicker ventrally; gallbladder on its right.
    ytop, ybot = 0.49, 0.32
    thick = 0.028 + 0.03 * np.clip((ytop - Y) / (ytop - ybot), 0, 1)
    liver_d = (X - (xd - 0.004 - thick)).astype(np.float32)
    liver = lambda G: sample(g, liver_d, G) > 0
    gb_c = (at_dia(0.37, 0.02) - 0.03, 0.37, 0.022)
    claim('organ_gallbladder', ell(gb_c, (0.014, 0.009, 0.009)), 800, 4)
    claim('organ_liver', liver, 7000, 10)
    xs = at_dia(0.42, 0.0) - 0.06  # just caudal to the liver
    claim('organ_stomach', tube([cardia, Vector((xs + 0.01, 0.43, -0.04)), Vector((xs - 0.01, 0.37, -0.02)),
                                 Vector((xs + 0.005, 0.355, 0.025)), Vector((xs + 0.02, 0.38, 0.045))],
                                lambda u: 0.012 + 0.022 * math.sin(math.pi * min(1, 0.15 + u * 0.95))), 4000)
    pylorus = Vector((xs + 0.02, 0.38, 0.045))
    duo = [pylorus, Vector((xs + 0.0, 0.42, 0.055)), Vector((xs - 0.08, 0.43, 0.052)), Vector((xs - 0.16, 0.41, 0.045)),
           Vector((xs - 0.18, 0.40, 0.02)), Vector((xs - 0.14, 0.41, -0.01))]
    claim('organ_duodenum', tube(duo, 0.008), 2000)
    spleen_pts = [Vector((xs + 0.01, 0.44, -0.062)), Vector((xs - 0.04, 0.40, -0.066)), Vector((xs - 0.09, 0.36, -0.055))]
    claim('organ_spleen', lambda G: tube_mask(G, spleen_pts, 0.011) & (G.centres()[..., 2] < -0.045), 2000)
    pan = [Vector((p.x, p.y + 0.004, p.z - 0.014)) for p in duo[1:4]]
    pan2 = [pylorus + Vector((-0.02, 0.03, -0.01)), Vector((xs - 0.03, 0.42, -0.04))]
    claim('organ_pancreas', lambda G: tube_mask(G, pan, 0.006) | tube_mask(G, pan2, 0.0055), 1500)
    # Bladder at the pelvic inlet, prostate in the pelvic canal.
    pel = verts_of([by['Pelvis']])
    cran = pel[pel[:, 0] > (pel[:, 0].min() + pel[:, 0].max()) / 2]  # cranial half: pubis, not ischium
    pub = cran[cran[:, 1] < cran[:, 1].min() + 0.008].mean(0)
    px, py = float(pub[0]), float(pub[1])
    # Pelvic canal height a little caudal to the inlet: rectum dorsal, vagina ventral.
    canal_t = bvh_of([by['Pelvis'], by['Sacrum']] + [by[n] for n in by if n.startswith('Ca_')])
    o = Vector((px - 0.03, spine_floor(px) - 0.02, 0))
    roof, flo = canal_t.ray_cast(o, Vector((0, 1, 0)), 0.1)[0], canal_t.ray_cast(o, Vector((0, -1, 0)), 0.1)[0]
    roof_y, floor_y = (roof.y if roof else o.y + 0.02), (flo.y if flo else o.y - 0.02)
    print('pelvic canal', round(floor_y, 4), round(roof_y, 4), 'pubis', round(py, 4), flush=True)
    rect_y, vag_y = floor_y + 0.62 * (roof_y - floor_y), floor_y + 0.24 * (roof_y - floor_y)
    everywhere = g.zeros() | True
    claim('organ_bladder', ell((px + 0.045, py - 0.01, 0), (0.04, 0.026, 0.026)), 2500, region=cav)
    shared = taken.copy()
    prostate = claim('organ_prostate', ell((px + 0.005, py + 0.012, 0), (0.012, 0.011, 0.012)), 800, region=everywhere)
    colon = [Vector((xs - 0.10, 0.40, 0.035)), Vector((xs - 0.04, 0.43, 0.035)), Vector((xs - 0.03, 0.44, -0.0)),
             Vector((xs - 0.05, 0.445, -0.035)), Vector((xs - 0.15, 0.45, -0.035)), Vector((px + 0.06, 0.455, -0.012)),
             Vector((px + 0.0, (rect_y + spine_floor(px) - 0.02) / 2, 0)), Vector((px - 0.06, rect_y, 0))]
    pelvic = cav | (X < px + 0.02)
    claim('organ_colon_rectum', tube(colon, 0.013), 3000, region=pelvic)
    # Jejunum and ileum: a serpentine tube filling the remaining ventral abdomen.
    loops, x0, x1 = [], xs - 0.03, px + 0.07
    for k, yy in enumerate((0.352, 0.374, 0.396)):
        for i in range(9):
            t = i / 8
            xx = x0 + (x1 - x0) * (t if k % 2 == 0 else 1 - t)
            loops.append(Vector((xx, yy, (0.038 if i % 2 else -0.038) * (1 if k % 2 == 0 else -1))))
    before_si = taken.copy()
    claim('organ_small_intestine', tube(loops, 0.0095, 600), 6000)
    # Rabbit variant: a large caecum coiled through the ventral abdomen, ending in the
    # vermiform appendix; the small intestine gives way to it.
    xm = (x0 + x1) / 2
    caecum = [Vector((xm, 0.395, 0.04)), Vector((x0, 0.375, 0.045)), Vector((x0, 0.35, -0.01)), Vector((xm, 0.345, -0.045)),
              Vector((x1, 0.355, -0.035)), Vector((x1, 0.36, 0.03)), Vector((xm + 0.02, 0.37, 0.02)), Vector((xm + 0.035, 0.385, -0.02))]
    c_r = lambda u: 0.019 - 0.007 * min(1, u / 0.8) if u < 0.84 else 0.006
    cm = claim('organ_caecum_rabbit', tube(caecum, c_r, 600), 6000, avoid=before_si, reserve=False)
    claim('organ_small_intestine_rabbit', tube(loops, 0.0095, 600), 5000, avoid=before_si | dilate(cm, 1), reserve=False)
    # Female tract (shown instead of the prostate): ovaries caudal to the kidneys, uterine
    # horns converging on a short body dorsal to the bladder, cervix, vagina in the pelvic canal.
    female = taken & ~prostate
    ov_r, ov_l = Vector((kr_x - 0.045, ky + 0.002, 0.032)), Vector((kl_x - 0.045, ky + 0.002, -0.032))
    claim('organ_ovary_R', ell(tuple(ov_r), (0.009, 0.006, 0.005)), 600, 4, region=everywhere, avoid=female, reserve=False)
    claim('organ_ovary_L', ell(tuple(ov_l), (0.009, 0.006, 0.005)), 600, 4, region=everywhere, avoid=female, reserve=False)
    body0, cervix = Vector((px + 0.045, py + 0.03, 0)), Vector((px + 0.008, py + 0.026, 0))
    horn = lambda ov, sgn, end: [ov + Vector((-0.012, -0.004, 0)), Vector((ov.x - 0.05, ky - 0.03, 0.03 * sgn)),
                                  Vector((px + 0.075, py + 0.034, 0.016 * sgn)), end]
    horns_f = lambda G: tube_mask(G, horn(ov_r, 1, body0), 0.0055) | tube_mask(G, horn(ov_l, -1, body0), 0.0055)
    claim('organ_uterus', lambda G: horns_f(G) | tube_mask(G, [body0, cervix], 0.0075), 2500, region=everywhere, avoid=female, reserve=False)
    # Rabbit: duplex uterus, two separate horns each with its own cervix, no body.
    duplex = lambda G: (tube_mask(G, horn(ov_r, 1, cervix + Vector((0, 0, 0.006))), 0.006)
                        | tube_mask(G, horn(ov_l, -1, cervix + Vector((0, 0, -0.006))), 0.006))
    claim('organ_uterus_rabbit', duplex, 2500, region=everywhere, avoid=female, reserve=False)
    claim('organ_vagina', tube([cervix, Vector((px - 0.03, vag_y, 0)), Vector((px - 0.07, vag_y, 0))], 0.0065),
          1200, region=everywhere, avoid=female, reserve=False)

    # ---- neck and head
    add('organ_trachea', airway_f, 2500, it=4, allowed=~heart)
    add('organ_oesophagus', oes_f, 2000, it=4, allowed=~trachea & ~heart)
    add('organ_larynx', ellipsoid_mask(g, (0.247, 0.612, 0), (0.02, 0.014, 0.015)), 1500, it=4)
    add('organ_thyroid', ellipsoid_mask(g, (0.226, 0.578, 0.013), (0.012, 0.005, 0.004)) | ellipsoid_mask(g, (0.226, 0.578, -0.013), (0.012, 0.005, 0.004)), 800, it=4)
    sc = canal[::2]
    add('organ_spinal_cord', lambda G: tube_mask(G, sc, lambda u: 0.0045 - 0.0028 * max(0, (u - 0.8) / 0.2)), 3000, it=4)
    return g, cav, T, A, xd, canal, dict(trachea=trachea | bronchi, oesophagus=oesophagus, cardia=cardia, aorta=aorta, cvc=cvc)


def tongue(by, tissue, col):
    """Tongue on the floor of the mouth (the dog's rest pose has the jaw open): from the
    root over the hyoid to a free apex behind the incisors, between the mandibles."""
    roof_t = bvh_of([by['MergedSkull']])
    floor_t = bvh_of([by[n] for n in by if n == 'Jaw' or any(k in n for k in ('mylohy', 'geniohy'))])
    side_t = bvh_of([by[n] for n in by if n == 'Jaw' or any(k in n for k in ('buccinator', 'masseter', 'pterygoid'))])
    xs = np.arange(0.30, 0.416, 0.005)
    floor, half = [], []
    for x in xs:
        o = Vector((float(x), 0.645, 0))
        hit = floor_t.ray_cast(o, Vector((0, -1, 0)), 0.08)[0]
        floor.append(hit.y if hit else np.nan)
        mid = Vector((float(x), (hit.y if hit else 0.62) + 0.01, 0))
        side = side_t.ray_cast(mid, Vector((0, 0, -1)), 0.06)[0]
        half.append(abs(side.z) if side else np.nan)
        assert roof_t.ray_cast(o, Vector((0, 1, 0)), 0.1)[0] is not None, 'mouth probe outside the skull'
    floor, half = np.array(floor), np.array(half)
    ok = ~np.isnan(floor)
    floor = np.interp(xs, xs[ok], floor[ok])
    ok = ~np.isnan(half)
    half = np.interp(xs, xs[ok], half[ok])
    half = np.convolve(np.pad(half, 2, mode='edge'), np.ones(5) / 5, mode='valid')
    floor = np.convolve(np.pad(floor, 3, mode='edge'), np.ones(7) / 7, mode='valid')
    g = Grid((0.29, 0.59, -0.035), (0.42, 0.67, 0.035), 0.001)
    c = g.centres()
    X, Y, Z = c[..., 0], c[..., 1], c[..., 2]
    t = np.clip((X - 0.30) / (0.415 - 0.30), 0, 1)  # 0 root, 1 apex
    fl = np.interp(X, xs, floor) + 0.001
    th = 0.024 - 0.016 * t ** 1.5
    root = np.sqrt(np.clip((X - 0.293) / 0.02, 0, 1)) * np.sqrt(np.clip((0.417 - X) / 0.012, 0, 1))  # rounded root and apex
    hw = np.clip(np.interp(X, xs, half) - 0.003, 0.013, 0.018) * root + 1e-6  # spatulate apex
    th = th * (0.6 + 0.4 * root)
    u = (Y - fl) / th * 2 - 1
    m = (X >= 0.293) & (X <= 0.417) & (np.abs(u) ** 3 + np.abs(Z / hw) ** 3 <= 1)
    idx = np.argwhere(m)
    m[tuple(idx[inside(tissue, c[m])].T)] = False
    m = largest_component(m)
    print('tongue voxels', int(m.sum()), flush=True)
    return mask_to_mesh(m, g, 'organ_tongue', col, tris=3000, smooth_it=14)


def main():
    t0 = time.time()
    os.makedirs(OUT, exist_ok=True)
    clear_scene()
    col = bpy.context.scene.collection
    dog = dog_import.load_dog(ROOT, col, systems=('bone', 'muscle', 'connective'))
    by = {p['id']: p['ob'] for p in dog}
    bones = [p['ob'] for p in dog if p['system'] == 'bone']
    tissue = bvh_of([p['ob'] for p in dog])
    skull = bvh_of([by['MergedSkull']])
    print(f'loaded {len(dog)} parts {time.time() - t0:.1f}s', flush=True)
    organs = []

    # Cranial cavity: enclosed by the skull, caudal to the orbits.
    six = [Vector(d) for d in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1))]
    eye_x = min(v.co.x for v in by['eye_L'].data.vertices) if 'eye_L' in by else 0.347
    g = Grid((0.255, 0.64, -0.05), (eye_x + 0.01, 0.745, 0.05), 0.002)
    cc = cavity(g, skull, six, 0.08)
    cc = largest_component(cc)
    lo, hi = bbox(cc, g)
    print('cranial cavity', lo.round(3), hi.round(3), int(cc.sum()), f'{time.time() - t0:.1f}s', flush=True)
    gb = Grid(lo, hi, 0.0008)
    for name, m in brain_parts(lo, hi, gb).items():
        organs.append((name, mask_to_mesh(m, gb, name, col, tris=8000 if 'cerebrum' in name else 3000, smooth_it=8)))
    print(f'brain {time.time() - t0:.1f}s', flush=True)
    organs.append(('organ_tongue', tongue(by, tissue, col)))
    trunk(by, tissue, col, organs, t0)
    print(f'trunk {time.time() - t0:.1f}s', flush=True)
    return dog, organs


def export(organs):
    chunks, parts, offset = [], [], 0
    for name, ob in organs:
        pos, idx = tri_arrays(ob)
        vb = struct.pack(f'<{len(pos)}f', *pos)
        ib = struct.pack(f'<{len(idx)}I', *idx)
        xs, ys, zs = pos[0::3], pos[1::3], pos[2::3]
        lo, hi = [min(xs), min(ys), min(zs)], [max(xs), max(ys), max(zs)]
        head = name.startswith('brain_') or name == 'organ_tongue'
        sex = 'male' if name == 'organ_prostate' else 'female' if any(k in name for k in ('ovary', 'uterus', 'vagina')) else None
        parts.append({'id': name, 'system': 'organ', 'anatomicalRegion': 'Head' if head else 'Neck & trunk', **({'sex': sex} if sex else {}),
                      'vertexOffset': offset, 'vertexCount': len(pos) // 3, 'indexOffset': offset + len(vb), 'indexCount': len(idx),
                      'center': [(a + b) / 2 for a, b in zip(lo, hi)], 'bounds': [lo, hi]})
        chunks += [vb, ib]
        offset += len(vb) + len(ib)
    with open(os.path.join(OUT, 'geometry.bin'), 'wb') as f:
        for c in chunks:
            f.write(c)
    with open(os.path.join(OUT, 'parts.json'), 'w', encoding='utf-8') as f:
        json.dump({'bytes': offset, 'parts': parts}, f)
    print(f'export: {len(parts)} organs, {offset / 1e6:.2f} MB', flush=True)


if __name__ == '__main__':
    dog, organs = main()
    export(organs)
    if '--render' in argv:
        for p in dog:
            p['ob'].hide_render = p['system'] != 'bone'
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'organs.blend'))
