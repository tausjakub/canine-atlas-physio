// Repack part geometry with 16-bit triangle indices where a part has fewer
// than 65536 vertices (every species part does): indices are two thirds of
// the bytes, so this cuts a model by about a third. Each part is written as
// float32 positions, then uint16 (or uint32) indices padded to 4 bytes so the
// next part's floats stay aligned. Parts gain `indexBits: 16`; readers fall
// back to 32-bit indices when it is absent (the dog model).
export function pack16(parts, geometry) {
  const chunks = [];
  let offset = 0;
  const out = parts.map((p) => {
    const vb = geometry.subarray(
      p.vertexOffset,
      p.vertexOffset + p.vertexCount * 12,
    );
    const src = new Uint32Array(
      geometry.buffer.slice(
        geometry.byteOffset + p.indexOffset,
        geometry.byteOffset + p.indexOffset + p.indexCount * 4,
      ),
    );
    const small = p.vertexCount < 65536;
    let ib = Buffer.from((small ? Uint16Array.from(src) : src).buffer);
    if (ib.length % 4)
      ib = Buffer.concat([ib, Buffer.alloc(4 - (ib.length % 4))]);
    const part = {
      ...p,
      vertexOffset: offset,
      indexOffset: offset + vb.length,
      ...(small ? { indexBits: 16 } : {}),
    };
    chunks.push(vb, ib);
    offset += vb.length + ib.length;
    return part;
  });
  return { parts: out, buffer: Buffer.concat(chunks) };
}

// Index bytes of a part (2 or 4 per index).
export const indexBytes = (p) => (p.indexBits === 16 ? 2 : 4);
