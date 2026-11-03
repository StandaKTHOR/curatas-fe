import {originalSession} from './originalAdapter';
export interface ScopedDictionaryNode {id:string;label:string;code:string|null;children:ScopedDictionaryNode[]}
/** Catalog-created UUID hierarchy only; no DEMUS or legacy-ID translations. */
export async function originalDictionaryTree(type:'MATERIAL'|'TECHNIQUE',cancel:AbortSignal){
 const {api,signal,catalog}=originalSession();
 if(!catalog.capabilities?.includes('dictionary.read'))throw new Error('Čtení číselníku vyžaduje dictionary.read. Vazba předmětu zůstává neověřená.');
 const combined=AbortSignal.any([signal,cancel]);await api.dictionaryMetadata(type,combined);
 const nodes=new Map<string,ScopedDictionaryNode>(),parents=new Map<string,string|null>();let after:string|undefined;
 for(let batch=0;batch<10;batch++){
  const page=await api.dictionaryValues(type,combined,after);
  for(const value of page.items){if(nodes.has(value.id))throw new Error('Duplicitní identita číselníku.');nodes.set(value.id,{id:value.id,label:value.label,code:value.code,children:[]});parents.set(value.id,value.parentId);}
  if(page.nextAfterId===null){
   const roots:ScopedDictionaryNode[]=[];
   for(const [id,node] of nodes){const seen=new Set([id]);let parent=parents.get(id);while(parent){if(seen.has(parent)||!nodes.has(parent))throw new Error('Neúplná nebo cyklická hierarchie číselníku.');seen.add(parent);parent=parents.get(parent);}
    const owner=parents.get(id);if(owner)nodes.get(owner)!.children.push(node);else roots.push(node);
   }
   if(combined.aborted)throw new Error('Request cancelled');return roots;
  }
  after=page.nextAfterId;
 }
 throw new Error('Číselník přesahuje omezené čtení 1 000 hodnot. Neúplná hierarchie není zobrazena.');
}
