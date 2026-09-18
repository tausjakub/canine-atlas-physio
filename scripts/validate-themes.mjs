import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
function loader(react=React){const cache=new Map();return function load(name){if(cache.has(name))return cache.get(name);const file=path.join(root,'app',name+(fs.existsSync(path.join(root,'app',name+'.ts'))?'.ts':'.tsx'));const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;const exports={};cache.set(name,exports);new Function('require','exports',output)(s=>s==='react'?react:s.endsWith('.json')?JSON.parse(fs.readFileSync(path.join(root,'app',s),'utf8')):s.startsWith('./')?load(s.slice(2)):require(s),exports);return exports;};}
const themes=JSON.parse(fs.readFileSync(path.join(root,'app/themes.json'))),load=loader();
assert.equal(themes.length,7);assert.equal(new Set(themes.map(t=>t.id)).size,7);
function luminance(hex){return hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
function contrast(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
for(const t of themes){assert(contrast(t.text,t.surface)>=4.5,t.id+' body contrast');assert(contrast(t.answerText,t.answer)>=4.5,t.id+' answer contrast');assert(contrast(t.muted,t.surface)>=4.5,t.id+' muted contrast');}
for(const language of ['en','cs']){const html=renderToStaticMarkup(React.createElement(load('theme-picker').default,{language}));assert.equal((html.match(/<option /g)||[]).length,7);}
assert.equal(load('theme-picker').validTheme('not-a-theme'),'dark');
let values=[],cursor=0,effects=[],saved={};global.document={documentElement:{dataset:{}}};global.localStorage={getItem:k=>saved[k]??null,setItem:(k,v)=>saved[k]=v};
const hooks={...React,useEffect:fn=>effects.push(fn),useState:init=>{const n=cursor++;if(!(n in values))values[n]=init;return[values[n],v=>values[n]=typeof v==='function'?v(values[n]):v];}};
const {default:Picker,themeStorageKey}=loader(hooks)('theme-picker');
const render=()=>{cursor=0;return Picker({language:'cs'});};
saved[themeStorageKey]='terracotta';let tree=render();effects.shift()();tree=render();assert.equal(tree.props.children[1].props.value,'terracotta');
for(const theme of themes){tree.props.children[1].props.onChange({target:{value:theme.id}});tree=render();assert.equal(document.documentElement.dataset.theme,theme.id);assert.equal(saved[themeStorageKey],theme.id);}
global.localStorage.setItem=()=>{throw Error('blocked');};tree.props.children[1].props.onChange({target:{value:'pastel'}});tree=render();assert.equal(document.documentElement.dataset.theme,'pastel');assert(tree.props.children[2]);
const Detail=load('answer-detail').default;
for(const q of load('quiz-data').questions)for(const language of ['en','cs']){const html=renderToStaticMarkup(React.createElement(Detail,{topic:q.topic,criterion:q.criterion,language}));assert(html.length>500,q.id);assert(html.includes('answer-pitfall'));assert(!html.includes('undefined'));}
console.log('PASS: seven bilingual themes, contrast of body/answer/muted text, saved preference, invalid values, storage failure and detailed feedback for all quiz questions.');
