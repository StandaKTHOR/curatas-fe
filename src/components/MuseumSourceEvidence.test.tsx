import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe,it,expect,vi} from 'vitest';
import {SourceAcquisitionView,VocabularyAssociations,LineageBrowser} from './MuseumSourceEvidence';
import {QuantityEvidence} from './DemusSourceIdentity';
import {getDemusLineage} from '../lib/api';
vi.mock('../lib/api',()=>({getDemusLineage:vi.fn()}));

describe('staff-only source evidence presentation',()=>{
    it('shows a neutral quantity discrepancy and keeps unknown counts unknown',()=>{
        const {rerender}=render(<QuantityEvidence sourceQuantity={2} quantity={1}/>);
        expect(screen.getByRole('status')).toHaveTextContent('2 / 1');
        rerender(<QuantityEvidence sourceQuantity={null} quantity={null}/>);
        expect(screen.queryByRole('status')).toBeNull();
        expect(screen.getAllByText('—')).toHaveLength(2);
    });
    it('preserves raw acquisition precision and a false boolean',()=>{
        render(<SourceAcquisitionView data={{acquisitionMethod:'dar',acquisitionDateRaw:'1937',acquiredFrom:null,documentNumber:null,circumstances:' text ',accessionFlag:false}}/>);
        expect(screen.getByText('1937')).toBeInTheDocument();
        expect(screen.getByText('Ne')).toBeInTheDocument();
        expect(screen.queryByText('1937-01-01')).toBeNull();
    });
    it('distinguishes provenance and missing role without guessing hierarchy',()=>{
        render(<VocabularyAssociations itemId={1} data={[{dictionaryId:281,type:'MATERIAL',code:'hedvábí',label:'hedvábí',role:null,associationOrigin:'CURRENT_OR_UNVERIFIED',dictionarySourceRecord:null,sourceRecords:['source-a'],hasMoreSourceRecords:true}]}/>);
        expect(screen.getByText('Současná / neověřená vazba')).toBeInTheDocument();
        expect(screen.getByText('Zdrojový výřez (1) — neúplný')).toBeInTheDocument();
        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });
    it('navigates bounded lineage pages through the actual API client contract',async()=>{
        vi.mocked(getDemusLineage).mockResolvedValueOnce({offset:0,limit:20,hasMore:true,records:[]}).mockResolvedValueOnce({offset:20,limit:20,hasMore:false,records:[]});
        render(<LineageBrowser category="items" id={17}/>);
        await userEvent.click(screen.getByRole('button',{name:'Otevřít zdrojovou historii'}));
        await userEvent.click(await screen.findByRole('button',{name:'Další výřez'}));
        expect(getDemusLineage).toHaveBeenLastCalledWith('items',17,20,20);
        expect(await screen.findByRole('button',{name:'Další výřez'})).toBeDisabled();
    });
});
