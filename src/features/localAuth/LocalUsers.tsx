import {Link} from 'react-router-dom';
import {useCallback,useEffect,useState} from 'react';
import {useAuth} from '../../components/AuthContext';
import {useCatalog} from '../catalog/CatalogContext';
import {effectiveToken,localAuthEnabled,localRequest,LocalAuthError} from './localAuthClient';
import UserProfiles from './UserProfiles';

interface User {id:number;login:string;displayName:string;active:boolean;enabled:boolean;validFrom:string;validUntil:string|null;lockedUntil:string|null}
interface Grant {capability:string;active:boolean;valid_from:string;valid_until:string|null}
interface Detail {user:User;membership:{active:boolean;valid_from:string;valid_until:string|null}[];grants:Grant[];effectiveCapabilities?:string[]}
interface AuditRow {id:number;actor_id:number;target_id:number|null;event:string;occurred_at:string;capability:string|null;grant_active:boolean|null}

export default function LocalUsers(){
 const {selectedCatalog}=useCatalog(),{token,logout}=useAuth();
 if(!localAuthEnabled())return <p>Provozní autentizace není zapnutá.</p>;
 if(!token)return <p>Přihlaste se pro správu uživatelů.</p>;
 if(!selectedCatalog?.capabilities?.includes('catalog.grant.manage'))return <p>Správa vyžaduje explicitní oprávnění vybraného katalogu.</p>;
 return <Users key={`${token}:${selectedCatalog.id}`} catalog={selectedCatalog.id} token={token} logout={logout}/>;
}

function Users({catalog,token,logout}:{catalog:number;token:string;logout:()=>void}){
 const [rows,setRows]=useState<User[]>([]),[detail,setDetail]=useState<Detail|null>(null),[login,setLogin]=useState(''),[name,setName]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[resetToken,setResetToken]=useState(''),[from,setFrom]=useState(''),[until,setUntil]=useState(''),[more,setMore]=useState(false);
 const [displayName,setDisplayName]=useState('');
 const [auditRows,setAuditRows]=useState<AuditRow[]>([]),[auditMore,setAuditMore]=useState(false);
 const root=`/api/v2/catalogs/${catalog}/users`;
 const fail=useCallback((e:unknown)=>{setError(e instanceof Error?e.message:'Požadavek se nezdařil.');if(e instanceof LocalAuthError&&[401,403].includes(e.status)){setRows([]);setDetail(null);setResetToken('');setAuditRows([]);if(e.status===401)logout();}},[logout]);
 const load=useCallback(async(after=0)=>{setBusy(true);try{const next=await localRequest(`${root}?afterId=${after}`,undefined,effectiveToken(token)) as User[];setRows(old=>after?[...old,...next]:next);setMore(next.length===100);}catch(e){fail(e);}finally{setBusy(false);}},[root,token,fail]);
 const loadAudit=useCallback(async(after=0)=>{setBusy(true);try{const next=await localRequest(`${root}/audit?afterId=${after}`,undefined,effectiveToken(token)) as AuditRow[];setAuditRows(old=>after?[...old,...next]:next);setAuditMore(next.length===100);}catch(e){fail(e);}finally{setBusy(false);}},[root,token,fail]);
 useEffect(()=>{const controller=new AbortController();void localRequest(root,undefined,effectiveToken(token),'GET',controller.signal).then((next:User[])=>{if(!controller.signal.aborted){setRows(next);setMore(next.length===100);}}).catch(e=>{if(!controller.signal.aborted)fail(e);});return()=>controller.abort();},[root,token,fail]);
 async function select(id:number){setError('');setResetToken('');setDetail(null);setBusy(true);try{const d=await localRequest(`${root}/${id}`,undefined,effectiveToken(token)) as Detail;setDetail(d);setDisplayName(d.user.displayName);setFrom(d.user.validFrom);setUntil(d.user.validUntil??'');}catch(e){fail(e);}finally{setBusy(false);}}
 async function create(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{await localRequest(root,{login,displayName:name},effectiveToken(token));setLogin('');setName('');await load();}catch(e){fail(e);}finally{setBusy(false);}}
 async function change(path:string,body:unknown,method='POST'){
  if(!detail||!window.confirm('Potvrdit administrativní změnu tohoto uživatele?'))return;
  setError('');setBusy(true);setResetToken('');try{const result=await localRequest(`${root}/${detail.user.id}/${path}`,body,effectiveToken(token),method);await select(detail.user.id);await load();if(result?.resetToken)setResetToken(result.resetToken);}catch(e){fail(e);}finally{setBusy(false);}
 }
 function validity(active:boolean){return {from:new Date(from).toISOString(),until:until?new Date(until).toISOString():null,active};}
 const writeGrants=detail?.grants.filter(g=>['item.inventory.write','item.professional.write'].includes(g.capability)&&g.active)??[];
 return <article aria-label="Správa uživatelů"><h1>Uživatelé katalogu</h1>{error&&<p role="alert">{error}</p>}{busy&&<p role="status">Zpracovávám…</p>}
 <form onSubmit={create}><label>Nové uživatelské jméno<input maxLength={100} pattern="[a-z0-9][a-z0-9._@-]{2,99}" value={login} onChange={e=>setLogin(e.target.value)} required/></label><label>Zobrazované jméno<input maxLength={100} value={name} onChange={e=>setName(e.target.value)} required/></label><button disabled={busy}>Vytvořit neaktivní účet</button></form>
 <ul>{rows.map(u=><li key={u.id}><button disabled={busy} onClick={()=>void select(u.id)}>{u.login} — {u.displayName}</button> {u.active&&u.enabled?'Aktivní':'Neaktivní'}</li>)}</ul>{more&&<button onClick={()=>void load(rows.at(-1)?.id??0)} disabled={busy}>Další uživatelé</button>}
 {detail&&<section aria-label="Detail uživatele"><h2>{detail.user.login}</h2><p>Stav: {detail.user.active&&detail.user.enabled?'Aktivní':'Neaktivní'}</p><p>Uzamčeno do: {detail.user.lockedUntil??'Neuzamčeno'}</p>
 <label>Zobrazované jméno uživatele<input value={displayName} maxLength={100} onChange={e=>setDisplayName(e.target.value)}/></label><button disabled={busy||!displayName.trim()||displayName===detail.user.displayName} onClick={()=>void change('identity',{displayName,expectedDisplayName:detail.user.displayName},'PUT')}>Uložit zobrazované jméno</button>
 <label>Platnost od (ISO UTC)<input value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Platnost do (ISO UTC, prázdné bez konce)<input value={until} onChange={e=>setUntil(e.target.value)}/></label>
 <button disabled={busy} onClick={()=>{try{void change('state',validity(true),'PUT');}catch{setError('Zadejte platný ISO čas.');}}}>Aktivovat účet</button><button disabled={busy} onClick={()=>{try{void change('state',validity(false),'PUT');}catch{setError('Zadejte platný ISO čas.');}}}>Deaktivovat účet</button>
 <p>Členství: {detail.membership[0]?.active?'Aktivní':'Neaktivní'}</p>
 <p>Platnost členství: {detail.membership[0]?.valid_from??'Nenastavena'} — {detail.membership[0]?.valid_until??'Bez konce'}</p>
 <UserProfiles catalog={catalog} userId={detail.user.id} token={token} from={from} until={until} effective={detail.effectiveCapabilities??[]} onChanged={async()=>{await select(detail.user.id);await load();}} onFatal={fail}/>
 {[true,false].map(active=><button key={String(active)} disabled={busy} onClick={()=>{try{void change('membership',validity(active),'PUT');}catch{setError('Zadejte platný ISO čas.');}}}>{active?'Povolit členství':'Odebrat členství'}</button>)}
 <fieldset><legend>Explicitní čtecí oprávnění</legend>{['catalog.read','item.read','dictionary.read'].map(cap=><div key={cap}><span>{cap}: {detail.grants.find(g=>g.capability===cap)?.active?'Povoleno':'Nepovoleno'}</span>{[true,false].map(active=><button key={String(active)} disabled={busy} onClick={()=>{try{void change(`grants/${cap}`,validity(active),'PUT');}catch{setError('Zadejte platný ISO čas.');}}}>{active?'Přiřadit':'Odebrat'} {cap}</button>)}</div>)}</fieldset>
 {writeGrants.length>0&&<fieldset><legend>Redukce zápisových oprávnění (pouze odebrání)</legend>{writeGrants.map(g=><div key={g.capability}><span>{g.capability}: Povoleno (aktivace pouze offline)</span><button disabled={busy} onClick={()=>{try{void change(`grants/${g.capability}`,validity(false),'PUT');}catch{setError('Zadejte platný ISO čas.');}}}>Odebrat {g.capability}</button></div>)}</fieldset>}
 <button disabled={busy} onClick={()=>void change('reset',{})}>Vydat jednorázový reset</button><button disabled={busy} onClick={()=>void change('revoke',{})}>Zneplatnit všechna přihlášení</button>
 {resetToken&&<aside><p>Jednorázový token předejte soukromým ověřeným kanálem. Platí 15 minut.</p><Link to="/login?reset=1">Nastavit heslo jednorázovým tokenem</Link><output aria-label="Jednorázový reset token">{resetToken}</output><button onClick={()=>setResetToken('')}>Skrýt token</button></aside>}
 </section>}
 <details><summary>Administrativní audit účtů a oprávnění katalogu</summary><button type="button" disabled={busy} onClick={()=>void loadAudit(0)}>Načíst administrativní audit</button>
 <ul aria-label="Administrativní audit katalogu">{auditRows.map(a=><li key={a.id}>{a.occurred_at} — aktér #{a.actor_id} → cíl #{a.target_id??'—'} — {a.event}{a.capability?` (${a.capability}: ${a.grant_active?'Povoleno':'Odebráno'})`:''}</li>)}{auditRows.length===0&&<li>Audit nebyl načten nebo neobsahuje záznamy.</li>}</ul>
 {auditMore&&<button type="button" disabled={busy} onClick={()=>void loadAudit(auditRows.at(-1)?.id??0)}>Další záznamy auditu</button>}
 </details></article>;
}
