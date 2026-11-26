import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Help,{helpContext} from './Help';
import {topics,tabGuides} from './content';
beforeEach(()=>{
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(){this.setAttribute('open','');}});
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(){this.removeAttribute('open');}});
 Element.prototype.scrollIntoView=vi.fn();
});
afterEach(()=>vi.restoreAllMocks());
it('contains all twenty actual tabs and complete chapters with valid related topics',()=>{
 expect(tabGuides).toHaveLength(20);expect(new Set(tabGuides.map(row=>row[0])).size).toBe(20);
 for(const topic of topics){expect(topic.sections.length).toBeGreaterThan(0);for(const related of topic.related)expect(topics.some(t=>t.id===related)).toBe(true);}
});
it('uses catalog type and active professional tab and falls back to the index',()=>{
 expect(helpContext('/admin/dictionaries','?type=LOCALITY')).toBe('locality');
 expect(helpContext('/unknown','')).toBe('home');
 const view=render(<button data-tab-name="Míry" aria-pressed="true">Míry</button>);
 expect(helpContext('/admin/items/edit/1001','')).toBe('measures');view.unmount();
});
it('opens with F1, searches without accents, navigates chapters, restores focus and keeps an editor mounted',async()=>{
 const user=userEvent.setup();const view=render(<><input aria-label="Draft" defaultValue="Rozepsaný předmět"/><button data-tab-name="MatTech" aria-pressed="true">MatTech</button><Help/></>);
 const draft=screen.getByLabelText('Draft');draft.focus();
 fireEvent.keyDown(window,{key:'F1'});expect(await screen.findByRole('dialog')).toBeVisible();
 await user.type(screen.getByRole('searchbox'),'soubezna');
 await user.click(screen.getAllByRole('button',{name:'Editace, ukládání a řešení problémů'})[0]);
 expect(screen.getByRole('heading',{name:'Souběžná editace'})).toBeVisible();
 await user.click(screen.getByRole('button',{name:'Zavřít nápovědu'}));
 await waitFor(()=>expect(draft).toHaveFocus());expect(screen.getByLabelText('Draft')).toBe(draft);expect(draft).toHaveValue('Rozepsaný předmět');
 expect(view.container.querySelector('[data-tab-name]')).toHaveAttribute('aria-pressed','true');
 await user.click(screen.getByRole('button',{name:/Nápověda/}));
 fireEvent(screen.getByRole('dialog'),new Event('cancel',{cancelable:true}));
 await waitFor(()=>expect(screen.getByRole('button',{name:/Nápověda/})).toHaveFocus());
});
