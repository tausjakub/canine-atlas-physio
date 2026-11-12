import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
function loader(react=React){const cache=new Map();return function load(name){if(cache.has(name))return cache.get(name);const file=new URL('../app/'+name+(fs.existsSync(new URL('../app/'+name+'.ts',import.meta.url))?'.ts':'.tsx'),import.meta.url);const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;const exports={};cache.set(name,exports);new Function('require','exports',output)(s=>s==='react'?react:s.endsWith('.json')?JSON.parse(fs.readFileSync(new URL('../app/'+s,import.meta.url),'utf8')):s.startsWith('./')?load(s.slice(2)):require(s),exports);return exports;};}
const load=loader(),{poseMatrix,posePoint,bindSoftVertices,deformSoftVertices,poseRig}=load('poses'),{isShown}=load('anatomy');
function find(node,predicate){if(Array.isArray(node)){for(const n of node){const f=find(n,predicate);if(f)return f;}}else if(node&&typeof node==='object'){if(predicate(node))return node;return find(node.props?.children,predicate);}}
const projections=[];
for(const species of ['cat','rabbit']){
 const atlas=JSON.parse(fs.readFileSync(new URL('../public/models/'+species+'/catalog.json',import.meta.url))),bytes=fs.readFileSync(new URL('../public/models/'+species+'/anatomy.bin',import.meta.url));
 assert.equal(atlas.bytes,bytes.length);assert.equal(atlas.species,species);assert.equal(new Set(atlas.parts.map(p=>p.id)).size,atlas.parts.length);
 const bones=atlas.parts.filter(p=>p.system==='bone');const views=['standing','sitting','lying'].map(pose=>({species,pose,parts:[]}));
 for(const p of atlas.parts){
  assert(p.label.cs&&p.label.en&&p.action.cs&&p.action.en);assert(p.vertexCount>0&&p.indexCount%3===0);assert(p.indexOffset+p.indexCount*4<=bytes.length);
  for(const field of ['location','connections','difference','recall','answer'])for(const lang of ['cs','en'])assert(p.study[field][lang]?.length>20,p.id+' '+field+' '+lang);
  assert(!p.study.location.en.startsWith('Schematic structure'),p.id+': missing individual study profile');
  const rest=new Float32Array(p.vertexCount*3);for(let i=0;i<rest.length;i++)rest[i]=bytes.readFloatLE(p.vertexOffset+i*4);assert(rest.every(Number.isFinite));
  for(let i=0;i<p.indexCount;i++)assert(bytes.readUInt32LE(p.indexOffset+i*4)<p.vertexCount);
  const bindings=p.system==='bone'?null:bindSoftVertices(rest,bones);
  for(const view of views){const posed=bindings?deformSoftVertices(rest,bindings,view.pose,atlas.poseConfig):rest;assert(posed.every(Number.isFinite));if(view.pose==='standing')assert.deepEqual(posed,rest);const matrix=poseMatrix(p,view.pose,atlas.poseConfig);const points=[];for(let i=0;i<posed.length;i+=12)points.push(bindings?Array.from(posed.slice(i,i+3)):posePoint(posed.slice(i,i+3),matrix).toArray());view.parts.push({id:p.id,system:p.system,points});}
 }
 for(const pose of ['sitting','lying']){const rig=poseRig(pose,atlas.poseConfig);for(const [a,b,j] of [['trunk','arm','shoulder'],['arm','forearm','elbow'],['forearm','forefoot','carpus'],['trunk','thigh','hip'],['thigh','shank','stifle'],['shank','hindfoot','hock']])assert(posePoint(atlas.poseConfig.joints[j],rig[a]).distanceTo(posePoint(atlas.poseConfig.joints[j],rig[b]))<1e-9);}
 projections.push(...views);
 assert.equal(atlas.parts.filter(p=>p.id.startsWith('Carpal_')).length,species==='cat'?14:18);
 assert.equal(atlas.parts.filter(p=>/^(Tarsus_|Tibial_tarsal_|Calcaneal_tuber_)/.test(p.id)).length,species==='cat'?14:12);
 for(const id of ['rectus_femoris','vastus_lateralis','vastus_medialis','vastus_intermedius','triceps_long','triceps_medial','triceps_lateral','soleus'])assert(atlas.parts.some(p=>p.id==='m_'+id+'_L'));
 for(const language of ['cs','en']){
  let cursor=0,values=[];const hooks={...React,useEffect:()=>{},useState:init=>{const n=cursor++;if(!(n in values))values[n]=n===0?atlas:typeof init==='function'?init():init;return[values[n],v=>values[n]=typeof v==='function'?v(values[n]):v];}};
  const Component=loader(hooks)('native-species-atlas').SchematicSpeciesAtlas,render=()=>{cursor=0;return Component({species,language});};
  let tree=render();let html=renderToStaticMarkup(tree);assert(html.includes(atlas.scientificName));assert(!html.includes('<iframe'));assert(!html.includes('undefined'));
  find(tree,n=>n.props?.animal===species).props.onChange('sitting');tree=render();
  const muscleButton=find(tree,n=>n.props?.className==='layer-row'&&n.props.children[1].props.children===(language==='cs'?'Svaly':'Muscles'));assert(muscleButton);muscleButton.props.onClick();tree=render();assert.equal(values[3].pose,'sitting');assert(!values[3].systems.includes('muscle'));muscleButton.props.onClick();tree=render();assert.equal(values[3].pose,'sitting');
  find(tree,n=>n.props?.className==='structure-row ').props.onClick();tree=render();const selected=atlas.parts.find(p=>p.id===values[3].selected);assert(selected);html=renderToStaticMarkup(tree);assert(html.includes(selected.action[language]));
  const actions=find(tree,n=>n.props?.className==='native-actions');actions.props.children[0].props.onClick();assert(values[3].isolate);assert.equal(atlas.parts.filter(p=>isShown(p,values[3])).length,1);actions.props.children[1].props.onClick();assert(values[3].hidden.includes(selected.id));assert.equal(values[3].selected,null);
  tree=render();const dissection=find(tree,n=>n.props?.className==='native-dissection');dissection.props.children[1].props.onClick();tree=render();assert.equal(values[3].pose,'sitting');assert(atlas.parts.filter(p=>isShown(p,values[3])&&p.system==='muscle').every(p=>p.study.depth==='deep'));assert(values[3].hidden.length>0);dissection.props.children[2].props.onClick();assert.equal(values[3].hidden.length,0);
  const picker=renderToStaticMarkup(React.createElement(load('species-atlas').SpeciesPicker,{species,language,onChange:()=>{}}));assert.equal((picker.match(/aria-pressed="true"/g)||[]).length,1);
 }
 console.log('PASS: '+species+': '+atlas.parts.length+' named parts, binary geometry, joint continuity, finite soft poses, bilingual selection and layer/pose persistence.');
}
if(process.argv.includes('--projection'))fs.writeFileSync(new URL('../../../work/species-projections.json',import.meta.url),JSON.stringify(projections));
