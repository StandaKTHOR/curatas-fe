import {createContext,useContext,useId,useLayoutEffect,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
export const TopOptionsGroup=createContext<{active:string|null;setActive:(id:string|null)=>void}|null>(null);
const Owner=createContext<string|null>(null);
/** Controlled disclosure: one shared supplementary row; form fields remain mounted. */
export default function TopPanelOptions({children,label='Možnosti',exclusive=true,disabled=false}:{children:ReactNode;label?:string;exclusive?:boolean;disabled?:boolean}){
 const id='item-options-'+useId().replace(/:/g,'');const group=useContext(TopOptionsGroup),parent=useContext(Owner);
 const [localOpen,setLocalOpen]=useState(false),[target,setTarget]=useState<HTMLElement|null>(null);
 const open=exclusive&&group?group.active===id:localOpen&&(!parent||!group||group.active===parent);
 const setOpen=(value:boolean)=>exclusive&&group?group.setActive(value?id:null):setLocalOpen(value);
 useLayoutEffect(()=>{setTarget(document.getElementById('item-top-options-host'));},[]);
 const content=<Owner.Provider value={exclusive?id:parent}><fieldset disabled={disabled} id={id} data-top-option data-scoped-reference-editor hidden={!open} data-top-popup>{children}</fieldset></Owner.Provider>;
 return <details open={open} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);e.currentTarget.querySelector('summary')?.focus();e.stopPropagation();}}}><summary aria-controls={id} aria-expanded={open} onClick={e=>{e.preventDefault();setOpen(!open);}}>{label}</summary>{target?createPortal(content,target):content}</details>;
}
