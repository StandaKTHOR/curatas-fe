import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, expect, it, vi} from 'vitest';
import {useState} from 'react';
import PublicationPicker from './PublicationPicker';
import type {ScopedApi} from '../scoped/scopedApi';
import type {professionalRegistryApi} from './professionalRegistryApi';

afterEach(cleanup);

it('shows an approved source publication as a normal selection without an origin warning', async () => {
    const key='s:'+'b'.repeat(64);
    const api={unifiedValues:vi.fn().mockResolvedValue({items:[{key,label:'Položka',code:'P-4'}],nextAfterId:null})} as unknown as ScopedApi;
    const onSelect=vi.fn();
    render(<MemoryRouter><PublicationPicker api={api} registry={vi.fn() as unknown as ReturnType<typeof professionalRegistryApi>}
        signal={new AbortController().signal} catalog={8} selected={key} onSelect={onSelect} canCreate={false} allowSourceWrite/></MemoryRouter>);
    const option=await screen.findByRole<HTMLOptionElement>('option',{name:'Položka — P-4'});
    expect(option.selected).toBe(true);
    expect(screen.getByLabelText('Publikace')).toHaveValue(key);
    expect(screen.queryByText(/současný zápis neumí/)).toBeNull();
});

it('retains exact separate publication identities for matching bibliographic captions', async () => {
    const key='s:'+'a'.repeat(64);
    const selected=vi.fn();
    const api={unifiedValues:vi.fn().mockResolvedValue({items:[
        {key:'p:00000000000000000273',fields:{Titul_LT:'Shodný titul',Ref_LT:'R-01'}},
        {key,fields:{Titul_LT:{kind:'TEXT',value:'Shodný titul'},Ref_LT:{kind:'TEXT',value:'R-01'}}},
    ],nextAfterId:null})} as unknown as ScopedApi;
    const registry=vi.fn() as unknown as ReturnType<typeof professionalRegistryApi>;
    const signal=new AbortController().signal;
    function Fixture() {
        const [value,setValue]=useState('');
        return <PublicationPicker api={api} registry={registry} signal={signal} catalog={8} selected={value}
            onSelect={id=>{setValue(id);selected(id);}} canCreate={false}/>;
    }
    render(<MemoryRouter><Fixture/></MemoryRouter>);
    const options=await screen.findAllByRole('option',{name:'Shodný titul — R-01'});
    expect(options.map(node=>(node as HTMLOptionElement).value)).toEqual(['273',key]);
    fireEvent.change(screen.getByLabelText('Publikace'),{target:{value:key}});
    expect(selected).toHaveBeenLastCalledWith(key);
    expect(screen.getByRole('link',{name:'Otevřít detail publikace'})).toHaveAttribute('href',`/admin/literature?catalog=8&type=LITERATURE&value=${encodeURIComponent(key)}`);
    fireEvent.change(screen.getByLabelText('Publikace'),{target:{value:'273'}});
    expect(selected).toHaveBeenLastCalledWith('273');
    expect(screen.queryByRole('button',{name:'Nová publikace'})).toBeNull();
    expect(registry).not.toHaveBeenCalled();
});
