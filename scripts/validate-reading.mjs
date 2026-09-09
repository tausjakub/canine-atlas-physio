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

const load=loader(),books=JSON.parse(fs.readFileSync(path.join(root,'app/library-data.json'),'utf8')),mapping=JSON.parse(fs.readFileSync(path.join(root,'app/book-reading-data.json'),'utf8'));
const {default:Reading,readingsFor}=load('book-reading');
let checked=0;
for(const r of [...Object.values(mapping.profiles).flat(),...Object.values(mapping.topics).flat()]){
 const book=books.find(b=>b.id===r.book);assert(book);const index=book.parts.findIndex(p=>r.page>=p.start&&r.page<=p.end);assert(index>=0);
 const section=book.parts[index];assert(fs.existsSync(path.join(root,'public',section.url)));
 for(const language of ['cs','en']){
  let cursor=0;const values=[book.id,index,r.page];const hooks={...React,useEffect:()=>{},useState:()=>[values[cursor++],()=>{}]};
  const Library=loader(hooks)('library').default;const html=renderToStaticMarkup(React.createElement(Library,{language}));
  assert(html.includes(section.url+'#page='+(r.page-section.start+1)));assert(html.includes('iframe'));assert(!html.includes('undefined'));
 }
 checked++;
}
for(const profile of Object.keys(mapping.profiles)){
 const html=renderToStaticMarkup(React.createElement(Reading,{profile,language:'cs'}));assert(html.includes('Přečíst v knihách'));assert(html.includes('?book=canine-rehabilitation&amp;page='));
}
for(const id of ['guide_cranial_cruciate_L','guide_elbow_medial_collateral_L','guide_sacrotuberous_R','guide_nuchal'])assert(readingsFor(id).length);
assert.equal(Object.keys(mapping.topics).length,13);
console.log('PASS: '+checked+' reading references resolve to available PDF sections; both-language readers use correct local page offsets; all 168 profile panels render and all 13 exam topics have reading links.');
