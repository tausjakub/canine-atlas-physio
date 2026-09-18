import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
function loader(react=React){const cache=new Map();return function load(name){if(cache.has(name))return cache.get(name);const file=path.join(root,'app',name+(fs.existsSync(path.join(root,'app',name+'.ts'))?'.ts':'.tsx'));const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;const exports={};cache.set(name,exports);new Function('require','exports',output)(s=>s==='./scene'?{default:()=>null}:s==='react'?react:s.endsWith('.json')?JSON.parse(fs.readFileSync(path.join(root,'app',s),'utf8')):s.startsWith('./')?load(s.slice(2)):require(s),exports);return exports;};}
const load=loader(),{planPhases,planTaskIds,phaseForDate,daysUntilExam}=load('personal-plan-data');
assert.equal(planPhases.length,11);assert.equal(planTaskIds.length,new Set(planTaskIds).size);
assert.equal(daysUntilExam('2026-11-10'),1);assert.equal(daysUntilExam('2026-11-11'),0);assert.equal(daysUntilExam('2026-11-13'),-2);
assert.equal(phaseForDate('2026-09-25').id,'osteo');assert.equal(phaseForDate('2026-10-09').id,'dorn');assert.equal(phaseForDate('2026-11-01').id,'placement');assert.equal(phaseForDate('2026-11-12').id,'exam');assert.equal(phaseForDate('2026-11-13'),undefined);
for(let time=Date.parse('2026-09-18');time<=Date.parse('2026-11-12');time+=86400000){const day=new Date(time).toISOString().slice(0,10);assert.equal(planPhases.filter(p=>p.start<=day&&p.end>=day).length,1,day);}
const modules=load('exam-data').examModules,targets=planPhases.flatMap(p=>p.tasks.map(t=>t.target).filter(Boolean));
for(const m of modules)assert(targets.includes(m.id),m.id);
for(const target of targets)assert([...modules.map(m=>m.id),'quiz','exam-day','practical'].includes(target),target);
for(const p of planPhases)for(const t of p.tasks){assert(t.text.cs.length>20);assert(t.text.en.length>20);}
for(const language of ['cs','en']){const html=renderToStaticMarkup(React.createElement(load('personal-plan').default,{language,onOpen:()=>{}}));assert(html.includes('11.–12. 11. 2026'));assert(html.includes('Toulcův dvůr'));assert.equal((html.match(/type="checkbox"/g)||[]).length,planTaskIds.length);assert(!html.includes('NaN'));}
let values=[],cursor=0,opened='';const hooks={...React,useEffect:()=>{},useState:init=>{const n=cursor++;if(!(n in values))values[n]=init;return[values[n],v=>values[n]=typeof v==='function'?v(values[n]):v];}};
const Component=loader(hooks)('personal-plan').default;function render(){cursor=0;return Component({language:'cs',onOpen:id=>opened=id});}
function find(node,predicate){if(Array.isArray(node)){for(const n of node){const f=find(n,predicate);if(f)return f;}}else if(node&&typeof node==='object'){if(predicate(node))return node;return find(node.props?.children,predicate);}}
let tree=render();const phase=find(tree,n=>n.props?.id==='plan-dorn');find(phase,n=>n.props?.className==='plan-phase-heading').props.onClick();tree=render();assert.equal(find(tree,n=>n.props?.id==='plan-body-dorn').props.hidden,false);
find(tree,n=>n.props?.className==='plan-task-link').props.onClick();assert.equal(opened,'anatomy');
values[0]='2026-11-13';tree=render();assert(!find(tree,n=>n.props?.children==='Pustit se do toho'));
console.log(`PASS: 11 contiguous phases, all user dates, all 13 topics, ${planTaskIds.length} bilingual steps, date boundaries, SSR and expansion/navigation.`);
