"""Derive a species config from another by reshaping its proportions.

Only position fields are transformed (spine, joints, pelvis, sternum, hull,
linea, tail, head occiput/rostrum, retarget toe landmarks) plus limb lengths;
relative (head-frame) parameters are left alone.
"""
import copy


def derive(base, species, trunk=1.0, height=1.0, head=1.0, legs=1.0, tail=1.0, **overrides):
    S = copy.deepcopy(base)
    S['species'] = species
    S['base'] = base.get('base', base['species'])
    t1x = base['spine']['T1'][0]

    def P(p):
        x, y, z = p
        if x < t1x:
            x = t1x + (x - t1x) * trunk
        return (x, y * height, z)

    S['spine'] = {k: P(v) for k, v in S['spine'].items()}
    J = base['joints']
    # Limbs: the girdle joints move with the trunk; distal points scale around
    # them by `legs`, so shorter legs keep the base species' limb shape.
    sh, hp = P(J['shoulder']), P(J['hip'])

    def limb(p, root, root_new):
        return tuple(rn + (a - r) * legs for a, r, rn in zip(p, root, root_new))

    joints = {}
    for k, v in J.items():
        if k.endswith('_z'):
            joints[k] = v
        elif k == 'carpus':
            joints[k] = limb(v, J['shoulder'], sh)
        elif k == 'hock':
            joints[k] = limb(v, J['hip'], hp)
        else:
            joints[k] = P(v)
    S['joints'] = joints
    S['pelvis']['points'] = {k: P(v) for k, v in S['pelvis']['points'].items()}
    S['sternum']['path'] = [P(v) for v in S['sternum']['path']]
    S['hull'] = [([P(v) for v in path], radii) for path, radii in S['hull']]
    S['linea'] = [P(v) for v in S['linea']]
    t0 = P(S['tail'][0])
    S['tail'] = [tuple(a + (b - a) * tail for a, b in zip(t0, P(v))) for v in S['tail']]
    occ = P(S['head']['occiput'])
    ros = P(S['head']['rostrum'])
    S['head']['occiput'] = occ
    S['head']['rostrum'] = tuple(o + (r - o) * head for o, r in zip(occ, ros))
    S['retarget']['fore_toe'] = limb(base['retarget']['fore_toe'], J['shoulder'], sh)
    for k in ('hind_toe', 'hind_mtp'):
        S['retarget'][k] = limb(base['retarget'][k], J['hip'], hp)
    S['len'] = {k: v * (legs if k != 'olecranon' else 1) for k, v in S['len'].items()}
    for k, v in overrides.items():
        if isinstance(v, dict) and isinstance(S.get(k), dict):
            S[k] = {**S[k], **v}
        else:
            S[k] = v
    return S
