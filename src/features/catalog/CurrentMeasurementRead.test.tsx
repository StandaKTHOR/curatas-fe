import {render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import CurrentMeasurementRead from './CurrentMeasurementRead';
import {scopedApi} from '../scoped/scopedApi';
afterEach(()=>vi.unstubAllGlobals());
const response=(value:unknown)=>new Response(JSON.stringify({catalogId:71,itemId:101,itemVersion:0,origin:'CURATOR_STATEMENT_NOT_SOURCE',curatorValue:value}),{headers:{ETag:'"0"'}});
it('displays exact decimal text, Unicode, empty unit and read-only controls without a write',async()=>{
 const f=vi.fn().mockResolvedValue(response({label:'  Žlutá míra ',decimalText:'12345678901234567890.0000000000001',unit:''}));vi.stubGlobal('fetch',f);
 render(<CurrentMeasurementRead api={scopedApi(71,'t')} itemId={101} onFatal={vi.fn()}/>);
 expect(await screen.findByDisplayValue('12345678901234567890.0000000000001')).toHaveAttribute('readonly');expect(screen.getByRole('textbox',{name:'Označení'})).toHaveValue('  Žlutá míra ');expect(f.mock.calls[0][1].method).toBeUndefined();expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
it('reports only the absence of a current measurement, never the absence of historical dimensions',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(null)));render(<CurrentMeasurementRead api={scopedApi(71,'t')} itemId={101} onFatal={vi.fn()}/>);
 expect(await screen.findByText(/Zdrojové míry tím nejsou dotčeny/)).toBeInTheDocument();expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});
it('propagates a revoked grant and never renders a current value on denial',async()=>{
 const fatal=vi.fn();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('',{status:403})));render(<CurrentMeasurementRead api={scopedApi(71,'t')} itemId={101} onFatal={fatal}/>);
 await waitFor(()=>expect(fatal).toHaveBeenCalledWith(403));expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});
