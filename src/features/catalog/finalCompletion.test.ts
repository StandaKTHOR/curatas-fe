import {afterEach,expect,it,vi} from 'vitest';
import {printDocument,firstPrintImage} from './printDocument';
import {fieldHelp,installFieldHelp} from './contextHelp';
import {professionalDelta,professionalDraft} from '../../lib/professional';
afterEach(()=>{vi.restoreAllMocks();document.body.innerHTML='';});
it('finds a photograph after the first metadata page and distinguishes no image from an API failure',async()=>{
 const image={kind:'IMAGE',id:'photo'};const load=vi.fn().mockResolvedValueOnce({items:[{kind:'DOCUMENT'}],nextAfterId:'cursor'}).mockResolvedValueOnce({items:[image],nextAfterId:null});
 expect(await firstPrintImage(load)).toBe(image);expect(load.mock.calls).toEqual([[undefined],['cursor']]);
 expect(await firstPrintImage(async()=>({items:[],nextAfterId:null}))).toBeUndefined();
 await expect(firstPrintImage(async()=>{throw new Error('Forbidden');})).rejects.toThrow('Forbidden');
});
it('rejects repeated cursors and a photo search exceeding its bounded metadata limit',async()=>{
 await expect(firstPrintImage(async()=>({items:[],nextAfterId:'same'}))).rejects.toThrow('stránkování');
 let cursor=0;await expect(firstPrintImage(async()=>({items:[],nextAfterId:String(++cursor)}))).rejects.toThrow('1000 příloh');expect(cursor).toBe(20);
});
it('prints exact selected columns, current values first, labelled historical fallback and escaped untrusted text',()=>{
 const html=printDocument([{id:1,title:'<script>alert(1)</script>',fund:'Současný fond',sourceInventory:{Fond_S:'Historický fond'}},{id:2,title:null,sourceInventory:{Predmet_S:'Židle',Fond_S:'Nábytek'}}],['title','fund'],'list');
 expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>');expect(html).toContain('Současný fond');expect(html).not.toContain('Historický fond');expect(html).toContain('Židle (DEMUS)');expect(html).toContain('Nábytek (DEMUS)');expect(html).not.toContain('Fyzický stav');
});
it('supports technical A5 and paired A4, embedded authenticated photos only, no data truncation',()=>{
 const row={id:1,description:'Ž'.repeat(5000),primaryImageUrl:'https://untrusted/photo'};const html=printDocument([row],['description'],'two-a5',{1:'data:image/png;base64,AA=='});
 expect(html).toContain('A4 portrait');expect(html).toContain('min-height:148mm');expect(html).toContain('Ž'.repeat(5000));expect(html).toContain('odborně neschválený');expect(html).not.toContain('https://untrusted');expect(html).toContain('data:image/png;base64,AA==');expect(printDocument([row],['description'],'a5')).toContain('A5 landscape');
 for(const columns of [[],['unknown'],['title','title']])expect(()=>printDocument([row],columns,'list')).toThrow();expect(()=>printDocument([],['title'],'list')).toThrow();
});
it('F1 shows source metadata and read-only boundary without inventing meaning or modifying the form',()=>{
 const stop=installFieldHelp(),alert=vi.spyOn(window,'alert').mockImplementation(()=>{});document.body.innerHTML='<input id="objectType" value="židle"><input data-demus-field="Predmet_S" data-demus-table="Sbirky" readonly value="kredenc">';
 document.querySelector('input')!.dispatchEvent(new KeyboardEvent('keydown',{key:'F1',bubbles:true,cancelable:true}));expect(alert).toHaveBeenLastCalledWith(expect.stringContaining('současný typ předmětu'));
 document.querySelectorAll('input')[1].dispatchEvent(new KeyboardEvent('keydown',{key:'F1',bubbles:true,cancelable:true}));expect(alert).toHaveBeenLastCalledWith(expect.stringContaining('Sbirky.Predmet_S'));expect(alert).toHaveBeenLastCalledWith(expect.stringContaining('pouze čtení'));expect(document.querySelector('input')!.value).toBe('židle');stop();expect(fieldHelp('unknown',true)).toContain('není doloženo');
});
it('preserves per-row UUIDs, order and explicit null removal in professional drafts and deltas',()=>{
 const record:any={kind:'MATERIAL_TECHNIQUE',payload:{Material_MT:'Historical text separate',materialAuthorityId:'a',techniqueAuthorityId:null,Poradi_MT:2}};
 const draft=professionalDraft(record);expect(draft.materialAuthorityId).toBe('a');expect(professionalDelta(record.kind,draft,record)).toEqual({});expect(professionalDelta(record.kind,{...draft,materialAuthorityId:null,Poradi_MT:0},record)).toEqual({Poradi_MT:0,materialAuthorityId:null});expect(record.payload.materialAuthorityId).toBe('a');
});
