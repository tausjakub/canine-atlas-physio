import {questions,questionById,type Question} from './quiz-data';
export const quizStorageKey='canine-atlas-quiz-v1';
export type Memory=Record<string,{seen:number;correct:number;review:boolean;lastAt:number}>;
export type Answer={questionId:string;choiceId:string;correct:boolean;unsure:boolean};
export type RunItem={questionId:string;order:string[]};
export type Run={items:RunItem[];answers:Answer[];cursor:number};
export function readMemory(raw:string|null):Memory{
 if(!raw)return {};const value=JSON.parse(raw);if(value?.version!==1||!value.items||typeof value.items!=='object'||Array.isArray(value.items))return {};
 const safe:Memory={};for(const [id,v] of Object.entries(value.items) as [string,any][]){if(questionById.has(id)&&v&&Number.isSafeInteger(v.seen)&&v.seen>=1&&v.seen<=1000000&&Number.isSafeInteger(v.correct)&&v.correct>=0&&v.correct<=v.seen&&typeof v.review==='boolean'&&Number.isFinite(v.lastAt)&&v.lastAt>=0)safe[id]={seen:v.seen,correct:v.correct,review:v.review,lastAt:v.lastAt};}return safe;
}
export function recordAnswer(memory:Memory,answer:Answer,now=Date.now()):Memory{
 const q=questionById.get(answer.questionId);if(!q||!q.choices.some(c=>c.id===answer.choiceId))return memory;
 const previous=memory[q.id],correct=answer.choiceId===q.correctId;
 return {...memory,[q.id]:{seen:(previous?.seen||0)+1,correct:(previous?.correct||0)+(correct?1:0),review:!correct||answer.unsure,lastAt:now}};
}
export function shuffle<T>(items:T[],random= Math.random):T[]{const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
export function poolFor(mode:string,topic:string,memory:Memory):Question[]{return questions.filter(q=>(mode==='pictures'?!!q.photo:mode==='review'?memory[q.id]?.review:!q.photo)&&(topic==='all'||q.topic===topic));}
export function createRun(pool:Question[],count:number,random=Math.random):Run{
 // Mixed sessions cycle through shuffled topics so the largest topic does not dominate.
 const groups=new Map<string,Question[]>();for(const q of shuffle(pool,random)){const group=groups.get(q.topic)||[];group.push(q);groups.set(q.topic,group);}
 const selected:Question[]=[];const topics=shuffle([...groups.keys()],random);
 while(selected.length<Math.min(count,pool.length)){for(const topic of topics){const q=groups.get(topic)!.pop();if(q)selected.push(q);if(selected.length>=Math.min(count,pool.length))break;}}
 return {items:selected.map(q=>({questionId:q.id,order:shuffle(q.choices.map(c=>c.id),random)})),answers:[],cursor:0};
}
export function submitAnswer(run:Run,choiceId:string,unsure:boolean):Run{
 if(run.answers[run.cursor])return run;const item=run.items[run.cursor],q=item&&questionById.get(item.questionId);if(!q||!q.choices.some(c=>c.id===choiceId))return run;
 return {...run,answers:[...run.answers,{questionId:q.id,choiceId,correct:q.correctId===choiceId,unsure}]};
}
export function scoreByTopic(answers:Answer[]){const result:Record<string,{correct:number;total:number}>={};for(const a of answers){const q=questionById.get(a.questionId);if(!q)continue;const row=result[q.topic]||{correct:0,total:0};row.total++;row.correct+=a.correct?1:0;result[q.topic]=row;}return result;}
