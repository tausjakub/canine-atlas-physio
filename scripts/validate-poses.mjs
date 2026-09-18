import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
function load(name){const exports={};const file=new URL(`../app/${name}`,import.meta.url);const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','exports',js)(id=>id.startsWith('./')?load(id.slice(2)+'.ts'):require(id),exports);return exports;}
const {dogPoses,poseRig,poseJoints,poseMatrix,posePoint,poseSegment,bindSoftVertices,deformSoftVertices}=load('poses.ts');
const Controls=load('pose-controls.tsx').default;
const {isShown,initial}=load('anatomy.ts');
const catalog=JSON.parse(fs.readFileSync(new URL('../public/models/catalog.json',import.meta.url)));
const bones=catalog.parts.filter(p=>p.system==='bone');
const joins=[['trunk','arm','shoulder'],['arm','forearm','elbow'],['forearm','forefoot','carpus'],['trunk','thigh','hip'],['thigh','shank','stifle'],['shank','hindfoot','hock']];
for(const pose of dogPoses){
 const rig=poseRig(pose);
 for(const [parent,child,joint] of joins)assert(posePoint(poseJoints[joint],rig[parent]).distanceTo(posePoint(poseJoints[joint],rig[child]))<1e-10,`${pose}: ${joint}`);
 for(const p of bones){const m=poseMatrix(p,pose);assert(Math.abs(m.determinant()-1)<1e-10);const a=posePoint(p.bounds[0],m),b=posePoint(p.bounds[1],m);assert(Math.abs(a.distanceTo(b)-posePoint(p.bounds[0],poseRig('standing').trunk).distanceTo(posePoint(p.bounds[1],poseRig('standing').trunk)))<1e-9);if(pose==='standing')assert(m.equals(poseRig('standing').trunk));assert.equal(a.z,p.bounds[0][2]);}
 for(const language of ['en','cs']){const html=renderToStaticMarkup(React.createElement(Controls,{pose,language,onChange:()=>{}}));assert.equal((html.match(/<button/g)||[]).length,3);assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);const selected=[];const tree=Controls({pose,language,onChange:p=>selected.push(p)});tree.props.children[1].props.children.forEach(button=>button.props.onClick());assert.deepEqual(selected,dogPoses);}
 const muscle={id:'test-muscle',system:'muscle'};
 assert(isShown(muscle,{...initial,pose,selected:muscle.id}));
 assert(isShown(bones[0],{...initial,pose}));
}
assert.equal(poseSegment({id:'Tibial_tarsal_L'}),'hindfoot');
assert.equal(poseSegment({id:'Phalanges_B_2_R_1'}),'hindtoes');
assert.equal(poseSegment({id:'Radius_L'}),'forearm');
assert.equal(poseSegment({id:'Pelvis'}),'trunk');
const bytes=fs.readFileSync(new URL('../public/models/anatomy.bin',import.meta.url));
const projections=dogPoses.map(pose=>({pose,parts:[]}));
for(const part of catalog.parts){
 const rest=new Float32Array(part.vertexCount*3);
 for(let i=0;i<rest.length;i++)rest[i]=bytes.readFloatLE(part.vertexOffset+i*4);
 const bindings=part.system==='bone'?null:bindSoftVertices(rest,bones);
 if(bindings)for(const weights of bindings)assert(Math.abs(weights.reduce((s,w)=>s+w.weight,0)-1)<1e-10);
 for(const [index,pose] of dogPoses.entries()){
  const posed=bindings?deformSoftVertices(rest,bindings,pose):rest;
  assert(posed.every(Number.isFinite),`${part.id}: ${pose}`);
  if(pose==='standing')assert.deepEqual(posed,rest);
  const m=poseMatrix(part,pose),points=[];
  for(let i=0;i<rest.length;i+=9)points.push(bindings?Array.from(posed.slice(i,i+3)):posePoint(rest.slice(i,i+3),m).toArray());
  projections[index].parts.push({id:part.id,system:part.system,points});
 }
}
if(process.argv.includes('--projection'))fs.writeFileSync(new URL('../../../work/soft-pose-projections.json',import.meta.url),JSON.stringify(projections));
console.log('PASS: all source soft-tissue vertices have normalized weights, finite poses and exact standing restoration.');
const {TubeGeometry,CatmullRomCurve3,Vector3}=require('three');
for(const guide of load('ligaments.ts').addLigaments(catalog).parts.filter(p=>p.path)){
 const g=new TubeGeometry(new CatmullRomCurve3(guide.path.map(v=>new Vector3(...v)),false,'centripetal'),24,guide.radius,8,false);
 const rest=g.getAttribute('position').array,bindings=bindSoftVertices(rest,bones);
 for(const pose of dogPoses)assert(deformSoftVertices(rest,bindings,pose).every(Number.isFinite));
 g.dispose();
}
console.log('PASS: ligament tube geometry deforms in all three poses.');
if(process.argv.includes('--projection')){
 const buffer=fs.readFileSync(new URL('../public/models/anatomy.bin',import.meta.url));
 const result=dogPoses.map(pose=>({pose,parts:bones.map(p=>{const m=poseMatrix(p,pose);const points=[];for(let i=0;i<p.vertexCount;i+=3){const j=p.vertexOffset+i*12;points.push(posePoint([buffer.readFloatLE(j),buffer.readFloatLE(j+4),buffer.readFloatLE(j+8)],m).toArray());}return{id:p.id,points};})}));
 fs.writeFileSync(new URL('../../../work/pose-projections.json',import.meta.url),JSON.stringify(result));
}
console.log(`PASS: ${bones.length} bones, three rigid poses, six connected joint chains, original standing geometry, unchanged lateral coordinates and bilingual controls.`);

