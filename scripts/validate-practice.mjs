import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url),root=process.cwd();
function loader(react=React){const cache=new Map();return function load(name){
 if(cache.has(name))return cache.get(name);
 const file=path.join(root,'app',name+(fs.existsSync(path.join(root,'app',name+'.ts'))?'.ts':'.tsx'));
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};cache.set(name,exports);new Function('require','exports',code)(s=>s==='react'?react:s.endsWith('.json')?JSON.parse(fs.readFileSync(path.join(root,'app',s),'utf8')):s.startsWith('./')?load(s.slice(2)):require(s),exports);return exports;
 };}
const load=loader(),{examModules}=load('exam-data'),{criterionDepth,topicCases}=load('exam-depth'),{practiceStations}=load('practical-data');
const valid=examModules.flatMap(m=>m.sections.map(s=>`${m.id}.${s.criteria}`));
assert.equal(valid.length,58);
assert.deepEqual(Object.keys(criterionDepth),examModules.map(m=>m.id));
for(const m of examModules){
 assert.deepEqual(Object.keys(criterionDepth[m.id]),m.sections.map(s=>s.criteria));
 for(const lang of ['en','cs']){
  for(const s of m.sections)assert(criterionDepth[m.id][s.criteria][lang].length>160);
  for(const field of ['question','answer','pitfall'])assert(topicCases[m.id][field][lang].length>15);
 }
}
const books=JSON.parse(fs.readFileSync('app/library-data.json','utf8'));
const escapeHtml=text=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
assert.equal(practiceStations.length,12);assert.equal(new Set(practiceStations.map(s=>s.id)).size,12);
for(const s of practiceStations){
 assert(['home','desk','supervised'].includes(s.kind));assert.equal(s.steps.length,3);assert.equal(s.checks.length,3);
 for(const id of s.criteria)assert(valid.includes(id),id);
 const book=books.find(b=>b.id===s.book.id);assert(book);assert(s.book.page>0&&s.book.page<=book.pages);assert(book.parts.some(p=>p.start<=s.book.page&&p.end>=s.book.page));
 if(s.image){assert(fs.statSync(`public/study/practice/${s.image}.webp`).size>10000);assert(s.alt.en&&s.alt.cs);}
 for(const lang of ['en','cs'])for(const pair of [s.title,s.goal,s.setup,s.observe,s.stop,s.oral,...s.steps,...s.checks])assert(pair[lang]?.length>12);
}
// Render every station, language and base path, rather than only the initial card.
for(const base of ['', '/canine-atlas-physio']){
 process.env.NEXT_PUBLIC_BASE_PATH=base;
 for(const lang of ['en','cs'])for(const station of practiceStations){
  const hooks={...React,useState:initial=>[initial===practiceStations[0].id?station.id:initial,()=>{}],useEffect:()=>{}};
  const View=loader(hooks)('practical-study').default;
  const html=renderToStaticMarkup(React.createElement(View,{language:lang,onLesson:()=>{}}));
  assert(html.includes(escapeHtml(station.title[lang])),station.id);assert(html.includes(escapeHtml(station.steps[0][lang])),station.id);
  assert(html.includes(`${base}/?book=${station.book.id}&amp;page=${station.book.page}`));
  if(station.image)assert(html.includes(`${base}/study/practice/${station.image}.webp`));
  assert(!html.includes('undefined'));assert.equal((html.match(/type="checkbox"/g)||[]).length,3);
 }
}
delete process.env.NEXT_PUBLIC_BASE_PATH;
const {parseChecklist}=load('study-checklist');
assert.deepEqual(parseChecklist(null,valid),[]);
assert.deepEqual(parseChecklist('["anatomy.a","anatomy.a",5,"other"]',valid),['anatomy.a']);
assert.throws(()=>parseChecklist('{',valid));assert.throws(()=>parseChecklist('{}',valid));
// Exercise persistence, toggling, failure reporting and station-to-criterion navigation.
let slots=[],cursor=0,effects=[];const memory=new Map();
globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
globalThis.requestAnimationFrame=fn=>{fn();return 1;};
const hooks={...React,useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useEffect:fn=>effects.push(fn),useRef:()=>({current:null})};
const {useChecklist}=loader(hooks)('study-checklist');
const renderCheck=()=>{cursor=0;return useChecklist('test',valid);};
renderCheck();effects.splice(0).forEach(fn=>fn());let check=renderCheck();check.toggle('anatomy.a');
assert.deepEqual(JSON.parse(memory.get('test')),['anatomy.a']);renderCheck().toggle('anatomy.a');assert.deepEqual(JSON.parse(memory.get('test')),[]);
renderCheck().toggle('invented');assert.equal(memory.get('test'),'[]');
localStorage.setItem=()=>{throw new Error('blocked');};renderCheck().toggle('anatomy.a');assert.equal(renderCheck().error,true);
const nodes=(n,out=[])=>{if(!n||typeof n!=='object')return out;if(Array.isArray(n)){n.forEach(x=>nodes(x,out));return out;}out.push(n);nodes(n.props?.children,out);return out;};
slots=[];effects=[];const View=loader(hooks)('practical-study').default;let link;
const renderView=()=>{cursor=0;return View({language:'en',onLesson:(...args)=>link=args});};
let tree=renderView();nodes(tree).find(n=>n.type==='button'&&n.props['aria-current']==='page').props.onClick();
nodes(tree).find(n=>n.type==='select').props.onChange({target:{value:'supervised'}});tree=renderView();assert(nodes(tree).some(n=>n.type==='h2'&&n.props.children==='PROM, goniometry & manual skills'));
nodes(tree).find(n=>n.type==='button'&&n.props.children?.some?.(c=>c===examModules.find(m=>m.id==='passive').title.en)).props.onClick();
assert.deepEqual(link,['passive','a']);
console.log('PASS: 58 bilingual expansions, 13 cases, 12 stations, 36 rehearsal checks, valid criterion/PDF/asset links, 48 station renders, both deployment bases, persistence failures and practical-to-lesson navigation.');
