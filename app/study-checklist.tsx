'use client';
import {useEffect,useState} from 'react';
import {examModules,local} from './exam-data';
import type {Language} from './i18n';
export function parseChecklist(raw:string|null,validIds:readonly string[]):string[]{
 if(raw===null)return [];
 const parsed:unknown=JSON.parse(raw);
 if(!Array.isArray(parsed))throw new Error('Invalid checklist');
 return [...new Set(parsed.filter((id):id is string=>typeof id==='string'&&validIds.includes(id)))];
}
export function useChecklist(key:string,validIds:readonly string[]){
 const [checked,setChecked]=useState<string[]>([]),[ready,setReady]=useState(false),[error,setError]=useState(false);
 useEffect(()=>{try{setChecked(parseChecklist(localStorage.getItem(key),validIds));}catch{setError(true);}setReady(true);},[key,validIds]);
 const toggle=(id:string)=>{
  if(!ready||!validIds.includes(id))return;
  const next=checked.includes(id)?checked.filter(item=>item!==id):[...checked,id];
  setChecked(next);
  try{localStorage.setItem(key,JSON.stringify(next));setError(false);}catch{setError(true);}
 };
 return {checked,ready,error,toggle};
}
const criterionIds=examModules.flatMap(m=>m.sections.map(s=>`${m.id}.${s.criteria}`));
export default function StudyChecklist({topic,language}:{topic:string;language:Language}){
 const e=(en:string,cs:string)=>language==='cs'?cs:en;
 const {checked,ready,error,toggle}=useChecklist('canine-atlas-criterion-recall-v1',criterionIds);
 const module=examModules.find(m=>m.id===topic)!;
 return <section className="learning-checklist">
  <h2>{e('Can I explain it without notes?','Dokážu to vysvětlit bez poznámek?')}</h2>
  <p>{e('Tick after a closed-book explanation, including the limits and an example. Revisit anything uncertain. This records self-review, not assessed competence.','Označte po vysvětlení bez knihy včetně limitů a příkladu. K nejistým položkám se vraťte. Jde o vlastní opakování, nikoli ověřenou způsobilost.')}</p>
  <p className="checklist-count" aria-live="polite">{e(`${checked.length} / 58 criteria self-reviewed`,`${checked.length} / 58 kritérií samostatně zopakováno`)}</p>
  {module.sections.map(s=>{const id=`${topic}.${s.criteria}`;return <label key={id}><input type="checkbox" disabled={!ready} checked={checked.includes(id)} onChange={()=>toggle(id)}/><span><b>{s.criteria.toUpperCase()}</b> {local(s.title,language)}</span></label>;})}
  <small>{e('Saved in this browser; independent of quiz scores and topic review.','Uloženo v tomto prohlížeči, nezávisle na výsledcích testů a opakování témat.')}</small>
  {error&&<p role="status">{e('Saved progress could not be read or written. Changes may only last for this visit.','Uložený postup nelze načíst nebo zapsat. Změny mohou platit jen při této návštěvě.')}</p>}
 </section>;
}
