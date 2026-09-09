import books from './library-data.json';
import {sitePath} from './site-path';
import mapping from './book-reading-data.json';
import {type Language} from './i18n';
type Reading={book:string;page:number;term:string;kind:string};
export function readingsFor(profile?:string,topic?:string):Reading[]{
 if(topic)return (mapping.topics as Record<string,Reading[]>)[topic]||[];
 if(profile?.startsWith('guide_')){
  const page=profile.includes('elbow')?78:profile.includes('sacrotuberous')?79:profile.includes('nuchal')?59:80;
  return [{book:'canine-rehabilitation',page,term:'Ligament anatomy',kind:'section'}];
 }
 return profile?(mapping.profiles as Record<string,Reading[]>)[profile]||[]:[];
}
export default function BookReading({profile,topic,language}:{profile?:string;topic?:string;language:Language}){
 const e=(en:string,cs:string)=>language==='cs'?cs:en;
 const refs=readingsFor(profile,topic);
 return <section className="book-reading-links"><h3>{e('Read in your books','Přečíst v knihách')}</h3><p>{refs.length?e('Related reading. Page numbers below refer to the PDF file, not the printed numbering. Opens in a new tab so you keep your study place.','Související četba. Čísla níže označují strany souboru PDF, nikoli tištěné číslování. Otevře se v nové kartě, takže neztratíš místo ve studiu.'):e('No specific page match is indexed for this model piece. You can start with the general canine anatomy chapter.','Pro tuto část modelu není přiřazena konkrétní stránka. Můžeš začít obecným přehledem anatomie psa.')}</p>
 {(refs.length?refs:[{book:'canine-rehabilitation',page:52,term:'Canine anatomy',kind:'overview'}]).map(r=>{const book=books.find(b=>b.id===r.book)!;return <a key={`${r.book}-${r.page}`} href={sitePath(`/?book=${encodeURIComponent(r.book)}&page=${r.page}`)} target="_blank" rel="noreferrer"><strong>{book.title}</strong><span>{r.kind==='match'?e('Mentions','Zmiňuje'):r.kind==='overview'?e('General overview','Obecný přehled'):e('Related section','Související oddíl')}: {r.term}</span><b>{e('PDF page','Strana PDF')} {r.page} ↗</b></a>;})}
 </section>;
}
