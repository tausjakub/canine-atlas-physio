import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {Box3, Matrix4, Vector3} from 'three';

const require=createRequire(import.meta.url);
const source=fs.readFileSync(new URL('../app/dorn-kinematics.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const api={};
new Function('require','exports',compiled)(require,api);
const {dornKinematics,dornMovementPartRole,dornMotionBounds,bindDornSoftVertices,deformDornSoftVertices}=api;
const catalog=JSON.parse(fs.readFileSync(new URL('../public/models/catalog.json',import.meta.url),'utf8'));
const binary=fs.readFileSync(new URL('../public/models/anatomy.bin',import.meta.url));
const bones=catalog.parts.filter(part=>part.system==='bone');
const identity=new Matrix4();
const kinds=['stifle','elbow','carpus','digits','hip','hip-rotation','hock','shoulder','hind-digits'];
const positions=part=>{
  const result=new Float32Array(part.vertexCount*3);
  for(let i=0;i<result.length;i++)result[i]=binary.readFloatLE(part.vertexOffset+i*4);
  return result;
};
const point=new Vector3(),a=new Vector3(),b=new Vector3();
const angle=rig=>rig.proximalAnchor.clone().sub(rig.pivot).angleTo(rig.distalAnchor.clone().sub(rig.pivot));
for(const kind of kinds){
  const start=dornKinematics(kind,0,bones),end=dornKinematics(kind,1,bones);
  assert(start.affectedIds.length>0,`${kind}: moving bone chain exists`);
  assert(start.contextIds.length>start.affectedIds.length,`${kind}: proximal reference exists`);
  assert(start.pivot.z<0,`${kind}: hinge is inside the left limb`);
  const motionBounds=dornMotionBounds(kind,bones);
  for(const bend of [0,.5,1]){
    const rig=dornKinematics(kind,bend,bones);
    assert.deepEqual(rig.affectedIds,start.affectedIds);
    assert(rig.pivot.equals(start.pivot),`${kind}: proximal hinge stays fixed`);
    assert(rig.proximalAnchor.equals(start.proximalAnchor),`${kind}: proximal segment stays fixed`);
    for(const part of bones){
      const matrix=rig.matrices.get(part.id)||identity;
      const rest=positions(part);
      assert(Math.abs(matrix.determinant()-1)<1e-10,`${kind}: ${part.id} remains rigid`);
      if(!bend)assert(matrix.equals(identity),`${kind}: exact source standing pose`);
      if(part.center[2]>0 || dornMovementPartRole(part,kind)!=='moving')assert(matrix.equals(identity),`${kind}: ${part.id} stays fixed`);
      for(let i=0;i<rest.length;i+=3){
        point.set(rest[i],rest[i+1],rest[i+2]).applyMatrix4(matrix);
        assert(point.toArray().every(Number.isFinite),`${kind}: ${part.id} finite source geometry`);
        if(kind!=='hip-rotation')assert.equal(point.z,rest[i+2],`${kind}: no unwanted lateral translation`);
        if(start.contextIds.includes(part.id))assert(motionBounds.containsPoint(point),`${kind}: ${part.id} stays within framing`);
      }
      a.fromArray(part.bounds[0]);b.fromArray(part.bounds[1]);
      const originalLength=a.distanceTo(b);
      a.applyMatrix4(matrix);b.applyMatrix4(matrix);
      assert(Math.abs(a.distanceTo(b)-originalLength)<1e-10,`${kind}: ${part.id} length preserved`);
      if(!kind.includes('digits')&&rig.matrices.has(part.id))assert(point.copy(rig.pivot).applyMatrix4(matrix).distanceTo(rig.pivot)<1e-10,`${kind}: contiguous chain shares its hinge`);
    }
  }
  if(kind==='stifle'||kind==='elbow')assert(angle(end)<angle(start)-.5,`${kind}: flexion reduces the angle between segments`);
  if(kind==='hip'||kind==='hock')assert(angle(end)<angle(start)-.3,`${kind}: flexion approaches the proximal reference`);
  if(kind==='shoulder')assert(end.distalAnchor.x>start.distalAnchor.x+.08,'shoulder: extension advances the arm cranially');
  if(kind==='hip-rotation'){
    assert(Math.abs(end.axis.y)>.95&&Math.abs(end.axis.z)<.15,'hip rotation: axis follows the actual femoral long axis');
    const matrix=end.matrices.get('Femoris_L');
    for(const distance of [-.3,0,.1,.3]){
      const onAxis=end.pivot.clone().addScaledVector(end.axis,distance);
      assert(onAxis.clone().applyMatrix4(matrix).distanceTo(onAxis)<1e-10,'hip rotation: complete long axis remains fixed');
    }
    const foot=catalog.parts.find(part=>part.id==='Metatarsi_L_3');
    assert(new Vector3(...foot.center).applyMatrix4(end.matrices.get(foot.id)).z<foot.center[2]-.03,'hip rotation: external turn carries left distal limb laterally');
    assert(end.distalAnchor.distanceTo(start.distalAnchor)<1e-9,'hip rotation: knee centre on femoral long axis remains fixed');
  }
  if(kind==='carpus')assert(end.distalAnchor.x<start.distalAnchor.x-.02,`carpus: palmarly folding paw approaches the caudal forearm`);
  if(kind==='digits'){
    assert(end.distalAnchor.x<start.distalAnchor.x-.01&&end.distalAnchor.y<start.distalAnchor.y-.01,'digits: claws curl palmarly rather than lift dorsally');
    assert.equal(start.affectedIds.length,13,'four main three-piece toe chains and one dewclaw');
    assert(!start.affectedIds.some(id=>/metacarpale/.test(id)),'digits: metacarpals remain fixed');
    for(const n of ['II','III','IV','V']){
      const ids=[`Phalanxpmxinutlis_digiti_${n}_L`,`Phalanx_media_digiti_${n}_L`,`Phalanx_distalis_digiti_${n}_L`];
      const chain=ids.map(id=>bones.find(p=>p.id===id||p.id===`${id}_`));
      assert(chain.every(Boolean));
      const endpoint=(p,end)=>new Vector3(p.bounds[end][0],p.center[1],p.center[2]);
      const pip=endpoint(chain[0],1).lerp(endpoint(chain[1],0),.5);
      const dip=endpoint(chain[1],1).lerp(endpoint(chain[2],0),.5);
      assert(pip.clone().applyMatrix4(end.matrices.get(chain[0].id)).distanceTo(pip.clone().applyMatrix4(end.matrices.get(chain[1].id)))<1e-10,`digit ${n}: proximal/intermediate hinge stays connected`);
      assert(dip.clone().applyMatrix4(end.matrices.get(chain[1].id)).distanceTo(dip.clone().applyMatrix4(end.matrices.get(chain[2].id)))<1e-10,`digit ${n}: intermediate/distal hinge stays connected`);
    }
  }
  if(kind==='hind-digits'){
    assert.equal(start.affectedIds.length,12,'hind digits: four original three-piece ray chains');
    assert(!start.affectedIds.some(id=>/Metatarsi/.test(id)),'hind digits: metatarsals stay fixed');
    assert(end.distalAnchor.x<start.distalAnchor.x-.01&&end.distalAnchor.y<start.distalAnchor.y-.01,'hind digits: distal phalanges curl plantarly');
    for(const n of [1,2,3,4]){
      const chain=[`Phalanges_B_L_${n}`,`Phalanges_B_2_L_${n}`,`Phalanges_B_3_L_${n}`].map(id=>bones.find(part=>part.id===id));
      const endpoint=(p,end)=>new Vector3(p.bounds[end][0],p.center[1],p.center[2]);
      const pip=endpoint(chain[0],1).lerp(endpoint(chain[1],0),.5);
      const dip=endpoint(chain[1],1).lerp(endpoint(chain[2],0),.5);
      assert(pip.clone().applyMatrix4(end.matrices.get(chain[0].id)).distanceTo(pip.clone().applyMatrix4(end.matrices.get(chain[1].id)))<1e-10,`hind ray ${n}: proximal/intermediate hinge stays connected`);
      assert(dip.clone().applyMatrix4(end.matrices.get(chain[1].id)).distanceTo(dip.clone().applyMatrix4(end.matrices.get(chain[2].id)))<1e-10,`hind ray ${n}: intermediate/distal hinge stays connected`);
    }
  }
  // Catch camera clipping at extrema lying between the sampling endpoints.
  for(let i=0;i<=100;i++){
    const rig=dornKinematics(kind,i/100,bones);
    assert(motionBounds.containsBox(rig.focusBounds),`${kind}: full sweep fits a stationary camera`);
  }
  assert.equal(dornKinematics(kind,-1,bones).bend,0);
  assert.equal(dornKinematics(kind,2,bones).bend,1);
  assert.equal(dornKinematics(kind,NaN,bones).bend,0);
  console.log(`PASS ${kind}: ${start.affectedIds.length} original bones, connected rigid chain, fixed opposite side, finite vertices and full-sweep camera bounds.`);
}

for(const id of ['skin','m_brachialis_L','m_gastrocnemius_L','m_flexor_carpi_ulnaris_L']){
  const part=catalog.parts.find(part=>part.id===id);assert(part);
  const rest=positions(part),bindings=bindDornSoftVertices(rest,bones);
  assert.equal(bindings.length,part.vertexCount);
  for(const influences of bindings)if(influences.length)assert(Math.abs(influences.reduce((sum,v)=>sum+v.weight,0)-1)<1e-10);
  for(const kind of kinds){
    assert.deepEqual(deformDornSoftVertices(rest,bindings,dornKinematics(kind,0,bones)),rest,`${id}: exact unbent restoration`);
    for(const bend of [.5,1]){
      const posed=deformDornSoftVertices(rest,bindings,dornKinematics(kind,bend,bones));
      assert(posed.every(Number.isFinite),`${id}: finite illustrative soft surface`);
      for(let i=0;i<rest.length;i+=3)if(rest[i+2]>=0)assert.deepEqual(Array.from(posed.slice(i,i+3)),Array.from(rest.slice(i,i+3)),`${id}: far-side tissue remains stationary`);
    }
  }
}
console.log('PASS soft surfaces: normalized spatial bindings, unchanged far side, finite deformation and exact rest restoration.');
