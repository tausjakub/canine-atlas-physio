import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as THREE from 'three';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function loader(react=React){const cache=new Map();return function load(name){
 if(cache.has(name))return cache.get(name);
 const file='app/'+name+(fs.existsSync(path.join(root,'app',name+'.ts'))?'.ts':'.tsx');
 const code=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};cache.set(name,exports);new Function('require','exports',code)(s=>s==='react'?react:s.endsWith('.json')?JSON.parse(read('app/'+s.slice(2))):s.startsWith('./')?load(s.slice(2)):require(s),exports);return exports;
 };}
const load=loader(),{addLigaments,ligamentCount}=load('ligaments'),{examModules,examSources}=load('exam-data'),{detailFor,structureName}=load('study-notes'),{isShown,initial,region}=load('anatomy');
const source=JSON.parse(read('public/models/catalog.json')),atlas=addLigaments(source),guides=atlas.parts.filter(p=>p.system==='ligament');
const binary=fs.readFileSync(path.join(root,'public/models/anatomy.bin'));
const anchors={cranial_cruciate:['Femoris','Tibia'],caudal_cruciate:['Femoris','Tibia'],stifle_medial_collateral:['Femoris','Tibia'],stifle_lateral_collateral:['Femoris','Fibula'],patellar:['Patella','Tibia'],elbow_medial_collateral:['humerus','Radius'],elbow_lateral_collateral:['humerus','Ulna'],sacrotuberous:['Sacrum','Pelvis'],nuchal:['C_2','Ribcage']};
assert.equal(ligamentCount,17);assert.equal(atlas.parts.length,442);assert.equal(source.parts.length,425);assert.equal(atlas.bytes,source.bytes);assert.equal(new Set(atlas.parts.map(p=>p.id)).size,442);
for(const p of guides){
 assert(p.path.length>=2);assert(p.radius>0);assert(['Forelimb','Hindlimb','Neck & trunk'].includes(region(p)));
 const key=p.id.replace(/^guide_/,'').replace(/_[LR]$/,''),side=p.id.slice(-2);
 for(const [i,bone] of anchors[key].entries()){
  const part=source.parts.find(p=>p.id===(['Sacrum','Pelvis','C_2','Ribcage'].includes(bone)?bone:bone+side));assert(part);
  const point=i===0?p.path[0]:p.path.at(-1);let nearest=Infinity;
  for(let v=0;v<part.vertexCount;v++){const offset=part.vertexOffset+v*12;nearest=Math.min(nearest,Math.hypot(...point.map((x,axis)=>x-binary.readFloatLE(offset+axis*4))));}
  assert(nearest<.001,`${p.id}: guide endpoint detached from ${part.id}`);
 }
 const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p.path.map(v=>new THREE.Vector3(...v)),false,'centripetal'),24,p.radius,8,false);g.computeBoundingBox();
 assert([...g.attributes.position.array].every(Number.isFinite));assert([...g.attributes.normal.array].every(Number.isFinite));assert(!g.boundingBox.isEmpty());
 for(let i=0;i<3;i++)assert(p.bounds[1][i]>p.bounds[0][i]);g.dispose();
 assert(isShown(p,{...initial,systems:['bone','ligament']}));assert(!isShown(p,{...initial,systems:['bone']}));assert(isShown(p,{...initial,selected:p.id}));assert(!isShown(p,{...initial,selected:p.id,hidden:[p.id]}));
 for(const language of ['en','cs']){const n=detailFor(p,language);for(const f of ['title','overview','location','attachments','function','nerve','physio','recall','warning','modelNote'])assert(n[f]?.length>10,`${p.id} ${language} ${f}`);assert(n.references.every(s=>s.url.startsWith('https://')));assert(structureName(p,language).includes(n.side));}
 if(p.id.endsWith('_L')){const r=guides.find(r=>r.id===p.id.replace(/_L$/,'_R'));assert(r);for(let i=0;i<p.path.length;i++){assert.equal(p.path[i][0],r.path[i][0]);assert.equal(p.path[i][1],r.path[i][1]);assert.equal(p.path[i][2],-r.path[i][2]);}}
}
assert.equal(examModules.length,13);assert.equal(examModules.reduce((n,m)=>n+m.sections.length,0),58);assert.equal(examModules.reduce((n,m)=>n+m.quiz.length,0),26);
const expected=[4,5,6,6,4,4,4,4,6,2,5,4,4];
for(const [i,m] of examModules.entries()){
 assert.equal(m.sections.length,expected[i]);assert.deepEqual(m.sections.map(s=>s.criteria),Array.from({length:expected[i]},(_,i)=>String.fromCharCode(97+i)));
 assert(m.sources.length);for(const key of m.sources)assert(examSources[key]);if(m.model)assert(atlas.parts.some(p=>p.id===m.model),`Broken 3D link: ${m.model}`);
 for(const language of ['en','cs']){assert(m.title[language].length>8);assert(m.practice[language].length>80);for(const s of m.sections){assert(s.text[language].length>150);assert(s.title[language]);assert.notEqual(s.text.en,s.text.cs);}for(const q of m.quiz){assert(q.question[language].length>10);assert(q.answer[language].length>35);}}
}
// Render every lesson and all recall answers in both languages without a browser.
for(const language of ['en','cs'])for(const m of examModules){
 const mock={...React,useEffect:()=>{},useRef:v=>({current:v}),useMemo:f=>f(),useState:initial=>[initial==='anatomy'?m.id:initial,()=>{}]};
 const Component=loader(mock)('exam-study').default;
 const html=renderToStaticMarkup(React.createElement(Component,{language,onExplore:()=>{}}));
 assert(html.includes(m.title[language].replaceAll('&','&amp;')));assert.equal((html.match(/class="exam-section"/g)||[]).length,m.sections.length);
 assert.equal((html.match(/<details/g)||[]).length,3);assert(!html.includes('undefined'));assert(!html.includes('[object Object]'));
 if(language==='cs')for(const leak of ['Mark this topic reviewed','Check your recall','Next topic','References &amp; further reading','Saved on this device'])assert(!html.includes(leak));
}
// Exercise real component handlers and storage recovery through a minimal hook harness.
const slots=[],effects=[];let cursor=0;const saved=new Map();
globalThis.localStorage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};
globalThis.document={getElementById:()=>null};
const mock={...React,useEffect:f=>effects.push(f),useRef:v=>({current:v}),useMemo:f=>f(),useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];}};
const Component=loader(mock)('exam-study').default;
const render=()=>{cursor=0;return Component({language:'cs',onExplore:id=>saved.set('selected',id)});};
function elements(node,out=[]){if(!node||typeof node!=='object')return out;if(Array.isArray(node)){node.forEach(n=>elements(n,out));return out;}out.push(node);elements(node.props?.children,out);return out;}
let tree=render();effects.splice(0).forEach(f=>f());tree=render();
elements(tree).find(n=>n.type==='button'&&n.props.className==='exam-reviewed').props.onClick();assert.deepEqual(JSON.parse(saved.get('canine-atlas-exam-reviewed-v1')),['anatomy']);
tree=render();elements(tree).find(n=>n.type==='button'&&n.props.className==='exam-reviewed').props.onClick();assert.deepEqual(JSON.parse(saved.get('canine-atlas-exam-reviewed-v1')),[]);
elements(tree).find(n=>n.type==='button'&&n.props.className==='exam-model-link').props.onClick();assert.equal(saved.get('selected'),'guide_cranial_cruciate_L');
elements(tree).find(n=>n.type==='input').props.onChange({target:{value:'ortezy'}});tree=render();assert(elements(tree).some(n=>n.type==='h1'&&n.props.children===examModules.find(m=>m.id==='support').title.cs));
elements(tree).find(n=>n.type==='input').props.onChange({target:{value:'zzzznoresults'}});tree=render();assert(!elements(tree).some(n=>n.type==='article'));
elements(tree).find(n=>n.type==='button'&&n.props.className==='exam-reviewed').props.onClick();assert.equal(slots[1],'');
saved.set('canine-atlas-exam-reviewed-v1','["anatomy","anatomy","invented",42]');slots.length=0;effects.length=0;render();effects.splice(0).forEach(f=>f());assert.deepEqual(slots[2],['anatomy']);
console.log('PASS: 17 finite selectable ligament geometries; symmetric sides, regions, bilingual notes and layer visibility.');
console.log('PASS: 13 modules, all 58 criterion mappings, 26 original recall questions, valid anatomy links and both-language rendering.');
console.log('PASS: actual progress toggle, storage restoration, duplicate/invalid ID filtering, accent-insensitive search, no-result recovery and anatomy navigation handlers.');
