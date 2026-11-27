"""Derive a species config from another by reshaping its proportions, and pose
any species from limb segment angles.

Only position fields are transformed (spine, joints, pelvis, sternum, hull,
linea, tail, head occiput/rostrum, retarget toe landmarks) plus limb lengths;
relative (head-frame) parameters are left alone.
"""
import copy
import math


def _apply_overrides(S, overrides):
    for k, v in overrides.items():
        if isinstance(v, dict) and isinstance(S.get(k), dict):
            S[k] = {**S[k], **v}
        else:
            S[k] = v


def derive(base, species, trunk=1.0, height=1.0, head=1.0, legs=1.0, tail=1.0, neck=1.0, **overrides):
    S = copy.deepcopy(base)
    # Overrides first (they may replace whole sub-dicts copied from the base),
    # then the landmark transforms so every position is reshaped.
    _apply_overrides(S, overrides)
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
        elif k in ('carpus', 'scap_dorsal'):
            # The scapula belongs to the limb: it shortens with the legs.
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
    # Neck: cervical points and the head move toward T1 by `neck`.
    t1 = S['spine']['T1']

    def N(p):
        return tuple(t + (a - t) * neck for a, t in zip(p, t1))

    for k in ('C1', 'C4', 'C7'):
        S['spine'][k] = N(S['spine'][k])
    occ0 = P(S['head']['occiput'])
    shift = [n - o for n, o in zip(N(occ0), occ0)]
    occ = tuple(a + d for a, d in zip(occ0, shift))
    ros = tuple(a + d for a, d in zip(P(S['head']['rostrum']), shift))
    S['head']['occiput'] = occ
    S['head']['rostrum'] = tuple(o + (r - o) * head for o, r in zip(occ, ros))
    S['retarget']['fore_toe'] = limb(base['retarget']['fore_toe'], J['shoulder'], sh)
    for k in ('hind_toe', 'hind_mtp'):
        S['retarget'][k] = limb(base['retarget'][k], J['hip'], hp)
    S['len'] = {k: v * (legs if k != 'olecranon' else 1) for k, v in S['len'].items()}
    return S


def apply_stance(S):
    """Pose the limbs from segment angles (degrees from +x, cranial; -90 is
    straight down) in S['stance']; the shoulder and hip heights follow from the
    bone lengths so the toes stand on the ground, and the trunk, neck, head and
    tail move with them (tilting between shoulder and hip). An optional `arch`
    (metres) bows the thoracolumbar spine dorsally, `head_pitch` (degrees,
    positive raises the nose) turns the head about the occiput."""
    st = S.get('stance')
    if not st:
        return S
    S = copy.deepcopy(S)
    J, R, L = S['joints'], S['retarget'], S['len']

    def d2(a, b):
        return math.hypot(a[0] - b[0], a[1] - b[1])

    ground = min(R['fore_toe'][1], R['hind_toe'][1])
    manus, pes, toe = d2(J['carpus'], R['fore_toe']), d2(J['hock'], R['hind_mtp']), d2(R['hind_mtp'], R['hind_toe'])
    fore = [(st['humerus'], L['humerus']), (st['radius'], L['radius']), (st['manus'], manus)]
    hind = [(st['femur'], L['femur']), (st['tibia'], L['tibia']), (st['pes'], pes), (st.get('toes', -10), toe)]

    def walk(start, segs):
        pts = [start]
        for a, length in segs:
            x, y = pts[-1]
            pts.append((x + length * math.cos(math.radians(a)), y + length * math.sin(math.radians(a))))
        return pts

    drop = lambda segs: -sum(l * math.sin(math.radians(a)) for a, l in segs)  # noqa: E731
    xs, xh = J['shoulder'][0], J['hip'][0]
    dsh = ground + drop(fore) - J['shoulder'][1]
    dhip = ground + drop(hind) - J['hip'][1]
    arch = st.get('arch', 0.0)
    xa, xb = S['spine']['Tmid'][0], S['spine']['S'][0]

    def lift(p):
        t = min(1.0, max(0.0, (p[0] - xh) / (xs - xh)))
        y = p[1] + dhip + (dsh - dhip) * t
        if arch and xb < p[0] < xa:
            y += arch * math.sin(math.pi * (p[0] - xb) / (xa - xb))
        return (p[0], y, p[2])

    S['spine'] = {k: lift(v) for k, v in S['spine'].items()}
    for k in ('shoulder', 'scap_dorsal', 'hip'):
        J[k] = lift(J[k])
    S['pelvis']['points'] = {k: lift(v) for k, v in S['pelvis']['points'].items()}
    S['sternum']['path'] = [lift(v) for v in S['sternum']['path']]
    S['hull'] = [([lift(v) for v in path], radii) for path, radii in S['hull']]
    S['linea'] = [lift(v) for v in S['linea']]
    S['tail'] = [lift(v) for v in S['tail']]
    occ, ros = lift(S['head']['occiput']), lift(S['head']['rostrum'])
    pitch = math.radians(st.get('head_pitch', 0.0))
    dx, dy = ros[0] - occ[0], ros[1] - occ[1]
    ros = (occ[0] + dx * math.cos(pitch) - dy * math.sin(pitch), occ[1] + dx * math.sin(pitch) + dy * math.cos(pitch), ros[2])
    S['head']['occiput'], S['head']['rostrum'] = occ, ros
    f = walk(J['shoulder'][:2], fore)
    h = walk(J['hip'][:2], hind)
    J['carpus'] = (*f[2], J['carpus'][2])
    R['fore_toe'] = (*f[3], R['fore_toe'][2])
    J['hock'] = (*h[2], J['hock'][2])
    R['hind_mtp'] = (*h[3], R['hind_mtp'][2])
    R['hind_toe'] = (*h[4], R['hind_toe'][2])
    return S
