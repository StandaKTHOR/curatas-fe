import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, expect, it, vi} from 'vitest';
import MuseumSection from './MuseumSection';
import {invalidateHierarchy} from './ThreeLevelDictionarySelect';
import {getMuseumItem, getDictionaryTree, saveProfessionalRecord} from '../lib/api';
vi.mock('../lib/api', async original => ({...await original<typeof import('../lib/api')>(),
    getMuseumItem:vi.fn(), getDictionaryTree:vi.fn(), saveProfessionalRecord:vi.fn()}));
const tree=(offset:number)=>[{id:offset+1,code:null,label:`Kořen ${offset}`,children:[
    {id:offset+2,code:null,label:`Kategorie ${offset}`,children:[{id:offset+3,code:'KOD',label:`Položka ${offset}`,children:[]}]}]},
    {id:offset+4,code:null,label:`Jiný kořen ${offset}`,children:[]}];
const detail={itemId:7,records:[]};
beforeEach(()=>{vi.resetAllMocks();invalidateHierarchy();
    vi.mocked(getMuseumItem).mockResolvedValue(detail as never);
    vi.mocked(getDictionaryTree).mockImplementation(async type=>tree(type==='MATERIAL'?0:10));});
async function selectPath(label:string,offset:number){
    for(let level=1;level<=3;level++) await userEvent.selectOptions(screen.getByRole('combobox',{name:`${label} — úroveň ${level}`}),String(offset+level));
}
it('new MatTech uses six cascading selects, independent paths and explicit CREATE then reopens the saved identity',async()=>{
    const saved={id:51,kind:'MATERIAL_TECHNIQUE',dictionaryId:null,partyId:null,materialDictionaryId:3,techniqueDictionaryId:13,payload:{Material_MT:'KOD',Technika_MT:'KOD'},legacyData:{}};
    vi.mocked(saveProfessionalRecord).mockImplementation(async()=>{vi.mocked(getMuseumItem).mockResolvedValue({...detail,records:[saved]} as never);return saved as never;});
    render(<MuseumSection itemId={7} section="materialTuples"/>);
    await screen.findByRole('heading',{name:'Přidat záznam materiálu a techniky'});
    await waitFor(()=>expect(screen.getByRole('combobox',{name:'Materiál — úroveň 1'})).toBeEnabled());
    expect(screen.getAllByRole('combobox')).toHaveLength(6);
    await selectPath('Materiál',0);await selectPath('Technika',10);
    expect(screen.getByLabelText('Vybraná cesta: Materiál')).toHaveTextContent('Kořen 0 › Kategorie 0 › Položka 0');
    await userEvent.selectOptions(screen.getByRole('combobox',{name:'Materiál — úroveň 1'}),'4');
    expect(screen.getByRole('combobox',{name:'Technika — úroveň 3'})).toHaveValue('13');
    expect(screen.getByRole('combobox',{name:'Materiál — úroveň 3'})).toBeDisabled();
    await selectPath('Materiál',0);expect(saveProfessionalRecord).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button',{name:'Uložit záznam'}));
    expect(saveProfessionalRecord).toHaveBeenCalledWith(7,'MATERIAL_TECHNIQUE',{fields:{kind:'MATERIAL_TECHNIQUE'},materialDictionaryId:3,techniqueDictionaryId:13},undefined,undefined);
    await userEvent.click(await screen.findByRole('button',{name:'Upravit'}));
    expect(screen.getByRole('combobox',{name:'Materiál — úroveň 3'})).toHaveValue('3');
    expect(screen.getByRole('combobox',{name:'Technika — úroveň 3'})).toHaveValue('13');
    expect(document.body.textContent).not.toMatch(/tuple/i);
});
it('edits only a note on an imported unknown binding, preserves history and another separate record',async()=>{
    const source={id:61,kind:'MATERIAL_TECHNIQUE',dictionaryId:null,partyId:null,materialDictionaryId:99,techniqueDictionaryId:null,payload:{Pozn_MT:'Old'},sourceTable:'MatTech',legacyData:{Material_MT:'Původní materiál',Technika_MT:'Původní technika',Sluz_MT:'source evidence'}};
    const other={...source,id:62,payload:{Material_MT:'Jiný materiál'}};
    vi.mocked(getMuseumItem).mockResolvedValue({...detail,records:[source,other]} as never);
    vi.mocked(saveProfessionalRecord).mockResolvedValue(source as never);
    render(<MuseumSection itemId={7} section="materialTuples"/>);
    await userEvent.click((await screen.findAllByRole('button',{name:'Upravit'}))[0]);
    await screen.findByText(/Stávající vazba #99/);
    expect(screen.getByLabelText('Materiál (uložený text)')).toHaveValue('Původní materiál');
    expect(screen.getByLabelText('Technika (uložený text)')).toHaveValue('Původní technika');
    const note=screen.getByLabelText('Poznámka k materiálu a technice');await userEvent.clear(note);await userEvent.type(note,'Corrected');
    await userEvent.click(screen.getByRole('button',{name:'Uložit záznam'}));
    expect(saveProfessionalRecord).toHaveBeenCalledWith(7,'MATERIAL_TECHNIQUE',{fields:{kind:'MATERIAL_TECHNIQUE',Pozn_MT:'Corrected'}},undefined,61);
    expect(source.materialDictionaryId).toBe(99);expect(source.legacyData.Sluz_MT).toBe('source evidence');
    expect(within(screen.getByRole('table')).getByText('Jiný materiál')).toBeInTheDocument();
});
it('empty MatTech trees allow historical text and note editing without assigning dictionary IDs',async()=>{
    vi.mocked(getDictionaryTree).mockResolvedValue([]);
    render(<MuseumSection itemId={7} section="materialTuples"/>);
    await screen.findAllByText(/Číselník zatím nemá položky/);
    await userEvent.type(screen.getByLabelText('Materiál (uložený text)'),'Bez přiřazení');
    await userEvent.type(screen.getByLabelText('Poznámka k materiálu a technice'),'Note');
    await userEvent.click(screen.getByRole('button',{name:'Uložit záznam'}));
    expect(saveProfessionalRecord).toHaveBeenCalledWith(7,'MATERIAL_TECHNIQUE',{fields:{kind:'MATERIAL_TECHNIQUE',Material_MT:'Bez přiřazení',Pozn_MT:'Note'}},undefined,undefined);
});
