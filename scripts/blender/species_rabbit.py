"""Oryctolagus cuniculus: authored proportions for an adult domestic rabbit
(~3 kg) in a resting crouch.

Features: vertebral formula C7 T12 L7 S4, ~16 caudal; 12 rib pairs (7
sternal); long lumbar transverse processes; long narrow skull with large
orbits, fenestrated maxilla and two pairs of upper incisors (peg teeth);
well-developed clavicle; carpus 9; fused distal tibia and fibula; third
trochanter; long hind feet with four digits. Values are illustrative, not
specimen measurements.
"""
import math
from skull import build_skull
from limbs import build_limbs

S = {
    'species': 'rabbit',
    'scale': 1.0,
    'muscle_scale': 1.5,
    'region_scale': {'Hindlimb': 1.35},
    'quality': {'smooth': 3, 'vox_small': 0.00058, 'vox_limb': 0.00075, 'vox_skull': 0.00085,
                'tri_vert': 850, 'tri_tail': 200, 'tri_rib': 380, 'tri_big': 3000, 'tri_long': 2400,
                'tri_small': 300, 'tri_tiny': 130, 'tri_skull': 9000},
    'vertebrae': (7, 12, 7, 4, 16),
    'spine': {'C1': (0.200, 0.168, 0), 'C4': (0.180, 0.150, 0), 'C7': (0.150, 0.136, 0),
              'T1': (0.140, 0.137, 0), 'Tmid': (0.075, 0.155, 0), 'Tn': (0.016, 0.168, 0),
              'L1': (0.004, 0.170, 0), 'Lmid': (-0.058, 0.181, 0), 'Ln': (-0.113, 0.162, 0),
              'S': (-0.148, 0.140, 0)},
    'vert': {
        'C': {'body': (0.0052, 0.0100), 'spinous': (0.003, 0.008), 'tilt': (0, -10), 'transverse': (0.006, 0.006), 'tdrop': -0.6, 'tfwd': 0.2},
        'T': {'body': (0.0048, 0.0095), 'spinous': (0.016, 0.008), 'tilt': (-35, 10), 'transverse': (0.004, 0.0035), 'tdrop': 0.25, 'tfwd': 0.0},
        'L': {'body': (0.0075, 0.0175), 'spinous': (0.010, 0.008), 'tilt': (25, 15), 'transverse': (0.022, 0.016), 'tdrop': -0.25, 'tfwd': 0.55},
    },
    'tail': [(-0.148, 0.140, 0), (-0.165, 0.145, 0), (-0.185, 0.158, 0), (-0.197, 0.176, 0)],
    'tail_r': (0.0035, 0.0015),
    'sternum': {'count': 6, 'r': 0.0030, 'xiphoid': 0.015,
                'path': [(0.150, 0.086, 0), (0.12, 0.068, 0), (0.07, 0.060, 0), (0.03, 0.062, 0)]},
    'ribs': {'true': 7, 'floating': 3, 'r': 0.0014, 'sweep': 0.018, 'arch_fwd': 0.014,
             'width': lambda u: 0.018 + 0.022 * math.sin(math.pi * min(1.0, 0.12 + 0.82 * u)),
             'depth': lambda u: 0.055 + 0.035 * math.sin(math.pi * min(1.0, 0.15 + u * 0.95)) - 0.02 * max(0, u - 0.75) / 0.25},
    'head': {
        'occiput': (0.205, 0.176, 0), 'rostrum': (0.279, 0.136, 0),
        'masses': [(0.22, 0.04, 0.24, 0.18, 0.17), (0.45, 0.10, 0.16, 0.10, 0.10), (0.58, -0.08, 0.22, 0.14, 0.13),
                   (0.82, 0.0, 0.20, 0.11, 0.09), (0.04, 0.0, 0.08, 0.16, 0.15), (0.50, -0.12, 0.30, 0.06, 0.10)],
        'crest': (0.18, 0.20, 0.18),
        'zygoma': [(0.18, -0.06, 0.20), (0.40, -0.08, 0.27), (0.62, -0.08, 0.20)], 'zyg_r': 0.02,
        'postorbital': [(0.42, 0.18, 0.12), (0.50, 0.14, 0.20)],
        'bulla': (0.12, -0.14, 0.12, 0.07), 'mastoid': 0.17,
        'orbit_cuts': [(0.42, 0.05, 0.22, (0.15, 0.11, 0.11))],
        'fenestrae': [(0.62, -0.02, 0.14, (0.04, 0.03, 0.05)), (0.70, -0.04, 0.13, (0.03, 0.025, 0.05))],
        'nasal': (1.0, 0.0, 0.06, 0.06, 0.05),
        'incisors': [(0.94, -0.08, 0.03, 0.14, 0.022), (0.90, -0.08, 0.06, 0.08, 0.012)],
        'mandible': {'symph': (0.85, -0.26, 0.04), 'body_mid': (0.50, -0.30, 0.14), 'angle': (0.08, -0.30, 0.19),
                     'ramus_base': (0.14, -0.25, 0.19), 'coronoid': (0.20, -0.02, 0.20), 'condyle': (0.10, 0.0, 0.19),
                     'h': 0.15, 'w': 0.022, 'ramus_w': 0.15},
    },
    'joints': {'shoulder': (0.135, 0.100, 0.030), 'scap_dorsal': (0.100, 0.150, 0.020), 'carpus': (0.150, 0.022, 0.026),
               'elbow_z': (0, 0, 0.030), 'hip': (-0.120, 0.120, 0.032), 'hock': (-0.162, 0.024, 0.030), 'stifle_z': (0, 0, 0.040)},
    'len': {'humerus': 0.065, 'radius': 0.066, 'olecranon': 0.012, 'femur': 0.088, 'tibia': 0.105},
    'radius': {'humerus': 0.0038, 'radius': 0.0028, 'ulna': 0.0025, 'femur': 0.0050, 'tibia': 0.0042, 'fibula': 0.0011},
    'scapula': {'outline': [(0.10, 0.06), (0.35, 0.15), (0.70, 0.22), (1.0, 0.20), (1.0, -0.12), (0.80, -0.30),
                            (0.50, -0.22), (0.25, -0.12), (0.10, -0.06)],
                'cup': 0.10, 'th': 0.0012, 'spine_cr': 0.0, 'spine_h': (0.02, 0.05, 0.08, 0.095),
                'acromion': (0.99, 0.08), 'metacromion': (0.15, 0.06)},
    'clavicle': {'from': (0.010, 0.010, -0.004), 'to': (0.028, -0.022, -0.020), 'r': 0.0008},
    'carpals': [('radiale', 0, -1.0, 1.0), ('intermedium', 0, -0.1, 1.0), ('ulnare', 0, 0.9, 1.0), ('accessorium', 0, 0, 1.1),
                ('centrale', 0.5, -0.3, 0.7), ('1', 1, -1.6, 0.6), ('2', 1, -0.6, 0.8), ('3', 1, 0.4, 0.9), ('4', 1, 1.4, 1.0)],
    'manus': {'spread': 0.004, 'mc_len': [0.008, 0.016, 0.019, 0.019, 0.016], 'angle': 30, 'r': 0.0014,
              'ph_len': [0.008, 0.006, 0.005], 'toe_angle': [10, 0], 'claw': (-20, 1.0)},
    'pelvis': {'ilium_w': 0.008, 'points': {'TS': (-0.100, 0.158, 0.010), 'TC': (-0.078, 0.150, 0.022),
                                             'IT': (-0.160, 0.130, 0.020), 'SYr': (-0.125, 0.105, 0.004),
                                             'SYc': (-0.155, 0.110, 0.004)}},
    'femur': {'gt': (-0.06,), 'third': True},
    'fibula_fused': True,
    'pes': {'angle': 35, 'calc_angle': 25, 'calc_len': 0.022, 'tarsals': [2, 3, 4], 'digits': [2, 3, 4, 5],
            'spread': 0.004, 'mt_len': [0.040, 0.046, 0.046, 0.040], 'mt_angle': 8, 'r': 0.0018,
            'ph_len': [0.010, 0.007, 0.006], 'toe_angle': [5, 0]},
    'hull': [([(0.21, 0.142, 0), (0.19, 0.128, 0), (0.168, 0.117, 0), (0.145, 0.108, 0), (0.12, 0.105, 0), (0.08, 0.110, 0), (0.04, 0.116, 0),
               (0.0, 0.121, 0), (-0.04, 0.122, 0), (-0.08, 0.125, 0), (-0.115, 0.130, 0), (-0.14, 0.130, 0)],
              [(0.016, 0.013), (0.021, 0.016), (0.025, 0.019), (0.029, 0.026), (0.040, 0.038), (0.047, 0.045), (0.051, 0.048),
               (0.053, 0.051), (0.052, 0.051), (0.050, 0.048), (0.035, 0.032), (0.020, 0.018)])],
    'linea': [(0.03, 0.058, 0), (-0.02, 0.064, 0), (-0.07, 0.072, 0), (-0.11, 0.098, 0), (-0.127, 0.103, 0)],
    'retarget': {
        'fore_toe': (0.178, 0.004, 0.024), 'hind_toe': (-0.085, 0.004, 0.028), 'orbit': 0.45, 'jaw_close': 1.4,
        'girth': {'cranium': 1.0, 'face': 0.95, 'neck': 1.0, 'thorax': 0.85, 'lumbar': 0.9, 'pelvis': 0.95, 'tail': 1.2,
                  'scap': 0.8, 'arm': 0.75, 'forearm': 0.7, 'manus': 0.8, 'thigh': 1.0, 'crus': 0.95, 'pes': 0.9},
        'width': {'cranium': 1.0, 'face': 0.8},
    },
    'skull': build_skull,
    'limbs': build_limbs,
}
