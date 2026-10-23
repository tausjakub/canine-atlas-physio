'use client';
import {sitePath} from './site-path';
import {useEffect,useState} from 'react';
import books from './library-data.json';
import {type Language} from './i18n';

export default function Library({language}:{language:Language}){
 const e=(en:string,cs:string)=>language==='cs'?cs:en;
 const [selected,setSelected]=useState<string|null>(null),[part,setPart]=useState(0);
 const [requestedPage,setRequestedPage]=useState<number|null>(null);
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search),b=books.find(b=>b.id===params.get('book')),page=Number(params.get('page'));
  if(b){
   const valid=Number.isInteger(page)&&page>=1&&page<=b.pages?page:1;
   setSelected(b.id);setPart(b.parts.findIndex(p=>valid>=p.start&&valid<=p.end));setRequestedPage(valid);
  }
 },[]);
 const book=books.find(b=>b.id===selected),section=book?.parts[part];
 function openPage(id:string,page=1){
  const target=books.find(b=>b.id===id);
  if(!target||!Number.isInteger(page)||page<1||page>target.pages)return;
  setSelected(id);setPart(target.parts.findIndex(p=>page>=p.start&&page<=p.end));setRequestedPage(page);
  const url=new URL(window.location.href);
  url.searchParams.set('view','library');url.searchParams.set('book',id);url.searchParams.set('page',String(page));
  window.history.replaceState(null,'',url);
 }
 function allBooks(){
  setSelected(null);setRequestedPage(null);
  const url=new URL(window.location.href);url.searchParams.delete('book');url.searchParams.delete('page');window.history.replaceState(null,'',url);
 }
 const category=(value:string)=>value==='astrophysics'?e('ASTROPHYSICS','ASTROFYZIKA'):e('VETERINARY REHABILITATION','VETERINÁRNÍ REHABILITACE');
 const sourceLanguage=(value:string)=>value==='cs'?e('Czech','česky'):e('English','anglicky');
 return <section className="book-library">
  <header><span className="eyebrow mint">{e('YOUR BOOKS','TVOJE KNIHY')}</span><h2>{e('Reading library','Knihovna')}</h2><p>{e('Choose a book. PDFs retain their original language and page content.','Vyber knihu. PDF zachovávají původní jazyk a obsah stran.')}</p></header>
  {!book?<div className="book-grid">{books.map((b,i)=><article key={b.id} className="book-card">
   <span className="book-number">{String(i+1).padStart(2,'0')}</span><small>{category(b.category)}</small><h3>{b.title}</h3><p>{b.author}</p><p>{b.pages} {e('PDF pages','stran PDF')} · {sourceLanguage(b.language)}{b.scanned?e(' · scanned pages',' · naskenované strany'):''}</p>
   <button className="primary" onClick={()=>openPage(b.id)}>{e('Read book','Číst dokument')} →</button>
  </article>)}</div>:section&&<div className="book-reader">
   <button className="book-back" onClick={allBooks}>← {e('All books','Všechny knihy')}</button><h3>{book.title}</h3><p>{book.author} · {sourceLanguage(book.language)}</p>
   <div className="book-toolbar">
    <button disabled={part===0} onClick={()=>openPage(book.id,book.parts[part-1].start)}>{e('Previous section','Předchozí část')}</button>
    <label>{e('PDF page range','Rozsah stran PDF')}<select value={part} onChange={ev=>openPage(book.id,book.parts[Number(ev.target.value)].start)}>{book.parts.map((p,i)=><option key={p.url} value={i}>{p.start}–{p.end} / {book.pages}</option>)}</select></label>
    <button disabled={part===book.parts.length-1} onClick={()=>openPage(book.id,book.parts[part+1].start)}>{e('Next section','Další část')}</button>
    <a href={sitePath(section.url)+'#page='+((requestedPage??section.start)-section.start+1)} target="_blank" rel="noreferrer">{e('Open PDF separately','Otevřít PDF samostatně')} ↗</a>
   </div>
   <form className="book-toolbar" onSubmit={ev=>{ev.preventDefault();openPage(book.id,Number(new FormData(ev.currentTarget).get('page')));}}>
    <label>{e('Go to PDF page','Přejít na stranu PDF')}<input key={`${book.id}-${requestedPage}`} name="page" type="number" min="1" max={book.pages} step="1" required defaultValue={requestedPage??section.start} aria-label={e('PDF page number','Číslo strany PDF')}/></label><button type="submit">{e('Go to page','Přejít na stranu')} →</button>
   </form>
   {requestedPage&&<p className="book-page-target">{e('Opening PDF page','Otevírá se strana PDF')} <strong>{requestedPage}</strong> · {e('Page within this section','Strana v této části')}: {requestedPage-section.start+1}</p>}
   <p className="book-help">{e('Page ranges follow the PDF file, including cover and front matter; printed page numbers may differ. Use the PDF toolbar to zoom. If the embedded reader is unavailable, open the PDF separately.','Rozsahy odpovídají stranám souboru PDF včetně obálky a úvodních stran; tištěné číslování se může lišit. Lišta PDF umožňuje přiblížení. Pokud se vložená čtečka nezobrazí, otevři PDF samostatně.')} {book.scanned?e('This manual consists of scanned images; searching or selecting text is unavailable.','Tato skripta tvoří naskenované obrázky; hledání ani označování textu v PDF není dostupné.'):e('Text can be searched within this section.','Text lze vyhledávat v této části.')} ({Math.ceil(section.bytes/1048576)} MB)</p>
   <iframe key={`${section.url}-${requestedPage}`} src={sitePath(section.url)+'#page='+((requestedPage??section.start)-section.start+1)+'&view=FitH'} title={`${book.title} · ${section.start}–${section.end}`} className="book-frame"/>
  </div>}
 </section>;
}
