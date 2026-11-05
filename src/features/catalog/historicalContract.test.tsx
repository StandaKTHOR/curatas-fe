import {render,screen,waitFor,cleanup,fireEvent,renderHook,act} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {scopedApi} from '../scoped/scopedApi';
import {historicalTables,historicalText,historicalFieldLines,typedHistorical} from './historicalContract';
import {HistoricalTableRows} from './HistoricalRows';
import {useHistoricalRows} from './useHistoricalRows';
import {bindOriginalCatalog} from './originalAdapter';
const catalog={id:71,code:'GENERATED',name:'Generated',version:0,institution:{id:1,code:'GEN',name:'Generated'},capabilities:['catalog.read','item.read'],professionalWriteEnabled:false};
const row=(id='a',name='kredenc kuchyňská')=>({recordId:id.repeat(64),sourceSha256:'b'.repeat(64),rowHash:'c'.repeat(64),occurrence:'1',parentRecordId:'d'.repeat(64),parentField:'IdC_UR',fields:{Predmet_UR:{kind:'TEXT',value:name},N:{kind:'NULL'},Z:{kind:'INTEGER',value:'0'},F:{kind:'BOOLEAN',value:false},B:{kind:'DOUBLE_BITS',value:'8000000000000000'}}});
const page=(items=[row()],change:Record<string,unknown>={})=>({catalogId:71,itemId:3,itemVersion:0,table:'Urceni',state:'AVAILABLE',items,nextAfterId:null,semantics:'TYPED_DEMUS_HISTORY_NOT_CURRENT_ASSERTIONS_V1',...change});
const reply=(body:unknown,etag='"0"',cache='no-store')=>new Response(JSON.stringify(body),{headers:{ETag:etag,'Cache-Control':cache}});
beforeEach(()=>{vi.stubEnv('VITE_DEMUS_HISTORY_ENABLED','true');vi.stubEnv('VITE_ORIGINAL_SCOPED_TEST','true');bindOriginalCatalog(catalog,'generated-token');});
afterEach(()=>{cleanup();bindOriginalCatalog(null,null);vi.unstubAllGlobals();vi.unstubAllEnvs();});
it.each(Object.entries(historicalTables))('reads the exact %s parent contract without reducing fields',(table,fk)=>{
 const r={...row(),parentField:fk};vi.stubGlobal('fetch',vi.fn().mockResolvedValue(reply(page([r],{table}))));
 return expect(scopedApi(71,'generated').sourceHistory(3,table as keyof typeof historicalTables,new AbortController().signal)).resolves.toMatchObject({items:[r],etag:'"0"'});
});
it.each([{catalogId:72},{itemId:4},{semantics:'CURRENT'},{table:'Vznik'},{state:'INVENTED'},{items:[{...row(),parentField:'IdC_VZ'}]},{items:[{...row(),fields:{bad:{kind:'INVENTED'}}}]},{items:[row(),row()]},{nextAfterId:'0'.repeat(64)},{items:[],state:'SOURCE_TABLE_UNAVAILABLE',nextAfterId:'a'.repeat(64)}])('rejects invalid historical contracts %j',async change=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(reply(page([row()],change))));await expect(scopedApi(71,'generated').sourceHistory(3,'Urceni',new AbortController().signal)).rejects.toThrow();
});
it.each(['public','private, max-age=30','no-cache','no-store, public'])('rejects cacheable source responses: %s',async cache=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(reply(page(),'"0"',cache)));await expect(scopedApi(71,'generated').sourceHistory(3,'Urceni',new AbortController().signal)).rejects.toThrow();
});
it('accepts duplicate no-store and preserves precise NULL/zero/false/bit values',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(reply(page(),'"0"','no-store, no-store')));const p=await scopedApi(71,'generated').sourceHistory(3,'Urceni',new AbortController().signal);
 expect(historicalText(p.items[0].fields.N)).toBe('NULL (DEMUS)');expect(historicalText(p.items[0].fields.Z)).toBe('0 (DEMUS)');expect(historicalText(p.items[0].fields.F)).toBe('false (DEMUS)');expect(historicalText(p.items[0].fields.B)).toContain('8000000000000000');expect(typedHistorical({kind:'INTEGER',value:0})).toBe(false);expect(typedHistorical({kind:'NULL',value:0})).toBe(false);
});
it('appends repeated DEMUS rows to the existing read-only table and pages even inside a disabled fieldset',async()=>{
 const f=vi.fn().mockResolvedValueOnce(reply(page([row()],{nextAfterId:'a'.repeat(64)}))).mockResolvedValueOnce(reply(page([row('e','židle')])));vi.stubGlobal('fetch',f);
 render(<fieldset disabled><table className="demus-datasheet"><tbody><tr><td>Současné tvrzení má přednost</td></tr><HistoricalTableRows itemId={3} table="Urceni" etag={'"0"'} fields={[["Predmet_UR","Předmět"],["N","NULL"],["Z","Nula"]]}/></tbody></table></fieldset>);
 await screen.findByText('kredenc kuchyňská (DEMUS)');expect(screen.getByText('Současné tvrzení má přednost')).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Upravit'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('link',{name:'Další historické záznamy DEMUS'}));await screen.findByText('židle (DEMUS)');expect(screen.getAllByText('NULL (DEMUS)')).toHaveLength(2);expect(f).toHaveBeenCalledTimes(2);expect(f.mock.calls.every(call=>!call[1].method||call[1].method==='GET')).toBe(true);
});
it('discards source rows on item, catalog, authentication and parent ETag changes',async()=>{
 const f=vi.fn().mockResolvedValue(reply(page()));vi.stubGlobal('fetch',f);const v=renderHook(({id,etag})=>useHistoricalRows(id,'Urceni',etag),{initialProps:{id:3,etag:'"0"'}});await waitFor(()=>expect(v.result.current.page?.items).toHaveLength(1));
 f.mockReturnValue(new Promise(()=>{}));v.rerender({id:4,etag:'"0"'});expect(v.result.current.page).toBeNull();bindOriginalCatalog({...catalog,id:72},'generated-token');v.rerender({id:4,etag:'"0"'});expect(v.result.current.page).toBeNull();bindOriginalCatalog(catalog,'another-user');v.rerender({id:3,etag:'"1"'});expect(v.result.current.page).toBeNull();
});
it('ignores late replies and rejects a successful response at a different parent revision',async()=>{
 let finish!:(r:Response)=>void;const f=vi.fn().mockImplementationOnce(()=>new Promise<Response>(r=>{finish=r;})).mockResolvedValueOnce(reply(page([row('e','židle')],{itemId:4})));vi.stubGlobal('fetch',f);
 const v=renderHook(({id})=>useHistoricalRows(id,'Urceni','"0"'),{initialProps:{id:3}});v.rerender({id:4});await waitFor(()=>expect(v.result.current.page?.items[0].fields.Predmet_UR.value).toBe('židle'));await act(async()=>finish(reply(page())));expect(v.result.current.page?.items[0].fields.Predmet_UR.value).toBe('židle');
 f.mockResolvedValue(reply(page([row()],{itemVersion:1}),'"1"'));v.rerender({id:3});await waitFor(()=>expect(v.result.current.page?.error).toMatch(/Verze předmětu/));expect(v.result.current.page?.items).toHaveLength(0);
});
it('does not classify an unverified link or API failure as missing historical data',async()=>{
 const f=vi.fn().mockResolvedValueOnce(reply(page([],{state:'SOURCE_RELATIONSHIP_UNVERIFIED'}))).mockRejectedValueOnce(new Error('API denied'));
 vi.stubGlobal('fetch',f);const v=renderHook(({id})=>useHistoricalRows(id,'Urceni','"0"'),{initialProps:{id:3}});await waitFor(()=>expect(v.result.current.page?.state).toBe('SOURCE_RELATIONSHIP_UNVERIFIED'));v.rerender({id:4});await waitFor(()=>expect(v.result.current.page?.error).toBe('API denied'));expect(v.result.current.page?.items).toHaveLength(0);
});

const related=(change:Record<string,unknown>={})=>({catalogId:71,itemId:3,itemVersion:0,table:'Urceni',sourceRecordId:'a'.repeat(64),state:'AVAILABLE',nextAfterId:null,semantics:'DECLARED_SOURCE_AUTHORITY_GRAPH_NOT_CURRENT_IDS_V1',items:[{relationshipId:'d'.repeat(64),recordId:'e'.repeat(64),sourceSha256:'b'.repeat(64),rowHash:'c'.repeat(64),occurrence:'1',table:'Adresar',matchingRecords:'2',fields:{ZkrJm_A:{kind:'TEXT',value:'Historický klíč'}},viaRecordId:'a'.repeat(64),sourcePath:['a'.repeat(64),'e'.repeat(64)]}],...change});
it('validates related authority provenance without converting a source key to a current ID',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(reply(related())));const result=await scopedApi(71,'generated').sourceRelated(3,'Urceni','a'.repeat(64),new AbortController().signal);expect(result.items[0]).toMatchObject({relatedTable:'Adresar',matchingRecords:'2',sourcePath:['a'.repeat(64),'e'.repeat(64)]});expect(result.items[0]).not.toHaveProperty('dictionaryId');
});
it.each([{catalogId:72},{sourceRecordId:'f'.repeat(64)},{semantics:'CURRENT'},{nextAfterId:'unsafe'},{items:[{...related().items[0],table:'_Uzivatele'}]},{items:[{...related().items[0],sourcePath:['f'.repeat(64),'e'.repeat(64)]}]},{items:[{...related().items[0],matchingRecords:'0'}]}])('rejects foreign or malformed related authority graph %j',async change=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(reply(related(change))));await expect(scopedApi(71,'generated').sourceRelated(3,'Urceni','a'.repeat(64),new AbortController().signal)).rejects.toThrow();
});
it('loads declared source authority rows only after expanding original evidence and labels ambiguity',async()=>{
 const f=vi.fn().mockImplementation((url:string)=>Promise.resolve(reply(url.includes('/relations?')?related():page())));vi.stubGlobal('fetch',f);
 render(<fieldset disabled><table><tbody><HistoricalTableRows itemId={3} table="Urceni" etag={'"0"'} fields={[["Predmet_UR","Předmět"]]}/></tbody></table></fieldset>);await screen.findByText('kredenc kuchyňská (DEMUS)');expect(f).toHaveBeenCalledTimes(1);
 const summary=screen.getByText('Všechna původní pole DEMUS');const detail=summary.parentElement as HTMLDetailsElement;detail.open=true;fireEvent(detail,new Event('toggle'));await screen.findByText('DEMUS Adresar · Nejednoznačná vazba — 2 kandidátů');expect(f).toHaveBeenCalledTimes(2);expect(screen.queryByRole('button',{name:'Použít autoritu'})).not.toBeInTheDocument();
});

it('renders exact source author, role and literature keys without losing NULL/zero/empty or raw evidence',()=>{
 const fields={OsobaVz_VZ:{kind:'TEXT',value:'Žluťoučký autor'},Role_VZ:{kind:'TEXT',value:'R1'},RokOd_VZ:{kind:'INTEGER',value:'0'},Pozn_VZ:{kind:'NULL'},Titul_LT:{kind:'TEXT',value:''}};
 const text=historicalFieldLines(fields);expect(text).toContain('OsobaVz_VZ [TEXT]: Žluťoučký autor (DEMUS)');expect(text).toContain('RokOd_VZ [INTEGER]: 0 (DEMUS)');expect(text).toContain('Pozn_VZ [NULL]: NULL (DEMUS)');expect(text).toContain('Prázdný řetězec');expect(fields.Role_VZ.value).toBe('R1');
});
it('retains validated repeated historical rows on next-page network failure and retries the same cursor',async()=>{
 const f=vi.fn().mockResolvedValueOnce(reply(page([row()],{nextAfterId:'a'.repeat(64)}))).mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(reply(page([row('e','židle')])));vi.stubGlobal('fetch',f);
 const v=renderHook(()=>useHistoricalRows(3,'Urceni','"0"'));await waitFor(()=>expect(v.result.current.page?.items).toHaveLength(1));act(()=>v.result.current.more());await waitFor(()=>expect(v.result.current.page?.error).toContain('Již'));expect(v.result.current.page?.items).toHaveLength(1);expect(v.result.current.page?.nextAfterId).toBe('a'.repeat(64));act(()=>v.result.current.more());await waitFor(()=>expect(v.result.current.page?.items).toHaveLength(2));expect(v.result.current.page?.error).toBe('');expect(f.mock.calls[1][0]).toBe(f.mock.calls[2][0]);
});
it('clears previous historical rows when next page is a different parent revision',async()=>{
 const f=vi.fn().mockResolvedValueOnce(reply(page([row()],{nextAfterId:'a'.repeat(64)}))).mockResolvedValueOnce(reply(page([row('e')],{itemVersion:1}),'"1"'));vi.stubGlobal('fetch',f);const v=renderHook(()=>useHistoricalRows(3,'Urceni','"0"'));await waitFor(()=>expect(v.result.current.page?.items).toHaveLength(1));act(()=>v.result.current.more());await waitFor(()=>expect(v.result.current.page?.error).toContain('Verze předmětu'));expect(v.result.current.page?.items).toHaveLength(0);expect(v.result.current.page?.nextAfterId).toBeNull();
});
