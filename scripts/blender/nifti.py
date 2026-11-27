"""Minimal NIfTI-1 reader (gzip or plain) with numpy; no nibabel in Blender."""
import gzip
import struct
import numpy as np

DTYPES = {2: np.uint8, 4: np.int16, 8: np.int32, 16: np.float32, 64: np.float64, 256: np.int8, 512: np.uint16, 768: np.uint32}


def load(path):
    raw = gzip.open(path).read() if path.endswith('.gz') else open(path, 'rb').read()
    end = '<' if struct.unpack_from('<i', raw, 0)[0] == 348 else '>'
    dim = struct.unpack_from(end + '8h', raw, 40)
    dtype = np.dtype(DTYPES[struct.unpack_from(end + 'h', raw, 70)[0]]).newbyteorder(end)
    pixdim = struct.unpack_from(end + '8f', raw, 76)
    off = int(struct.unpack_from(end + 'f', raw, 108)[0])
    slope, inter = struct.unpack_from(end + '2f', raw, 112)
    sform = struct.unpack_from(end + 'h', raw, 254)[0]
    srow = np.array(struct.unpack_from(end + '12f', raw, 280)).reshape(3, 4)
    n = dim[1:1 + dim[0]]
    data = np.frombuffer(raw, dtype, int(np.prod(n)), off).reshape(n[::-1]).transpose()[..., ] if dim[0] >= 3 else None
    data = np.asarray(data)
    if slope not in (0.0, 1.0):
        data = data * slope + inter
    affine = srow if sform > 0 else np.diag(list(pixdim[1:4]) + [0])[:3]
    return data, affine, pixdim[1:4]
