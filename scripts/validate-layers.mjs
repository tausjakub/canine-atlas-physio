// Organ and clinical layer packs (dog, cat, rabbit): binaries match catalogs,
// every part has a complete bilingual card and a Latin name, labels are sane.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function loadTs(file) {
  const src = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const m = { exports: {} };
  new Function('module', 'exports', 'require', src)(m, m.exports, () => ({}));
  return m.exports;
}
const { latinName } = loadTs('app/latin.ts');
const text = (b, where) => {
  assert(b && b.cs?.trim() && b.en?.trim(), `${where}: missing CZ or EN text`);
  assert(!/[–—“”]/.test(b.cs + b.en), `${where}: use plain hyphens and quotes`);
};
let total = 0;
for (const dir of ['', 'cat/', 'rabbit/', 'ferret/', 'guinea_pig/'])
  for (const layer of ['organs', 'clinical']) {
    const base = `public/models/${dir}${layer}/`;
    const cat = JSON.parse(fs.readFileSync(base + 'catalog.json', 'utf8'));
    assert.equal(fs.statSync(base + 'anatomy.bin').size, cat.bytes, base);
    const ids = new Set();
    for (const p of cat.parts) {
      const where = `${base}${p.id}`;
      assert(!ids.has(p.id), `${where}: duplicate id`);
      ids.add(p.id);
      assert(p.vertexOffset + p.vertexCount * 12 <= cat.bytes, where);
      assert(
        p.indexOffset + p.indexCount * (p.indexBits === 16 ? 2 : 4) <=
          cat.bytes,
        where,
      );
      text(p.label, where + ' label');
      text(p.action, where + ' action');
      for (const k of [
        'location',
        'connections',
        'recall',
        'answer',
        'difference',
      ])
        text(p.study[k], `${where} ${k}`);
      assert(latinName(p), `${where}: no Latin name`);
      for (const l of p.labels ?? [])
        assert(
          l.text && l.at.length === 3 && l.at.every(Number.isFinite),
          where,
        );
      total++;
    }
    if (layer === 'clinical')
      for (const sys of ['landmark', 'lymph', 'vessel', 'nerve'])
        assert(
          cat.parts.some((p) => p.system === sys),
          `${base}: no ${sys}`,
        );
  }
console.log(`layers: ${total} organ and clinical parts checked`);
