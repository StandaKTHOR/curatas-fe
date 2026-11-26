import {useEffect,useState} from 'react';
import {resolveApiUrl} from '../lib/api';
import {hasPrivateNoStore} from '../lib/privateResponsePolicy';
type Notice={enabled:boolean;startsAt:string|null;endsAt:string|null;message:string|null};
export function parseMaintenanceNotice(value:unknown):Notice{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid public notice');
 const n=value as Notice;if(Object.keys(n).length!==4||!['enabled','startsAt','endsAt','message'].every(k=>Object.hasOwn(n,k))||typeof n.enabled!=='boolean')throw new Error('Invalid public notice');
 const date=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
 if(n.enabled){if(!date(n.startsAt)||n.endsAt!==null&&(!date(n.endsAt)||Date.parse(n.endsAt)<Date.parse(n.startsAt!))||typeof n.message!=='string'||!n.message.trim()||n.message.length>1000)throw new Error('Invalid public notice');}
 else if(n.startsAt!==null||n.endsAt!==null||n.message!==null)throw new Error('Disabled notice must not expose config');
 return n;
}
export default function MaintenanceNotice(){
 const [notice,setNotice]=useState<Notice|null>(null);
 useEffect(()=>{const cancel=new AbortController();let request=0;
  const load=async()=>{const own=++request;try{const response=await fetch(resolveApiUrl('/api/auth/local/maintenance'),{method:'GET',credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.any([cancel.signal,AbortSignal.timeout(5000)])});if(!response.ok||!hasPrivateNoStore(response.headers))throw new Error('Unavailable notice');const text=await response.text();if(text.length>8192)throw new Error('Oversize notice');const next=parseMaintenanceNotice(JSON.parse(text));if(!cancel.signal.aborted&&own===request)setNotice(next);}catch{if(!cancel.signal.aborted&&own===request)setNotice(null);}};
  void load();const timer=window.setInterval(()=>void load(),60000);return()=>{cancel.abort();window.clearInterval(timer);};
 },[]);
 if(!notice?.enabled)return null;
 const format=(v:string)=>new Intl.DateTimeFormat('cs-CZ',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Prague'}).format(new Date(v));
 return <div role="status" aria-label="Plánovaná údržba"><strong>Plánovaná odstávka</strong><p>Začátek: <time dateTime={notice.startsAt!}>{format(notice.startsAt!)} (Europe/Prague)</time></p><p>{notice.endsAt?<>Předpokládaný konec: <time dateTime={notice.endsAt}>{format(notice.endsAt)} (Europe/Prague)</time></>:'Předpokládaný konec zatím není známý.'}</p><p>{notice.message}</p></div>;
}
