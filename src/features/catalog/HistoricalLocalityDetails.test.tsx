import {render,screen,fireEvent,cleanup} from '@testing-library/react';import {it,expect,vi,afterEach} from 'vitest';
const mocks=vi.hoisted(()=>({read:vi.fn()}));vi.mock('./useHistoricalRows',()=>({useHistoricalRows:(...args:any[])=>mocks.read(...args)}));
import HistoricalLocalityDetails from './HistoricalLocalityDetails';afterEach(cleanup);
it('reads only after opening and displays exact linked locality fields without an editable copy',async()=>{
 const more=vi.fn();mocks.read.mockImplementation((_i,_t,_e,related)=>({enabled:true,more,page:related?{state:'AVAILABLE',items:[{recordId:'loc',relatedTable:'Lokality',relationshipId:'rel',parentRecordId:'root',sourceSha256:'source',rowHash:'hash',matchingRecords:'1',sourcePath:['root','loc'],fields:{Lokalita_L:{kind:'TEXT',value:'Doložená lokalita'},Poznamka_L:{kind:'TEXT',value:'Původní poznámka'},PlusT_L:{kind:'NULL'}}}],nextAfterId:'cursor'}:{state:'AVAILABLE',items:[{recordId:'root'}]}}));
 const {container}=render(<HistoricalLocalityDetails itemId={9001} etag='"3"'/>);expect(mocks.read).not.toHaveBeenCalled();fireEvent.click(screen.getByText('Historické údaje lokality DEMUS'));await screen.findByText('Doložená lokalita (DEMUS)');expect(screen.getByText('Původní poznámka (DEMUS)')).toBeInTheDocument();expect(container.querySelector('input,select,textarea')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Další zdrojové údaje lokality'}));expect(more).toHaveBeenCalled();expect(mocks.read).toHaveBeenCalledWith(9001,'Sbirky','"3"','root');
});
it('reports uncertain lineage without inventing locality fields',async()=>{
 mocks.read.mockReturnValue({enabled:true,page:{state:'AMBIGUOUS_PARENT_LINEAGE',items:[]}});render(<HistoricalLocalityDetails itemId={9001} etag='"3"'/>);fireEvent.click(screen.getByText('Historické údaje lokality DEMUS'));expect(await screen.findByRole('status')).toHaveTextContent('Více zdrojových přiřazení');expect(screen.queryByText('Zeměpisná šířka')).toBeNull();
});

it('does not present an indirect person birthplace as the item locality',async()=>{
 mocks.read.mockImplementation((_i,_t,_e,related)=>({enabled:true,page:related?{state:'AVAILABLE',items:[{recordId:'birthplace',relatedTable:'Lokality',parentRecordId:'person',sourcePath:['root','person','birthplace'],fields:{Lokalita_L:{kind:'TEXT',value:'Birthplace must stay separate'}}}]}:{state:'AVAILABLE',items:[{recordId:'root'}]}}));
 render(<HistoricalLocalityDetails itemId={9001} etag='"3"'/>);fireEvent.click(screen.getByText('Historické údaje lokality DEMUS'));await screen.findByText(/není nalezena vazba na Lokality/);expect(screen.queryByText(/Birthplace must stay separate/)).toBeNull();
});
