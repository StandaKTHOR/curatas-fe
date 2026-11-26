import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import Help from './Help';
beforeEach(()=>{
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:vi.fn(function(this:HTMLDialogElement){this.setAttribute('open','');})});
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(){this.removeAttribute('open');}});
 Element.prototype.scrollIntoView=vi.fn();
});
afterEach(()=>{vi.restoreAllMocks();window.history.replaceState(null,'','/');});
it.each(['h','H'])('Alt+%s opens the existing contextual dialog without submitting or changing the draft and selection',async key=>{
 window.history.replaceState(null,'','/admin/items/edit/1001');
 const submitted=vi.fn(e=>e.preventDefault());render(<><form onSubmit={submitted}><input aria-label="Draft" defaultValue="Rozepsaný předmět"/><select aria-label="Odborná identita" defaultValue="exact"><option value="exact">Stejná položka</option></select><button data-tab-name="Míry" aria-pressed="true">Míry</button></form><Help/></>);
 const draft=screen.getByLabelText('Draft');draft.focus();const event=new KeyboardEvent('keydown',{key,altKey:true,bubbles:true,cancelable:true});fireEvent(window,event);
 expect(event.defaultPrevented).toBe(true);expect(await screen.findByRole('heading',{name:'Míry a rozměry'})).toBeVisible();expect(submitted).not.toHaveBeenCalled();expect(draft).toHaveValue('Rozepsaný předmět');expect(screen.getByLabelText('Odborná identita')).toHaveValue('exact');
 fireEvent(screen.getByRole('dialog'),new Event('cancel',{cancelable:true}));await waitFor(()=>expect(draft).toHaveFocus());expect(screen.getByRole('button',{name:'Míry'})).toHaveAttribute('aria-pressed','true');
});
it.each([
 {key:'h'}, {key:'h',altKey:true,ctrlKey:true},{key:'h',altKey:true,metaKey:true},{key:'h',altKey:true,shiftKey:true},
 {key:'h',altKey:true,isComposing:true},{key:'h',altKey:true,keyCode:229},{key:'F1',ctrlKey:true},{key:'F1',altKey:true},
 {key:'Tab'},{key:'ArrowDown'},{key:'Enter'},{key:'Escape'},{key:'s',ctrlKey:true}
])('leaves other keyboard actions and composition native: %j',input=>{
 render(<Help/>);const event=new KeyboardEvent('keydown',{...input,bubbles:true,cancelable:true});fireEvent(window,event);expect(event.defaultPrevented).toBe(false);expect(document.querySelector('dialog')).not.toHaveAttribute('open');
});
it('does not capture AltGraph even when the browser reports Alt alone',()=>{
 render(<Help/>);const event=new KeyboardEvent('keydown',{key:'h',altKey:true,cancelable:true});Object.defineProperty(event,'getModifierState',{value:(name:string)=>name==='AltGraph'});fireEvent(window,event);expect(event.defaultPrevented).toBe(false);expect(document.querySelector('dialog')).not.toHaveAttribute('open');
});
it('suppresses held shortcuts and retains a single open dialog, query and original focus',async()=>{
 render(<><input aria-label="Origin"/><Help/></>);const origin=screen.getByLabelText('Origin');origin.focus();
 const held=new KeyboardEvent('keydown',{key:'h',altKey:true,repeat:true,cancelable:true});fireEvent(window,held);expect(held.defaultPrevented).toBe(true);expect(document.querySelector('dialog')).not.toHaveAttribute('open');
 fireEvent.keyDown(window,{key:'F1'});await screen.findByRole('searchbox');fireEvent.change(screen.getByRole('searchbox'),{target:{value:'publikace'}});
 fireEvent.keyDown(window,{key:'h',altKey:true});fireEvent.keyDown(window,{key:'F1',repeat:true});expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);expect(document.querySelectorAll('dialog')).toHaveLength(1);expect(screen.getByRole('searchbox')).toHaveValue('publikace');
 fireEvent(screen.getByRole('dialog'),new Event('cancel',{cancelable:true}));await waitFor(()=>expect(origin).toHaveFocus());
});
it('offers the book SVG, accessible name, exact tooltip, shortcut metadata and a non-submit action',()=>{
 render(<Help/>);const button=screen.getByRole('button',{name:'Nápověda MES'});expect(button).toHaveAttribute('type','button');expect(button).toHaveAttribute('title','Nápověda MES (Alt+H nebo F1 podle prohlížeče)');expect(button).toHaveAttribute('aria-keyshortcuts','Alt+H F1');expect(button.querySelector('svg')).toHaveAttribute('aria-hidden','true');expect(button).toHaveTextContent('Nápověda');expect(button.textContent).not.toContain('?');
 fireEvent.click(button);expect(document.querySelector('dialog')).toHaveAttribute('open');
});

it('Escape closes help with a populated search and restores the original editor focus',async()=>{
 render(<><input aria-label="Edited field" defaultValue="Zachovaná hodnota"/><Help/></>);const origin=screen.getByLabelText('Edited field');origin.focus();fireEvent.keyDown(window,{key:'h',altKey:true});const search=await screen.findByRole('searchbox');fireEvent.change(search,{target:{value:'publikace'}});search.focus();const escape=new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});fireEvent(search,escape);expect(escape.defaultPrevented).toBe(true);expect(document.querySelector('dialog')).not.toHaveAttribute('open');await waitFor(()=>expect(origin).toHaveFocus());expect(origin).toHaveValue('Zachovaná hodnota');
});
