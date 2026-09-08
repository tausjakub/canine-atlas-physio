import data from './study-data.json';
import dataCs from './study-data.cs.json';
import {type Part,displayName} from './anatomy';
import type {Language} from './i18n';
import {ligamentDetail} from './ligaments';
export type Source={title:string;url:string};
export type StudyProfile={title:string;overview:string;location:string;attachments:string;function:string;nerve:string;physio:string;recall:string;sources:string[]};
export type PieceNote={profile:string;side:string;modelNote:string;warning:string};
const sources:Record<string,Source>=data.sources;
const profiles:Record<string,StudyProfile>=data.profiles;
const pieces:Record<string,PieceNote>=data.parts;
export const noteCoverage={pieces:Object.keys(pieces).length,profiles:Object.keys(profiles).length,qualified:Object.values(pieces).filter(p=>p.warning).length};
export function detailFor(part:Part,language:Language='en'){
 const guide=ligamentDetail(part,language);if(guide)return guide;
 const localized=language==='cs'?dataCs:data;
 const localPieces:Record<string,PieceNote>=localized.parts,localProfiles:Record<string,StudyProfile>=localized.profiles,localSources:Record<string,Source>=localized.sources;
 const piece=localPieces[part.id];
 if(!piece||!localProfiles[piece.profile])throw new Error(`Missing study note: ${part.id}`);
 return {...localProfiles[piece.profile],...piece,references:localProfiles[piece.profile].sources.map(id=>localSources[id])};
}
export function structureName(part:Part,language:Language){
 const guide=ligamentDetail(part,language);if(guide)return `${guide.title} · ${guide.side}`;
 if(language==='en')return displayName(part.id);
 const note=detailFor(part,language);
 const suffix=part.id.match(/(?:digiti_|metacarpale_)([IV]+)/)?.[1];
 const level=part.id.match(/^(?:C|L|Ca)_(\d+)$/)?.[1];
 const fragment=part.id.match(/(?:\(2\)|\.001|_(\d+))$/);
 return [note.title,note.side==='Vlevo'||note.side==='Vpravo'?note.side:'',suffix?`prst ${suffix}`:'',level?`${part.id.split('_')[0]}${level}`:fragment?`část ${fragment[1]??2}`:''].filter(Boolean).join(' · ');
}
