import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import HistoricalPersonDetails from './HistoricalPersonDetails';
const m=vi.hoisted(()=>({read:vi.fn()}));vi.mock('./useHistoricalRows',()=>({useHistoricalRows:(...args:any[])=>m.read(...args)}));afterEach(cleanup);
it('shows original bad dates and biography verbatim only through direct recorded person relationships',async()=>{
 m.read.mockImplementation((_id,table,_etag,related)=>({enabled:true,page:related?{state:'AVAILABLE',items:table==='Sbirky'?[{recordId:'person',parentRecordId:'root',relatedTable:'Osobnosti',matchingRecords:'1',fields:{Jmeno_OS:{kind:'TEXT',value:'TEST původní osoba'},DatNar_OS:{kind:'TEXT',value:'nesprávně 1900??'},Medailon_OS:{kind:'TEXT',value:'Původní medailon'}},sourceSha256:'source',rowHash:'hash'}]:[]}:{state:'AVAILABLE',items:table==='Sbirky'?[{recordId:'root'}]:[]}}));
 render(<HistoricalPersonDetails itemId={1001} etag='"4"'/>);fireEvent.click(screen.getByText('Údaje o autorovi'));
 expect(await screen.findByText('nesprávně 1900??')).toBeVisible();expect(screen.getByText('Původní medailon')).toBeVisible();expect(m.read).toHaveBeenCalledWith(1001,'Sbirky','"4"','root');
});
it('does not invent a person from an indirect relationship or a missing source',async()=>{
 m.read.mockImplementation((_id,table,_etag,related)=>({enabled:true,page:related?{state:'AVAILABLE',items:[{recordId:'other',parentRecordId:'different-root',relatedTable:'Osobnosti',fields:{name:{kind:'TEXT',value:'Nesouvisející osoba'}}}]}:{state:'AVAILABLE',items:table==='Sbirky'?[{recordId:'root'}]:[]}}));
 render(<HistoricalPersonDetails itemId={1001} etag='"4"'/>);fireEvent.click(screen.getByText('Údaje o autorovi'));expect(await screen.findAllByText(/nebyla doložena přímá vazba/)).not.toHaveLength(0);expect(screen.queryByText(/Nesouvisející osoba/)).toBeNull();
});
