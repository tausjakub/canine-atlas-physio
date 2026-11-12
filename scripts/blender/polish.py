"""Finishing pass after retargeting: smoother muscle surfaces, no muscle
inside bone, and a triangle budget that keeps each species under 12 MB."""
from common import bvh_of, push_out, smooth, decimate, tri_count


def subdivide(ob, levels=1):
    m = ob.modifiers.new('sub', 'SUBSURF')
    m.levels = levels
    m.render_levels = levels
    from common import bake
    bake(ob)


def polish(parts, S):
    q = S.get('polish', {})
    bones = [p['ob'] for p in parts if p['system'] == 'bone']
    for ob in bones:
        # Keep detailed bones detailed (skull, vertebrae); only trim heavy ones.
        n = tri_count(ob)
        decimate(ob, max(q.get('bone_tris', 600), min(n, int(n * q.get('bone_factor', 0.5)))))
    tree = bvh_of(bones)
    for p in parts:
        if p['system'] != 'muscle':
            continue
        ob = p['ob']
        n = tri_count(ob)
        subdivide(ob, 1)
        smooth(ob, 2, 0.35)
        push_out(ob, tree, 0.00015, iterations=1)
        decimate(ob, max(q.get('muscle_min', 600), min(q.get('muscle_max', 4000), n * q.get('muscle_factor', 2.2))))
