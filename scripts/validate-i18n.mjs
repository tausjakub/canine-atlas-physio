import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const json=name=>JSON.parse(read(name));
const en=json('app/study-data.json'),cs=json('app/study-data.cs.json'),ui=json('app/ui.cs.json'),cards=json('app/cards.cs.json'),atlas=json('public/models/catalog.json');
assert.deepEqual(Object.keys(cs.parts),Object.keys(en.parts));
assert.deepEqual(Object.keys(cs.profiles),Object.keys(en.profiles));
assert.deepEqual(Object.keys(cs.sources),Object.keys(en.sources));
assert.equal(cs.translationSourceSha256,createHash('sha256').update(read('app/study-data.json').replace(/\r\n/g,'\n')).digest('hex'),'English notes changed; review Czech translations');
for(const [key,n] of Object.entries(en.profiles)){
 const c=cs.profiles[key];assert.deepEqual(c.sources,n.sources);
 for(const field of ['title','overview','location','attachments','function','nerve','physio','recall']){
  assert(c[field]?.trim().length>5,`${key}.${field} missing`);
  assert.notEqual(c[field],n[field],`${key}.${field} left in English`);
  assert(!/ZXQ|TODO|placeholder|\ufffd/.test(c[field]),`${key}.${field} invalid content`);
 }
}
for(const [id,e] of Object.entries(en.parts)){
 const c=cs.parts[id];assert.equal(c.profile,e.profile);
 assert.equal(c.side,({Left:'Vlevo',Right:'Vpravo','Midline / side not specified':'Střední čára / strana neuvedena'})[e.side]);
 assert.equal(!!c.warning,!!e.warning);assert.equal(!!c.modelNote,!!e.modelNote);
}
for(const [id,s] of Object.entries(en.sources)){assert.equal(cs.sources[id].url,s.url);assert.notEqual(cs.sources[id].title,s.title);}
for(const [key,value] of Object.entries(ui)){
 const placeholders=s=>[...s.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort();
 assert.deepEqual(placeholders(value),placeholders(key),key);assert(value.trim());
}
// Execute the actual TypeScript helpers with their real data, without a browser or network.
const require=createRequire(import.meta.url),cache=new Map();
function load(name){
 const file=path.join(root,'app',name+'.ts');if(cache.has(file))return cache.get(file);
 const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};cache.set(file,exports);
 new Function('require','exports',output)(specifier=>specifier.endsWith('.json')?json('app/'+specifier.slice(2)):specifier.startsWith('./')?load(specifier.slice(2)):require(specifier),exports);
 return exports;
}
const {translate,normalizeSearch}=load('i18n'),{structureName,detailFor}=load('study-notes');
assert.equal(translate('cs','Card {number} of {total}',{number:3,total:15}),'Kartička 3 z 15');
assert.equal(translate('en','Card {number} of {total}',{number:3,total:15}),'Card 3 of 15');
assert.equal(normalizeSearch('NADHŘEBENOVÝ'),'nadhrebenovy');
assert.equal(normalizeSearch('čéška'),normalizeSearch('ceska'));
for(const part of atlas.parts){
 const c=detailFor(part,'cs'),e=detailFor(part,'en');assert(c.references.every(Boolean));assert(e.references.every(Boolean));
 assert.equal(c.title,cs.profiles[cs.parts[part.id].profile].title);
 assert(structureName(part,'cs').length>5);assert(structureName(part,'en').length>2);
}
assert.match(structureName(atlas.parts.find(p=>p.id==='m_supraspinatus_R'),'cs'),/Vpravo/);
assert(atlas.parts.some(p=>normalizeSearch(structureName(p,'cs')).includes('nadhrebenovy')));
assert.match(cs.profiles.supraspinatus.function,/extenzi ramenního/);
assert.match(cs.profiles.flexor_digitorum_superficialis_hind.function,/extenzi.*hlezna/);
assert.match(cs.profiles.flexor_digitorum_superficialis_fore.function,/flexi zápěstí/);
assert.match(cs.profiles.psoas_minor.attachments,/kyčelní kosti/);
assert.match(cs.profiles.axis.overview,/zubu/);
assert.equal(cards.length,load('anatomy').notes.length);
for(const c of cards)for(const f of ['title','action','landmark','study'])assert(c[f]?.length>8);
// Audit JSX source: visible literal words and accessible labels must use translations.
for(const file of ['page.tsx','scene.tsx']){
 const source=read('app/'+file),tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(n){
  if(ts.isJsxText(n)){const text=n.text.trim();if(/[A-Za-z]/.test(text))assert(['3D','CZ','ENG'].includes(text),`${file}: untranslated JSX '${text}'`);}
  if(ts.isJsxAttribute(n)&&['aria-label','placeholder','title'].includes(n.name.text)&&n.initializer&&ts.isStringLiteral(n.initializer))assert(['English','Čeština'].includes(n.initializer.text),`${file}: untranslated accessible label ${n.initializer.text}`);
  if(ts.isCallExpression(n)&&n.expression.getText(tree)==='t'&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0]))assert(ui[n.arguments[0].text],`${file}: missing key ${n.arguments[0].text}`);
  ts.forEachChild(n,visit);
 }visit(tree);
}
console.log(`PASS: all 425 pieces, ${Object.keys(cs.profiles).length} Czech profiles, ${Object.keys(ui).length} UI strings, 15 cards, ${Object.keys(cs.sources).length} reference titles.`);
console.log('PASS: actual language helpers, bilingual search, diacritics, side labels, references, placeholders, anatomical distinctions and JSX/accessibility translation coverage.');
// Render representative real page branches with supplied state; no browser/3D context is needed.
const pageCode=ts.transpileModule(read('app/page.tsx'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
for(const language of ['en','cs'])for(const selected of [null,'m_supraspinatus_R','m_flexor_digitorum_superficialis_L.001','Carpal_L','C_1','m_Ligament','study']){
 const state={...load('anatomy').initial,selected:selected==='study'?null:selected};
 const mockReact={...React,useEffect:()=>{},useMemo:f=>f(),useRef:()=>({current:null}),useState:initial=>[initial==='en'?language:initial===null?atlas:initial===load('anatomy').initial?state:initial==='explore'&&selected==='study'?'study':initial===false&&selected==='study'?true:initial,()=>{}]};
 const exports={};new Function('require','exports',pageCode)(s=>s==='react'?mockReact:s==='./scene'?{__esModule:true,default:()=>null}:s==='@/components/ui/button'?{Button:({children,...props})=>React.createElement('button',props,children)}:s.endsWith('.json')?json('app/'+s.slice(2)):s.startsWith('./')?load(s.slice(2)):require(s),exports);
 const html=renderToStaticMarkup(React.createElement(exports.default));
 assert(html.includes(language==='cs'?'Atlas psa':'Canine Atlas'));
 assert(html.includes(language==='cs'?'Zdroje a rozsah':'Sources &amp; scope'));
 if(selected&&selected!=='study')assert(html.includes(language==='cs'?'Význam pro fyzioterapii':'Physiotherapy relevance'));
 if(selected==='study')assert(html.includes(language==='cs'?'Další kartička':'Next card'));
 if(language==='cs')for(const leak of ['Review anatomy source','Find in the 3D model','Source identity qualification','Model repository','Show surrounding anatomy'])assert(!html.includes(leak),`Czech render leaks ${leak}`);
}
console.log('PASS: English and Czech page rendering for empty selection, muscles, limb-specific notes, ambiguous pieces, vertebrae and revealed study cards.');
