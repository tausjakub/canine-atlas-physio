import cs from './ui.cs.json';
export type Language='en'|'cs';
export const languageStorageKey='canine-atlas-language';
export function translate(language:Language,key:string,values:Record<string,string|number>={}){
 const text=language==='cs'?(cs as Record<string,string>)[key]:key;
 if(text===undefined)throw new Error(`Missing Czech interface translation: ${key}`);
 return text.replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??`{${name}}`));
}
export function normalizeSearch(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();}
