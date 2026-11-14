import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import CurrentHistory from './CurrentHistory';
const mocks=vi.hoisted(()=>({api:{currentHistory:vi.fn(),saveCurrentHistory:vi.fn()},canEdit:true}));
const signal=new AbortController().signal;
vi.mock('./originalAdapter',()=>({originalSession:()=>({api:mocks.api,signal,catalog:{id:1}})}));
vi.mock('./originalEdit',()=>({originalCanEdit:()=>mocks.canEdit}));
const entry={id:'11111111-1111-4111-8111-111111111111',eventType:'REVISION' as const,eventDate:'2026-11-06',description:'Žluťoučká revize'};
const session=()=>({etag:'"0"',busy:false,scopedCurrent:{etag:'"0"'}} as any);
beforeEach(()=>{mocks.api.currentHistory.mockReset();mocks.api.saveCurrentHistory.mockReset();mocks.canEdit=true;mocks.api.currentHistory.mockResolvedValue({items:[entry],etag:'"0"'});});
afterEach(cleanup);
it('loads current history separately and read-only does not allow writes',async()=>{
 render(<CurrentHistory itemId={1001} editSession={session()} readOnly/>);await screen.findByText('Žluťoučká revize');expect(screen.getByRole('button',{name:'Upravit událost'})).toBeDisabled();expect(mocks.api.saveCurrentHistory).not.toHaveBeenCalled();
});
it('updates then confirms GET before reporting success and preserves item revision',async()=>{
 const edit=session(),onSave=vi.fn();render(<CurrentHistory itemId={1001} editSession={edit} readOnly={false} onSave={onSave}/>);await screen.findByText('Žluťoučká revize');fireEvent.click(screen.getByRole('button',{name:'Upravit událost'}));fireEvent.change(screen.getByLabelText('Popis současné události'),{target:{value:'Potvrzená změna'}});
 const result={items:[{...entry,description:'Potvrzená změna'}],etag:'"1"'};mocks.api.saveCurrentHistory.mockResolvedValue(result);mocks.api.currentHistory.mockResolvedValue(result);fireEvent.click(screen.getByRole('button',{name:'Uložit událost historie'}));
 await screen.findByText('Historie byla uložena a znovu načtena.');expect(edit.etag).toBe('"1"');expect(onSave).toHaveBeenCalledOnce();expect(mocks.api.saveCurrentHistory.mock.calls[0][1]).toBe('"0"');expect(mocks.api.currentHistory.mock.calls.length).toBeGreaterThan(1);
});
it('does not pretend success if save or confirming GET fails, keeping the entered draft',async()=>{
 render(<CurrentHistory itemId={1001} editSession={session()} readOnly={false}/>);await screen.findByText('Žluťoučká revize');fireEvent.change(screen.getByLabelText('Popis současné události'),{target:{value:'Neztratit rozepsaný text'}});mocks.api.saveCurrentHistory.mockRejectedValue(new Error('Konflikt verze'));fireEvent.click(screen.getByRole('button',{name:'Uložit událost historie'}));await screen.findByRole('alert');expect(screen.getByLabelText('Popis současné události')).toHaveValue('Neztratit rozepsaný text');expect(screen.queryByText('Historie byla uložena a znovu načtena.')).toBeNull();
});
it('rejects a stale item response after changing item',async()=>{
 let complete!:(value:any)=>void;mocks.api.currentHistory.mockImplementationOnce(()=>new Promise(resolve=>{complete=resolve;}));
 const view=render(<CurrentHistory itemId={1001} editSession={session()} readOnly/>);mocks.api.currentHistory.mockResolvedValue({items:[],etag:'"0"'});view.rerender(<CurrentHistory itemId={1002} editSession={session()} readOnly/>);await waitFor(()=>expect(mocks.api.currentHistory).toHaveBeenCalledWith(1002,signal));complete({items:[entry],etag:'"0"'});await Promise.resolve();expect(screen.queryByText('Žluťoučká revize')).toBeNull();
});
