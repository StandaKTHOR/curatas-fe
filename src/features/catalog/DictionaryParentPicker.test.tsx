import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import DictionaryParentPicker from './DictionaryParentPicker';
import type {ScopedApi} from '../scoped/scopedApi';
afterEach(cleanup);
const node=(id:string)=>({id,type:'MATERIAL',catalogId:1,label:id,code:null,parentId:null,version:'0'});
it('searches bounded pages beyond the first1000 and retains the selected UUID',async()=>{
 const api={dictionaryValues:vi.fn().mockImplementation((_t,_s,after,q)=>Promise.resolve(q?{items:[node('remote1001')],nextAfterId:null}:{items:[node(after?'next':'root')],nextAfterId:after?null:'cursor'})),dictionaryValue:vi.fn().mockResolvedValue({value:node('selected')})} as unknown as ScopedApi;const change=vi.fn();
 render(<DictionaryParentPicker api={api} type="MATERIAL" signal={new AbortController().signal} value="selected" onChange={change}/>);
 await screen.findByRole('option',{name:'selected'});fireEvent.click(await screen.findByRole('button',{name:'Další nadřazené položky'}));await screen.findByRole('option',{name:'next'});fireEvent.change(screen.getByLabelText('Hledat nadřazenou položku'),{target:{value:'remote'}});await screen.findByRole('option',{name:'remote1001'});await waitFor(()=>expect(screen.getByLabelText('Nadřazená položka')).toBeEnabled());fireEvent.change(screen.getByLabelText('Nadřazená položka'),{target:{value:'remote1001'}});expect(change).toHaveBeenCalledWith('remote1001');expect(api.dictionaryValues).toHaveBeenLastCalledWith('MATERIAL',expect.any(AbortSignal),undefined,'remote');
});
it('does not offer the edited node as its own parent and exposes read errors',async()=>{
 const api={dictionaryValues:vi.fn().mockResolvedValue({items:[node('self')],nextAfterId:null}),dictionaryValue:vi.fn()} as unknown as ScopedApi;
 const view=render(<DictionaryParentPicker api={api} type="MATERIAL" signal={new AbortController().signal} value="" exclude="self" onChange={vi.fn()}/>);await waitFor(()=>expect(screen.getByLabelText('Nadřazená položka')).toBeEnabled());expect(screen.queryByRole('option',{name:'self'})).toBeNull();
 const failed={...api,dictionaryValues:vi.fn().mockRejectedValue(new Error('403'))};view.rerender(<DictionaryParentPicker api={failed} type="MATERIAL" signal={new AbortController().signal} value="" onChange={vi.fn()}/>);expect(await screen.findByRole('alert')).toHaveTextContent('403');expect(screen.getByLabelText('Nadřazená položka')).toBeDisabled();
});
