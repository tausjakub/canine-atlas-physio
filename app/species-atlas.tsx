'use client';

import type {Language} from './i18n';
type Pair={en:string;cs:string};
const b=(cs:string,en:string):Pair=>({cs,en});
export type Species='dog'|'cat'|'rabbit';
export const speciesNames={dog:b('Pes','Dog'),cat:b('Kočka','Cat'),rabbit:b('Králík','Rabbit')};
export function SpeciesPicker({species,onChange,language}:{species:Species;onChange:(species:Species)=>void;language:Language}){
 return <nav className="species-picker" aria-label={language==='cs'?'Druh zvířete':'Animal species'}><span>{language==='cs'?'Anatomický atlas':'Anatomy atlas'}</span>{(['dog','cat','rabbit'] as const).map(s=><button key={s} aria-pressed={s===species} onClick={()=>onChange(s)}>{speciesNames[s][language]}</button>)}</nav>;
}
