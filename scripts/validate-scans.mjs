import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Box3,Group,Mesh,Vector3} from 'three';
// Browser UI tests cover texture decoding; this isolates hierarchy and geometry
// using the same GLTFLoader while removing image material references in memory.
for(const species of ['cat','rabbit']){
 const bytes=fs.readFileSync(new URL('../public/models/'+species+'/skeleton-scan.glb',import.meta.url));
 assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const len=bytes.readUInt32LE(12),data=JSON.parse(bytes.subarray(20,20+len));
 assert(data.images.length>0);for(const image of data.images)assert(Number.isInteger(image.bufferView),'Texture must be embedded');
 assert(!data.buffers.some(b=>b.uri),'No external files should be required');
 const buffer=bytes.subarray(28+len);data.buffers[0].uri='data:application/octet-stream;base64,'+buffer.toString('base64');
 delete data.images;delete data.textures;delete data.materials;for(const m of data.meshes)for(const p of m.primitives)delete p.material;
 globalThis.ProgressEvent??=class{constructor(type,properties){this.type=type;Object.assign(this,properties);}};
 const gltf=await new GLTFLoader().parseAsync(JSON.stringify(data),'');const root=new Group();root.add(gltf.scene);root.rotation.y=species==='cat'?Math.PI:Math.PI/2;root.updateMatrixWorld(true);
 let triangles=0,meshes=0,supports=0;const bounds=new Box3();root.traverse(o=>{if(o instanceof Mesh){meshes++;const pos=o.geometry.attributes.position;assert([...pos.array].every(Number.isFinite));const support=species==='rabbit'&&pos.count===24;if(support)supports++;else bounds.expandByObject(o);triangles+=(o.geometry.index?.count||pos.count)/3;}});
 assert.equal(meshes,species==='cat'?1:3);assert.equal(supports,species==='rabbit'?1:0);assert(triangles>70000);const size=bounds.getSize(new Vector3());assert(size.x>size.z&&size.y>size.z,'Skeleton should be upright with long axis X');
 console.log('PASS:',species,meshes,'meshes,',triangles,'triangles, embedded textures, finite geometry, upright framing. SHA256',createHash('sha256').update(bytes).digest('hex'));
}
