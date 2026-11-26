import {render,screen,waitFor,fireEvent} from '@testing-library/react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import MatTechPositions,{matTechPositionRows} from './MatTechPositions';
import {bindOriginalCatalog} from '../features/catalog/originalAdapter';
const api=vi.hoisted(()=>({dictionaryValues:vi.fn(),dictionaryValue:vi.fn()}));
vi.mock('../features/scoped/scopedApi',async original=>({...await original<typeof import('../features/scoped/scopedApi')>(),scopedApi:()=>({...api})}));
const row=(id:number,value:string|null)=>({id,kind:'MATERIAL_TECHNIQUE',payload:{materialAuthorityId:value},sourceTable:null} as any);
const value=(id:string)=>({id,catalogId:1,type:'MATERIAL',label:id,parentId:'UNRELATED-PARENT',code:null,version:'0'});
beforeEach(()=>{vi.stubEnv('VITE_ORIGINAL_SCOPED_TEST','true');vi.resetAllMocks();bindOriginalCatalog({id:1,code:'GENERATED',name:'Generated',version:0,institution:{id:1,code:'GEN',name:'Generated'},capabilities:['catalog.read','item.read','dictionary.read','item.professional.write'],professionalWriteEnabled:true,professionalRecordsEnabled:true},'generated');api.dictionaryValues.mockResolvedValue({items:['papír','textil','drát','sklo'].map(value),nextAfterId:null});api.dictionaryValue.mockImplementation(async(_t:string,id:string)=>({value:value(id),etag:'"0"'}));});
afterEach(()=>{bindOriginalCatalog(null,null);vi.unstubAllEnvs();});
it('shows independent authorities in one triple and selects level2 by record70 without following parents',async()=>{
 const rows=[row(69,'papír'),row(70,'textil'),row(71,'drát')],change=vi.fn();render(<MatTechPositions rows={rows} record={rows[0]} payload={rows[0].payload} adding={false} readOnly={false} onChange={change}/>);
 await waitFor(()=>expect(screen.getByLabelText('Materiál — úroveň 2')).toBeEnabled());expect(screen.getByLabelText('Materiál — úroveň 1')).toHaveValue('papír');expect(screen.getByLabelText('Materiál — úroveň 2')).toHaveValue('textil');expect(screen.getByLabelText('Materiál — úroveň 3')).toHaveValue('drát');
 fireEvent.change(screen.getByLabelText('Materiál — úroveň 2'),{target:{value:'sklo'}});expect(change).toHaveBeenCalledWith(rows[1],'MATERIAL','sklo');
 expect(api.dictionaryValues.mock.calls.every(c=>c.length===4)).toBe(true);expect(api.dictionaryValue.mock.calls.some(c=>c[1]==='UNRELATED-PARENT')).toBe(false);
});
it('preserves empty position2 and continuation4/5 without renumbering row identities',async()=>{
 const rows=[row(1,'a'),row(2,null),row(3,'c'),row(4,'d'),row(5,'e')];expect(matTechPositionRows(rows,'MATERIAL').map(r=>r.id)).toEqual([1,2,3,4,5]);
 render(<MatTechPositions rows={rows} record={rows[0]} payload={rows[0].payload} adding={false} readOnly={true} onChange={vi.fn()}/>);
 await waitFor(()=>expect(api.dictionaryValues).toHaveBeenCalled());expect(screen.getByLabelText('Materiál — úroveň 2')).toHaveValue('');expect(screen.getByLabelText('Materiál — úroveň 3')).toHaveValue('c');expect(screen.getByLabelText('Materiál — úroveň 5')).toHaveValue('e');expect(screen.getByLabelText('Materiál — úroveň 1')).toBeDisabled();
});
