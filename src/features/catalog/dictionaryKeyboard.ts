import type {KeyboardEvent} from 'react';
/** Typing in a native selector starts explicit search; it never chooses or saves a value. */
export function dictionaryTypeToSearch(event:KeyboardEvent<HTMLSelectElement>,type:string,search:(value:string)=>void){
 if(event.ctrlKey||event.altKey||event.metaKey||event.key===' '||Array.from(event.key).length!==1||event.nativeEvent.isComposing)return;
 event.preventDefault();
 const input=Array.from(document.querySelectorAll<HTMLInputElement>('input[aria-label]')).find(n=>n.dataset.dictionarySearch===type||n.getAttribute('aria-label')===`Hledat autoritu ${type}`);
 if(!input||input.disabled)return;
 if(!input.getClientRects().length)event.currentTarget.parentElement?.querySelector<HTMLElement>('summary')?.click();
 search(event.key);
 requestAnimationFrame(()=>{input.focus();input.setSelectionRange(input.value.length,input.value.length);});
}
