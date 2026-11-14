import {render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import ThreeLevelDictionarySelect,{invalidateHierarchy} from './ThreeLevelDictionarySelect';
beforeEach(()=>invalidateHierarchy());
afterEach(()=>vi.unstubAllGlobals());
it.each([401,403,'missing_children'])('never shows terminal/empty state for %s and keeps the saved ID untouched',async problem=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify(problem==='missing_children'?[{id:1,label:'bavlna'}]:{}),{status:typeof problem==='number'?problem:200})));
    const change=vi.fn();render(<ThreeLevelDictionarySelect type="MATERIAL" label="Materiál" value={1} historicalValue="bavlna" onChange={change}/>);
    await screen.findByRole('alert');
    expect(screen.queryByText(/Tato položka nemá další úroveň/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Číselník zatím nemá položky/)).not.toBeInTheDocument();
    expect(screen.getByRole('combobox',{name:'Materiál — úroveň 1'})).toBeDisabled();
    expect(change).not.toHaveBeenCalled();expect(screen.getByText(/Původní text: bavlna/)).toBeInTheDocument();
});
it('shows terminal state only for an explicit fully loaded root leaf',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify([{id:1,type:'MATERIAL',label:'bavlna',parentId:null,children:[]}]),{status:200})));
    const change=vi.fn();render(<ThreeLevelDictionarySelect type="MATERIAL" label="Materiál" value={1} onChange={change}/>);
    await screen.findByText(/Tato položka nemá další úroveň/);
    await waitFor(()=>expect(screen.getByRole('combobox',{name:'Materiál — úroveň 1'})).toBeEnabled());
    expect(screen.getByRole('combobox',{name:'Materiál — úroveň 2'})).toBeDisabled();expect(change).not.toHaveBeenCalled();
});
