"""Limb skeleton shared by cat and rabbit; species differences are parameters.

Every bone is registered in F[tag] as a Frame (bone axis + radius) and its
named landmarks in F[tag]['lm'], which muscle tables reference.
"""
import math
from mathutils import Vector
from common import V, Builder, lerp, catmull
from skeleton import Frame, ik


class ScapFrame:
    """t: 0 dorsal border -> 1 glenoid. cr: -1 caudal border .. +1 cranial
    border (0 = spine). lat: outward offset in plate-thickness units."""

    def __init__(self, G, D, cranial, side, outline, Ls, th):
        self.G, self.side, self.Ls, self.th = V(G), side, Ls, th
        self.el = (V(D) - V(G)).normalized()
        out = V(0, 0, side)
        cr = V(cranial)
        cr = (cr - self.el * cr.dot(self.el)).normalized()
        n = self.el.cross(cr).normalized()
        if n.dot(out) < 0:
            n = -n
        self.cr, self.n = cr, n
        self.outline = outline
        self.r = th

    def half(self, a, sign):
        best = 0.0
        pts = self.outline
        for i in range(len(pts)):
            (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % len(pts)]
            if (x0 - a) * (x1 - a) <= 0 and x0 != x1:
                y = lerp(y0, y1, (a - x0) / (x1 - x0))
                if y * sign > best:
                    best = y * sign
        return best

    def p(self, t, cr=0.0, lat=0.0, *_):
        a = 1 - t
        w = self.half(max(0.02, min(0.98, a)), 1 if cr >= 0 else -1)
        return self.G + self.el * (a * self.Ls) + self.cr * (cr * w * self.Ls) + self.n * (lat * self.th)


def build_limbs(S, side, tag, F, finish):
    sc, q, J = S['scale'], S['quality'], S['joints']
    s = side
    lm = F.setdefault(tag, {}).setdefault('lm', {})
    reg = F[tag]

    def j(name):
        x, y, z = J[name]
        return V(x * sc, y * sc, s * z * sc)

    vs, vb = q['vox_limb'] * sc, q['vox_small'] * sc
    # ---------------- forelimb ----------------
    G, D, CA = j('shoulder'), j('scap_dorsal'), j('carpus')
    Lh, Lr = S['len']['humerus'] * sc, S['len']['radius'] * sc
    EL = ik(G, CA, Lh, Lr, 1)
    EL.z = j('elbow_z').z
    # Scapula.
    Ls = (D - G).length
    sp = S['scapula']
    sf = ScapFrame(G, D, V(1, 0.15, 0), s, sp['outline'], Ls, sp['th'] * sc)
    reg['sca'] = sf
    b = Builder()
    ol = sp['outline']
    b.plate(ol, lambda x, y: sp['cup'] * Ls * (y * y), lambda x, y: sp['th'] * sc * (1.6 if x < 0.18 else 1.0),
            G, sf.el * Ls, sf.cr * Ls, sf.n)
    # Spine of the scapula rises toward the acromion.
    spine = [sf.p(t, sp['spine_cr'], 0) for t in (0.02, 0.35, 0.7, 0.86)]
    hts = sp['spine_h']
    spine_top = [p + sf.n * (h * Ls) for p, h in zip(spine, hts)]
    b.tube(spine_top, [(h * Ls * 0.3 + sp['th'] * sc, sp['th'] * sc * 0.9) for h in hts], seg=10, hint=sf.n)
    b.tube([spine[i].lerp(spine_top[i], 0.5) for i in range(4)], [(h * Ls * 0.5 + sp['th'] * sc, sp['th'] * sc * 0.8) for h in hts], seg=8, hint=sf.n)
    acr = sf.p(sp['acromion'][0], sp['spine_cr'] + 0.05, 0) + sf.n * (sp['acromion'][1] * Ls)
    b.tube([spine_top[-1], acr], [sp['th'] * sc * 1.4, sp['th'] * sc * 1.1], seg=10)
    if sp.get('metacromion'):
        mt = spine_top[-1] + (-sf.cr * sp['metacromion'][0] + sf.el * sp['metacromion'][1]) * Ls
        b.tube([spine_top[-1] + (spine_top[-2] - spine_top[-1]) * 0.15, mt], [(sp['th'] * sc * 1.1, sp['th'] * sc * 0.6)], seg=8, hint=sf.n)
    # Glenoid, supraglenoid tubercle and coracoid process.
    b.ellipsoid(G + sf.el * Ls * 0.04, (Ls * 0.1, Ls * 0.07, Ls * 0.08), axes=(sf.cr, sf.el, sf.n), seg=14, rings=8)
    b.ellipsoid(G + sf.el * Ls * 0.06 + sf.cr * Ls * 0.1, (Ls * 0.045, Ls * 0.05, Ls * 0.04), seg=10, rings=6)
    b.tube([G + sf.el * Ls * 0.08 + sf.cr * Ls * 0.08, G + sf.el * Ls * 0.06 + sf.cr * Ls * 0.13 - sf.n * Ls * 0.06], [Ls * 0.025, Ls * 0.015], seg=8)
    finish(b, f'Scapula_{tag}', 'Forelimb', vb * 0.8, q['tri_big'])
    lm.update({
        'sca.spine_mid': spine_top[1], 'sca.spine_dist': spine_top[2], 'sca.acromion': acr,
        'sca.dorsal_cr': sf.p(0.02, 0.8), 'sca.dorsal_cd': sf.p(0.02, -0.8), 'sca.dorsal_mid': sf.p(0.0, 0.0),
        'sca.angle_cd': sf.p(0.02, -1.0), 'sca.angle_cr': sf.p(0.05, 1.0),
        'sca.supraglenoid': G + sf.el * Ls * 0.07 + sf.cr * Ls * 0.11,
        'sca.infraglenoid': G + sf.el * Ls * 0.1 - sf.cr * Ls * 0.09,
        'sca.coracoid': G + sf.el * Ls * 0.06 + sf.cr * Ls * 0.13 - sf.n * Ls * 0.06,
        'sca.glenoid': G,
    })
    if sp.get('metacromion'):
        lm['sca.metacromion'] = mt

    # Clavicle (embedded in the brachiocephalic muscle).
    cl = S['clavicle']
    c0 = G + V(cl['from'][0] * sc, cl['from'][1] * sc, s * cl['from'][2] * sc)
    c1 = G + V(cl['to'][0] * sc, cl['to'][1] * sc, s * cl['to'][2] * sc)
    b = Builder().tube([c0, lerp(c0, c1, 0.5) + V(0.002 * sc, 0, 0), c1], [cl['r'] * sc * 1.2, cl['r'] * sc, cl['r'] * sc * 1.2], seg=8)
    finish(b, f'Clavicle_{tag}', 'Forelimb', vb * 0.6, q['tri_small'])
    lm['clav'] = lerp(c0, c1, 0.5)

    # Humerus.
    rh = S['radius']['humerus'] * sc
    hf = Frame(G - (EL - G).normalized() * rh * 0.3, EL, rh, s)
    reg['hum'] = hf
    b = Builder()
    b.tube([hf.p(0.08, -0.1), hf.p(0.45, 0.3), hf.p(0.88, 0.0)], [rh * 1.45, rh * 1.05, rh * 1.0, rh * 1.35], seg=14)
    b.ellipsoid(hf.p(0.03, -0.75, 0, -0.2), (rh * 1.55, rh * 1.6, rh * 1.5))  # head
    b.ellipsoid(hf.p(-0.02, 1.05, 0.55), (rh * 1.0, rh * 1.25, rh * 0.85))  # greater tubercle
    b.ellipsoid(hf.p(0.04, 0.55, -1.15), (rh * 0.75, rh * 0.8, rh * 0.6))  # lesser tubercle
    b.tube([hf.p(0.12, 1.0, 0.75), hf.p(0.3, 1.0, 0.8), hf.p(0.42, 0.7, 0.55)], [(rh * 0.35, rh * 0.25)], seg=8)  # crest
    b.tube([hf.p(0.98, -0.1, -1.55), hf.p(0.99, 0.2, 0.0), hf.p(0.98, -0.1, 1.45)], [rh * 0.85, rh * 1.05, rh * 0.8], seg=12)  # condyle
    b.ellipsoid(hf.p(0.94, -0.35, -2.0), (rh * 0.75, rh * 0.85, rh * 0.6))  # medial epicondyle
    b.ellipsoid(hf.p(0.93, -0.35, 1.7), (rh * 0.6, rh * 0.75, rh * 0.5))  # lateral epicondyle
    b.tube([hf.p(0.62, -0.6, 1.0), hf.p(0.9, -0.4, 1.6)], [(rh * 0.4, rh * 0.25)], seg=8)  # lateral supracondylar crest
    finish(b, f'humerus_{tag}', 'Forelimb', vs, q['tri_long'])
    lm.update({
        'hum.head': hf.p(0.0, -1.3, 0), 'hum.gt': hf.p(-0.04, 1.35, 0.8), 'hum.lt': hf.p(0.04, 0.6, -1.6),
        'hum.delt': hf.p(0.32, 1.0, 1.4), 'hum.crest': hf.p(0.3, 1.5, 0.6), 'hum.teres': hf.p(0.3, -0.2, -1.4),
        'hum.neck_cd': hf.p(0.15, -1.2, 0.6), 'hum.lat_epi': hf.p(0.92, -0.3, 2.3),
        'hum.med_epi': hf.p(0.93, -0.3, -2.7), 'hum.supracond': hf.p(0.75, -0.6, 1.6),
        'hum.cr_dist': hf.p(0.8, 1.0, 0.0), 'hum.cd_mid': hf.p(0.5, -1.3, 0.2),
    })

    # Radius and ulna.
    rr = S['radius']['radius'] * sc
    r0 = EL + hf.cr * rr * 1.0 + hf.lat * rr * 0.3
    r1 = CA + V(0.002 * sc, 0.003 * sc, -s * rr * 0.4)
    rf = Frame(r0, r1, rr, s)
    reg['rad'] = rf
    b = Builder()
    b.tube([rf.p(0.03), rf.p(0.5, 0.45), rf.p(0.95, 0.1)], [(rr * 1.05, rr * 0.8), (rr * 0.95, rr * 0.7), (rr * 1.65, rr * 0.95)], seg=12, hint=rf.lat)
    b.ellipsoid(rf.p(0.01), (rr * 1.3, rr * 0.55, rr * 1.15), axes=(rf.cr, rf.axis, rf.lat))
    b.ellipsoid(rf.p(0.98, 0, -1.3), (rr * 0.6, rr * 0.7, rr * 0.5))  # styloid
    finish(b, f'Radius_{tag}', 'Forelimb', vb, q['tri_long'])
    ru = S['radius']['ulna'] * sc
    olec = EL - hf.cr * rh * 1.6 + (EL - G).normalized() * (-S['len']['olecranon'] * sc) - hf.cr * S['len']['olecranon'] * sc * 0.3
    u0 = EL - hf.cr * rh * 1.0
    u1 = CA + V(-0.004 * sc, 0.002 * sc, s * ru * 0.8)
    uf = Frame(u0, u1, ru, s)
    reg['uln'] = uf
    b = Builder()
    b.tube([olec, u0, uf.p(0.45, -0.2), uf.p(0.98)], [(ru * 1.0, ru * 1.6), (ru * 1.0, ru * 1.7), (ru * 0.75, ru * 1.0), (ru * 0.8, ru * 0.9)], seg=12, hint=uf.lat)
    b.ellipsoid(u0 + hf.cr * rh * 0.6 + uf.axis * rh * 0.3, (ru * 1.0, ru * 0.9, ru * 1.1))  # coronoid region
    b.ellipsoid(olec, (ru * 1.5, ru * 1.3, ru * 1.2))
    finish(b, f'Ulna_{tag}', 'Forelimb', vb, q['tri_long'])
    lm.update({
        'uln.olec': olec, 'uln.olec_cd': olec - hf.cr * ru * 1.2, 'uln.prox_med': uf.p(0.12, 0, -1.5),
        'uln.prox_lat': uf.p(0.15, 0, 1.5), 'uln.mid_cd': uf.p(0.5, -1.2), 'uln.dist': uf.p(0.95, 0, 1.0),
        'rad.tub': rf.p(0.12, -0.3, -1.2), 'rad.prox_lat': rf.p(0.05, 0.6, 1.4), 'rad.mid_cr': rf.p(0.5, 1.4),
        'rad.dist_cr': rf.p(0.88, 1.6, 0), 'rad.dist_med': rf.p(0.92, 0, -1.8), 'rad.dist_lat': rf.p(0.9, 0.5, 1.6),
        'rad.mid_med': rf.p(0.55, 0, -1.4),
    })

    # Carpus.
    names = S['carpals']
    fwd = V(1, 0, 0)
    for k, (nm, row, col, size) in enumerate(names):
        c = CA + V(0, -row * rr * 1.25, s * col * rr * 1.1) + fwd * rr * 0.3
        if nm == 'accessorium':
            c = CA + V(-rr * 2.3, -rr * 0.2, s * rr * 1.0)
        b = Builder().ellipsoid(c, (rr * 0.8 * size, rr * 0.55 * size, rr * 0.6 * size), seg=12, rings=8)
        finish(b, f'Carpal_{nm}_{tag}', 'Forelimb', vb * 0.5, q['tri_tiny'])
    lm['carp.acc'] = CA + V(-rr * 3.2, -rr * 0.2, s * rr * 1.0)
    lm['carp.dors'] = CA + V(rr * 1.4, -rr * 0.8, 0)
    lm['carp.palm'] = CA + V(-rr * 0.8, -rr * 1.4, 0)

    # Metacarpals and digits.
    mc = S['manus']
    base_y = CA.y - rr * 2.6
    for d in range(1, 6):
        spread = (d - 3) * mc['spread'] * sc
        L = mc['mc_len'][d - 1] * sc
        b0 = V(CA.x + rr * 0.4, base_y, CA.z - s * spread * 0.8)
        dirv = V(math.cos(math.radians(mc['angle'])), -math.sin(math.radians(mc['angle'])), -s * 0.08).normalized()
        if d == 1:
            b0 = V(CA.x + rr * 0.3, base_y + rr * 0.9, CA.z - s * (2 * mc['spread'] * sc * 0.9))
        b1 = b0 + dirv * L
        r = mc['r'] * sc * (1.15 if d in (3, 4) else 0.95)
        b = Builder().tube([b0, b1], [r * 1.35, r, r * 1.3], seg=10)
        finish(b, f'Os_metacarpale_{d}_{tag}', 'Forelimb', vb * 0.45, q['tri_small'])
        lm[f'mc{d}.prox'], lm[f'mc{d}.dist'] = b0, b1
        p = b1
        n_ph = 2 if d == 1 else 3
        for ph in range(n_ph):
            pl = mc['ph_len'][ph] * sc * (0.75 if d == 1 else 1.0)
            if ph == n_ph - 1:
                a = math.radians(mc['claw'][0])
                q2 = p + V(math.cos(a) * pl, math.sin(a) * pl * mc['claw'][1], 0)
                b = Builder().tube([p, lerp(p, q2, 0.5) + V(0, pl * 0.25, 0), q2], [r * 0.95, r * 0.75, r * 0.15], seg=8)
            else:
                ang = math.radians(mc['toe_angle'][ph])
                q2 = p + V(math.cos(ang) * pl, -math.sin(ang) * pl, 0)
                b = Builder().tube([p, q2], [r * 1.0, r * 0.75, r * 0.95], seg=8)
            finish(b, f'Phalanx_{d}_{ph + 1}_{tag}', 'Forelimb', vb * 0.4, q['tri_tiny'])
            lm[f'fd{d}.p{ph + 1}'] = q2
            p = q2

    # ---------------- hindlimb ----------------
    A, H = j('hip'), j('hock')
    Lf, Lt = S['len']['femur'] * sc, S['len']['tibia'] * sc
    ST = ik(A, H, Lf, Lt, -1)
    ST.z = j('stifle_z').z
    pv = S['pelvis']
    P = {k: (V(v[0] * sc, v[1] * sc, s * v[2] * sc)) for k, v in pv['points'].items()}
    P['A'] = A
    b = Builder()
    w = pv['ilium_w'] * sc
    b.tube([P['TS'], lerp(P['TS'], P['A'], 0.5), P['A']], [(w * 0.35, w * 1.0), (w * 0.33, w * 0.7), (w * 0.45, w * 0.55)], seg=12, hint=V(0, 0, 1))
    b.tube([P['TC'], lerp(P['TC'], P['A'], 0.45), P['A']], [(w * 0.3, w * 0.55), (w * 0.25, w * 0.5), (w * 0.45, w * 0.5)], seg=10, hint=V(0, 0, 1))
    b.tube([P['TS'], P['TC']], [(w * 0.25, w * 0.4)], seg=8, hint=V(0, 0, 1))
    b.tube([P['A'], lerp(P['A'], P['IT'], 0.5), P['IT']], [(w * 0.35, w * 0.4), (w * 0.3, w * 0.42), (w * 0.4, w * 0.55)], seg=10, hint=V(0, 0, 1))
    b.tube([P['IT'], P['SYc']], [(w * 0.3, w * 0.4), (w * 0.25, w * 0.3)], seg=8, hint=V(0, 1, 0))
    b.tube([P['A'], lerp(P['A'], P['SYr'], 0.5) + V(0, -w * 0.2, 0), P['SYr']], [(w * 0.28, w * 0.25)], seg=8, hint=V(0, 1, 0))
    b.tube([P['SYr'], P['SYc']], [(w * 0.3, w * 0.25)], seg=8, hint=V(0, 0, 1))
    acet = [A + V(math.cos(t) * w * 0.85, math.sin(t) * w * 0.85, s * w * 0.15) for t in [k * math.pi / 5 for k in range(11)]]
    b.tube(acet, [w * 0.18], seg=6, n=30)
    finish(b, f'Pelvis_{tag}', 'Hindlimb', vb * 0.85, q['tri_big'])
    for k, v in P.items():
        lm['pel.' + k] = v
    lm['pel.ilium_mid'] = lerp(P['TS'], P['A'], 0.45) + V(0, 0, s * w * 0.4)
    lm['pel.ilium_lat'] = lerp(P['TC'], P['A'], 0.35) + V(0, 0, s * w * 0.5)
    lm['pel.ilium_ven'] = lerp(P['TC'], P['A'], 0.4) + V(0, -w * 0.6, 0)
    lm['pel.ischium_mid'] = lerp(P['A'], P['IT'], 0.5)
    lm['pel.obturator'] = (P['A'] + P['IT'] + P['SYr'] + P['SYc']) / 4
    lm['pel.pubis'] = lerp(P['A'], P['SYr'], 0.6)

    rf_ = S['radius']['femur'] * sc
    top = A + V(0, 0, s * rf_ * 1.6) + (ST - A).normalized() * rf_ * 0.5
    ff = Frame(top, ST, rf_, s)
    reg['fem'] = ff
    b = Builder()
    b.tube([ff.p(0.05), ff.p(0.5, 0.35), ff.p(0.9, -0.1)], [rf_ * 1.35, rf_ * 1.0, rf_ * 1.0, rf_ * 1.4], seg=14)
    b.ellipsoid(A, (rf_ * 1.45, rf_ * 1.45, rf_ * 1.45))
    b.tube([A, top], [rf_ * 0.85, rf_ * 1.0], seg=10)
    gt = ff.p(S['femur']['gt'][0], -0.3, 0.8)
    b.ellipsoid(gt, (rf_ * 1.0, rf_ * 1.3, rf_ * 0.8))
    b.ellipsoid(ff.p(0.13, -1.1, -1.0), (rf_ * 0.6, rf_ * 0.7, rf_ * 0.55))  # lesser trochanter
    if S['femur'].get('third'):
        b.ellipsoid(ff.p(0.27, 0, 1.25), (rf_ * 0.45, rf_ * 0.9, rf_ * 0.4))
    for side_c in (-1, 1):
        b.ellipsoid(ff.p(0.98, -0.65, side_c * 0.85), (rf_ * 1.0, rf_ * 1.05, rf_ * 0.75))
    for side_c in (-1, 1):
        b.tube([ff.p(0.84, 0.95, side_c * 0.6), ff.p(0.98, 0.75, side_c * 0.7)], [rf_ * 0.4], seg=8)
    finish(b, f'Femoris_{tag}', 'Hindlimb', vs, q['tri_long'])
    lm.update({
        'fem.head': A, 'fem.gt': gt + ff.lat * rf_ * 0.6, 'fem.gt_top': gt + ff.axis * -rf_ * 1.0,
        'fem.lt': ff.p(0.13, -1.4, -1.3), 'fem.third': ff.p(0.27, 0, 1.6), 'fem.troch_fossa': ff.p(0.0, -1.0, 0.3),
        'fem.cr_prox': ff.p(0.12, 1.1, 0.2), 'fem.cd_mid': ff.p(0.5, -1.3, 0), 'fem.med_mid': ff.p(0.45, 0, -1.3),
        'fem.lat_mid': ff.p(0.45, 0, 1.3), 'fem.lat_dist': ff.p(0.9, -0.4, 1.5), 'fem.med_dist': ff.p(0.9, -0.4, -1.5),
        'fem.lat_epi': ff.p(0.93, -0.8, 1.6), 'fem.med_epi': ff.p(0.93, -0.8, -1.6), 'fem.cd_dist': ff.p(0.85, -1.4, 0),
        'fem.cd_lat_sup': ff.p(0.85, -1.4, 0.8), 'fem.cd_med_sup': ff.p(0.85, -1.4, -0.8), 'fem.extensor_fossa': ff.p(0.96, 0.2, 1.4),
        'fem.ext_fossa': ff.p(0.96, 0.2, 1.4),
    })
    pat = ff.p(0.92, 1.45)
    b = Builder().ellipsoid(pat, (rf_ * 0.55, rf_ * 0.95, rf_ * 0.6), axes=(ff.cr, ff.axis, ff.lat))
    finish(b, f'Patella_{tag}', 'Hindlimb', vb * 0.45, q['tri_small'])
    lm['pat'] = pat + ff.cr * rf_ * 0.4

    rt = S['radius']['tibia'] * sc
    t0 = ST + (H - ST).normalized() * rf_ * 1.2
    tf = Frame(t0, H, rt, s)
    reg['tib'] = tf
    b = Builder()
    b.tube([tf.p(0.04), tf.p(0.5, 0.3), tf.p(0.97)], [(rt * 1.6, rt * 1.4), (rt * 1.05, rt * 1.0), (rt * 0.95, rt * 0.9), (rt * 1.25, rt * 1.1)], seg=14, hint=tf.lat)
    b.ellipsoid(tf.p(0.01), (rt * 1.8, rt * 0.75, rt * 2.0), axes=(tf.cr, tf.axis, tf.lat))
    b.tube([tf.p(0.02, 1.65), tf.p(0.18, 1.6), tf.p(0.4, 0.8)], [(rt * 0.45, rt * 0.6), (rt * 0.35, rt * 0.45), (rt * 0.2, rt * 0.3)], seg=8, hint=tf.lat)
    b.ellipsoid(tf.p(0.99, 0, -1.1), (rt * 0.65, rt * 0.75, rt * 0.55))
    finish(b, f'Tibia_{tag}', 'Hindlimb', vs, q['tri_long'])
    fr = S['radius']['fibula'] * sc
    f0 = tf.p(0.05, -0.6, 1.9)
    f1 = tf.p(1.0, -0.2, 1.4)
    pts = [f0, tf.p(0.5, -0.9, 2.0), f1] if not S['fibula_fused'] else [f0, tf.p(0.3, -0.8, 1.9), tf.p(0.55, -0.3, 1.2)]
    b = Builder().tube(pts, [fr * 1.8, fr, fr * 1.4], seg=8)
    b.ellipsoid(f0, (fr * 1.6, fr * 1.8, fr * 1.4))
    finish(b, f'Fibula_{tag}', 'Hindlimb', vb * 0.5, q['tri_small'] * 2)
    lm.update({
        'tib.tub': tf.p(0.08, 1.9), 'tib.crest': tf.p(0.25, 1.4), 'tib.med_cond': tf.p(0.02, 0, -2.0),
        'tib.lat_cond': tf.p(0.02, 0, 2.0), 'tib.med_prox': tf.p(0.18, 0.2, -1.5), 'tib.med_mid': tf.p(0.5, 0, -1.3),
        'tib.cd_prox': tf.p(0.12, -1.5, 0), 'tib.cd_mid': tf.p(0.45, -1.3, 0), 'tib.lat_prox': tf.p(0.1, 0.6, 1.7),
        'tib.cr_mid': tf.p(0.5, 1.2, 0.3), 'tib.med_mall': tf.p(0.99, 0, -1.6), 'tib.dist_cr': tf.p(0.92, 1.2, 0),
        'fib.head': f0 + tf.lat * fr, 'fib.mid': pts[1] + tf.lat * fr, 'fib.lat_mall': f1 + tf.lat * fr * 1.3,
    })

    # Tarsus.
    ps = S['pes']
    down = V(math.cos(math.radians(ps['angle'])), -math.sin(math.radians(ps['angle'])), 0)
    talus = H + down * rt * 0.6
    b = Builder().ellipsoid(talus, (rt * 1.3, rt * 1.1, rt * 1.1))
    for k in (-1, 1):
        b.tube([talus + V(-rt * 0.9, rt * 0.4, s * k * rt * 0.55), talus + V(rt * 0.9, rt * 0.2, s * k * rt * 0.55)], [rt * 0.45], seg=8)
    finish(b, f'Tibial_tarsal_{tag}', 'Hindlimb', vb * 0.5, q['tri_small'])
    cal_dir = V(-math.cos(math.radians(ps['calc_angle'])), math.sin(math.radians(ps['calc_angle'])), 0)
    cb = talus + V(0, -rt * 0.9, s * rt * 0.7)
    tub = cb + cal_dir * ps['calc_len'] * sc
    b = Builder().tube([cb + down * rt * 1.2, cb, tub], [rt * 0.95, rt * 0.85, rt * 0.75], seg=10)
    b.ellipsoid(tub, (rt * 0.95, rt * 0.9, rt * 0.85))
    finish(b, f'Calcaneal_tuber_{tag}', 'Hindlimb', vb * 0.5, q['tri_small'])
    lm['calc.tuber'] = tub + cal_dir * rt * 0.6
    lm['calc.lat'] = cb + V(0, 0, s * rt * 1.0)
    b = Builder().ellipsoid(talus + down * rt * 1.8 + V(0, 0, -s * rt * 0.3), (rt * 0.8, rt * 0.45, rt * 1.0))
    finish(b, f'Tarsus_centrale_{tag}', 'Hindlimb', vb * 0.45, q['tri_tiny'])
    row = talus + down * rt * 2.9
    for i in ps['tarsals']:
        c = row + V(0, 0, s * (i - 2.6) * rt * 0.75)
        if i == 4:
            c = c + V(0, rt * 0.6, s * rt * 0.4)
        b = Builder().ellipsoid(c, (rt * 0.55, rt * 0.45 if i != 4 else rt * 1.0, rt * 0.45), seg=10, rings=6)
        finish(b, f'Tarsus_{i}_{tag}', 'Hindlimb', vb * 0.4, q['tri_tiny'])
    lm['tars.dors'] = row + V(rt * 0.8, rt * 0.3, 0)
    lm['tars.plantar'] = row + V(-rt * 1.0, -rt * 0.4, 0)
    lm['tars.med'] = row + V(0, 0, -s * rt * 1.6)
    lm['tars.lat'] = row + V(0, 0, s * rt * 1.6)

    for d in ps['digits']:
        L = ps['mt_len'][d - 2] * sc
        b0 = row + down * rt * 0.9 + V(0, 0, s * (d - 3.5) * ps['spread'] * sc)
        dirv = V(math.cos(math.radians(ps['mt_angle'])), -math.sin(math.radians(ps['mt_angle'])), s * (d - 3.5) * 0.04).normalized()
        b1 = b0 + dirv * L
        r = ps['r'] * sc * (1.15 if d in (3, 4) else 1.0)
        b = Builder().tube([b0, b1], [r * 1.35, r, r * 1.3], seg=10)
        finish(b, f'Metatarsi_{d}_{tag}', 'Hindlimb', vb * 0.45, q['tri_small'])
        lm[f'mt{d}.prox'], lm[f'mt{d}.dist'] = b0, b1
        p = b1
        for ph in range(3):
            pl = ps['ph_len'][ph] * sc
            if ph == 2:
                a = math.radians(mc['claw'][0])
                q2 = p + V(math.cos(a) * pl, math.sin(a) * pl * mc['claw'][1], 0)
                b = Builder().tube([p, lerp(p, q2, 0.5) + V(0, pl * 0.25, 0), q2], [r * 0.95, r * 0.75, r * 0.15], seg=8)
            else:
                ang = math.radians(ps['toe_angle'][ph])
                q2 = p + V(math.cos(ang) * pl, -math.sin(ang) * pl, 0)
                b = Builder().tube([p, q2], [r * 1.0, r * 0.75, r * 0.95], seg=8)
            finish(b, f'Phalanges_B_{d}_{ph + 1}_{tag}', 'Hindlimb', vb * 0.4, q['tri_tiny'])
            lm[f'hd{d}.p{ph + 1}'] = q2
            p = q2

    reg['joints'] = {'shoulder': G, 'elbow': EL, 'carpus': CA, 'hip': A, 'stifle': ST, 'hock': H,
                     'foretoes': lm['mc3.dist'], 'hindtoes': lm['mt3.dist']}
