'use client';
import {useMemo,useState} from 'react';
import AnatomyScene from './scene';
import BookReading from './book-reading';
import {type Atlas,initial,type SceneState} from './anatomy';
import {type Language} from './i18n';
import {detailFor,structureName} from './study-notes';
import {shuffle} from './quiz-engine';

export const challengeIds=['MergedSkull','Jaw','Sacrum','Pelvis','C_1','C_2','L_1','Femoris_L','Femoris_R','Tibia_L','Tibia_R','Fibula_L','Fibula_R','Patella_L','Patella_R','Scapula_L','Scapula_R','humerus_L','humerus_R','Radius_L','Radius_R','Ulna_L','Ulna_R'];
export default function AnatomyChallenge({atlas,language,onClose}:{atlas:Atlas;language:Language;onClose:()=>void}){
 const e=(en:string,cs:string)=>language==='cs'?cs:en;
 const bones=useMemo(()=>atlas.parts.filter(p=>p.system==='bone'),[atlas]);
 const [deck,setDeck]=useState<string[]>([]),[index,setIndex]=useState(0),[answers,setAnswers]=useState<{id:string;correct:boolean}[]>([]),[checked,setChecked]=useState(false),[done,setDone]=useState(false);
 const [scene,setScene]=useState<SceneState>({...initial,systems:['bone']});
 const target=atlas.parts.find(p=>p.id===deck[index]);
 const note=target?detailFor(target,language):null;
 const start=(ids:string[])=>{setDeck(shuffle(ids).slice(0,10));setIndex(0);setAnswers([]);setChecked(false);setDone(false);setScene(s=>({...initial,systems:['bone'],reset:s.reset+1}));};
 const select=(id:string)=>{if(!checked&&bones.some(p=>p.id===id))setScene(s=>({...s,selected:id}));};
 const check=(skip=false)=>{if(checked||!target||(!skip&&!scene.selected))return;setAnswers(a=>a.length>index?a:[...a,{id:target.id,correct:!skip&&scene.selected===target.id}]);setChecked(true);};
 const next=()=>{if(index+1===deck.length){setDone(true);return;}setIndex(i=>i+1);setChecked(false);setScene(s=>({...initial,systems:['bone'],reset:s.reset+1}));};
 return <section className="anatomy-challenge">
  <header className="challenge-heading"><div><span className="eyebrow mint">{e('ACTIVE RECALL · 3D','AKTIVNÍ VYBAVOVÁNÍ · 3D')}</span><h2>{e('Find it on the dog','Najdi strukturu na psovi')}</h2></div><button onClick={onClose}>{e('Back to study','Zpět ke studiu')}</button></header>
  {!deck.length?<div className="challenge-intro"><p>{e('Find ten named bones on the unlabelled skeleton. Rotate the dog, select a piece, then check your answer. Left and right refer to the dog.','Najdi deset pojmenovaných kostí na kostře bez popisků. Otoč psa, vyber část a ověř odpověď. Levá a pravá strana se vztahují ke psovi.')}</p><p>{e('Keyboard: use the numbered selector to highlight pieces, then check. The numbers are anonymous model pieces, not anatomical labels.','Klávesnice: číselným výběrem zvýrazni jednotlivé části a poté ověř odpověď. Čísla označují anonymní části modelu, nikoli anatomické názvy.')}</p><button className="primary" onClick={()=>start(challengeIds.filter(id=>bones.some(p=>p.id===id)))}>{e('Start 10 challenges','Spustit 10 úloh')}</button><p className="muted">{e('This round lasts until you leave this mode or reload. Research model: confirm anatomy with your course materials.','Kolo trvá do opuštění tohoto režimu nebo obnovení stránky. Výzkumný model: anatomii ověřuj podle studijních materiálů.')}</p></div>:done?<div className="challenge-intro"><h3>{e('Round complete','Kolo dokončeno')}: {answers.filter(a=>a.correct).length} / {answers.length}</h3><ul>{answers.map(a=><li key={a.id}>{a.correct?'✓':'✕'} {structureName(atlas.parts.find(p=>p.id===a.id)!,language)}</li>)}</ul>{answers.some(a=>!a.correct)&&<button className="primary" onClick={()=>start(answers.filter(a=>!a.correct).map(a=>a.id))}>{e('Retry missed structures','Zopakovat chybné struktury')}</button>}<button onClick={()=>start(challengeIds.filter(id=>bones.some(p=>p.id===id)))}>{e('New round','Nové kolo')}</button></div>:target&&<div className="challenge-layout">
   <div className="challenge-model"><AnatomyScene atlas={atlas} language={language} state={scene} onSelect={select}/><div className="challenge-camera">{[['lateral','L'],['right','R'],['cranial','Cr'],['dorsal','D'],['three-quarter','¾']].map(([view,label])=><button key={view} aria-pressed={scene.view===view} onClick={()=>setScene(s=>({...s,view,reset:s.reset+1}))}>{language==='cs'&&label==='R'?'P':label}</button>)}</div></div>
   <div className="challenge-panel"><p>{e('Challenge','Úloha')} {index+1} / {deck.length}</p><h3>{e('Find','Najdi')}: {structureName(target,language)}</h3><p>{e('Drag to orbit. Scroll or pinch to zoom. Your selected piece is highlighted.','Tažením otáčej. Kolečkem nebo gestem přibližuj. Vybraná část je zvýrazněna.')}</p><label>{e('Select a numbered piece','Vyber očíslovanou část')}<select disabled={checked} value={scene.selected??''} onChange={ev=>select(ev.target.value)}><option value="">—</option>{bones.map((p,i)=><option key={p.id} value={p.id}>{e('Piece','Část')} {i+1}</option>)}</select></label>
   {!checked?<><button className="primary" disabled={!scene.selected} onClick={()=>check()}>{e('Check answer','Ověřit odpověď')}</button><button onClick={()=>check(true)}>{e('I don’t know','Nevím')}</button></>:<div aria-live="polite"><h3>{answers[index]?.correct?e('Correct','Správně'):e('Let’s review this one','Zopakuj si tuto strukturu')}</h3>{scene.selected&&<p>{e('Highlighted','Zvýrazněno')}: {structureName(atlas.parts.find(p=>p.id===scene.selected)!,language)}</p>}<button onClick={()=>setScene(s=>({...s,selected:target.id,isolate:!s.isolate,reset:s.reset+1}))}>{scene.isolate?e('Show in skeleton','Ukázat v kostře'):e('Isolate the answer','Izolovat odpověď')}</button><h4>{e('Location & relationships','Poloha a vztahy')}</h4><p>{note?.location}</p><h4>{e('Function & biomechanics','Funkce a biomechanika')}</h4><p>{note?.function}</p><BookReading profile={note?.profile} language={language}/>{note?.warning&&<p className="identity-warning">{note.warning}</p>}{note?.references.map(r=><a key={r.url} href={r.url} target="_blank" rel="noreferrer">{r.title} ↗</a>)}<button className="primary" onClick={next}>{index+1===deck.length?e('See results','Zobrazit výsledky'):e('Next structure','Další struktura')}</button></div>}
   </div>
  </div>}
 </section>;
}
