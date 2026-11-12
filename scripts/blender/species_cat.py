"""Felis catus: authored proportions for an adult domestic cat (~4 kg).

Proportions follow standard feline osteology (vertebral formula C7 T13 L7
S3, ~21 caudal; 13 rib pairs, 9 sternal; carpus 7, tarsus 7; forelimb
digits 5, hindlimb digits 4). Values are illustrative, not specimen
measurements.
"""
import math
from skull import build_skull
from limbs import build_limbs

S = {
    'species': 'cat',
    'scale': 1.0,
    'muscle_scale': 1.7,
    'quality': {'smooth': 3, 'vox_small': 0.00062, 'vox_limb': 0.0008, 'vox_skull': 0.0009,
                'tri_vert': 900, 'tri_tail': 220, 'tri_rib': 420, 'tri_big': 3200, 'tri_long': 2600,
                'tri_small': 320, 'tri_tiny': 140, 'tri_skull': 9000},
    'vertebrae': (7, 13, 7, 3, 21),
    'spine': {'C1': (0.216, 0.240, 0), 'C4': (0.192, 0.216, 0), 'C7': (0.160, 0.198, 0),
              'T1': (0.147, 0.196, 0), 'Tmid': (0.075, 0.206, 0), 'Tn': (-0.004, 0.212, 0),
              'L1': (-0.016, 0.214, 0), 'Lmid': (-0.075, 0.222, 0), 'Ln': (-0.133, 0.214, 0),
              'S': (-0.168, 0.207, 0)},
    'vert': {
        'C': {'body': (0.0060, 0.0115), 'spinous': (0.004, 0.011), 'tilt': (0, -10), 'transverse': (0.008, 0.007), 'tdrop': -0.6, 'tfwd': 0.2},
        'T': {'body': (0.0050, 0.0100), 'spinous': (0.021, 0.009), 'tilt': (-32, 18), 'transverse': (0.005, 0.004), 'tdrop': 0.25, 'tfwd': 0.0},
        'L': {'body': (0.0068, 0.0150), 'spinous': (0.011, 0.009), 'tilt': (22, 15), 'transverse': (0.015, 0.011), 'tdrop': -0.35, 'tfwd': 0.45},
    },
    'tail': [(-0.168, 0.207, 0), (-0.198, 0.202, 0), (-0.245, 0.170, 0), (-0.29, 0.115, 0), (-0.318, 0.05, 0)],
    'tail_r': (0.0036, 0.0012),
    'sternum': {'count': 8, 'r': 0.0034, 'xiphoid': 0.012,
                'path': [(0.158, 0.132, 0), (0.125, 0.108, 0), (0.075, 0.097, 0), (0.028, 0.099, 0)]},
    'ribs': {'true': 9, 'floating': 1, 'r': 0.0016, 'sweep': 0.022, 'arch_fwd': 0.018,
             'width': lambda u: 0.021 + 0.028 * math.sin(math.pi * min(1.0, 0.12 + 0.82 * u)),
             'depth': lambda u: 0.068 + 0.045 * math.sin(math.pi * min(1.0, 0.15 + u * 0.95)) - 0.03 * max(0, u - 0.75) / 0.25},
    'head': {
        'occiput': (0.226, 0.246, 0), 'rostrum': (0.313, 0.223, 0),
        'masses': [(0.33, 0.06, 0.34, 0.26, 0.24), (0.55, 0.08, 0.18, 0.16, 0.13), (0.70, -0.06, 0.22, 0.15, 0.17),
                   (0.88, -0.02, 0.12, 0.11, 0.11), (0.08, 0.02, 0.10, 0.18, 0.20), (0.45, -0.08, 0.28, 0.07, 0.13)],
        'crest': (0.25, 0.31, 0.20),
        'zygoma': [(0.22, -0.10, 0.25), (0.45, -0.12, 0.37), (0.68, -0.06, 0.22)], 'zyg_r': 0.022,
        'postorbital': [(0.55, 0.17, 0.15), (0.58, 0.07, 0.29)],
        'bulla': (0.18, -0.16, 0.13, 0.075), 'mastoid': 0.2,
        'orbit_cuts': [(0.52, 0.07, 0.27, (0.17, 0.13, 0.12))],
        'nasal': (1.0, 0.0, 0.07, 0.07, 0.06),
        'mandible': {'symph': (0.92, -0.24, 0.05), 'body_mid': (0.55, -0.26, 0.17), 'angle': (0.12, -0.27, 0.23),
                     'ramus_base': (0.22, -0.22, 0.23), 'coronoid': (0.34, 0.08, 0.25), 'condyle': (0.14, -0.12, 0.23),
                     'h': 0.13, 'w': 0.024, 'ramus_w': 0.11},
    },
    'joints': {'shoulder': (0.150, 0.180, 0.034), 'scap_dorsal': (0.116, 0.228, 0.024), 'carpus': (0.142, 0.040, 0.030),
               'elbow_z': (0, 0, 0.036), 'hip': (-0.170, 0.190, 0.036), 'hock': (-0.212, 0.070, 0.034), 'stifle_z': (0, 0, 0.044)},
    'len': {'humerus': 0.098, 'radius': 0.092, 'olecranon': 0.016, 'femur': 0.112, 'tibia': 0.118},
    'radius': {'humerus': 0.0045, 'radius': 0.0032, 'ulna': 0.0028, 'femur': 0.0050, 'tibia': 0.0042, 'fibula': 0.0012},
    'scapula': {'outline': [(0.10, 0.07), (0.30, 0.20), (0.62, 0.30), (0.88, 0.27), (1.0, 0.12), (1.0, -0.15),
                            (0.92, -0.30), (0.6, -0.24), (0.3, -0.13), (0.10, -0.07)],
                'cup': 0.12, 'th': 0.0013, 'spine_cr': -0.02, 'spine_h': (0.02, 0.05, 0.085, 0.10),
                'acromion': (0.97, 0.07), 'metacromion': (0.12, 0.03)},
    'clavicle': {'from': (0.012, 0.012, -0.004), 'to': (0.020, -0.002, -0.012), 'r': 0.0009},
    'carpals': [('intermedioradiale', 0, -0.8, 1.3), ('ulnare', 0, 0.9, 1.0), ('accessorium', 0, 0, 1.2),
                ('1', 1, -1.6, 0.7), ('2', 1, -0.6, 0.8), ('3', 1, 0.4, 0.9), ('4', 1, 1.4, 1.0)],
    'manus': {'spread': 0.0045, 'mc_len': [0.010, 0.020, 0.024, 0.024, 0.020], 'angle': 65, 'r': 0.0016,
              'ph_len': [0.010, 0.007, 0.007], 'toe_angle': [25, 0], 'claw': (20, 1.0)},
    'pelvis': {'ilium_w': 0.009, 'points': {'TS': (-0.140, 0.222, 0.012), 'TC': (-0.118, 0.212, 0.024),
                                             'IT': (-0.222, 0.192, 0.022), 'SYr': (-0.176, 0.168, 0.004),
                                             'SYc': (-0.214, 0.174, 0.004)}},
    'femur': {'gt': (-0.02,), 'third': False},
    'fibula_fused': False,
    'pes': {'angle': 80, 'calc_angle': 75, 'calc_len': 0.020, 'tarsals': [1, 2, 3, 4], 'digits': [2, 3, 4, 5],
            'spread': 0.0045, 'mt_len': [0.040, 0.046, 0.046, 0.040], 'mt_angle': 76, 'r': 0.0018,
            'ph_len': [0.009, 0.006, 0.006], 'toe_angle': [25, 0]},
    # Hidden guide volume (thoracic/abdominal cavity, ventral neck) that flat
    # muscles drape over; radii are (vertical, lateral). Not exported.
    'hull': [([(0.232, 0.212, 0), (0.205, 0.192, 0), (0.18, 0.176, 0), (0.15, 0.160, 0), (0.12, 0.157, 0), (0.08, 0.156, 0), (0.04, 0.156, 0),
               (0.0, 0.157, 0), (-0.03, 0.158, 0), (-0.08, 0.162, 0), (-0.13, 0.180, 0), (-0.165, 0.192, 0)],
              [(0.018, 0.014), (0.024, 0.017), (0.030, 0.021), (0.035, 0.030), (0.054, 0.044), (0.062, 0.052), (0.063, 0.055),
               (0.061, 0.054), (0.057, 0.050), (0.050, 0.044), (0.030, 0.028), (0.018, 0.016)])],
    'linea': [(0.03, 0.098, 0), (-0.03, 0.106, 0), (-0.09, 0.113, 0), (-0.15, 0.158, 0), (-0.176, 0.168, 0)],
    # Retargeting the dog model: target landmarks not covered above and girth
    # multipliers per body segment (relative to the trunk-length scale).
    'retarget': {
        'fore_toe': (0.163, 0.006, 0.028), 'hind_toe': (-0.185, 0.006, 0.030), 'orbit': 0.6, 'jaw_close': 1.9,
        'girth': {'cranium': 1.25, 'face': 0.95, 'neck': 0.9, 'thorax': 0.8, 'lumbar': 0.85, 'pelvis': 0.85, 'tail': 0.85,
                  'scap': 0.85, 'arm': 0.8, 'forearm': 0.75, 'manus': 0.85, 'thigh': 0.85, 'crus': 0.8, 'pes': 0.85},
        'width': {'cranium': 1.35, 'face': 1.1},
    },
    'skull': build_skull,
    'limbs': build_limbs,
}
