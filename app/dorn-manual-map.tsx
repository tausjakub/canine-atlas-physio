'use client';

import {useState} from 'react';
import {ArrowDown,ArrowUpRight,Compass,Info} from 'lucide-react';
import type {Language} from './i18n';
import {dornMovements,type DornMovementKind} from './dorn-movement-data';
import {dornManualTopics} from './dorn-manual-data';

export default function DornManualMap({language,onSelectMovement}:{language:Language;onSelectMovement:(kind:DornMovementKind)=>void}){
 const [selected,setSelected]=useState(1);
 const e=(en:string,cs:string)=>language==='cs'?cs:en;
 const topic=dornManualTopics.find(item=>item.number===selected)!;
 const groups=[{id:'hind',title:e('Hindlimb','Pánevní končetina')},{id:'fore',title:e('Forelimb','Hrudní končetina')},{id:'axial',title:e('Trunk, neck & head','Trup, krk a hlava')}];
 return <details className="dorn-manual-map">
  <summary><span><Compass size={20}/><span>{e('Movement study map','Studijní mapa pohybů')}<small>{e('22 topics · select a region to see what actually moves','22 témat · vyber oblast a zjisti, co se skutečně pohybuje')}</small></span></span><span className="dorn-map-count">22 <ChevronMark/></span></summary>
  <div className="dorn-map-body">
   <p className="dorn-map-intro">{e('These 22 topics explore anatomical regions and movement concepts. Some share a limb movement; others concern tissue contact, translation or traction. Use the map to distinguish the moving segment from the surrounding anatomy.','Těchto 22 témat propojuje anatomické oblasti a pohybové souvislosti. Některá sdílejí pohyb končetiny, jiná se týkají kontaktu s tkání, posunu nebo tahu. Mapa ti pomůže odlišit pohybující se segment od okolní anatomie.')}</p>
   <p className="dorn-map-prep">{e('Keep tissue movement around the spine and pelvis separate from bone movement. A hand or tissue-glide direction does not establish an additional joint-motion plane.','Pohyb tkání kolem páteře a pánve odlišuj od pohybu kostí. Směr ruky nebo posunu tkáně neurčuje další rovinu kloubního pohybu.')}</p>
   <nav className="dorn-map-groups" aria-label={e('All 22 movement topics','Všech 22 pohybových témat')}>
    {groups.map(group=><div key={group.id}><h3>{group.title}</h3><div>{dornManualTopics.filter(item=>item.region===group.id).map(item=><button key={item.number} aria-pressed={selected===item.number} onClick={()=>setSelected(item.number)}><span>{String(item.number).padStart(2,'0')}</span><span>{item.title[language]}</span>{item.animations.length>0&&<small>3D</small>}</button>)}</div></div>)}
   </nav>
   <section className="dorn-map-detail" aria-live="polite" aria-atomic="true">
    <header><span>{e('STUDY TOPIC','STUDIJNÍ TÉMA')} {String(topic.number).padStart(2,'0')}</span><h3>{topic.title[language]}</h3></header>
    <div className="dorn-map-explanation"><div><h4>{e('Movement & direction','Pohyb a směr')}</h4><p>{topic.motion[language]}</p></div><div><h4>{e('Plane & axis','Rovina a osa')}</h4><p>{topic.plane[language]}</p><span className="dorn-plane-evidence">{topic.certainty==='unspecified'?e('No single movement plane established','Jednoznačná rovina pohybu není určena'):topic.certainty==='mixed'?e('Movement and qualified anatomical explanation','Pohyb a upřesněný anatomický výklad'):e('Explanatory anatomical interpretation','Názorný anatomický výklad')}</span></div></div>
    <p className="dorn-map-distinction">{topic.distinction[language]}</p>
    {topic.animations.length>0?<div className="dorn-map-jump">{topic.animations.map(kind=>{const lesson=dornMovements.find(item=>item.id===kind);return lesson?<button key={kind} onClick={()=>onSelectMovement(kind)}>{e('Explore in 3D','Prohlédnout ve 3D')} · {lesson.title[language]}<ArrowDown size={15}/></button>:null;})}</div>:<p className="dorn-map-source-only"><Info size={15}/>{e('Use this explanation to identify the region and distinguish the movement concepts. Corrective handling or pressure is not reconstructed as an animation.','Vysvětlení ti pomůže určit oblast a odlišit pohybové souvislosti. Korekční úchop ani přítlak nejsou rekonstruovány jako animace.')}</p>}
   </section>
   <div className="dorn-plane-primer"><span className="eyebrow">{e('READ DIRECTION IN THE DOG’S FRAME','SMĚR ČTI V SOUSTAVĚ TĚLA PSA')}</span><div><p><strong>{e('Sagittal','Sagitální')}</strong>{e('Divides left and right. Limb bending and straightening are illustrated in a plane parallel to this plane.','Dělí tělo na levou a pravou část. Ohnutí a narovnání končetin znázorňujeme v rovině rovnoběžné s touto rovinou.')}</p><p><strong>{e('Dorsal','Dorzální')}</strong>{e('Divides the back and belly. Side-to-side movement along the trunk may be described in this plane; a drawing must still identify what moves.','Odděluje hřbetní a břišní část. V této rovině lze popsat stranový pohyb podél trupu; kresba však musí určit, která část se pohybuje.')}</p><p><strong>{e('Transverse & local axes','Transverzální a místní osy')}</strong>{e('A body cross-section is perpendicular to its head-to-tail axis. Rotation of a limb is defined around that segment’s own long axis, which need not line up with a body axis.','Příčný řez tělem je kolmý k jeho podélné ose od hlavy k ocasu. Rotace končetiny se vztahuje k podélné ose daného segmentu, která nemusí souhlasit s osou trupu.')}</p></div><p className="dorn-plane-note">{e('Turning the camera or placing the dog on its side does not rename its anatomical directions. A contact arrow is not automatically a joint-motion arrow. The displayed axes are illustrative anatomical references.','Otočení kamery ani položení psa na bok nemění názvy jeho anatomických směrů. Šipka přítlaku není automaticky šipkou kloubního pohybu. Zobrazené osy jsou ilustrační anatomické reference.')}</p><nav><a href="https://vanat.ahc.umn.edu/cadavSlabs/" target="_blank" rel="noreferrer">{e('University of Minnesota · canine planes','University of Minnesota · roviny u psa')}<ArrowUpRight size={13}/></a></nav></div>
  </div>
 </details>;
}

function ChevronMark(){return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>;}
