import fs from 'node:fs';
import assert from 'node:assert/strict';
const dir=new URL('../public/models/cat/',import.meta.url);
const atlas=JSON.parse(fs.readFileSync(new URL('detailed-catalog.json',dir)));
const buffer=fs.readFileSync(new URL('detailed-anatomy.bin',dir));
assert.equal(atlas.geometryKind,'sculpt');assert.equal(atlas.bytes,buffer.length);
assert.equal(atlas.parts.length,398);assert.equal(new Set(atlas.parts.map(p=>p.id)).size,398);
let triangles=0,next=0;const systems=new Set();
for(const p of atlas.parts){
 assert.equal(p.vertexOffset,next);assert.equal(p.indexOffset,p.vertexOffset+p.vertexCount*12);
 next=p.indexOffset+p.indexCount*4;assert(next<=buffer.length);assert.equal(p.indexCount%3,0);
 for(let i=0;i<p.vertexCount*3;i++){const value=buffer.readFloatLE(p.vertexOffset+i*4),axis=i%3;assert(Number.isFinite(value));assert(value>=p.bounds[0][axis]-1e-6&&value<=p.bounds[1][axis]+1e-6);}
 for(let i=0;i<p.indexCount;i++)assert(buffer.readUInt32LE(p.indexOffset+i*4)<p.vertexCount);
 assert(p.label.cs&&p.label.en);if(p.identification==='unidentified')assert.equal(p.study,null,'Unidentified geometry must not receive an anatomical lesson');else {assert(p.study.location.en.startsWith('General anatomy'));assert(p.anatomicalRegion);}
 assert(Number.isInteger(p.sourceComponent));systems.add(p.system);triangles+=p.indexCount/3;
}
assert.equal(next,buffer.length);assert.equal(triangles,451198);assert.deepEqual([...systems].sort(),['bone','muscle']);assert(!atlas.poseConfig);
console.log('PASS: 398 source components, 451198 triangles, finite bounded geometry, valid indices, bilingual labels, explicitly provisional lessons, no unvalidated rig.');
