import {theoryChapters} from './theory-data';
import {examModules,local} from './exam-data';
import {criterionDepth} from './exam-depth';
import type {Language} from './i18n';
import {sitePath} from './site-path';
export function theorySearchText(topic:string){return JSON.stringify(theoryChapters[topic]||{});}
export default function TheoryChapter({topic,language}:{topic:string;language:Language}){
 const e=(en:string,cs:string)=>language==='cs'?cs:en;
 const chapter=theoryChapters[topic],module=examModules.find(m=>m.id===topic)!;
 const words=[local(chapter.lead,language),...chapter.units.flatMap(u=>u.paragraphs.map(p=>local(p,language))),...chapter.rows.flatMap(r=>[r.term,r.mechanism,r.meaning].map(p=>local(p,language))),local(chapter.example,language),...module.sections.flatMap(s=>[local(s.text,language),local(criterionDepth[topic][s.criteria],language)])].join(' ').split(/\s+/).length;
 return <section className="theory-chapter" aria-labelledby={`theory-${topic}`}>
  <div className="theory-intro"><span className="eyebrow mint">{e('DETAILED THEORY','PODROBNÁ TEORIE')}</span><h2 id={`theory-${topic}`}>{e('Understand the topic','Porozumějte tématu')}</h2><p>{local(chapter.lead,language)}</p><small>{e(`About ${Math.ceil(words/160)} min reading · allow extra time for recall and book study`,`Přibližně ${Math.ceil(words/160)} min čtení · přidejte čas na vybavování a studium knih`)}</small></div>
  <nav className="chapter-contents" aria-label={e('In this chapter','Obsah kapitoly')}>{chapter.units.map((unit,i)=><a key={i} href={`#theory-${topic}-${i}`}>{local(unit.title,language)}</a>)}<a href={`#theory-table-${topic}`}>{e('Compare the concepts','Porovnání pojmů')}</a><a href={`#criterion-${topic}-a`}>{e('Exam criteria and deeper reasoning','Kritéria zkoušky a souvislosti')}</a><a href={`#recall-${topic}`}>{e('Revision questions','Otázky k opakování')}</a></nav>
  {chapter.units.map((unit,i)=><section className="theory-unit" id={`theory-${topic}-${i}`} key={i}><h3>{local(unit.title,language)}</h3>{unit.paragraphs.map((p,j)=><p key={j}>{local(p,language)}</p>)}</section>)}
  <div className="theory-table-wrap" id={`theory-table-${topic}`} tabIndex={0} role="region" aria-label={e('Concept comparison table','Tabulka porovnání pojmů')}><table><caption>{e('Keep these distinctions clear','Rozlišujte tyto pojmy')}</caption><thead><tr><th scope="col">{e('Concept','Pojem')}</th><th scope="col">{e('Meaning / mechanism','Význam / mechanismus')}</th><th scope="col">{e('Clinical implication','Klinický význam')}</th></tr></thead><tbody>{chapter.rows.map((row,i)=><tr key={i}><th scope="row">{local(row.term,language)}</th><td>{local(row.mechanism,language)}</td><td>{local(row.meaning,language)}</td></tr>)}</tbody></table></div>
  <aside className="theory-example"><h3>{e('Worked example','Rozebraný příklad')}</h3><p>{local(chapter.example,language)}</p></aside>
  <p className="theory-reference"><a href={sitePath(`/?book=${chapter.reading.book}&page=${chapter.reading.page}`)} target="_blank" rel="noreferrer">{e('Continue in the related textbook section','Pokračovat v souvisejícím oddílu učebnice')} · {e('PDF page','strana PDF')} {chapter.reading.page} ↗</a><small>{e('Original explanatory synthesis, supported by the supplied rehabilitation textbooks and the topic references below. PDF page numbers differ from printed numbering.','Vlastní vysvětlující text opřený o dodané rehabilitační učebnice a zdroje tématu níže. Číslování PDF se liší od tištěných stran.')}</small></p>
 </section>;
}
