// @vitest-environment jsdom
import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import AuthorityAndRangeBindings from './AuthorityAndRangeBindings';
import MuseumSection from '../../components/MuseumSection';
import {bindOriginalCatalog} from './originalAdapter';

const catalog={
 id:71,catalogId:71,code:'GEN',name:'Generated',version:0,
 institution:{id:1,code:'G',name:'Generated'},
 capabilities:['catalog.read','item.read','item.inventory.write','item.professional.write'],
 inventoryWriteEnabled:true,
 professionalWriteEnabled:true,
 professionalRecordsEnabled:true
};
const hex=(c:string)=>c.repeat(64);
const reply=(body:unknown,version=0,status=200)=>new Response(JSON.stringify(body),{status,headers:{ETag:`"${version}"`,'Cache-Control':'no-store'}});
const choice=(id:string,key:string,code:string,label:string|null=null,kind='TEXT',sourceType='TEXT')=>({
 recordId:id,sourceSha256:hex('a'),rowHash:hex('b'),
 typedKey:{[key]:{kind,sourceType,javaType:'java.lang.String',value:code}},
 code,label,groupingCode:null
});

beforeEach(()=>{
 vi.stubEnv('VITE_ORIGINAL_SCOPED_TEST','true');
 vi.stubEnv('VITE_LOCAL_AUTH_ENABLED','false');
 bindOriginalCatalog(catalog,'SYNTHETIC_TOKEN');
});
afterEach(()=>{
 bindOriginalCatalog(null,null);
 vi.unstubAllGlobals();
 vi.unstubAllEnvs();
});

describe('Priority 2: AuthorityAndRangeBindings (Určil, GROUP, Author role, Fund, Subcollection, Inventory Range)',()=>{
 it('loads and saves inventory-range and authorities with source-choices, validation, and ETag propagation',async()=>{
  let version=0;
  let rangeState={lowerNumber:null as string|null,upperNumber:null as string|null,seriesRecordId:null as string|null};
  let rangePresent=false;
  let authState={determinedByText:null as string|null,authorRoleText:null as string|null,groupRecordId:null as string|null,fundRecordId:null as string|null,collectionRecordId:null as string|null,departmentRecordId:null as string|null,objectTypeRecordId:null as string|null};
  let authPresent=false;
  const f=vi.fn().mockImplementation((url:string,init:any={})=>{
   const u=new URL(String(url),'https://unit.invalid');
   if(u.pathname.endsWith('/curator-record/inventory-range')){
    if(init.method==='PUT'){
     expect(init.headers['If-Match']).toBe(`"${version}"`);
     const body=JSON.parse(init.body);
     rangeState={lowerNumber:String(body.lowerNumber),upperNumber:body.upperNumber===null?null:String(body.upperNumber),seriesRecordId:body.seriesRecordId};
     rangePresent=true;version++;
    }
    return Promise.resolve(reply({catalogId:71,itemId:101,itemVersion:version,section:'inventory-range',values:rangeState,hasCurrentAssertion:rangePresent,origin:'CURRENT_CURATOR_STATEMENT_NOT_SOURCE'},version));
   }
   if(u.pathname.endsWith('/curator-record/authorities')){
    if(init.method==='PUT'){
     expect(init.headers['If-Match']).toBe(`"${version}"`);
     authState=JSON.parse(init.body);
     authPresent=true;version++;
    }
    return Promise.resolve(reply({catalogId:71,itemId:101,itemVersion:version,section:'authorities',values:authState,hasCurrentAssertion:authPresent,origin:'CURRENT_CURATOR_STATEMENT_NOT_SOURCE'},version));
   }
   if(u.pathname.includes('/source-choices/series'))return Promise.resolve(reply({catalogId:71,kind:'series',items:[choice(hex('1'),'Rada_IR','R-1','Řada 1')],nextAfterId:null},version));
   if(u.pathname.includes('/source-choices/fund'))return Promise.resolve(reply({catalogId:71,kind:'fund',items:[choice(hex('3'),'Fond_FN','F-1','Fond 1')],nextAfterId:null},version));
   if(u.pathname.includes('/source-choices/collection'))return Promise.resolve(reply({catalogId:71,kind:'collection',items:[choice(hex('5'),'Podsb_PB','7','Podsbírka 7','INTEGER','BYTE')],nextAfterId:null},version));
   if(u.pathname.includes('/source-choices/group'))return Promise.resolve(reply({catalogId:71,kind:'group',items:[choice(hex('6'),'Skup_SK','SK-1','Skupina 1')],nextAfterId:null},version));
   if(u.pathname.includes('/source-choices/department'))return Promise.resolve(reply({catalogId:71,kind:'department',items:[choice(hex('4'),'Odd_OE','OD-1','Oddělení 1')],nextAfterId:null},version));
   if(u.pathname.includes('/source-choices/object-type'))return Promise.resolve(reply({catalogId:71,kind:'object-type',items:[choice(hex('7'),'Nazev_NZ','OB-1','Obraz')],nextAfterId:null},version));
   throw new Error('Unexpected URL: '+u.pathname);
  });
  vi.stubGlobal('fetch',f);
  const onSave=vi.fn();
  render(<AuthorityAndRangeBindings itemId={101} onSave={onSave}/>);
  await screen.findByRole('option',{name:'R-1 — Řada 1'});
  await screen.findByRole('option',{name:'F-1 — Fond 1'});

  // Invalid reversed range rejected before transport
  await userEvent.type(screen.getByLabelText('Dolní pořadové číslo'),'20');
  await userEvent.type(screen.getByLabelText('Horní pořadové číslo'),'10');
  await userEvent.click(screen.getByRole('button',{name:'Uložit rozsah a řadu'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Dolní pořadové číslo musí být menší nebo rovno hornímu');

  // Valid range + series save
  await userEvent.clear(screen.getByLabelText('Dolní pořadové číslo'));
  await userEvent.type(screen.getByLabelText('Dolní pořadové číslo'),'12');
  await userEvent.clear(screen.getByLabelText('Horní pořadové číslo'));
  await userEvent.type(screen.getByLabelText('Horní pořadové číslo'),'15');
  await userEvent.selectOptions(screen.getByLabelText('Inventární řada (číselník InvRady)'),hex('1'));
  await userEvent.click(screen.getByRole('button',{name:'Uložit rozsah a řadu'}));
  await waitFor(()=>expect(onSave).toHaveBeenCalledWith('"1"'));
  expect(rangeState).toEqual({lowerNumber:'12',upperNumber:'15',seriesRecordId:hex('1')});

  // Authorities save (Určil, Role autora, Fond, Podsbírka, Skupina, Oddělení, Předmět)
  await userEvent.type(screen.getByLabelText('Určil (současné kurátorské tvrzení)'),'Doc. GENERATED');
  await userEvent.selectOptions(screen.getByLabelText('Role autora (současné kurátorské tvrzení)'),'Škola / dílna');
  await userEvent.selectOptions(screen.getByLabelText('Fond (zdrojový číselník Fondy)'),hex('3'));
  await userEvent.selectOptions(screen.getByLabelText('Podsbírka (zdrojový číselník Podsbirky)'),hex('5'));
  await userEvent.selectOptions(screen.getByLabelText('Skupina / GROUP (zdrojový číselník Skupiny)'),hex('6'));
  await userEvent.selectOptions(screen.getByLabelText('Oddělení (zdrojový číselník Oddeleni)'),hex('4'));
  await userEvent.selectOptions(screen.getByLabelText('Předmět / Název (zdrojový číselník Nazvy)'),hex('7'));
  await userEvent.click(screen.getByRole('button',{name:'Uložit odborné vazby a role'}));
  await waitFor(()=>expect(onSave).toHaveBeenCalledWith('"2"'));
  expect(authState).toEqual({
   determinedByText:'Doc. GENERATED',
   authorRoleText:'Škola / dílna',
   fundRecordId:hex('3'),
   collectionRecordId:hex('5'),
   groupRecordId:hex('6'),
   departmentRecordId:hex('4'),
   objectTypeRecordId:hex('7'),
  });
 });
});

describe('Priority 3: Specialist Tabs (Reference, Manipulace, Akce, ISO) in MuseumSection',()=>{
 it.each([
  ['bibliography','reference','Reference — nativní klíč','Ref_RF','GEN-REF-1',{Ref_RF:null,Str_RF:null}],
  ['manipulation','manipulation','Typ manipulace','Typ_MN','Revize 2026',{Typ_MN:null,DatMan_MN:null,Kdo_MN:null,Stav_MN:null,Osetreni_MN:null,InvRev_MN:null,PopisSt_MN:null}],
  ['action','action','Prezentace','Prezentace_AK','Stálá expozice',{Poradi_AK:null,Prezentace_AK:null,Revers_AK:null,CKtlg_AK:null,Pozn_AK:null}],
  ['iso','iso','Kód ISO','KodISO_SO','ISO-99',{KodISO_SO:null,CharISO_SO:null,MatISO_SO:null,CenaISO_SO:null,MenaISO_SO:null,PovrchISO_SO:null,TvarISO_SO:null}],
 ] as const)('reads, edits, saves, and reloads specialist tab %s (%s) via scoped API',async(section,curatorSec,label,fieldKey,entered,initial)=>{
  let version=0;
  let stored:Record<string,string|null>={...initial};
  let present=true;
  const f=vi.fn().mockImplementation((url:string,init:any={})=>{
   const u=new URL(String(url),'https://unit.invalid');
   if(u.pathname.endsWith('/curator-record/'+curatorSec)){
    if(init.method==='PUT'){
     expect(init.headers['If-Match']).toBe(`"${version}"`);
     const body=JSON.parse(init.body);
     stored=Object.fromEntries(Object.entries(body).map(([k,v])=>[k,v===null?null:String(v)]));
     present=true;version++;
    }
    return Promise.resolve(reply({catalogId:71,itemId:101,itemVersion:version,section:curatorSec,values:stored,hasCurrentAssertion:present,origin:'CURRENT_CURATOR_STATEMENT_NOT_SOURCE'},version));
   }
   if(u.pathname.endsWith('/professional-records')){
    return Promise.resolve(reply({catalogId:71,itemId:101,itemVersion:version,semantics:'CURRENT_OWNED_RECORDS_NOT_SOURCE',items:[]},version));
   }
   throw new Error('Unexpected URL: '+u.pathname);
  });
  vi.stubGlobal('fetch',f);
  const editSession:any={itemId:101,etag:'"0"',scopedCurrent:{catalogId:71,etag:'"0"'}};
  const onSave=vi.fn();
  render(<MuseumSection itemId={101} section={section} editSession={editSession} onSave={onSave}/>);
  const input=await screen.findByLabelText(label);
  await userEvent.click(screen.getByRole('button',{name:'Upravit'}));
  expect(input).not.toBeDisabled();
  await userEvent.type(input,entered);
  await userEvent.click(screen.getByRole('button',{name:'Uložit záznam'}));
  expect(await screen.findByRole('status')).toHaveTextContent('Záznam uložen.');
  expect(stored[fieldKey]).toBe(entered);
  expect(editSession.etag).toBe('"1"');
  expect(onSave).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Současné kurátorské tvrzení · #0')).toBeInTheDocument();
 });
});

it('blocks input before the authoritative snapshot and preserves a reversed range draft across closing and reopening',async()=>{
 const values={lowerNumber:'1',upperNumber:null,seriesRecordId:null};let resolve!:(value:Response)=>void;let first=true;
 const f=vi.fn((url:string,init:any={})=>{
  if(String(url).includes('/curator-record/inventory-range')){
   if(init.method==='PUT')throw new Error('Reversed range must never reach transport');
   const body={catalogId:71,itemId:101,itemVersion:0,section:'inventory-range',values,hasCurrentAssertion:true,origin:'CURRENT_CURATOR_STATEMENT_NOT_SOURCE'};
   if(first){first=false;return new Promise<Response>(r=>{resolve=r;});}return Promise.resolve(reply(body));
  }
  return Promise.resolve(reply({catalogId:71,kind:'series',items:[],nextAfterId:null}));
 });vi.stubGlobal('fetch',f);const drafts:any={current:{}};
 const component=render(<AuthorityAndRangeBindings itemId={101} mode="range" drafts={drafts}/>);
 expect(screen.getByLabelText('Dolní pořadové číslo')).toBeDisabled();expect(screen.getByLabelText('Horní pořadové číslo')).toBeDisabled();
 resolve(reply({catalogId:71,itemId:101,itemVersion:0,section:'inventory-range',values,hasCurrentAssertion:true,origin:'CURRENT_CURATOR_STATEMENT_NOT_SOURCE'}));
 await waitFor(()=>expect(screen.getByLabelText('Dolní pořadové číslo')).toBeEnabled());await userEvent.clear(screen.getByLabelText('Dolní pořadové číslo'));await userEvent.type(screen.getByLabelText('Dolní pořadové číslo'),'20');await userEvent.type(screen.getByLabelText('Horní pořadové číslo'),'10');
 await userEvent.click(screen.getByRole('button',{name:'Uložit rozsah a řadu'}));expect(await screen.findByRole('alert')).toHaveTextContent('Dolní pořadové číslo musí být menší nebo rovno hornímu');expect(drafts.current.rangeBindings.dirty).toBe(true);
 component.unmount();render(<AuthorityAndRangeBindings itemId={101} mode="range" drafts={drafts}/>);await waitFor(()=>expect(screen.getByLabelText('Dolní pořadové číslo')).toBeEnabled());expect(screen.getByLabelText('Dolní pořadové číslo')).toHaveValue('20');expect(screen.getByLabelText('Horní pořadové číslo')).toHaveValue('10');expect(f.mock.calls.every(c=>c[1]?.method!=='PUT')).toBe(true);
});
