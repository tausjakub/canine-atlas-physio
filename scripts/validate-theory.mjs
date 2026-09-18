import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url),root=process.cwd();
function loader(react=React){const cache=new Map();return function load(name){if(cache.has(name))return cache.get(name);const file=path.join(root,'app',name+(fs.existsSync(path.join(root,'app',name+'.ts'))?'.ts':'.tsx'));const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;const exports={};cache.set(name,exports);new Function('require','exports',code)(s=>s==='react'?react:s.endsWith('.json')?JSON.parse(fs.readFileSync(path.join(root,'app',s),'utf8')):s.startsWith('./')?load(s.slice(2)):require(s),exports);return exports;};}
const load=loader(),{examModules}=load('exam-data'),{theoryChapters}=load('theory-data'),{furtherTopics}=load('further-data'),{default:Chapter,theorySearchText}=load('theory-chapter');
const books=JSON.parse(fs.readFileSync('app/library-data.json','utf8'));
const escape=text=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
assert.deepEqual(Object.keys(theoryChapters),examModules.map(m=>m.id));
const wordCounts=[];
for(const module of examModules){const chapter=theoryChapters[module.id];assert.equal(chapter.units.length,3);assert(chapter.rows.length>=3);assert(chapter.units.every(u=>u.paragraphs.length===2));
 const book=books.find(b=>b.id===chapter.reading.book);assert(book);assert(book.parts.some(p=>p.start<=chapter.reading.page&&p.end>=chapter.reading.page));
 for(const language of ['en','cs']){
  const pairs=[chapter.lead,chapter.example,...chapter.units.flatMap(u=>[u.title,...u.paragraphs]),...chapter.rows.flatMap(r=>[r.term,r.mechanism,r.meaning])];
  for(const pair of pairs){assert(pair[language]?.length>2);if(pair.en.length>25)assert.notEqual(pair.en,pair.cs);}
  const words=chapter.units.flatMap(u=>u.paragraphs.map(p=>p[language])).join(' ').split(/\s+/).length;assert(words>=(language==='cs'?200:250),`${module.id} ${language}: ${words}`);if(language==='en')wordCounts.push(words);
  for(const base of ['', '/canine-atlas-physio']){process.env.NEXT_PUBLIC_BASE_PATH=base;const html=renderToStaticMarkup(React.createElement(Chapter,{topic:module.id,language}));assert(html.includes(escape(chapter.example[language])));assert(html.includes(base+'/?book='+chapter.reading.book));assert(!html.includes('undefined'));assert.equal((html.match(/<caption>/g)||[]).length,1);for(let i=0;i<3;i++){assert(html.includes(`href="#theory-${module.id}-${i}"`));assert(html.includes(`id="theory-${module.id}-${i}"`));}assert(html.includes(`href="#criterion-${module.id}-a"`));assert(html.includes(`href="#recall-${module.id}"`));}
  assert(theorySearchText(module.id).includes(chapter.units[0].title[language]));
 }
}
delete process.env.NEXT_PUBLIC_BASE_PATH;
assert.equal(furtherTopics.length,9);assert.equal(new Set(furtherTopics.map(t=>t.id)).size,9);
for(const topic of furtherTopics){assert.equal(topic.sections.length,4);assert(topic.sources.length);assert(examModules.some(m=>m.id===topic.bookTopic));
 for(const id of topic.criteria){const [m,c]=id.split('.');assert(examModules.find(x=>x.id===m)?.sections.some(s=>s.criteria===c));}
 for(const language of ['en','cs']){for(const pair of [topic.title,topic.intro,topic.evidence,topic.rehearsal,...topic.sections.flatMap(s=>[s.title,s.text]),...topic.quiz.flatMap(q=>[q.question,q.answer])])assert(pair[language].length>2);for(const section of topic.sections)assert(section.text[language].length>150);
  const hooks={...React,useState:initial=>[initial===furtherTopics[0].id?topic.id:initial,()=>{}]};
  const View=loader(hooks)('further-study').default;
  const html=renderToStaticMarkup(React.createElement(View,{language,onLesson:()=>{}}));assert(html.includes(escape(topic.evidence[language])));assert(html.includes(escape(topic.sections[3].text[language])));assert.equal((html.match(/<details>/g)||[]).length,topic.quiz.length);assert(!html.includes('undefined'));
 }
}
// Exercise actual selection and the related-criterion callback without a browser.
let active='dorn',destination;const hooks={...React,useState:()=>[active,v=>active=v],useRef:()=>({current:null})};
globalThis.requestAnimationFrame=fn=>{fn();return 1;};
const View=loader(hooks)('further-study').default;
const nodes=(n,out=[])=>{if(!n||typeof n!=='object')return out;if(Array.isArray(n)){n.forEach(x=>nodes(x,out));return out;}out.push(n);nodes(n.props?.children,out);return out;};
const render=()=>View({language:'cs',onLesson:(...args)=>destination=args});
let tree=render();nodes(tree).find(n=>n.type==='button'&&n.props.children?.includes?.('Hojení a jizvy v terapeutické praxi')).props.onClick();assert.equal(active,'scars');tree=render();nodes(tree).find(n=>n.type==='button'&&n.props.children?.includes?.('A')).props.onClick();assert.deepEqual(destination,['healing','a']);
console.log(`PASS: all 13 bilingual theory chapters (${wordCounts.reduce((a,b)=>a+b,0)} additional English explanation words, excluding tables/examples and existing notes); 39 sections, 13 comparisons, 13 worked examples, both deployment bases and textbook targets.`);
console.log('PASS: 9 bilingual additional chapters, 36 sections, evidence notes, valid criterion links, all 18 renders, chapter selection and lesson navigation.');
