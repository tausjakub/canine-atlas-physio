'use client';
import {useEffect,useState} from 'react';
import themes from './themes.json';
import type {Language} from './i18n';
export const themeStorageKey='canine-atlas-theme-v1';
export function validTheme(value:unknown){return themes.some(t=>t.id===value)?String(value):'dark';}
export default function ThemePicker({language}:{language:Language}){
 const [theme,setTheme]=useState('dark'),[error,setError]=useState(false);
 useEffect(()=>{try{const saved=validTheme(localStorage.getItem(themeStorageKey));setTheme(saved);document.documentElement.dataset.theme=saved;}catch{setError(true);}},[]);
 const change=(value:string)=>{const next=validTheme(value);setTheme(next);document.documentElement.dataset.theme=next;try{localStorage.setItem(themeStorageKey,next);setError(false);}catch{setError(true);}};
 return <div className="theme-picker"><label htmlFor="atlas-theme">{language==='cs'?'Motiv':'Theme'}</label><select id="atlas-theme" value={theme} onChange={e=>change(e.target.value)}>{themes.map(t=><option key={t.id} value={t.id}>{t.icon} {t[language]}</option>)}</select>{error&&<small role="status">{language==='cs'?'Motiv nelze uložit.':'Theme could not be saved.'}</small>}</div>;
}
