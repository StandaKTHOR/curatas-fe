import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({api:{dictionaryMetadata:vi.fn(),dictionaryValues:vi.fn(),dictionaryValue:vi.fn(),saveDictionary:vi.fn()},signal:new AbortController().signal}));
vi.mock('../features/catalog/originalAdapter',()=>({originalSession:()=>mocks}));
import PagedThreeLevelDictionarySelect from './PagedThreeLevelDictionarySelect';
beforeEach(()=>{vi.resetAllMocks();mocks.api.dictionaryMetadata.mockResolvedValue({operations:['read','create','update']});mocks.api.dictionaryValues.mockResolvedValue({items:[],nextAfterId:null});});
afterEach(cleanup);
it.each(['MATERIAL','TECHNIQUE'] as const)('prefills missing %s and selects its UUID only after a matching GET',async type=>{
 const value={id:'11111111-1111-4111-8111-111111111111',catalogId:1,type,label:'Česká nová hodnota',code:'CESKA',parentId:null,version:'0'},selected=vi.fn();mocks.api.saveDictionary.mockResolvedValue({value,etag:'"0"'});mocks.api.dictionaryValue.mockResolvedValue({value,etag:'"0"'});
 const {container}=render(<PagedThreeLevelDictionarySelect type={type} label={type} value={null} scopedValue={null} onScopedChange={selected}/>);await waitFor(()=>expect(screen.queryByText('Načítání číselníku…')).toBeNull());
 fireEvent.change(screen.getByLabelText('Hledat: '+type),{target:{value:value.label}});fireEvent.click(await screen.findByRole('button',{name:'Založit novou hodnotu: '+value.label}));await waitFor(()=>expect(container.querySelector<HTMLInputElement>('#dictLabel')?.value).toBe(value.label));fireEvent.change(container.querySelector('#dictCode')!,{target:{value:value.code}});fireEvent.click(screen.getByRole('button',{name:'Přidat a vybrat'}));
 await waitFor(()=>expect(selected).toHaveBeenCalledWith(value.id));expect(mocks.api.dictionaryValue).toHaveBeenCalledWith(type,value.id,mocks.signal);expect(mocks.api.saveDictionary).toHaveBeenCalledWith(type,expect.objectContaining({label:value.label,code:value.code,parentId:null}),mocks.signal,undefined,undefined);
});
