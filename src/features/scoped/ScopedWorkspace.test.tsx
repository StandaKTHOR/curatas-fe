import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ScopedWorkspace from './ScopedWorkspace';
import MediaPanel from './MediaPanel';
import { ScopedError, type ScopedApi } from './scopedApi';
let auth: { token: string | null; logout: () => void; setToken: (token: string | null) => void };
let catalog: { selectedCatalog: { id: number; name: string } | null };
let api: ScopedApi;
vi.mock('../../components/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../catalog/CatalogContext', () => ({ useCatalog: () => catalog }));
vi.mock('./scopedApi', async original => ({ ...await original<typeof import('./scopedApi')>(), scopedApi: () => api }));
const item = { id:101,catalogId:11,title:'Local item',inventoryNumber:' 0001/02 ',accessionNumber:null,version:'3' };
const dimension = { id:5,itemId:101,catalogId:11,type:'historical',value:'12.30',unit:'cm',createdInScopedApi:false };
const media = { id:'12345678-1234-1234-1234-123456789abc',itemId:101,catalogId:11,kind:'IMAGE' as const,name:'private.png',mimeType:'image/png',byteSize:3,variants:['content','thumbnail'] as ('content'|'thumbnail')[] };
function setup() {
    api={inventoryEvidence:vi.fn(),list:vi.fn().mockResolvedValue({items:[item],nextAfterId:null}),detail:vi.fn().mockResolvedValue({value:item,etag:'"3"'}),patch:vi.fn().mockResolvedValue({value:{...item,title:'Saved',version:'4'},etag:'"4"'}),
        dimensions:vi.fn().mockResolvedValue({value:{items:[dimension],nextAfterId:null},etag:'"3"'}),dimension:vi.fn().mockResolvedValue({value:dimension,etag:'"3"'}),
        createDimension:vi.fn().mockResolvedValue({value:{...dimension,type:'new',createdInScopedApi:true},etag:'"4"'}),patchDimension:vi.fn(),
        media:vi.fn().mockResolvedValue({items:[media],nextAfterId:null}),mediaDetail:vi.fn().mockResolvedValue(media),bytes:vi.fn().mockResolvedValue(new Blob(['abc'],{type:'image/png'}))};
    auth={token:'session-one',logout:vi.fn(),setToken:vi.fn()};catalog={selectedCatalog:{id:11,name:'A'}};
    vi.stubEnv('VITE_SCOPED_WORKSPACE_ENABLED','true');vi.stubGlobal('URL',class extends URL { static createObjectURL=vi.fn(()=> 'blob:private');static revokeObjectURL=vi.fn(); });
}
function workspace() { return render(<MemoryRouter><ScopedWorkspace /></MemoryRouter>); }
async function detail() {fireEvent.click(await screen.findByRole('button',{name:/Local item/}));await screen.findByText('Název na serveru');await screen.findByRole('button',{name:'private.png'});}
async function preview(){fireEvent.click(await screen.findByRole('button',{name:'private.png'}));fireEvent.click(await screen.findByRole('button',{name:'Náhled obrázku'}));return screen.findByRole('img');}
beforeEach(setup);afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('isolated scoped workspace',()=>{
    it('requires feature flag, session and explicit catalog before item reads',()=>{
        vi.stubEnv('VITE_SCOPED_WORKSPACE_ENABLED','false');const view=workspace();expect(screen.getByText(/není zapnuta/)).toBeInTheDocument();expect(api.list).not.toHaveBeenCalled();
        vi.stubEnv('VITE_SCOPED_WORKSPACE_ENABLED','true');auth.token=null;view.rerender(<MemoryRouter><ScopedWorkspace/></MemoryRouter>);expect(screen.getByRole('link',{name:'přihlaste'})).toBeInTheDocument();
        auth.token='t';catalog.selectedCatalog=null;view.rerender(<MemoryRouter><ScopedWorkspace/></MemoryRouter>);expect(screen.getByText(/Vyberte katalog/)).toBeInTheDocument();expect(api.list).not.toHaveBeenCalled();
    });
    it('synchronizes a cross-tab token removal with the existing auth provider',async()=>{
        workspace();await detail();fireEvent(window,new globalThis.StorageEvent('storage',{key:'token',newValue:null}));expect(auth.setToken).toHaveBeenCalledWith(null);
    });
    it('shows scalar detail and inventory unchanged, and never treats catalog choice as write grant',async()=>{
        workspace();await detail();expect(screen.getByTestId('item-etag')).toHaveTextContent('"3"');expect(screen.getByText(/item.write/)).toBeInTheDocument();
        expect(screen.getAllByText('0001/02',{exact:false}).some(e=>e.textContent===' 0001/02 ')).toBe(true);expect(api.patch).not.toHaveBeenCalled();
    });
    it('renders empty list and retries an explicit failed read',async()=>{
        vi.mocked(api.list).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({items:[],nextAfterId:null});workspace();await screen.findByRole('alert');
        fireEvent.click(screen.getByRole('button',{name:'Obnovit předměty'}));await screen.findByText(/nejsou dostupné předměty/);expect(api.list).toHaveBeenCalledTimes(2);
    });
    it('uses only server cursor for next page',async()=>{
        vi.mocked(api.list).mockResolvedValueOnce({items:[item],nextAfterId:101}).mockResolvedValueOnce({items:[{...item,id:102,title:'Second'}],nextAfterId:null});workspace();
        fireEvent.click(await screen.findByRole('button',{name:'Další předměty'}));await screen.findByRole('button',{name:/Second/});expect(api.list).toHaveBeenLastCalledWith(expect.anything(),101);
    });
    it('saves allowed fields once with the original ETag',async()=>{
        workspace();await detail();fireEvent.click(screen.getByRole('button',{name:'Upravit předmět'}));fireEvent.change(screen.getByLabelText('Název předmětu'),{target:{value:'  new Ω '}});
        fireEvent.click(screen.getByRole('button',{name:'Uložit předmět'}));await screen.findByText('Saved');expect(api.patch).toHaveBeenCalledWith(101,'"3"',{title:'  new Ω ',inventoryNumber:' 0001/02 '},expect.anything());expect(api.patch).toHaveBeenCalledTimes(1);
    });
    it.each([0,409,412,428])('retains draft after %s until explicit compare and confirmation',async status=>{
        vi.mocked(api.patch).mockRejectedValue(new ScopedError(status));workspace();await detail();fireEvent.click(screen.getByRole('button',{name:'Upravit předmět'}));
        fireEvent.change(screen.getByLabelText('Název předmětu'),{target:{value:'My draft'}});fireEvent.click(screen.getByRole('button',{name:'Uložit předmět'}));
        await screen.findByText('Draft je zachován. Zápis se neopakuje automaticky.');expect(screen.getByRole('button',{name:'Uložit předmět'})).toBeDisabled();
        vi.mocked(api.detail).mockResolvedValue({value:{...item,title:'Other editor',version:'4'},etag:'"4"'});fireEvent.click(screen.getByRole('button',{name:'Načíst server pro porovnání'}));
        await screen.findByText('Other editor');expect(screen.getByLabelText('Název předmětu')).toHaveValue('My draft');expect(api.patch).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('button',{name:'Potvrdit porovnání a použít nový ETag'}));expect(screen.getByRole('button',{name:'Uložit předmět'})).toBeEnabled();
    });
    it.each([401,403,404])('clears all private item/media DOM on %s',async status=>{
        workspace();await detail();await preview();vi.mocked(api.bytes).mockRejectedValue(new ScopedError(status));
        fireEvent.click(screen.getByRole('button',{name:'Otevřít obrázek'}));await screen.findByText(/Soukromý obsah byl uzavřen/);expect(screen.queryByRole('img')).not.toBeInTheDocument();expect(screen.queryByText('Název na serveru')).not.toBeInTheDocument();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private');
        expect(auth.logout).toHaveBeenCalledTimes(status===401?1:0);
    });
    it('marks historical dimensions read-only and creates only an explicit new scalar draft',async()=>{
        workspace();await detail();fireEvent.click(await screen.findByRole('button',{name:/historical: 12.30/}));await screen.findByText('Tento rozměr je pouze pro čtení.');expect(screen.queryByRole('button',{name:'Upravit rozměr'})).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button',{name:'Nový rozměr'}));fireEvent.change(screen.getByLabelText('Typ rozměru'),{target:{value:'height'}});fireEvent.change(screen.getByLabelText('Hodnota rozměru'),{target:{value:'1.001'}});
        fireEvent.click(screen.getByRole('button',{name:'Uložit rozměr'}));await screen.findByText(/Nejvýše 36/);expect(api.createDimension).not.toHaveBeenCalled();
        fireEvent.change(screen.getByLabelText('Hodnota rozměru'),{target:{value:'1.20'}});fireEvent.click(screen.getByRole('button',{name:'Uložit rozměr'}));await screen.findByRole('button',{name:'Upravit rozměr'});expect(api.createDimension).toHaveBeenCalledWith(101,'"3"',{type:'height',value:'1.20',unit:null},expect.anything());
    });
    it('releases preview on catalog/session change and logout',async()=>{
        const view=workspace();await detail();await preview();catalog.selectedCatalog={id:12,name:'B'};
        view.rerender(<MemoryRouter><ScopedWorkspace/></MemoryRouter>);expect(screen.queryByRole('img')).not.toBeInTheDocument();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private');
        await detail();await preview();auth.token='session-two';view.rerender(<MemoryRouter><ScopedWorkspace/></MemoryRouter>);expect(screen.queryByRole('img')).not.toBeInTheDocument();
        auth.token=null;view.rerender(<MemoryRouter><ScopedWorkspace/></MemoryRouter>);expect(screen.getByRole('link',{name:'přihlaste'})).toBeInTheDocument();
    });
    it('preserves dimension draft and requires explicit parent-version comparison on conflict',async()=>{
        const fresh={...dimension,createdInScopedApi:true,type:'height'};vi.mocked(api.dimensions).mockResolvedValue({value:{items:[fresh],nextAfterId:null},etag:'"3"'});vi.mocked(api.dimension).mockResolvedValue({value:fresh,etag:'"3"'});vi.mocked(api.patchDimension).mockRejectedValue(new ScopedError(412));
        workspace();await detail();fireEvent.click(await screen.findByRole('button',{name:/height: 12.30/}));fireEvent.click(await screen.findByRole('button',{name:'Upravit rozměr'}));
        fireEvent.change(screen.getByLabelText('Hodnota rozměru'),{target:{value:'9.99'}});fireEvent.click(screen.getByRole('button',{name:'Uložit rozměr'}));await screen.findByText(/Draft zůstal zachován/);
        vi.mocked(api.dimension).mockResolvedValue({value:{...fresh,value:'22.00'},etag:'"4"'});fireEvent.click(screen.getByRole('button',{name:'Načíst verzi pro porovnání rozměru'}));await screen.findByText(/Server: height, 22.00/);
        expect(screen.getByLabelText('Hodnota rozměru')).toHaveValue('9.99');expect(screen.getByRole('button',{name:'Uložit rozměr'})).toBeDisabled();expect(api.patchDimension).toHaveBeenCalledTimes(1);
    });
    it('ignores a pending old-session blob without ever allocating its object URL',async()=>{
        let resolve!:(b:Blob)=>void;vi.mocked(api.bytes).mockImplementation(()=>new Promise(r=>resolve=r));const view=workspace();await detail();
        fireEvent.click(screen.getByRole('button',{name:'private.png'}));fireEvent.click(await screen.findByRole('button',{name:'Náhled obrázku'}));auth.token='changed-session';view.rerender(<MemoryRouter><ScopedWorkspace/></MemoryRouter>);
        await act(async()=>resolve(new Blob(['stale'])));expect(URL.createObjectURL).not.toHaveBeenCalled();expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
    it('ignores late item response from an unmounted catalog',async()=>{
        let resolve!:(v:any)=>void;vi.mocked(api.list).mockImplementationOnce(()=>new Promise(r=>resolve=r));const view=workspace();catalog.selectedCatalog={id:12,name:'B'};view.rerender(<MemoryRouter><ScopedWorkspace/></MemoryRouter>);
        await screen.findByRole('button',{name:/Local item/});await act(async()=>resolve({items:[{...item,title:'OLD PRIVATE'}],nextAfterId:null}));expect(screen.queryByText(/OLD PRIVATE/)).not.toBeInTheDocument();
    });
});
describe('media byte lifecycle',()=>{
    it('revokes old URL when another variant replaces the preview and on unmount',async()=>{
        const view=render(<MediaPanel api={api} itemId={101} onFatal={vi.fn()}/>);await preview();fireEvent.click(screen.getByRole('button',{name:'Otevřít obrázek'}));await waitFor(()=>expect(api.bytes).toHaveBeenCalledTimes(2));
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private');view.unmount();expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    });
    it('creates no object URL for an ignored late byte response after close or unmount',async()=>{
        let resolve!:(b:Blob)=>void;vi.mocked(api.bytes).mockImplementation(()=>new Promise(r=>resolve=r));const view=render(<MediaPanel api={api} itemId={101} onFatal={vi.fn()}/>);
        fireEvent.click(await screen.findByRole('button',{name:'private.png'}));fireEvent.click(await screen.findByRole('button',{name:'Náhled obrázku'}));fireEvent.click(screen.getByRole('button',{name:'Zavřít médium'}));
        await act(async()=>resolve(new Blob(['old'])));expect(URL.createObjectURL).not.toHaveBeenCalled();expect(screen.queryByRole('img')).not.toBeInTheDocument();view.unmount();
    });
    it('releases a temporary download URL after browser acquisition',async()=>{
        vi.spyOn(globalThis.HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});const view=render(<MediaPanel api={api} itemId={101} onFatal={vi.fn()}/>);
        fireEvent.click(await screen.findByRole('button',{name:'private.png'}));await screen.findByRole('button',{name:'Stáhnout originál'});vi.useFakeTimers();
        fireEvent.click(screen.getByRole('button',{name:'Stáhnout originál'}));await act(async()=>{await Promise.resolve();});expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
        act(()=>vi.advanceTimersByTime(1000));expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private');view.unmount();expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    });
    it('PDF has download only, no image preview or embedded document context',async()=>{
        vi.mocked(api.media).mockResolvedValue({items:[{...media,kind:'ATTACHMENT',name:'doc.pdf',mimeType:'application/pdf',variants:['content']}],nextAfterId:null});vi.mocked(api.mediaDetail).mockResolvedValue({...media,kind:'ATTACHMENT',name:'doc.pdf',mimeType:'application/pdf',variants:['content']});
        const view=render(<MediaPanel api={api} itemId={101} onFatal={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'doc.pdf'}));await screen.findByRole('button',{name:'Stáhnout originál'});
        expect(screen.queryByRole('button',{name:'Náhled obrázku'})).not.toBeInTheDocument();expect(view.container.querySelector('iframe,object,embed')).toBeNull();
    });
    it('keeps source tokens out of browser URL and never stores private byte payloads',async()=>{
        const storage=vi.spyOn(globalThis.Storage.prototype,'setItem');render(<MediaPanel api={api} itemId={101} onFatal={vi.fn()}/>);await preview();expect(screen.getByRole('img')).toHaveAttribute('src','blob:private');expect(storage).not.toHaveBeenCalled();storage.mockRestore();
    });
});
