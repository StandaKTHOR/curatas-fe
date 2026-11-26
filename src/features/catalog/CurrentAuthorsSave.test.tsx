import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import CurrentAuthors from './CurrentAuthors';
const mocks=vi.hoisted(()=>({api:{currentAuthors:vi.fn(),saveCurrentAuthors:vi.fn(),dictionaryValues:vi.fn()}}));
const signal=new AbortController().signal;
vi.mock('./originalAdapter',()=>({originalSession:()=>({api:mocks.api,signal,catalog:{id:1,capabilities:['dictionary.read']}})}));
vi.mock('./originalEdit',()=>({originalCanEdit:()=>true}));
vi.mock('../../components/AddDictionaryModal',()=>({default:()=>null}));
const author='11111111-1111-4111-8111-111111111111',role='22222222-2222-4222-8222-222222222222';
beforeEach(()=>{vi.resetAllMocks();mocks.api.currentAuthors.mockResolvedValue({items:[],etag:'"0"'});mocks.api.dictionaryValues.mockImplementation(async(type)=>({items:[{id:type==='AUTHOR'?author:role,label:type==='AUTHOR'?'Existující autor':'Autor',code:null,parentId:null}],nextAfterId:null}));});
afterEach(cleanup);
it('tracks author/role selection and clears the registered draft after a confirmed save',async()=>{
 const edit={etag:'"0"',scopedCurrent:{etag:'"0"'}},drafts={current:{} as Record<string,any>};
 render(<CurrentAuthors itemId={1001} editSession={edit as any} readOnly={false} drafts={drafts}/>);
 await screen.findByRole('option',{name:'Existující autor'});await waitFor(()=>expect(screen.getByLabelText('Autor přiřazení')).toBeEnabled());
 fireEvent.change(screen.getByLabelText('Autor přiřazení'),{target:{value:author}});fireEvent.change(screen.getByLabelText('Role přiřazení'),{target:{value:role}});
 expect(drafts.current.currentAuthors.dirty).toBe(true);
 mocks.api.saveCurrentAuthors.mockImplementation(async(_id,_tag,rows)=>({items:rows.map((v:any)=>({...v,authorLabel:'Existující autor',roleLabel:'Autor'})),etag:'"1"'}));
 fireEvent.click(screen.getByRole('button',{name:'Přidat přiřazení autora'}));await screen.findByText('Současná přiřazení autorů byla uložena.');
 expect(drafts.current.currentAuthors.dirty).toBe(false);expect(edit.etag).toBe('"1"');expect(screen.getByLabelText('Autor přiřazení')).toHaveValue('');
});
it('preserves author selection on a CAS refusal and never reports success',async()=>{
 const edit={etag:'"0"',scopedCurrent:{etag:'"0"'}},drafts={current:{} as Record<string,any>};render(<CurrentAuthors itemId={1001} editSession={edit as any} readOnly={false} drafts={drafts}/>);
 await screen.findByRole('option',{name:'Existující autor'});await waitFor(()=>expect(screen.getByLabelText('Autor přiřazení')).toBeEnabled());fireEvent.change(screen.getByLabelText('Autor přiřazení'),{target:{value:author}});
 mocks.api.saveCurrentAuthors.mockRejectedValue(Object.assign(new Error('Konflikt verze'),{status:412}));fireEvent.click(screen.getByRole('button',{name:'Přidat přiřazení autora'}));await screen.findByRole('alert');
 expect(screen.getByLabelText('Autor přiřazení')).toHaveValue(author);expect(drafts.current.currentAuthors.dirty).toBe(true);expect(edit.etag).toBe('"0"');expect(screen.queryByRole('status')).toBeNull();
});
