'use client';
import {useRef,useState} from 'react';
import {furtherTopics} from './further-data';
import {examModules,local} from './exam-data';
import type {Language} from './i18n';
import BookReading from './book-reading';
export default function FurtherStudy({language,onLesson,onPractical}:{language:Language;onLesson:(topic:string,criterion:string)=>void;onPractical?:()=>void}){
 const e=(en:string,cs:string)=>language==='cs'?cs:en;
 const [active,setActive]=useState(furtherTopics[0].id);
 const topic=furtherTopics.find(t=>t.id===active)!;
 const heading=useRef<HTMLHeadingElement>(null);
 return <section className="further-study"><span className="eyebrow mint">{e('9 ADDITIONAL STUDY TOPICS','9 ROZŠIŘUJÍCÍCH TÉMAT')}</span><h1>{e('Methods and foundations','Metody a souvislosti')}</h1><p className="muted">{e('Original study chapters linked to the exam syllabus. They are not proprietary course materials or additional official exam criteria. Provider descriptions explain terminology; they do not establish treatment efficacy.','Vlastní studijní kapitoly propojené s osnovou zkoušky. Nejde o skripta poskytovatelů ani další oficiální kritéria. Popisy poskytovatelů vymezují názvy, neprokazují účinnost léčby.')}</p>
  <nav className="further-menu" aria-label={e('Additional topics','Rozšiřující témata')}>{furtherTopics.map((t,i)=><button key={t.id} aria-current={active===t.id?'page':undefined} onClick={()=>{setActive(t.id);requestAnimationFrame(()=>{heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start'});});}}><span>{String(i+1).padStart(2,'0')}</span>{local(t.title,language)}</button>)}</nav>
  <article key={topic.id}><h2 ref={heading} tabIndex={-1}>{local(topic.title,language)}</h2><p className="further-lead">{local(topic.intro,language)}</p>{topic.sections.map((section,i)=><section className="theory-unit" key={i}><h3>{local(section.title,language)}</h3><p>{local(section.text,language)}</p></section>)}
  <aside className="theory-example"><h3>{e('Evidence and interpretation','Důkazy a jejich výklad')}</h3><p>{local(topic.evidence,language)}</p>{topic.sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{local(source.title,language)} ↗</a>)}</aside>
  <section className="exam-practice"><h3>{e('Rehearse your understanding','Nacvičte porozumění')}</h3><p>{local(topic.rehearsal,language)}</p>{onPractical&&<button className="quiz-link" onClick={onPractical}>{e('Open practical preparation','Otevřít praktickou přípravu')} →</button>}</section>
  <section className="exam-recall"><h3>{e('Answer before revealing','Odpovězte před odhalením')}</h3>{topic.quiz.map((q,i)=><details key={i}><summary>{local(q.question,language)}</summary><p>{local(q.answer,language)}</p></details>)}</section>
  <section className="practice-connections"><h3>{e('Related exam criteria','Související kritéria zkoušky')}</h3><div>{topic.criteria.map(id=>{const [moduleId,criterion]=id.split('.'),module=examModules.find(m=>m.id===moduleId)!;return <button key={id} onClick={()=>onLesson(moduleId,criterion)}>{local(module.title,language)} · {criterion.toUpperCase()} →</button>;})}</div></section>
  <BookReading topic={topic.bookTopic} language={language}/><p className="scope-note">{e('Clinical techniques require supervised training. These original notes have not undergone independent veterinary peer review.','Klinické techniky vyžadují výcvik pod dohledem. Vlastní poznámky neprošly nezávislou veterinární odbornou recenzí.')}</p></article>
 </section>;
}
