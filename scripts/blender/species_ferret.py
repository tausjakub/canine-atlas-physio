"""Mustela putorius furo: the domestic ferret, derived from the cat proportions.

Long, low body with short legs and a small head; vertebral formula C7 T15 L5
S3, ~18 caudal; 15 rib pairs; five digits on every foot. The dog has 13 + 7
thoracolumbar vertebrae and the ferret 15 + 5, so the dog's first two lumbar
vertebrae become T14 and T15 and receive ribs (species_edits). Values are
illustrative, not specimen measurements.
"""
from species_cat import S as CAT
from species_derive import derive

S = derive(
    CAT,
    'ferret',
    trunk=1.35,
    height=0.72,
    head=0.85,
    legs=0.72,
    tail=0.75,
    stance={'humerus': -115, 'radius': -92, 'manus': -60, 'femur': -65, 'tibia': -125, 'pes': -55, 'toes': -10, 'arch': 0.015, 'head_pitch': 0},
    skull_scan={'skull': 'ferret/skull.stl', 'jaw': 'ferret/jaw.stl', 'up': 'y'},
    vertebrae=(7, 15, 5, 3, 18),
    relabel_lumbar=2,
    retarget={
        **CAT['retarget'],
        'girth': {**CAT['retarget']['girth'], 'thorax': 0.72, 'lumbar': 0.72, 'pelvis': 0.78, 'neck': 0.78, 'scap': 0.72,
                  'arm': 0.72, 'forearm': 0.75, 'thigh': 0.85, 'crus': 0.8},
    },
)
