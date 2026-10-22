import {useEffect} from 'react';
/** Explicit navigation may discard private drafts; authentication changes always clear them. */
export function useDraftWarning(dirty:boolean){
 useEffect(()=>{
  if(!dirty)return;
  const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
  const discard=(event:Event)=>{if(!window.confirm('Opustit neuložený formulář v této evidenci? Probíhající zápis se může dokončit pouze v původní evidenci.'))event.preventDefault();};
  const link=(event:MouseEvent)=>{const anchor=event.target instanceof Element?event.target.closest('a[href]'):null;if(!anchor)return;
   const target=new URL(anchor.getAttribute('href')!,window.location.href);if(target.href===window.location.href)return;
   if(!window.confirm('Opustit neuložený formulář? Nejistý výsledek zápisu nejprve ověřte.')){event.preventDefault();event.stopPropagation();}
  };
  window.addEventListener('beforeunload',unload);window.addEventListener('curatas:catalog-discard',discard);
  document.addEventListener('click',link,true);
  return()=>{window.removeEventListener('beforeunload',unload);window.removeEventListener('curatas:catalog-discard',discard);document.removeEventListener('click',link,true);};
 },[dirty]);
}
