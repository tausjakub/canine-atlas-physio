'use client';
import {useEffect,useState} from 'react';
import type {Language} from './i18n';
export default function PrivateSession({language}:{language:Language}){
 const [enabled,setEnabled]=useState(false);
 useEffect(()=>{const abort=new AbortController();fetch('/_auth/session',{signal:abort.signal,cache:'no-store'}).then(async response=>{if(!response.ok)return;const data=await response.json() as {authenticated?:unknown};if(data.authenticated===true)setEnabled(true);}).catch(()=>{});return()=>abort.abort();},[]);
 return enabled?<form method="post" action="/_auth/logout"><button className="private-logout" type="submit">{language==='cs'?'Odhlásit se':'Log out'}</button></form>:null;
}
