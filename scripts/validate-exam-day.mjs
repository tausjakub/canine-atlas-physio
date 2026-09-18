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
const load=loader(),Component=load('exam-day').default;
for(const language of ['en','cs']){const html=renderToStaticMarkup(React.createElement(Component,{language,onLesson:()=>{},onQuiz:()=>{},onPractical:()=>{}}));for(const required of ['180 min','60 min','70 %','50 %'])assert(html.includes(required)||html.includes(required.replace(' %','%')));assert.equal((html.match(/<option /g)||[]).length,13);assert.equal((html.match(/type="checkbox"/g)||[]).length,11);assert(html.includes(load('exam-day').instituteStandard));}
let values=[],cursor=0,lesson='',quiz=false,practical=false;
const hooks={...React,useEffect:()=>{},useState:init=>{const n=cursor++;if(!(n in values))values[n]=init;return[values[n],v=>values[n]=typeof v==='function'?v(values[n]):v];}};
const Interactive=loader(hooks)('exam-day').default;
const render=()=>{cursor=0;return Interactive({language:'en',onLesson:id=>lesson=id,onQuiz:()=>quiz=true,onPractical:()=>practical=true});};
function find(node,predicate){if(Array.isArray(node)){for(const n of node){const f=find(n,predicate);if(f)return f;}}else if(node&&typeof node==='object'){if(predicate(node))return node;return find(node.props?.children,predicate);}}
let tree=render();find(tree,n=>n.type==='textarea').props.onChange({target:{value:'My reasoning'}});tree=render();assert.equal(find(tree,n=>n.type==='textarea').props.value,'My reasoning');
find(tree,n=>n.type==='button'&&n.props.children==='Show review prompts').props.onClick();tree=render();assert(find(tree,n=>n.type==='details'));
find(tree,n=>n.type==='select').props.onChange({target:{value:'cases'}});tree=render();assert.equal(find(tree,n=>n.type==='textarea').props.value,'');assert(!find(tree,n=>n.type==='details'));
find(tree,n=>n.type==='button'&&n.props.children==='Review this lesson').props.onClick();assert.equal(lesson,'cases');
find(tree,n=>n.type==='button'&&n.props.children==='Open knowledge tests').props.onClick();assert(quiz);
find(tree,n=>n.type==='button'&&n.props.children==='Open practical preparation').props.onClick();assert(practical);
console.log('PASS: bilingual exam guide, 13 rehearsal topics, 11 visible checkboxes, sources, answer/reveal/reset and lesson/quiz/practical navigation.');
