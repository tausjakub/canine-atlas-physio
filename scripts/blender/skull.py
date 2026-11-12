"""Parametric skull and hemimandibles (species proportions in S['head'])."""
from common import V, Builder, lerp


def head_frame(S):
    h = S['head']
    O, R = V(h['occiput']), V(h['rostrum'])
    ax = (R - O).normalized()
    up = V(0, 1, 0)
    up = (up - ax * up.dot(ax)).normalized()
    return O, ax, up, (R - O).length


def build_skull(S, col, F):
    h = S['head']
    O, ax, up, Lk = head_frame(S)
    lat = V(0, 0, 1)

    def P(a, u, l=0.0):
        return O + ax * (a * Lk) + up * (u * Lk) + lat * (l * Lk)

    out = []
    b = Builder()
    for (a, u, ra, ru, rl) in h['masses']:
        b.ellipsoid(P(a, u), (ra * Lk, ru * Lk, rl * Lk), axes=(ax, up, lat), seg=22, rings=14)
    # Sagittal and nuchal crests.
    b.tube([P(0.03, h['crest'][0]), P(0.25, h['crest'][1]), P(0.5, h['crest'][2])], [(0.012 * Lk, 0.03 * Lk), (0.01 * Lk, 0.02 * Lk), (0.006 * Lk, 0.008 * Lk)], seg=8, hint=lat)
    cuts = []
    for s in (-1, 1):
        z = h['zygoma']
        b.tube([P(z[0][0], z[0][1], s * z[0][2]), P(z[1][0], z[1][1], s * z[1][2]), P(z[2][0], z[2][1], s * z[2][2])],
               [(h['zyg_r'] * Lk, h['zyg_r'] * Lk * 1.8)], seg=10, hint=lat)
        po = h['postorbital']
        b.tube([P(po[0][0], po[0][1], s * po[0][2]), P(po[1][0], po[1][1], s * po[1][2])], [0.012 * Lk, 0.006 * Lk], seg=8)
        bu = h['bulla']
        b.ellipsoid(P(bu[0], bu[1], s * bu[2]), (bu[3] * Lk, bu[3] * Lk * 0.85, bu[3] * Lk * 0.8), axes=(ax, up, lat), seg=14, rings=8)
        b.ellipsoid(P(-0.02, -0.06, s * 0.08), (0.03 * Lk, 0.045 * Lk, 0.035 * Lk), axes=(ax, up, lat), seg=12, rings=8)  # condyle
        b.ellipsoid(P(0.1, -0.03, s * h['mastoid']), (0.035 * Lk, 0.04 * Lk, 0.03 * Lk), axes=(ax, up, lat), seg=10, rings=6)
        for (a, u, l, r) in h['orbit_cuts']:
            c = Builder().ellipsoid(P(a, u, s * l), (r[0] * Lk, r[1] * Lk, r[2] * Lk), axes=(ax, up, lat), seg=20, rings=12).obj('cut', col)
            cuts.append(c)
        for (a, u, l, r) in h.get('fenestrae', []):
            c = Builder().ellipsoid(P(a, u, s * l), (r[0] * Lk, r[1] * Lk, r[2] * Lk), axes=(ax, up, lat), seg=10, rings=6).obj('cut', col)
            cuts.append(c)
    na = h['nasal']
    cuts.append(Builder().ellipsoid(P(na[0], na[1]), (na[2] * Lk, na[3] * Lk, na[4] * Lk), axes=(ax, up, lat)).obj('cut', col))
    # Incisors (rabbit: two pairs, including the peg teeth); cheek teeth omitted.
    for (a, u, l, ln, r) in h.get('incisors', []):
        for s in (-1, 1):
            b.tube([P(a, u, s * l), P(a + 0.04, u - ln * 0.6, s * l), P(a + 0.03, u - ln, s * l)], [r * Lk, r * Lk * 0.8], seg=8)
    out.append(('MergedSkull', 'Head', b, S['quality']['vox_skull'], S['quality']['tri_skull'], cuts))

    m = h['mandible']
    for s, tag in ((-1, 'L'), (1, 'R')):
        b = Builder()
        body = [P(*m['symph'][:2], s * m['symph'][2]), P(*m['body_mid'][:2], s * m['body_mid'][2]), P(*m['angle'][:2], s * m['angle'][2])]
        b.tube(body, [(m['w'] * Lk, m['h'] * Lk * 0.45), (m['w'] * Lk, m['h'] * Lk * 0.55), (m['w'] * Lk * 0.8, m['h'] * Lk * 0.6)], seg=12, hint=lat)
        b.tube([P(*m['ramus_base'][:2], s * m['ramus_base'][2]), P(*m['coronoid'][:2], s * m['coronoid'][2])], [(m['w'] * Lk * 0.7, m['ramus_w'] * Lk), (m['w'] * Lk * 0.5, m['ramus_w'] * Lk * 0.5)], seg=10, hint=lat)
        b.tube([P(*m['ramus_base'][:2], s * m['ramus_base'][2]), P(*m['condyle'][:2], s * m['condyle'][2])], [(m['w'] * Lk * 0.7, m['ramus_w'] * Lk * 0.6)], seg=10, hint=lat)
        b.ellipsoid(P(*m['condyle'][:2], s * m['condyle'][2]), (0.025 * Lk, 0.02 * Lk, 0.045 * Lk), axes=(ax, up, lat), seg=10, rings=6)
        b.ellipsoid(P(*m['angle'][:2], s * m['angle'][2]), (m['h'] * Lk * 0.6, m['h'] * Lk * 0.4, m['w'] * Lk * 1.1), axes=(ax, up, lat), seg=10, rings=6)
        out.append((f'Jaw_{tag}', 'Head', b, S['quality']['vox_small'] * 0.8, S['quality']['tri_big'] // 2, None))
        lm = F.setdefault(tag, {}).setdefault('lm', {})
        lm.update({
            'mand.symph': P(m['symph'][0], m['symph'][1] - m['h'] * 0.4, s * m['symph'][2]),
            'mand.body_mid': P(m['body_mid'][0], m['body_mid'][1], s * (m['body_mid'][2] + m['w'] * 1.2)),
            'mand.body_ven': P(m['body_mid'][0], m['body_mid'][1] - m['h'] * 0.6, s * m['body_mid'][2]),
            'mand.angle': P(m['angle'][0], m['angle'][1], s * (m['angle'][2] + m['w'] * 1.5)),
            'mand.angle_med': P(m['angle'][0], m['angle'][1], s * (m['angle'][2] - m['w'] * 1.5)),
            'mand.ramus_lat': lerp(P(*m['ramus_base'][:2], s * (m['ramus_base'][2] + m['w'] * 1.4)), P(*m['coronoid'][:2], s * (m['coronoid'][2] + m['w'])), 0.4),
            'mand.coronoid': P(*m['coronoid'][:2], s * m['coronoid'][2]),
            'mand.ramus_med': P(m['ramus_base'][0], m['ramus_base'][1] + 0.05, s * (m['ramus_base'][2] - m['w'] * 1.5)),
        })
    for s, tag in ((-1, 'L'), (1, 'R')):
        lm = F[tag]['lm']
        z = h['zygoma']
        lm.update({
            'sk.temporal': P(0.32, h['crest'][1] * 0.75, s * 0.12), 'sk.temporal_cd': P(0.12, h['crest'][0] * 0.8, s * 0.14),
            'sk.crest': P(0.25, h['crest'][1] + 0.02), 'sk.nuchal': P(0.02, h['crest'][0] - 0.02, s * 0.1),
            'sk.nuchal_lat': P(0.04, h['crest'][0] - 0.1, s * 0.2),
            'sk.zyg_mid': P(z[1][0], z[1][1] - h['zyg_r'] * 1.5, s * (z[1][2] + h['zyg_r'])),
            'sk.zyg_rost': P(z[2][0] - 0.05, z[2][1] - h['zyg_r'] * 1.5, s * (z[2][2] + h['zyg_r'])),
            'sk.zyg_cd': P(z[0][0] + 0.05, z[0][1] - h['zyg_r'] * 1.5, s * (z[0][2] + h['zyg_r'])),
            'sk.mastoid': P(0.1, -0.06, s * (h['mastoid'] + 0.03)), 'sk.occ_ven': P(0.04, -0.12, s * 0.05),
            'sk.basi': P(0.15, -0.16, s * 0.03), 'sk.paracond': P(0.02, -0.12, s * 0.12),
            'sk.bulla': P(h['bulla'][0], h['bulla'][1] - h['bulla'][3], s * h['bulla'][2]),
            'hyoid': P(0.22, -0.42, s * 0.05), 'hyoid_mid': P(0.24, -0.42, s * 0.0),
            'mid.symph': P(h['mandible']['symph'][0] - 0.05, h['mandible']['symph'][1] - h['mandible']['h'] * 0.5, 0),
            'sk.maxilla': P(0.72, -0.08, s * 0.14), 'sk.nose': P(0.95, 0.0, s * 0.05),
        })
    F['head'] = (O, ax, up, Lk)
    return out
