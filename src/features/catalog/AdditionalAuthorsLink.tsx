import {originalCanEdit} from './originalEdit';

/** Navigation to the existing UUID editor; never appends legacy text parties. */
export default function AdditionalAuthorsLink({itemId,readOnly,blocked,onOpen}:{itemId?:number;readOnly:boolean;blocked:boolean;onOpen:()=>void}){
 const enabled=!!itemId&&!readOnly&&!blocked&&originalCanEdit('professional')&&import.meta.env.VITE_CURRENT_AUTHORS_ENABLED==='true';
 const reason=!itemId?'Další současná přiřazení lze přidat po uložení nového předmětu.':blocked?'Nejprve uložte rozpracované změny a dokončete probíhající operaci.':!enabled?'Úprava současných autorů není v tomto kontextu povolena.':'Otevřít současné autory a role na kartě Vznik.';
 return <button type="button" data-scoped-navigation disabled={!enabled} title={reason} onClick={()=>{if(enabled)onOpen();}} className="text-[10px] font-bold text-gray-600 hover:text-gray-900 underline">+ Další role / tvůrce</button>;
}
