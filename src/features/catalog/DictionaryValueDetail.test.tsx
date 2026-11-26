import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import DictionaryValueDetail,{DictionaryBranch} from './DictionaryValueDetail';
afterEach(cleanup);
const root={id:'root',catalogId:1,type:'MATERIAL',label:'Kov',code:'K',parentId:null,version:'2'};
const child={...root,id:'child',label:'Železo',parentId:'root',version:'3'};
const leaf={...root,id:'leaf',label:'Litina',parentId:'child',version:'7'};
it('opens a fresh standalone value and resolves the exact path; editing receives its current server version',async()=>{
 const edit=vi.fn(),api={dictionaryValue:vi.fn((_t,id)=>Promise.resolve({value:{root,child,leaf}[id as 'root'|'child'|'leaf']})),dictionaryValues:vi.fn().mockResolvedValue({items:[],nextAfterId:null})};
 render(<DictionaryValueDetail api={api as any} type="MATERIAL" id="leaf" signal={new AbortController().signal} onBack={()=>{}} onOpen={()=>{}} onEdit={edit} writable/>);
 await screen.findByText('Kov → Železo → Litina');fireEvent.click(screen.getByRole('button',{name:'Upravit tuto položku'}));expect(edit).toHaveBeenCalledWith(leaf);expect(screen.queryByText(/verze 7/)).toBeNull();expect(screen.queryByText(leaf.id,{exact:true})).toBeNull();await waitFor(()=>expect(api.dictionaryValues).toHaveBeenCalledWith('MATERIAL',expect.any(AbortSignal),undefined,'',{parentId:'leaf'}));
});
it('read permission does not imply dictionary write; forbidden detail is never represented by an empty editor',async()=>{
 const api={dictionaryValue:vi.fn().mockRejectedValue(new Error('403 Forbidden')),dictionaryValues:vi.fn()};render(<DictionaryValueDetail api={api as any} type="MATERIAL" id="foreign" signal={new AbortController().signal} onBack={()=>{}} onOpen={()=>{}} onEdit={()=>{}} writable={false}/>);expect(await screen.findByRole('alert')).toHaveTextContent('403');expect(screen.queryByRole('button',{name:'Upravit tuto položku'})).toBeNull();
});
it('uses independent server cursors for roots and expanded child branches',async()=>{
 const api={dictionaryValues:vi.fn((_t,_s,after,_q,branch)=>Promise.resolve(branch.parentId?{items:[child],nextAfterId:null}:after?{items:[{...root,id:'root2',label:'Dřevo'}],nextAfterId:null}:{items:[root],nextAfterId:'root'}))};render(<DictionaryBranch api={api as any} type="MATERIAL" signal={new AbortController().signal} onOpen={()=>{}}/>);await screen.findByRole('button',{name:'Detail Kov'});fireEvent.click(screen.getByText('Podřazené: Kov'));await screen.findByRole('button',{name:'Detail Železo'});expect(api.dictionaryValues).toHaveBeenCalledWith('MATERIAL',expect.any(AbortSignal),undefined,'',{parentId:'root'});fireEvent.click(screen.getByRole('button',{name:'Další položky větve'}));await screen.findByRole('button',{name:'Detail Dřevo'});expect(api.dictionaryValues).toHaveBeenCalledWith('MATERIAL',expect.any(AbortSignal),'root','',{rootsOnly:true});
});
it('does not infer a historical hierarchy from names or codes and reports cycles in returned paths',async()=>{
 const api={dictionaryValue:vi.fn().mockResolvedValue({value:{...leaf,parentId:'leaf'}}),dictionaryValues:vi.fn()};render(<DictionaryValueDetail api={api as any} type="MATERIAL" id="leaf" signal={new AbortController().signal} onBack={()=>{}} onOpen={()=>{}} onEdit={()=>{}} writable/>);expect(await screen.findByRole('alert')).toHaveTextContent('cestu nelze bezpečně');expect(api.dictionaryValues).not.toHaveBeenCalled();
});
