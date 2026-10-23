'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Info,Pause,Play,RotateCcw} from 'lucide-react';
import {type Language} from './i18n';
import {dornMovements,type DornMovementKind,type DornText} from './dorn-movement-data';
import DornScene from './dorn-scene';
import DornManualMap from './dorn-manual-map';
import './dorn-movement.css';

const phaseStops=[0,.38,.58,.84];
function phaseAt(value:number){return value<.2?0:value<.5?1:value<.65?2:3;}
function bendAt(value:number){
 const x=value<.2?0:value<.5?(value-.2)/.3:value<.65?1:value<.95?(.95-value)/.3:0;
 return x*x*(3-2*x);
}

export default function DornMovementStudy({language}:{language:Language}){
 const e=(en:string,cs:string)=>language==='cs'?cs:en,l=(value:DornText)=>value[language];
 const [selected,setSelected]=useState(dornMovements[0].id),[progress,setProgress]=useState(0),[playing,setPlaying]=useState(false),[reduced,setReduced]=useState(false);
 const progressRef=useRef(0),heading=useRef<HTMLHeadingElement>(null),movement=dornMovements.find(m=>m.id===selected)!,phase=phaseAt(progress);
 const seek=(value:number)=>{progressRef.current=value;setProgress(value);};
 useEffect(()=>{const preference=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>{setReduced(preference.matches);if(preference.matches)setPlaying(false);};update();preference.addEventListener('change',update);return()=>preference.removeEventListener('change',update);},[]);
 useEffect(()=>{
  if(!playing||reduced)return;
  let frame=0,previous:number|null=null;
  const tick=(now:number)=>{if(previous===null)previous=now;const next=Math.min(1,progressRef.current+Math.min(now-previous,100)/11000);previous=now;progressRef.current=next;setProgress(next);if(next>=1){setPlaying(false);return;}frame=requestAnimationFrame(tick);};
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[playing,reduced]);
 const choose=(id:DornMovementKind)=>{setPlaying(false);seek(0);setSelected(id);requestAnimationFrame(()=>heading.current?.focus({preventScroll:true}));};
 const choosePhase=(index:number)=>{setPlaying(false);seek(phaseStops[index]);};
 return <section className="dorn-page" aria-label={e('Dorn method visual study','Dornova metoda: vizuální studium')}>
  <header className="dorn-hero"><div><span className="eyebrow">{e('YOUR STUDY NOTES · MOVEMENT AT A GLANCE','TVOJE STUDIJNÍ POZNÁMKY · POHYB PŘEHLEDNĚ')}</span><h1>{e('See the movement. Understand the anatomy.','Uvidět pohyb. Pochopit anatomii.')}</h1><p>{e(`Explore 22 study topics and ${dornMovements.length} controllable 3D movement studies. Compare directions, anatomical planes and the relationships between bones.`,`Prozkoumej 22 studijních témat a ${dornMovements.length} ovladatelných 3D pohybových studií. Porovnej směry, anatomické roviny a vzájemné vztahy kostí.`)}</p></div></header>
  <div className="dorn-context"><strong>{e('Study for supervised practice','Studium pro praxi pod dohledem')}</strong><p>{e('These 3D anatomy views show movement directions, not a complete treatment. They do not establish hand placement, corrective force, a safe range or an exercise dose. Discuss the anatomy with your instructor. They are not unsupervised exercises for your dog.','Tyto 3D anatomické pohledy ukazují směry pohybu, nikoli kompletní ošetření. Neurčují úchop, korekční sílu, bezpečný rozsah ani dávku cvičení. Anatomii prober s instruktorem. Nejsou domácím cvičením se psem bez odborného vedení.')}</p></div>
  <DornManualMap language={language} onSelectMovement={kind=>{choose(kind);requestAnimationFrame(()=>document.getElementById('dorn-3d-lessons')?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'}));}}/>
  <div className="dorn-animation-heading" id="dorn-3d-lessons"><h2>{e('3D movement studies','3D pohybové studie')}</h2><span>{dornMovements.length} {e('studies · direction, not treatment dose','studií · směr, nikoli dávka terapie')}</span></div>
  <nav className="dorn-movement-tabs" aria-label={e('Choose a movement','Vyber pohyb')}>{dornMovements.map((item,index)=><button key={item.id} aria-pressed={selected===item.id} onClick={()=>choose(item.id)}><span>{String(index+1).padStart(2,'0')}</span><span>{l(item.title)}</span><ChevronRight size={16}/></button>)}</nav>
  <article className="dorn-lesson" key={movement.id}>
   <header className="dorn-lesson-heading"><div><span className="dorn-source-label">{e('MOVEMENT STUDY · 3D ANATOMY','POHYBOVÁ STUDIE · 3D ANATOMIE')}</span><h2 ref={heading} tabIndex={-1}>{l(movement.title)}</h2><p>{l(movement.summary)}</p></div><div className="dorn-location"><DornScene kind={movement.id} bend={0} returning={false} language={language} mode="overview"/><small>{e('Joint location · atlas model','Umístění kloubu · model atlasu')}</small></div></header>
   <dl className="dorn-movement-reference"><div><dt>{e('Movement direction','Směr pohybu')}</dt><dd>{l(movement.direction)}</dd></div><div><dt>{e('Plane & axis · anatomical interpretation','Rovina a osa · anatomický výklad')}</dt><dd>{l(movement.plane)}</dd></div></dl>
   <div className="dorn-player-layout"><div className="dorn-player">
    <figure className="dorn-stage"><DornScene kind={movement.id} bend={bendAt(progress)} returning={phase===3} language={language} mode="detail"/><figcaption>{e('Rotate the 3D view to compare the bones, joint and optional movement plane. The four phases are observation steps for the illustrated movement. Range and speed are illustrative, not patient targets.','Otočením 3D pohledu porovnej kosti, kloub a volitelnou rovinu pohybu. Čtyři fáze jsou kroky pozorování znázorněného pohybu. Rozsah a rychlost jsou ilustrační, nejsou cílem pro pacienta.')}</figcaption></figure>
    <div className="dorn-player-controls"><button className="dorn-play" disabled={reduced} onClick={()=>{if(progress>=1)seek(0);setPlaying(value=>!value);}}>{playing?<Pause size={17}/>:<Play size={17}/>}<span>{playing?e('Pause','Pozastavit'):progress>=1?e('Replay diagram','Přehrát znovu'):e('Play diagram','Přehrát schéma')}</span></button><button className="dorn-reset" onClick={()=>{setPlaying(false);seek(0);}} aria-label={e('Reset diagram','Vrátit schéma na začátek')}><RotateCcw size={17}/></button><span className="dorn-playback-note">{e('One visual sequence','Jedna názorná sekvence')}</span></div>
    <label className="dorn-scrub"><span>{e('Move through the diagram','Projdi si schéma ručně')}</span><input type="range" min="0" max="100" step=".1" value={progress*100} onChange={event=>{setPlaying(false);seek(Number(event.target.value)/100);}} aria-valuetext={`${phase+1} / 4 · ${l(movement.phases[phase].title)}`}/></label>
    {reduced&&<p className="dorn-reduced" role="status">{e('Reduced motion is enabled in your system. Use the four phase buttons or the slider to study still frames.','V systému máš zapnuté omezení pohybu. Pomocí čtyř tlačítek fází nebo posuvníku si prohlédni jednotlivé snímky.')}</p>}
   </div><aside className="dorn-phase-card"><span className="eyebrow">{e('OBSERVE IN STEPS','POZORUJ PO KROCÍCH')}</span><ol>{movement.phases.map((item,index)=><li key={index}><button aria-current={index===phase?'step':undefined} onClick={()=>choosePhase(index)}><span>{index+1}</span><span>{l(item.title)}</span></button></li>)}</ol><div className="dorn-phase-copy" aria-live="polite" aria-atomic="true"><h3>{l(movement.phases[phase].title)}</h3><p>{l(movement.phases[phase].body)}</p></div><div className="dorn-step-controls"><button disabled={phase===0} onClick={()=>choosePhase(phase-1)} aria-label={e('Previous phase','Předchozí fáze')}><ChevronLeft size={18}/></button><span>{phase+1} / 4</span><button disabled={phase===3} onClick={()=>choosePhase(phase+1)} aria-label={e('Next phase','Další fáze')}><ChevronRight size={18}/></button></div></aside></div>
   <div className="dorn-reading-grid"><section className="dorn-observation"><h3>{e('What to recognise','Co máš rozpoznat')}</h3><p>{l(movement.anatomy)}</p><h3>{e('Details to remember','Co si zapamatovat')}</h3><p>{l(movement.notice)}</p><div className="dorn-scope"><h4>{e('What this diagram does not show','Co toto schéma neukazuje')}</h4><p>{l(movement.omitted)}</p></div><details className="dorn-recall"><summary>{e('Try explaining it aloud','Zkus to vysvětlit nahlas')}</summary><p className="dorn-recall-question">{l(movement.question)}</p><details><summary>{e('Check your explanation','Ověřit vysvětlení')}</summary><p>{l(movement.answer)}</p></details></details></section></div>
  </article>
  <footer className="dorn-footer"><Info size={19}/><p>{e('Educational movement studies. The atlas geometry is adapted for illustrative joint motion; the animations have not received independent veterinary review.','Výukové pohybové studie. Geometrie atlasu je upravena pro ilustrační pohyb kloubů; animace nemají nezávislou veterinární odbornou recenzi.')}</p></footer>
 </section>;
}
