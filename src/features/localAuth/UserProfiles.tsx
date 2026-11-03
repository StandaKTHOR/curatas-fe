import {useEffect,useState} from 'react';
import {effectiveToken,localRequest,LocalAuthError} from './localAuthClient';

interface Profile {id:string;name:string;description:string;capabilities:string[];plannedInactive:string[];restrictions:string[];delegable:boolean}
interface Catalog {version:string;profiles:Profile[]}
interface Preview {profile:Profile;effectiveCapabilities:string[];additions:string[];blockers:string[];expectedState:string;applicable:boolean}
interface Audit {id:number;event:string;occurred_at:string;capability:string|null;grant_active:boolean|null}
export const capabilityName=(cap:string)=>({'catalog.read':'Otevření katalogu','item.read':'Čtení předmětů a odborných údajů','dictionary.read':'Čtení číselníků','catalog.grant.manage':'Správa přístupů (vyžaduje stewarda)','item.write':'Editace předmětů — neaktivní','item.inventory.write':'Inventární editace předmětů','item.professional.write':'Odborná kurátorská editace','dictionary.write':'Editace číselníků — neaktivní','catalog.access.delegate':'Časově omezené sdílení katalogu','catalog.audit.read':'Forenzní audit katalogu'}[cap]??'Nepodporované oprávnění');

export default function UserProfiles({catalog,userId,token,from,until,effective,onChanged,onFatal}:{catalog:number;userId:number;token:string;from:string;until:string;effective:string[];onChanged:()=>Promise<void>;onFatal:(e:unknown)=>void}){
 const root=`/api/v2/catalogs/${catalog}/users`;
 const [definitions,setDefinitions]=useState<Catalog|null>(null),[selected,setSelected]=useState('PROFILE_VIEWER'),[preview,setPreview]=useState<Preview|null>(null),[audit,setAudit]=useState<Audit[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const controller=new AbortController();void Promise.all([localRequest(`${root}/profiles`,undefined,effectiveToken(token),'GET',controller.signal),localRequest(`${root}/audit?userId=${userId}`,undefined,effectiveToken(token),'GET',controller.signal)]).then(([d,a]:[Catalog,Audit[]])=>{if(!controller.signal.aborted){setDefinitions(d);setAudit(a);}}).catch(e=>{if(!controller.signal.aborted){setError('Profily nebo audit nelze načíst.');if(e instanceof LocalAuthError&&[401,403,404].includes(e.status))onFatal(e);}});return()=>controller.abort();},[root,userId,token,onFatal]);
 useEffect(()=>setPreview(null),[selected,from,until]);
 const profile=definitions?.profiles.find(p=>p.id===selected);
 async function action(apply:boolean){
  if(!definitions||apply&&(!preview?.applicable||!window.confirm('Přiřadit pouze zobrazená čtecí oprávnění? Budoucí editace zůstanou vypnuté.')))return;
  setBusy(true);setError('');
  try{const body={version:definitions.version,profileId:selected,from:new Date(from).toISOString(),until:until?new Date(until).toISOString():null,...(apply?{expectedState:preview?.expectedState}:{})};const result=await localRequest(`${root}/${userId}/${apply?'profile':'profile-preview'}`,body,effectiveToken(token),apply?'PUT':'POST') as Preview;setPreview(result);if(apply)await onChanged();}
  catch(e){setPreview(null);setError(e instanceof LocalAuthError&&e.status===409?'Oprávnění se změnila. Načtěte znovu detail a náhled.':'Náhled nebo přiřazení nebylo povoleno.');if(e instanceof LocalAuthError&&[401,403,404].includes(e.status))onFatal(e);}
  finally{setBusy(false);}
 }
 return <section aria-label="Profilové šablony"><h3>Profily a účinná oprávnění</h3>
 <p>Profil je šablona. Rozhodují aktuální oprávnění a členství; název profilu sám přístup neuděluje.</p>
 <p>Budoucí editace jsou plánované a neaktivní. Vytváření, import a zápisy zůstávají vypnuté.</p>
 <ul aria-label="Účinná oprávnění">{effective.map(cap=><li key={cap}>{capabilityName(cap)}</li>)}{effective.length===0&&<li>Žádná účinná oprávnění</li>}</ul>
 {error&&<p role="alert">{error}</p>}
 {!definitions?<p role="status">Načítám profily…</p>:<><label>Profilová šablona<select value={selected} disabled={busy} onChange={e=>setSelected(e.target.value)}>{definitions.profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
 {profile&&<><p>{profile.description}</p><ul>{profile.capabilities.map(cap=><li key={cap}>{capabilityName(cap)}</li>)}</ul><ul>{profile.restrictions.map(r=><li key={r}>{r}</li>)}</ul>{profile.plannedInactive.length>0&&<p>Plánované / neaktivní: {profile.plannedInactive.map(capabilityName).join(', ')}</p>}</>}
 <button disabled={busy} onClick={()=>void action(false)}>Zobrazit náhled oprávnění</button>
 {preview&&<div aria-label="Náhled změn"><p>Šablona přidává nebo obnovuje pouze uvedené čtení; jiná explicitní práva neodebírá.</p><p>Nově účinné: {preview.additions.map(capabilityName).join(', ')||'Beze změny čtení'}</p>{preview.blockers.length>0&&<p role="status">Nelze přiřadit: správce musí mít delegovatelná práva, platné členství a nesmí měnit vlastní účet. Správce přístupů vyžaduje offline schválení.</p>}<button disabled={busy||!preview.applicable} onClick={()=>void action(true)}>Potvrdit čtecí šablonu</button></div>}</>}
 <h3>Poslední administrativní změny</h3><ul aria-label="Historie oprávnění">{audit.map(a=><li key={a.id}>{a.occurred_at} — {a.event}{a.capability&&` — ${capabilityName(a.capability)}: ${a.grant_active?'Přiřazeno':'Odebráno'}`}</li>)}{audit.length===0&&<li>Zatím bez změn</li>}</ul>
 </section>;
}
