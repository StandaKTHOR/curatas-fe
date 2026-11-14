import {render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import DemusLegacyDataView from '../../components/DemusLegacyDataView';
import {bindOriginalCatalog} from './originalAdapter';
import {useOriginalSourcePlus} from './useOriginalSourcePlus';
const api=vi.hoisted(()=>({sourcePlus:vi.fn()}));
vi.mock('../scoped/scopedApi',async original=>({...await original<typeof import('../scoped/scopedApi')>(),scopedApi:()=>api}));
function bind(id=1){bindOriginalCatalog({id,code:'GENERATED',name:'Generated',version:0,institution:{id:1,code:'GEN',name:'Generated'},capabilities:['catalog.read','item.read']},'generated');}
function Panel({enabled=true}:{enabled?:boolean}){const value=useOriginalSourcePlus(7,enabled);return <DemusLegacyDataView legacyData={value.data} unavailableMessage={value.message}/>;}
const row={recordId:'a'.repeat(64),sourceSha256:'b'.repeat(64),rowHash:'c'.repeat(64),occurrence:1,fields:{Plus3C_S:{kind:'FLOAT_BITS',value:'80000000'}}};
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('VITE_ORIGINAL_SCOPED_TEST','true');bind();});afterEach(()=>{bindOriginalCatalog(null,null);vi.unstubAllEnvs();});
it('populates the existing original legacy-data panel with exact source bits',async()=>{api.sourcePlus.mockResolvedValue({items:[row],nextAfterId:null,etag:'"0"'});const {container}=render(<Panel/>);await waitFor(()=>expect(container.textContent).toContain('80000000'));expect(api.sourcePlus).toHaveBeenCalledWith(7,expect.any(AbortSignal),'');expect(container.textContent).toContain('FLOAT_BITS');});
it('does not read source evidence before the original Plus tab is active',()=>{render(<Panel enabled={false}/>);expect(api.sourcePlus).not.toHaveBeenCalled();});
it('discards a paginated read when item versions differ and displays the actual error',async()=>{api.sourcePlus.mockResolvedValueOnce({items:[row],nextAfterId:row.recordId,etag:'"0"'}).mockResolvedValueOnce({items:[{...row,recordId:'d'.repeat(64)}],nextAfterId:null,etag:'"1"'});const {container}=render(<Panel/>);await screen.findByText(/Verze předmětu se změnila/);expect(container.textContent).not.toContain('80000000');});
it('clears source values immediately on catalog change and aborts the previous owner signal',async()=>{api.sourcePlus.mockResolvedValueOnce({items:[row],nextAfterId:null,etag:'"0"'}).mockImplementation(()=>new Promise(()=>{}));const {container,rerender}=render(<Panel/>);await waitFor(()=>expect(container.textContent).toContain('80000000'));const signal=api.sourcePlus.mock.calls[0][1];bind(2);rerender(<Panel/>);expect(container.textContent).not.toContain('80000000');expect(signal.aborted).toBe(true);});
