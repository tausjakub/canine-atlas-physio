import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
function loader(react=React,{mockMap=true}={}){const cache=new Map();return function load(name){if(cache.has(name))return cache.get(name);const file=new URL('../app/'+name+(fs.existsSync(new URL('../app/'+name+'.ts',import.meta.url))?'.ts':'.tsx'),import.meta.url);const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;const exports={};cache.set(name,exports);new Function('require','exports',output)(s=>s==='react'?react:s==='./dorn-scene'?{__esModule:true,default:props=>React.createElement('div',{'data-three-scene':props.mode,'data-kind':props.kind,'data-bend':props.bend,'data-returning':String(props.returning)})}:s==='./dorn-manual-map'&&mockMap?{__esModule:true,default:()=>React.createElement('div',{'data-manual-map':true})}:s.endsWith('.css')?{}:s.endsWith('.json')?JSON.parse(fs.readFileSync(new URL('../app/'+s,import.meta.url),'utf8')):s.startsWith('./')?load(s.slice(2)):require(s),exports);return exports;};}
function all(node,predicate,result=[]){if(Array.isArray(node))for(const child of node)all(child,predicate,result);else if(node&&typeof node==='object'){if(predicate(node))result.push(node);all(node.props?.children,predicate,result);}return result;}
const movementData=loader()('dorn-movement-data');
const {dornMovements}=movementData;
assert(!('dornBookId' in movementData),'study lessons have no removed-book identifier');
const expectedKinds=['stifle','elbow','carpus','digits','hip','hip-rotation','hock','shoulder','hind-digits'];
assert.deepEqual(dornMovements.map(item=>item.id),expectedKinds);
assert.equal(new Set(dornMovements.map(item=>item.id)).size,9);
for(const item of dornMovements){assert(!('sourcePage' in item));assert(!('sourceHeading' in item));assert.equal(item.phases.length,4);for(const lang of ['cs','en'])for(const field of ['title','summary','anatomy','notice','omitted','question','answer','direction','plane'])assert(item[field][lang]?.trim().length>5);for(const phase of item.phases)for(const lang of ['cs','en'])assert(phase.title[lang]&&phase.body[lang]);}
const noRemovedBook=html=>{assert(!/dorn-(?:preview|method-dogs)/i.test(html),'removed-book URLs and previews must not be rendered');assert(!/\b(?:PDF|manuálu|předlohy|předloha)\b/i.test(html),'study UI must stand alone without the removed document');};
globalThis.requestAnimationFrame=()=>0;
for(const language of ['cs','en']){
 let cursor=0;const values=[];
 const react={...React,useEffect:()=>{},useId:()=>`dorn-test-${language}`,useState:initial=>{const index=cursor++;if(!(index in values))values[index]=typeof initial==='function'?initial():initial;return[values[index],next=>values[index]=typeof next==='function'?next(values[index]):next];},useRef:initial=>{const index=cursor++;if(!(index in values))values[index]={current:initial};return values[index];}};
 const Component=loader(react)('dorn-movement').default;
 const render=()=>{cursor=0;return Component({language});};
 let tree=render();
 for(const item of dornMovements){
  const tabs=all(tree,node=>node.props?.className==='dorn-movement-tabs')[0];
  tabs.props.children.find(button=>button.key===item.id).props.onClick();tree=render();
  assert.equal(values[0],item.id);assert.equal(values[1],0);assert.equal(values[2],false);
  const html=renderToStaticMarkup(tree);assert(html.includes(item.title[language]));noRemovedBook(html);assert(!html.includes('undefined'));assert(html.includes('data-three-scene="detail"'));assert(html.includes('data-three-scene="overview"'));assert(html.includes('data-bend="0"'));assert(!html.includes('dorn-dog-body'));assert(!html.includes('dorn-joint-diagram'));
  const phaseCard=all(tree,node=>node.props?.className==='dorn-phase-card')[0],steps=all(phaseCard,node=>node.type==='ol')[0].props.children;
  steps[2].props.children.props.onClick();tree=render();assert.equal(values[1],.58);assert.equal(values[2],false);
  all(tree,node=>node.props?.className==='dorn-play')[0].props.onClick();assert.equal(values[2],true);
  all(tree,node=>node.props?.className==='dorn-reset')[0].props.onClick();assert.equal(values[1],0);assert.equal(values[2],false);
  const scrub=all(tree,node=>node.type==='input'&&node.props?.type==='range')[0];scrub.props.onChange({target:{value:'84'}});tree=render();assert.equal(values[1],.84);assert.equal(values[2],false);const returnHTML=renderToStaticMarkup(tree);assert(returnHTML.includes(item.phases[3].title[language]));assert(returnHTML.includes('data-returning="true"'));
 }
 values[3]=true;tree=render();assert.equal(all(tree,node=>node.props?.className==='dorn-play')[0].props.disabled,true);assert(renderToStaticMarkup(tree).includes(language==='cs'?'omezení pohybu':'Reduced motion'));
 console.log(`PASS: ${language}: nine standalone 3D lessons, directions/planes, frame selection, playback/reset, scrub and reduced motion.`);
}
const {dornManualTopics}=loader()('dorn-manual-data');
assert.deepEqual(dornManualTopics.map(item=>item.number),Array.from({length:22},(_,i)=>i+1));
assert.deepEqual(['hind','fore','axial'].map(region=>dornManualTopics.filter(item=>item.region===region).length),[6,6,10]);
for(const item of dornManualTopics){assert(!('pages' in item),'retained topics have no removed-document page mapping');assert(['interpreted','mixed','unspecified'].includes(item.certainty));for(const field of ['title','motion','plane','distinction'])for(const lang of ['cs','en'])assert(item[field][lang]?.length>(field==='title'?1:5),`${item.number} ${field} ${lang}`);for(const kind of item.animations)assert(expectedKinds.includes(kind));}
assert.equal(dornManualTopics[15].certainty,'unspecified','lumbar contact does not prescribe one movement plane');
assert.equal(dornManualTopics[16].certainty,'unspecified','thoracic contact does not prescribe one movement plane');
assert.equal(dornManualTopics[19].certainty,'unspecified','atlas contact is not invented head motion');
for(const language of ['cs','en']){
 const Map=loader(React,{mockMap:false})('dorn-manual-map').default;
 const html=renderToStaticMarkup(React.createElement(Map,{language,onSelectMovement:()=>{}}));
 assert(!html.includes('undefined'));noRemovedBook(html);assert.equal((html.match(/aria-pressed=/g)||[]).length,22);
 for(const item of dornManualTopics)assert(html.includes(item.title[language]));
 assert(html.includes('vanat.ahc.umn.edu/cadavSlabs/'));
 let selected=1;const clicked=[];
 const react={...React,useState:()=>[selected,next=>{selected=next;}]};
 const InteractiveMap=loader(react,{mockMap:false})('dorn-manual-map').default;
 const renderMap=()=>InteractiveMap({language,onSelectMovement:kind=>clicked.push(kind)});
 let tree=renderMap();
 for(const topic of dornManualTopics){
  const groups=all(tree,node=>node.props?.className==='dorn-map-groups')[0];
  all(groups,node=>node.type==='button').find(node=>Number(node.key)===topic.number).props.onClick();
  tree=renderMap();const detail=all(tree,node=>node.props?.className==='dorn-map-detail')[0];
  const detailHTML=renderToStaticMarkup(detail);
  noRemovedBook(detailHTML);
  const jump=all(detail,node=>node.props?.className==='dorn-map-jump')[0];
  if(topic.animations.length){
   const before=clicked.length;for(const button of all(jump,node=>node.type==='button'))button.props.onClick();
   assert.deepEqual(clicked.slice(before),topic.animations,`${language} topic ${topic.number}: correct 3D study handoff`);
  }else assert(!jump,`${language} topic ${topic.number}: no unsupported animation link`);
 }
}
const books=JSON.parse(fs.readFileSync(new URL('../app/library-data.json',import.meta.url),'utf8'));
assert(!books.some(book=>book.id==='dorn-method-dogs'),'removed book is absent from the library');
for(const directory of ['../public/library/','../dist/client/library/']){
 const location=new URL(directory,import.meta.url);
 if(fs.existsSync(location))assert(!fs.readdirSync(location).some(file=>/^dorn-(?:method-dogs|preview)/i.test(file)),`${directory}: removed PDF and previews must not remain accessible`);
}
console.log('PASS: all 22 standalone study topics, separate fore/hind digit references, qualified planes, bilingual map interaction, and removed-book assets absent.');

// Real 3D geometry and joint continuity are checked in validate-dorn-3d.mjs.
