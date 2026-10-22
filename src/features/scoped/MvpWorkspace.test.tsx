import { fireEvent,render,screen } from '@testing-library/react';
import { expect,it,vi,afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CatalogItems } from './ScopedWorkspace';
import InventoryEvidencePanel from './InventoryEvidencePanel';
import { scopedApi } from './scopedApi';
let api:ReturnType<typeof scopedApi>;
vi.mock('./scopedApi',async original=>({...await original<typeof import('./scopedApi')>(),scopedApi:()=>api}));
afterEach(()=>vi.restoreAllMocks());
it('combines exact search fields, starts a new cursor and resets explicitly',async()=>{
    api={list:vi.fn().mockResolvedValue({items:[],nextAfterId:null})} as unknown as ReturnType<typeof scopedApi>;
    render(<MemoryRouter><CatalogItems catalogId={11} catalogName="A" token="session" onUnauthorized={vi.fn()}/></MemoryRouter>);
    await screen.findByText(/nejsou dostupné předměty/);fireEvent.change(screen.getByLabelText('Hledat inventární číslo'),{target:{value:' 00%_ '}});fireEvent.change(screen.getByLabelText('Hledat název'),{target:{value:'Ω'}});fireEvent.click(screen.getByRole('button',{name:'Vyhledat předměty'}));
    await screen.findByText(/nejsou dostupné předměty/);expect(api.list).toHaveBeenLastCalledWith(expect.anything(),0,50,{inventory:' 00%_ ',title:'Ω'});
    fireEvent.click(screen.getByRole('button',{name:'Vymazat filtry'}));await screen.findByText(/nejsou dostupné předměty/);expect(screen.getByLabelText('Hledat inventární číslo')).toHaveValue('');expect(api.list).toHaveBeenLastCalledWith(expect.anything(),0);
});
it('inventory is read-only and preserves exact alias/native component strings',async()=>{
    api={inventoryEvidence:vi.fn().mockResolvedValue({sourceLocalId:'000101',sourceInventoryNumber:'  OLD  ',sourceComponents:{ordinal:'0007'},aliases:[{id:'00000000-0000-0000-0000-000000000000',inventoryNumber:'  ALIAS  ',components:{ordinal:'0008'}}],nextAfterId:null})} as unknown as ReturnType<typeof scopedApi>;
    render(<InventoryEvidencePanel api={api} itemId={101} onFatal={vi.fn()}/>);expect(api.inventoryEvidence).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Načíst inventární souvislosti'}));await screen.findByTestId('source-local-id');
    expect(screen.getByTestId('inventory-alias').textContent).toBe('  ALIAS  ');expect(screen.getByText('0007')).toBeInTheDocument();expect(screen.queryByRole('textbox')).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:/Uložit/})).not.toBeInTheDocument();
});
it('refuses to mix alias pages from different parent versions',async()=>{
    const first={itemVersion:'0',sourceLocalId:'000101',sourceInventoryNumber:null,sourceComponents:{},aliases:[{id:'00000000-0000-0000-0000-000000000000',inventoryNumber:'OLD PAGE',components:{}}],nextAfterId:'00000000-0000-0000-0000-000000000000'};
    api={inventoryEvidence:vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce({...first,itemVersion:'1',aliases:[],nextAfterId:null})} as unknown as ReturnType<typeof scopedApi>;
    render(<InventoryEvidencePanel api={api} itemId={101} onFatal={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'Načíst inventární souvislosti'}));await screen.findByText('OLD PAGE');
    fireEvent.click(screen.getByRole('button',{name:'Další aliasy'}));await screen.findByText(/Inventární evidence se změnila/);expect(screen.queryByText('OLD PAGE')).not.toBeInTheDocument();
});
