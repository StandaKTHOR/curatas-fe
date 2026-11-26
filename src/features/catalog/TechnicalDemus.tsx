import {createContext,useContext,useState,type ReactNode,type DetailsHTMLAttributes} from 'react';
import {createPortal} from 'react-dom';
import './itemCardCompact.css';
const Target=createContext<HTMLElement|null|undefined>(undefined);
const Inside=createContext(false);
export const useCleanItemCard=()=>useContext(Target)!==undefined;
/** Disclosure owns presentation only. Original component state, requests and save handlers stay intact. */
export function TechnicalDemusProvider({children}:{children:ReactNode}){
 const [target,setTarget]=useState<HTMLDivElement|null>(null);
 return <Target.Provider value={target}><div data-clean-item-card="true">{children}<details data-demus-technical="true"><summary>Technické údaje DEMUS</summary><p>Doklad původu ukazuje, ze kterého záznamu byl údaj převzat. Identifikátor a kontrolní otisk umožňují najít přesný záznam i při shodném názvu. Odborné úpravy se ukládají v příslušných záložkách a původní doklady zůstávají zachované.</p><div ref={setTarget}/></details></div></Target.Provider>;
}
export default function TechnicalDemus({title,children,...props}:{title:string;children:ReactNode}&Omit<DetailsHTMLAttributes<HTMLDetailsElement>,'title'>){
 const target=useContext(Target),inside=useContext(Inside);
 const content=<details {...props} data-technical-entry="true"><summary>{title}</summary>{children}</details>;
 if(inside)return content;
 const owned=<Inside.Provider value>{content}</Inside.Provider>;
 if(target)return createPortal(owned,target);
 if(target===null)return null;
 return <details data-demus-technical="true"><summary>Technické údaje DEMUS</summary>{owned}</details>;
}
