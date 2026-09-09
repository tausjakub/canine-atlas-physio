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
const load=loader(),{questions,questionById}=load('quiz-data'),{examModules}=load('exam-data'),{photoData}=load('study-visuals'),engine=load('quiz-engine');
assert.equal(questions.length,69);assert.equal(new Set(questions.map(q=>q.id)).size,69);assert.equal(questions.filter(q=>q.photo).length,11);
for(const m of examModules)assert.deepEqual(questions.filter(q=>q.topic===m.id&&!q.photo).map(q=>q.criterion),m.sections.map(s=>s.criteria));
for(const q of questions){
 assert(q.choices.length>=3);assert.equal(q.choices.filter(c=>c.id===q.correctId).length,1);assert.equal(new Set(q.choices.map(c=>c.id)).size,q.choices.length);
 for(const lang of ['en','cs']){assert(q.prompt[lang].length>15);assert(q.explanation[lang].length>100);assert.equal(new Set(q.choices.map(c=>c.text[lang])).size,q.choices.length);for(const c of q.choices)assert(c.text[lang].length>=3);}
 if(q.photo){const p=photoData[q.photo.kind];assert(p.marks[q.photo.mark]);assert.equal(q.choices.find(c=>c.id===q.correctId).text.cs,p.marks[q.photo.mark].name[1]);}
}
const seed=()=>{let state=193;return()=>{state=(state*16807)%2147483647;return(state-1)/2147483646;};};
const mixed=engine.createRun(engine.poolFor('topics','all',{}),13,seed());assert.equal(mixed.items.length,13);assert.equal(new Set(mixed.items.map(i=>questionById.get(i.questionId).topic)).size,13);
assert.equal(new Set(mixed.items.map(i=>i.questionId)).size,13);assert(mixed.items.some(i=>i.order[0]!==questionById.get(i.questionId).correctId));
assert.deepEqual(engine.createRun([],10).items,[]);assert.equal(engine.createRun(questions,1000).items.length,69);
const first=questionById.get(mixed.items[0].questionId),wrong=first.choices.find(c=>c.id!==first.correctId).id;
assert.equal(engine.submitAnswer(mixed,'not-an-option',false),mixed);
let run=engine.submitAnswer(mixed,wrong,false);assert.equal(run.answers[0].correct,false);assert.equal(engine.submitAnswer(run,first.correctId,false),run);
let memory=engine.recordAnswer({},run.answers[0],10);assert(memory[first.id].review);assert.equal(memory[first.id].seen,1);
memory=engine.recordAnswer(memory,{questionId:first.id,choiceId:first.correctId,correct:true,unsure:true},20);assert(memory[first.id].review);
memory=engine.recordAnswer(memory,{questionId:first.id,choiceId:first.correctId,correct:true,unsure:false},30);assert(!memory[first.id].review);assert.equal(memory[first.id].seen,3);assert.equal(memory[first.id].correct,2);
assert.deepEqual(engine.readMemory(JSON.stringify({version:1,items:memory})),memory);assert.deepEqual(engine.readMemory(null),{});assert.throws(()=>engine.readMemory('{broken'));
assert.deepEqual(engine.readMemory(JSON.stringify({version:1,items:{unknown:{seen:1,correct:1,review:true,lastAt:0},[first.id]:{seen:1,correct:2,review:true,lastAt:0}}})),{});
assert.deepEqual(engine.poolFor('review','all',memory),[]);
assert(engine.poolFor('pictures','all',{}).every(q=>q.photo));assert.equal(engine.poolFor('topics','hydrotherapy',{}).length,2);
// Real component handlers: stable answers across language changes, duplicate-submit
// protection, persisted review flags, feedback, next question, results and lesson link.
function elements(node,out=[]){if(!node||typeof node!=='object')return out;if(Array.isArray(node)){node.forEach(n=>elements(n,out));return out;}out.push(node);elements(node.props?.children,out);return out;}
const storage=new Map(),lessons=[];globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};globalThis.document={getElementById:()=>null};
function harness(){const state=[],refs=[],effects=[];let cursor=0,refCursor=0;let lang='en';
 const hook={...React,useEffect:f=>effects.push(f),useRef:initial=>{const i=refCursor++;return refs[i]??(refs[i]={current:initial});},useState:initial=>{const i=cursor++;if(!(i in state))state[i]=initial;return[state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v;}];}};
 const Component=loader(hook)('exam-quiz').default;
 const render=()=>{cursor=0;refCursor=0;return Component({language:lang,onLesson:(...args)=>lessons.push(args)});};
 render();effects.splice(0).forEach(f=>f());
 return {render,state,refs,language:value=>{lang=value;},effects};
}
const h=harness();let tree=h.render();const find=(tree,type,filter)=>elements(tree).find(n=>n.type===type&&filter(n.props));
find(tree,'button',p=>p.className==='quiz-primary').props.onClick();tree=h.render();assert.equal(h.state[6].items.length,10);
const activeId=h.state[6].items[0].questionId,q=questionById.get(activeId),incorrect=q.choices.find(c=>c.id!==q.correctId).id;
find(tree,'input',p=>p.value===incorrect).props.onChange();tree=h.render();const beforeOrder=[...h.state[6].items[0].order];h.language('cs');tree=h.render();assert.deepEqual(h.state[6].items[0].order,beforeOrder);assert.equal(h.state[7],incorrect);
const check=find(tree,'button',p=>p.className==='quiz-primary').props.onClick;check();check();tree=h.render();assert.equal(h.state[6].answers.length,1);assert.equal(h.state[3][activeId].seen,1);assert(h.state[3][activeId].review);
assert(engine.readMemory(storage.get(engine.quizStorageKey))[activeId].review);find(tree,'button',p=>p.className==='quiz-link').props.onClick();assert.equal(lessons.at(-1)[0],q.topic);
find(tree,'button',p=>p.className==='quiz-primary').props.onClick();tree=h.render();assert.equal(h.state[6].cursor,1);assert.equal(h.state[7],'');assert.equal(h.state[8],false);
const radio=find(tree,'input',p=>p.type==='radio');radio.props.onChange();tree=h.render();find(tree,'button',p=>p.className==='quiz-primary').props.onClick();tree=h.render();
find(tree,'button',p=>p.children==='Ukončit sérii').props.onClick();tree=h.render();find(tree,'button',p=>p.children==='Zobrazit výsledky').props.onClick();tree=h.render();assert(h.state[9]);assert.equal(h.state[6].answers.length,2);
assert.equal(Object.values(engine.scoreByTopic(h.state[6].answers)).reduce((n,s)=>n+s.total,0),2);
h.state[1]='orthopedics';find(tree,'button',p=>p.children==='Vybrat jiný test').props.onClick();assert.equal(h.state[6],null);assert.equal(h.state[1],'all');
// Render all 69 questions (including photos) in both languages with submitted feedback.
for(const language of ['en','cs'])for(const q of questions){
 const r=engine.submitAnswer(engine.createRun([q],1),q.correctId,false);let index=0;
 const values=['topics','all',10,{},true,false,r,q.correctId,false,false,false];
 const hook={...React,useEffect:()=>{},useRef:v=>({current:v}),useState:()=>[values[index++],()=>{}]};
 const Component=loader(hook)('exam-quiz').default;
 const html=renderToStaticMarkup(React.createElement(Component,{language,onLesson:()=>{}}));assert(html.includes(language==='cs'?'Správná odpověď:':'Correct answer:'));assert(!html.includes('undefined'));
 if(q.photo){assert(html.includes('class="quiz-photo"'));assert(!html.includes('class="photo-key"'));assert(html.includes('CC BY-SA 4.0'));}
 if(language==='cs')for(const leak of ['Check answer','Correct answer:','Review this lesson','End session','Photo source'])assert(!html.includes(leak));
}
console.log('PASS: 58 bilingual criterion questions + 11 photo questions; choice uniqueness, answer keys, explanations and exact photo mapping.');
console.log('PASS: balanced/shuffled sessions, score calculation, duplicate submission protection, review queue transitions and corrupt storage handling.');
console.log('PASS: actual quiz interactions, language switching without answer/order changes, saved flags, lesson links, next/reset and partial results; 138 feedback renders.');
