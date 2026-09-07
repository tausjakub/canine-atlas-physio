import assert from 'node:assert/strict';
import fs from 'node:fs';
import {displayName,noteFor,initial,isShown,notes,region} from '../app/anatomy.ts';
const atlas=JSON.parse(fs.readFileSync(new URL('../public/models/catalog.json',import.meta.url)));
const raw=fs.readFileSync(new URL('../public/models/anatomy.bin',import.meta.url));
const buffer=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
assert.equal(raw.length,atlas.bytes);assert.equal(atlas.parts.length,425);
assert.equal(new Set(atlas.parts.map(p=>p.id)).size,atlas.parts.length);
for(const p of atlas.parts){
 const v=new Float32Array(buffer,p.vertexOffset,p.vertexCount*3),ix=new Uint32Array(buffer,p.indexOffset,p.indexCount);
 assert(ix.length%3===0);for(const i of ix)assert(i<p.vertexCount);
 for(let i=0;i<v.length;i++){assert(Number.isFinite(v[i]));assert(v[i]>=p.bounds[0][i%3]-1e-6&&v[i]<=p.bounds[1][i%3]+1e-6);}
 assert(displayName(p.id).length>0);assert(region(p));
 assert(!isShown(p,{...initial,hidden:[p.id]}));
 assert(isShown(p,{...initial,selected:p.id,isolate:true}));
 assert(!isShown(p,{...initial,selected:'missing',isolate:true}));
}
for(const n of notes){assert(atlas.parts.some(p=>n.match.test(p.id)),n.title);assert(n.action&&n.landmark&&n.lab);}
assert.equal(region(atlas.parts.find(p=>p.id==='Scapula_L')),'Forelimb');
assert.equal(region(atlas.parts.find(p=>p.id==='Tibia_R')),'Hindlimb');
assert(noteFor(atlas.parts.find(p=>p.id==='m_gastrocnemius_L')));
assert.equal(displayName('C_1'),'Cervical vertebra C1 · atlas');
console.log('PASS: 425 pieces; complete valid geometry; visibility, region and study-card contracts.');
console.log(Object.fromEntries(['bone','muscle','connective','surface'].map(s=>[s,atlas.parts.filter(p=>p.system===s).length])));
