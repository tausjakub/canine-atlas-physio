import data from './study-data.json';
import type {Part} from './anatomy';
export type Source={title:string;url:string};
export type StudyProfile={title:string;overview:string;location:string;attachments:string;function:string;nerve:string;physio:string;recall:string;sources:string[]};
export type PieceNote={profile:string;side:string;modelNote:string;warning:string};
const sources:Record<string,Source>=data.sources;
const profiles:Record<string,StudyProfile>=data.profiles;
const pieces:Record<string,PieceNote>=data.parts;
export const noteCoverage={pieces:Object.keys(pieces).length,profiles:Object.keys(profiles).length,qualified:Object.values(pieces).filter(p=>p.warning).length};
export function detailFor(part:Part){
 const piece=pieces[part.id];
 if(!piece||!profiles[piece.profile])throw new Error(`Missing study note: ${part.id}`);
 return {...profiles[piece.profile],...piece,references:profiles[piece.profile].sources.map(id=>sources[id])};
}
