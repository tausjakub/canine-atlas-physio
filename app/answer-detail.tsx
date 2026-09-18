import {criterionDepth,topicCases} from './exam-depth';
import type {Language} from './i18n';
export default function AnswerDetail({topic,criterion,language}:{topic:string;criterion?:string;language:Language}){
 const e=(en:string,cs:string)=>language==='cs'?cs:en;
 const depth=criterion?criterionDepth[topic]?.[criterion]:undefined,example=topicCases[topic];
 if(!depth&&!example)return null;
 return <div className="answer-detail">
  {depth&&<><h4>{e('Understand the connection','Pochopte souvislosti')}</h4><p>{depth[language]}</p></>}
  {example&&<><h4>{e('A common mistake in this topic','Častá chyba v tomto tématu')}</h4><p className="answer-pitfall">{example.pitfall[language]}</p><details><summary>{e('Apply it to a related case','Použití v souvisejícím případu')}</summary><p><strong>{example.question[language]}</strong></p><p>{example.answer[language]}</p></details></>}
  <p className="answer-practice">{e('Try saying the answer in your own words: explain the principle, connect it to an example and state what extra information you would need. Then compare your explanation with the lesson.','Zkuste odpověď vlastními slovy: vysvětlete princip, propojte jej s příkladem a řekněte, jaké další informace byste potřebovali. Potom své vysvětlení porovnejte s lekcí.')}</p>
 </div>;
}
