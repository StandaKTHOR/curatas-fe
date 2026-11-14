import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup} from '@testing-library/react';
import AttachmentCaptionEditor from './AttachmentCaptionEditor';
afterEach(cleanup);
it('uses the supplied scoped operation for owned UUID captions and reloads only after success',async()=>{
 const save=vi.fn().mockResolvedValue(undefined),reload=vi.fn().mockResolvedValue(undefined);
 render(<AttachmentCaptionEditor itemId={7} attachmentId="11111111-1111-4111-8111-111111111111" caption="Old" saveCaption={save} onSaved={reload}/>);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Nový popis'}});fireEvent.click(screen.getByRole('button'));await waitFor(()=>expect(reload).toHaveBeenCalledTimes(1));expect(save).toHaveBeenCalledWith('Nový popis');expect(screen.getByRole('status').textContent).toContain('uložen');
});
it('keeps the draft on rejected save and never invokes the successful readback',async()=>{
 const reload=vi.fn(),save=vi.fn().mockRejectedValue(new Error('Verze se změnila'));
 render(<AttachmentCaptionEditor itemId={7} attachmentId="11111111-1111-4111-8111-111111111111" caption="Old" saveCaption={save} onSaved={reload}/>);fireEvent.change(screen.getByRole('textbox'),{target:{value:'Draft'}});fireEvent.click(screen.getByRole('button'));await screen.findByText('Verze se změnila');expect(reload).not.toHaveBeenCalled();expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Draft');
});
