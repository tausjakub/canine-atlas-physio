"""Load the converted MusculoskeletalDog geometry (public/models) into Blender.

The dog catalog stores per-part byte offsets into anatomy.bin: float32 XYZ
positions and uint32 triangle indices, in the atlas frame (x cranial, y up,
z lateral, left negative), rest pose.
"""
import json
import os
import struct
import bpy


def load_dog(root, col, systems=('bone', 'muscle')):
    models = os.path.join(root, 'public', 'models')
    with open(os.path.join(models, 'catalog.json'), encoding='utf-8') as f:
        catalog = json.load(f)
    with open(os.path.join(models, 'anatomy.bin'), 'rb') as f:
        blob = f.read()
    with open(os.path.join(root, 'app', 'study-data.json'), encoding='utf-8') as f:
        profiles = {k: v.get('profile') for k, v in json.load(f)['parts'].items()}
    parts = []
    for p in catalog['parts']:
        if p['system'] not in systems or p.get('path'):
            continue
        n = p['vertexCount']
        pos = struct.unpack_from(f'<{n * 3}f', blob, p['vertexOffset'])
        idx = struct.unpack_from(f'<{p["indexCount"]}I', blob, p['indexOffset'])
        me = bpy.data.meshes.new(p['id'])
        me.from_pydata([pos[i:i + 3] for i in range(0, len(pos), 3)], [],
                       [idx[i:i + 3] for i in range(0, len(idx), 3)])
        me.validate()
        ob = bpy.data.objects.new(p['id'], me)
        col.objects.link(ob)
        parts.append({'id': p['id'], 'system': p['system'], 'ob': ob, 'profile': profiles.get(p['id'])})
    return parts
