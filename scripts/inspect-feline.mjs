import fs from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Vector3,Box3,Mesh} from 'three';
const input=process.argv[2];if(!input)throw Error('Provide authorized GLB path');
const bytes=fs.readFileSync(input);
globalThis.ProgressEvent??=class{constructor(type,props){Object.assign(this,props);}};
// Geometry-only import also works with textured source files in Node.
const length=bytes.readUInt32LE(12),data=JSON.parse(bytes.subarray(20,20+length));
data.buffers[0].uri='data:application/octet-stream;base64,'+bytes.subarray(28+length).toString('base64');
delete data.images;delete data.textures;delete data.materials;for(const mesh of data.meshes)for(const primitive of mesh.primitives)delete primitive.material;
const scene=(await new GLTFLoader().parseAsync(JSON.stringify(data),'')).scene;scene.updateMatrixWorld(true);
const positions=[],triangles=[],lookup=new Map();
scene.traverse(mesh=>{if(!(mesh instanceof Mesh))return;const p=mesh.geometry.attributes.position,map=[];for(let i=0;i<p.count;i++){const v=new Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);const key=v.toArray().map(x=>x.toFixed(6)).join(',');let index=lookup.get(key);if(index===undefined){index=positions.length;lookup.set(key,index);positions.push(v.toArray());}map.push(index);}const indices=mesh.geometry.index?.array||Array.from({length:p.count},(_,i)=>i);for(let i=0;i<indices.length;i+=3)triangles.push([map[indices[i]],map[indices[i+1]],map[indices[i+2]]]);});
const parent=positions.map((_,i)=>i);function find(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;}function join(a,b){parent[find(a)]=find(b);}
for(const t of triangles){join(t[0],t[1]);join(t[1],t[2]);}
const groups=new Map();for(const t of triangles){const k=find(t[0]);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(t);}
const components=[...groups.values()].sort((a,b)=>b.length-a.length).map((faces,i)=>{const ids=[...new Set(faces.flat())],map=new Map(ids.map((id,i)=>[id,i])),xyz=ids.map(id=>positions[id]),box=new Box3().setFromPoints(xyz.map(p=>new Vector3(...p)));return {id:i,triangles:faces.length,bounds:[box.min.toArray(),box.max.toArray()],center:box.getCenter(new Vector3()).toArray(),positions:xyz,indices:faces.map(t=>t.map(i=>map.get(i)))};});
fs.writeFileSync(process.argv[3]||'../../work/feline-components.json',JSON.stringify(components));
console.log(JSON.stringify({components:components.length,triangles:triangles.length,largest:components.slice(0,15).map(({positions,indices,...c})=>c)}));
