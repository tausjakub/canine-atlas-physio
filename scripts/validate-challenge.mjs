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

const catalog=JSON.parse(fs.readFileSync(path.join(root,'public/models/catalog.json'),'utf8'));
const {challengeIds}=loader()('anatomy-challenge');
assert.equal(challengeIds.length,23);assert.equal(new Set(challengeIds).size,23);
for(const id of challengeIds)assert(catalog.parts.some(p=>p.id===id&&p.system==='bone'),id);
let values=[],cursor=0,lang='en';
const hooks={...React,useMemo:fn=>fn(),useState:init=>{const n=cursor++;if(!(n in values))values[n]=typeof init==='function'?init():init;return[values[n],v=>values[n]=typeof v==='function'?v(values[n]):v];}};
const Component=loader(hooks)('anatomy-challenge').default;
const render=()=>{cursor=0;return Component({atlas:catalog,language:lang,onClose:()=>{}});};
function find(node,type,match){if(!node)return;if(Array.isArray(node)){for(const n of node){const r=find(n,type,match);if(r)return r;}}else if(typeof node==='object'){if(node.type===type&&match(node.props))return node;return find(node.props?.children,type,match);}}
let tree=render();find(tree,'button',p=>p.children==='Start 10 challenges').props.onClick();tree=render();assert.equal(values[0].length,10);assert.equal(new Set(values[0]).size,10);
let target=values[0][0];find(tree,'select',()=>true).props.onChange({target:{value:target}});tree=render();lang='cs';tree=render();assert.equal(values[5].selected,target);
const check=find(tree,'button',p=>p.children==='Ověřit odpověď').props.onClick;check();check();tree=render();assert.equal(values[2].length,1);assert(values[2][0].correct);assert(find(tree,'select',p=>p.disabled));
find(tree,'button',p=>p.children==='Izolovat odpověď').props.onClick();tree=render();assert(values[5].isolate);assert.equal(values[5].selected,target);
find(tree,'button',p=>p.children==='Další struktura').props.onClick();tree=render();assert.equal(values[1],1);assert.equal(values[5].selected,null);assert(!values[3]);
for(let i=1;i<10;i++){find(tree,'button',p=>p.children==='Nevím').props.onClick();tree=render();find(tree,'button',p=>p.children===(i===9?'Zobrazit výsledky':'Další struktura')).props.onClick();tree=render();}
assert(values[4]);assert.equal(values[2].filter(a=>a.correct).length,1);
find(tree,'button',p=>p.children==='Zopakovat chybné struktury').props.onClick();tree=render();assert.equal(values[0].length,9);assert(!values[0].includes(target));assert.equal(values[2].length,0);
console.log('PASS: 23 valid bone targets; ten unique challenges; language stability; selection, locked/double answers, isolation, next reset, results and mistakes-only retry.');
