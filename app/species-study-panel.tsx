import type {Language} from './i18n';
import type {Bilingual} from './exam-data';
export type SpeciesStudy={location:Bilingual;connections:Bilingual;nerve:Bilingual|null;difference:Bilingual;recall:Bilingual;answer:Bilingual;reference:string;depth:'deep'|'superficial'};
export default function SpeciesStudyPanel({study,language}:{study:SpeciesStudy;language:Language}){
 const e=(cs:string,en:string)=>language==='cs'?cs:en;
 return <section className="species-study-notes">
  <h3>{e('Poloha a rozpoznání','Location and identification')}</h3><p>{study.location[language]}</p>
  <h3>{e('Spojení a úponové oblasti','Connections and attachment regions')}</h3><p>{study.connections[language]}</p>
  {study.nerve&&<><h3>{e('Motorická inervace','Motor innervation')}</h3><p>{study.nerve[language]}</p></>}
  <h3>{e('Souvislosti pro studium pohybu','Movement study context')}</h3><p>{e('Sledujte vztah struktury ke kloubům v okolí. Pohyb v zatížené končetině se může lišit od izolovaného pohybu; název svalu sám o sobě nevysvětluje celou jeho úlohu. Změna polohy v atlasu ukazuje prostorový vztah, nikoli bezpečný rozsah pohybu živého zvířete.','Follow the structure’s relationship to neighbouring joints. Weight-bearing function may differ from isolated movement; a muscle’s name does not explain its entire role. Atlas poses demonstrate spatial relationships, not a safe range of motion for a living animal.')}</p>
  <details><summary>{e('Druhové souvislosti','Species context')}</summary><p>{study.difference[language]}</p></details>
  <div className="species-recall"><h3>{e('Zkus si odpovědět','Test your recall')}</h3><p>{study.recall[language]}</p><details><summary>{e('Zobrazit vysvětlení','Reveal explanation')}</summary><p>{study.answer[language]}</p></details></div>
  <a href={study.reference} target="_blank" rel="noreferrer">{e('Anatomický podklad k dalšímu studiu ↗','Anatomical reference for further study ↗')}</a>
 </section>;
}
