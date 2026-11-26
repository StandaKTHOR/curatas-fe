import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import AuthorityRelatedItems from './AuthorityRelatedItems';
import DocumentationFiles from './DocumentationFiles';
import {dictionaryTypeToSearch} from './dictionaryKeyboard';
afterEach(cleanup);
const id='11111111-1111-4111-8111-111111111111';
it('loads an exact UUID relationship only after expansion and paginates without name matching',async()=>{
 const request=vi.fn().mockResolvedValue({items:[{item:{id:9001,inventoryNumber:'TEST 1',title:'TEST'}}],totalElements:26,hasMore:true});
 render(<AuthorityRelatedItems api={{curatorPage:request} as any} type="AUTHOR" id={id} catalog={1} readable/>);
 expect(request).not.toHaveBeenCalled();fireEvent.click(screen.getByText('Skutečně přiřazené předměty'));
 expect(await screen.findByRole('link',{name:'TEST 1'})).toHaveAttribute('href','/admin/items/view/9001?catalog=1');
 expect(JSON.parse(request.mock.calls[0][3].advancedFilter).conditions).toEqual([{field:'authorAuthorityId',operator:'EQUALS',value:id}]);
 fireEvent.click(screen.getByRole('button',{name:'Další předměty'}));await waitFor(()=>expect(request).toHaveBeenLastCalledWith(1,25,'inventoryNumber,asc',expect.any(Object),expect.any(AbortSignal)));
});
it('does not imply item.read from dictionary.read and does not call a forbidden API',()=>{
 const request=vi.fn();render(<AuthorityRelatedItems api={{curatorPage:request} as any} type="LOCALITY" id={id} catalog={1} readable={false}/>);
 expect(screen.getByText(/samostatné oprávnění/)).toBeVisible();expect(request).not.toHaveBeenCalled();
});
it('reports a denied related-item read as an error, never an empty successful count',async()=>{
 const request=vi.fn().mockRejectedValue(new Error('Nemáte oprávnění'));render(<AuthorityRelatedItems api={{curatorPage:request} as any} type="LOCALITY" id={id} catalog={1} readable/>);fireEvent.click(screen.getByText('Skutečně přiřazené předměty'));
 expect(await screen.findByRole('alert')).toHaveTextContent('Nemáte oprávnění');expect(screen.queryByText(/Ověřený počet: 0/)).toBeNull();
});
it('keeps photo and attachment captions and metadata together and surfaces download failures',async()=>{
 const download=vi.fn().mockRejectedValue(new Error('Stahování odmítnuto'));
 render(<DocumentationFiles files={[{id:'1',name:'A.jpg',kind:'IMAGE',caption:'Řádek 1\nŘádek 2',mimeType:'image/jpeg',byteSize:24,download},{id:'2',name:'B.pdf',kind:'ATTACHMENT',caption:'Doklad',mimeType:'application/pdf',byteSize:12,download}]} loaded busy={false} error="" more={false} onMore={()=>{}} onPhotos={()=>{}} onAttachments={()=>{}}/>);
 expect(screen.getByRole('table',{name:'Soubory dokumentace'})).toHaveTextContent('A.jpg');expect(screen.getByText('Doklad')).toBeVisible();expect(screen.getByText('24 B')).toBeVisible();expect(screen.getByText(/Řádek 1/).textContent).toBe('Řádek 1\nŘádek 2');
 fireEvent.click(screen.getByRole('button',{name:'Stáhnout B.pdf'}));expect(await screen.findByRole('alert')).toHaveTextContent('Stahování odmítnuto');
});
it('typing starts dictionary search without changing a selected UUID; navigation keys stay native',()=>{
 const search=vi.fn();render(<><select aria-label="Autor" defaultValue={id} onKeyDown={e=>dictionaryTypeToSearch(e,'AUTHOR',search)}><option value={id}>Autor</option></select><input data-dictionary-search="AUTHOR" aria-label="Hledat autoritu AUTHOR"/></>);
 const select=screen.getByRole('combobox');fireEvent.keyDown(select,{key:'ř'});expect(search).toHaveBeenCalledWith('ř');expect(select).toHaveValue(id);
 search.mockClear();for(const key of ['Tab','ArrowDown','Enter','Escape',' '])fireEvent.keyDown(select,{key});fireEvent.keyDown(select,{key:'a',ctrlKey:true});expect(search).not.toHaveBeenCalled();
});
