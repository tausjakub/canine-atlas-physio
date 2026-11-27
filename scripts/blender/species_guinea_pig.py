"""Cavia porcellus: the guinea pig, derived from the rabbit proportions.

Compact body, short legs, large head and no visible tail; vertebral formula
C7 T13 L6 S4, ~6 caudal; 13 rib pairs; four digits on the forefoot and three
on the hind foot; one pair of upper incisors (no peg teeth); dentition
I 1/1 C 0/0 P 1/1 M 3/3 (20 teeth). Values are illustrative, not specimen
measurements.
"""
from species_rabbit import S as RABBIT
from species_derive import derive

S = derive(
    RABBIT,
    'guinea_pig',
    trunk=0.9,
    height=0.8,
    head=1.1,
    legs=0.75,
    tail=0.3,
    vertebrae=(7, 13, 6, 4, 6),
    pegs=False,
    remove_digits={'fore': [1], 'hind': [5]},
    retarget={
        **RABBIT['retarget'],
        'girth': {**RABBIT['retarget']['girth'], 'thorax': 1.0, 'lumbar': 1.05, 'pelvis': 1.0, 'face': 1.1,
                  'thigh': 0.95, 'crus': 0.85, 'pes': 0.85},
        'head_shape': {**RABBIT['retarget']['head_shape'], 'orbit_grow': 0.5, 'nasal': (0.5, 1.0, 0.02)},
    },
)
