import {render,screen,waitFor,fireEvent,cleanup} from '@testing-library/react';
import {useState} from 'react';
import {afterEach,it,expect,vi} from 'vitest';
import {bindOriginalCatalog} from './originalAdapter';
import {useManagedAuthorities} from './useManagedAuthorities';
import {HistoricalOptions,historicalPickerMessage} from './historicalSelection';
import {historicalVocabularyTables} from '../scoped/scopedApi';
const types=['SUBJECT','OBJECT_TYPE','FUND','COLLECTION','AUTHOR','AUTHOR_ROLE','GROUP','LOCALITY','COUNTRY'] as const;
const source=(type:string)=>({recordId:'a'.repeat(64),sourceSha256:'b'.repeat(64),rowHash:'c'.repeat(64),occurrence:'1',table:historicalVocabularyTables[type],typedKey:null,code:'Ž1',label:'Žluťoučká hodnota',groupingCode:null});
afterEach(()=>{cleanup();bindOriginalCatalog(null,null);vi.unstubAllGlobals();vi.unstubAllEnvs();});
function Picker({itemId}:{itemId?:number}){
 const managed=useManagedAuthorities(itemId,itemId?'"0"':undefined,false,()=>{},itemId?undefined:{values:{},onChange:()=>{}});
 const [selected,setSelected]=useState('');
 return <>{types.map(type=><div key={type}><input aria-label={'Hledat '+type} disabled={!managed.ready} value={managed.query(type)} onChange={e=>managed.search(type,e.target.value)}/><select aria-label={type} value={selected} onChange={e=>{const ref=managed.historicalChoices(type).find(v=>'demus:'+v.recordId===e.target.value);if(ref)setSelected('demus:'+ref.recordId);}}><option value="">prázdné</option><HistoricalOptions items={managed.historicalChoices(type)}/></select></div>)}{managed.error&&<p role="alert">{managed.error}</p>}</>;
}
it.each([undefined,3])('initializes real selectable source identities before typing, then searches in %s mode',async itemId=>{
 vi.stubEnv('VITE_MANAGED_AUTHORITIES_ENABLED','true');vi.stubEnv('VITE_ORIGINAL_SCOPED_TEST','true');
 bindOriginalCatalog({id:71,code:'G',name:'Generated',version:0,institution:{id:1,code:'G',name:'Generated'},capabilities:['catalog.read','item.read','dictionary.read','item.professional.write'],historicalDictionariesEnabled:true,historicalAssignmentsEnabled:true} as any,'generated');
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
  const u=new URL(url,'http://localhost'),type=u.pathname.split('/dictionaries/')[1]?.split('/')[0];let body:unknown;
  if(u.pathname.endsWith('/references'))body={catalogId:71,itemId:3,itemVersion:0,items:[]};
  else if(u.pathname.endsWith('/historical'))body={catalogId:71,type,sourceSha256:'b'.repeat(64),semantics:'IMMUTABLE_DEMUS_VOCABULARY_NOT_CURRENT_UUID_V1',state:type==='CUSTODIAN'?'MAPPING_AMBIGUOUS':'AVAILABLE',items:['CUSTODIAN','CLASSIFICATION'].includes(type)||u.searchParams.get('q')==='missing'?[]:[source(type)],nextAfterId:null};
  else if(u.pathname.endsWith('/values'))body={items:[],nextAfterId:null};
  else body={type,ownership:'CATALOG_CREATED_ONLY',parentSupport:'EXPLICIT_SAME_TYPE',operations:['read']};
  return new Response(JSON.stringify(body),{headers:{ETag:'"0"','Cache-Control':'no-store, no-store'}});
 }));
 render(<Picker itemId={itemId}/>);
 for(const type of types){await waitFor(()=>expect(screen.getByLabelText(type).querySelector('option[value="demus:'+source(type).recordId+'"]')).not.toBeNull());
  fireEvent.change(screen.getByLabelText('Hledat '+type),{target:{value:'Žluť'}});
  await waitFor(()=>expect(screen.getByLabelText(type).querySelector('option[value="demus:'+source(type).recordId+'"]')).not.toBeNull());
  expect(vi.mocked(fetch).mock.calls.some(([url])=>String(url).includes('/'+type+'/historical?')&&new URL(String(url),'http://localhost').searchParams.get('q')==='Žluť')).toBe(true);
  fireEvent.change(screen.getByLabelText(type),{target:{value:'demus:'+source(type).recordId}});expect(screen.getByLabelText(type)).toHaveValue('demus:'+source(type).recordId);
 }
 fireEvent.change(screen.getByLabelText('Hledat SUBJECT'),{target:{value:'missing'}});
 await waitFor(()=>expect(screen.getByLabelText('SUBJECT').querySelector('optgroup')).toBeNull());
 expect(vi.mocked(fetch).mock.calls.every(([,init])=>!init?.method||init.method==='GET')).toBe(true);
});
it('does not render an empty group or promise unavailable custodian/classification values',()=>{
 const {container}=render(<select><HistoricalOptions items={[]}/></select>);expect(container.querySelector('optgroup')).toBeNull();
 expect(historicalPickerMessage('CUSTODIAN','MAPPING_AMBIGUOUS',0,'')).toContain('odborně blokováno');
 expect(historicalPickerMessage('CLASSIFICATION','AVAILABLE',0,'')).toContain('nemá položky');
 expect(historicalPickerMessage('SUBJECT','AVAILABLE',0,'x')).toContain('neodpovídá hledání');
});

it.each(['SOURCE_PARENT_MISSING','AMBIGUOUS_CATALOG_SOURCE','SOURCE_TABLE_UNAVAILABLE','UNKNOWN'])('shows curator wording while retaining source status in the API: %s',state=>{const message=historicalPickerMessage('FUND',state,0,'');expect(message).not.toContain(state);expect(message).not.toContain('nemá položky');});
