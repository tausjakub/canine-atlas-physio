"""Geometry kernel for the cat and rabbit atlases (run inside Blender).

Coordinates are the atlas's: x cranial, y dorsal (up), z lateral, with the
left side at negative z. Units are metres. Every shape here is authored from
parameters; no third-party mesh is read.
"""
import math
import bpy
import bmesh
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree


def V(*a):
    return Vector(a[0] if len(a) == 1 else a)


def lerp(a, b, t):
    return a + (b - a) * t


def smoothstep(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def catmull(points, n):
    """Centripetal-free uniform Catmull-Rom through points, n samples."""
    pts = [V(p) for p in points]
    if len(pts) == 2:
        return [pts[0].lerp(pts[1], i / (n - 1)) for i in range(n)]
    ext = [pts[0] * 2 - pts[1]] + pts + [pts[-1] * 2 - pts[-2]]
    seg = len(pts) - 1
    # Distribute samples by chord length so segments keep even spacing.
    lengths = [(pts[i + 1] - pts[i]).length for i in range(seg)]
    total = sum(lengths) or 1
    out = []
    for k in range(n):
        d = total * k / (n - 1)
        i = 0
        while i < seg - 1 and d > lengths[i]:
            d -= lengths[i]
            i += 1
        t = d / (lengths[i] or 1)
        p0, p1, p2, p3 = ext[i], ext[i + 1], ext[i + 2], ext[i + 3]
        t2, t3 = t * t, t * t * t
        out.append(
            0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
                   + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    return out


def frames(points, hint=None):
    """Parallel-transport frames (tangent, normal, binormal) along a polyline."""
    tans = []
    for i in range(len(points)):
        a = points[max(0, i - 1)]
        b = points[min(len(points) - 1, i + 1)]
        tans.append((b - a).normalized())
    up = V(hint) if hint is not None else V(0, 0, 1)
    if abs(up.dot(tans[0])) > 0.95:
        up = V(0, 1, 0) if abs(tans[0].y) < 0.9 else V(1, 0, 0)
    n = (up - tans[0] * up.dot(tans[0])).normalized()
    out = []
    for i, t in enumerate(tans):
        if i:
            n = (n - t * n.dot(t)).normalized()
        out.append((t, n, t.cross(n)))
    return out


class Builder:
    """Accumulates closed surfaces into one mesh before remeshing."""

    def __init__(self):
        self.verts, self.faces = [], []

    def add(self, verts, faces):
        o = len(self.verts)
        self.verts += [V(v) for v in verts]
        self.faces += [tuple(i + o for i in f) for f in faces]
        return self

    def ellipsoid(self, c, r, axes=None, seg=18, rings=12):
        c = V(c)
        ax = axes or (V(1, 0, 0), V(0, 1, 0), V(0, 0, 1))
        verts, faces = [], []
        for i in range(rings + 1):
            th = math.pi * i / rings
            for j in range(seg):
                ph = 2 * math.pi * j / seg
                x, y, z = math.sin(th) * math.cos(ph), math.cos(th), math.sin(th) * math.sin(ph)
                verts.append(c + ax[0] * (x * r[0]) + ax[1] * (y * r[1]) + ax[2] * (z * r[2]))
        for i in range(rings):
            for j in range(seg):
                a, b = i * seg + j, i * seg + (j + 1) % seg
                faces.append((a, b, b + seg, a + seg))
        return self.add(verts, faces)

    def tube(self, pts, radii, seg=14, hint=None, flat=1.0, n=None):
        """Closed tube along a spline; radii per control point (or callable)."""
        path = catmull(pts, n or max(8, len(pts) * 6))
        fr = frames(path, hint)
        verts, faces = [], []
        m = len(path)
        for i, (p, (t, nn, bn)) in enumerate(zip(path, fr)):
            u = i / (m - 1)
            r = radii(u) if callable(radii) else _interp(radii, u)
            rx, ry = (r if isinstance(r, tuple) else (r, r * flat))
            for j in range(seg):
                a = 2 * math.pi * j / seg
                verts.append(p + nn * (math.cos(a) * rx) + bn * (math.sin(a) * ry))
        for i in range(m - 1):
            for j in range(seg):
                a, b = i * seg + j, i * seg + (j + 1) % seg
                faces.append((a, b, b + seg, a + seg))
        c0, c1 = len(verts), len(verts) + 1
        verts += [path[0], path[-1]]
        for j in range(seg):
            faces.append((c0, (j + 1) % seg, j))
            faces.append((c1, (m - 1) * seg + j, (m - 1) * seg + (j + 1) % seg))
        return self.add(verts, faces)

    def plate(self, outline, normal_offset, thickness, origin, ex, ey, ez):
        """Extruded polygon in a local frame (ex, ey in-plane, ez normal)."""
        o = V(origin)
        verts, faces = [], []
        k = len(outline)
        for side in (-1, 1):
            for (x, y) in outline:
                verts.append(o + ex * x + ey * y + ez * (normal_offset(x, y) + side * thickness(x, y) / 2))
        cen = [V(0, 0, 0), V(0, 0, 0)]
        for s in range(2):
            for i in range(k):
                cen[s] += verts[s * k + i]
            cen[s] /= k
        verts += cen
        for i in range(k):
            j = (i + 1) % k
            faces.append((i, j, k + j, k + i))
            faces.append((2 * k, j, i))
            faces.append((2 * k + 1, k + i, k + j))
        return self.add(verts, faces)

    def obj(self, name, collection=None):
        me = bpy.data.meshes.new(name)
        me.from_pydata([tuple(v) for v in self.verts], [], self.faces)
        me.validate()
        ob = bpy.data.objects.new(name, me)
        (collection or bpy.context.scene.collection).objects.link(ob)
        return ob


def _interp(vals, u):
    if not isinstance(vals, list):
        return vals
    if len(vals) == 1:
        return vals[0]
    x = u * (len(vals) - 1)
    i = min(int(x), len(vals) - 2)
    f = smoothstep(x - i)
    a, b = vals[i], vals[i + 1]
    if isinstance(a, tuple):
        return tuple(lerp(a[k], b[k], f) for k in range(2))
    return lerp(a, b, f)


def bake(ob):
    """Apply the modifier stack by evaluating it (no operator context needed)."""
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    bpy.data.meshes.remove(old)
    return ob


def remesh(ob, voxel, smooth=4, factor=0.5, tris=None, adaptivity=0.0):
    m = ob.modifiers.new('r', 'REMESH')
    m.mode = 'VOXEL'
    m.voxel_size = voxel
    m.adaptivity = adaptivity
    m.use_smooth_shade = False
    if smooth:
        s = ob.modifiers.new('s', 'LAPLACIANSMOOTH')
        s.iterations = smooth
        s.lambda_factor = factor
        s.use_volume_preserve = True
    bake(ob)
    if tris:
        decimate(ob, tris)
    return ob


def smooth(ob, iterations=3, factor=0.5):
    # Plain smoothing: volume-preserving Laplacian is unstable on thin sheets.
    s = ob.modifiers.new('s', 'SMOOTH')
    s.iterations = iterations
    s.factor = factor
    return bake(ob)


def decimate(ob, tris):
    n = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    if n > tris:
        d = ob.modifiers.new('d', 'DECIMATE')
        d.ratio = tris / n
        bake(ob)
    return ob


def subtract(ob, cutters):
    for c in cutters:
        m = ob.modifiers.new('b', 'BOOLEAN')
        m.operation = 'DIFFERENCE'
        m.solver = 'EXACT' if 'EXACT' in [e.identifier for e in m.bl_rna.properties['solver'].enum_items] else m.solver
        m.object = c
        bake(ob)
    for c in cutters:
        bpy.data.objects.remove(c)
    return ob


def bvh_of(objs):
    verts, polys = [], []
    for ob in objs:
        o = len(verts)
        mw = ob.matrix_world
        verts += [mw @ v.co for v in ob.data.vertices]
        polys += [tuple(i + o for i in p.vertices) for p in ob.data.polygons]
    if not polys:
        return None
    return BVHTree.FromPolygons(verts, polys, all_triangles=False)


def push_out(ob, tree, gap, iterations=2, falloff=None):
    """Move vertices lying inside deeper structures onto their surface.

    Keeps a muscle draped over bone and deeper muscle instead of
    interpenetrating it. Inside-ness is judged by the nearest face normal.
    """
    if tree is None:
        return ob
    for _ in range(iterations):
        moved = 0
        for v in ob.data.vertices:
            hit = tree.find_nearest(v.co)
            if hit[0] is None:
                continue
            loc, nor = hit[0], hit[1]
            d = (v.co - loc).dot(nor)
            if d < gap:
                v.co = loc + nor * gap
                moved += 1
        ob.data.update()
        if not moved:
            break
        smooth(ob, 2, 0.35)
    return ob


def tri_arrays(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.verts.ensure_lookup_table()
    pos = []
    for v in bm.verts:
        pos += [v.co.x, v.co.y, v.co.z]
    idx = []
    for f in bm.faces:
        idx += [v.index for v in f.verts]
    bm.free()
    return pos, idx


def tri_count(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def clear_scene():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)
    for me in list(bpy.data.meshes):
        bpy.data.meshes.remove(me)
