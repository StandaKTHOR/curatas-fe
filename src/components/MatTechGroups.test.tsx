import {render,screen,within,fireEvent} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import MatTechGroups from './MatTechGroups';
vi.mock('./ThreeLevelDictionarySelect',()=>({default:(p:any)=><select aria-label={p.label} value={p.scopedValue??''} disabled={p.readOnly} onChange={e=>p.onScopedChange(e.target.value)}><option value={p.scopedValue??''}>{p.scopedValue}</option></select>}));
const row=(id:number,type:string)=>({id,kind:'MATERIAL_TECHNIQUE',payload:{[type+'AuthorityId']:type+'-'+id},sourceTable:null} as any);
it('renders all ten materials and six techniques at once, preserving order and IDs',()=>{
 const rows=[...Array.from({length:10},(_,i)=>row(i+1,'material')),...Array.from({length:6},(_,i)=>row(i+11,'technique'))],select=vi.fn(),update=vi.fn();
 const {container}=render(<MatTechGroups rows={rows} record={rows[0]} payload={rows[0].payload} readOnly={false} onSelect={select} onPayload={update}/>);
 const groups=Array.from(container.querySelectorAll('[data-mattech-group]'));expect(groups).toHaveLength(16);expect(groups.map(g=>g.getAttribute('data-record-id'))).toEqual(rows.map(r=>String(r.id)));
 groups.forEach((g,i)=>expect(within(g as HTMLElement).getByRole('combobox')).toHaveValue((i<10?'material-':'technique-')+(i+1)));
 expect(update).not.toHaveBeenCalled();fireEvent.click(within(groups[2] as HTMLElement).getByRole('button',{name:'Upravit materiál'}));expect(select).toHaveBeenCalledWith(rows[2]);expect(update).not.toHaveBeenCalled();
});
it('retains every existing assignment when explicitly adding a new empty pair',()=>{
 const rows=[row(69,'material'),row(70,'material'),row(71,'material'),row(72,'technique')];
 const {container}=render(<MatTechGroups rows={rows} record={null} payload={{}} readOnly={false} onSelect={vi.fn()} onPayload={vi.fn()}/>);
 expect(container.querySelectorAll('[data-record-id="new"]')).toHaveLength(2);expect(container.querySelectorAll('[data-mattech-group]')).toHaveLength(6);
 rows.forEach(r=>expect(container.querySelector(`[data-record-id="${r.id}"]`)).toBeInTheDocument());
});
