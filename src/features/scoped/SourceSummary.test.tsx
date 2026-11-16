import {render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {scopedApi,ScopedError} from './scopedApi';
import SourceSummaryPanel from './SourceSummaryPanel';

afterEach(()=>vi.unstubAllGlobals());
const response=(body:any,tag='"0"')=>new Response(JSON.stringify(body),{headers:{ETag:tag}});
it.each([[0,false,'0','Ne'],[null,null,'Neuvedeno','Neuvedeno'],[2,true,'2','Ano']])('preserves native quantity %s and boolean %s without an edit control',async(count,flag,display,booleanDisplay)=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({catalogId:1,itemId:7,itemVersion:0,sourceQuantity:count,sourceAccessionFlag:flag})));
    render(<SourceSummaryPanel api={scopedApi(1,'token')} itemId={7} onFatal={vi.fn()}/>);
    expect(await screen.findByTestId('source-quantity')).toHaveTextContent(display as string);expect(screen.getByTestId('source-accession-flag')).toHaveTextContent(booleanDisplay as string);expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});
it('rejects foreign scope, a textual boolean and a mismatched ETag',async()=>{
    for(const [body,tag] of [[{catalogId:2,itemId:7,itemVersion:0,sourceQuantity:1,sourceAccessionFlag:true},'"0"'],[{catalogId:1,itemId:7,itemVersion:0,sourceQuantity:1,sourceAccessionFlag:'false'},'"0"'],[{catalogId:1,itemId:7,itemVersion:0,sourceQuantity:1,sourceAccessionFlag:false},'"1"']] as const){
        vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(body,tag)));await expect(scopedApi(1,'token').sourceSummary!(7,new AbortController().signal)).rejects.toThrow();
    }
});
it.each([401,403,404])('propagates %s without a legacy retry',async status=>{
    const fetcher=vi.fn().mockResolvedValue(new Response('{}',{status}));vi.stubGlobal('fetch',fetcher);
    await expect(scopedApi(1,'token').sourceSummary!(7,new AbortController().signal)).rejects.toBeInstanceOf(ScopedError);expect(fetcher).toHaveBeenCalledTimes(1);
});
