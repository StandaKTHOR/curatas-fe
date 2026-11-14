import fields from './demusFieldHelp.json';
const sourceNames:Record<string,string>={inventoryNumber:'Rada_S / PorC_S / Lomeni_S / StatSpr_S / Spravce_S / Odd_S',title:'Titul_S',objectType:'Predmet_S',description:'Popis_S',material:'Material_S',technique:'Technika_S',materialNote:'PoznMT_S',author:'Autor_S',datingText:'Datace_S'};
export function fieldHelp(key:string,readOnly:boolean,table?:string){
 key=key==='current-object-type'?'objectType':key;
 const matches=fields.filter(f=>f.field===key&&(table===undefined||table.length===0||f.table===table));
 const source=matches.length?matches.map(f=>`${f.table}.${f.field} [${f.type}]`).join('\n'):sourceNames[key]??'Odpovídající historické pole není doloženo.';
 return `Nápověda: ${key}\nDEMUS: ${source}\n${readOnly?'Historický podklad — pouze čtení. Zdrojová identita, NULL a opakování zůstávají zachované.':'Současný údaj MES — editace jen podle oprávnění. Historické hodnoty nejsou automaticky přebírány ani ukládány.'}\nPůvod: katalogově omezené API; přesný artifact, řádek a lineage jsou v rozbalené DEMUS evidenci.\n${matches.length?'Odborný výklad nad rámec doloženého názvu pole není ověřen.':'Význam: '+(key==='title'?'současný titul / název, samostatně od typu předmětu.':key==='objectType'?'současný typ předmětu, samostatně od titulu.':'podle popisku stávajícího formuláře; nedoloženou historickou sémantiku nelze odhadovat.')}`;
}
export function installFieldHelp(){
 const listener=(event:KeyboardEvent)=>{if(event.key!=='F1')return;const target=event.target instanceof Element?event.target:null;
  const node=target?.closest<HTMLElement>('[data-demus-field],input[id],textarea[id],select[id]');if(!node)return;
  const key=node.dataset.demusField||node.id;if(!key)return;event.preventDefault();
  const control=node as HTMLInputElement;window.alert(fieldHelp(key,!!node.closest('[data-demus-source]')||control.readOnly||control.disabled,node.dataset.demusTable));
 };document.addEventListener('keydown',listener);return()=>document.removeEventListener('keydown',listener);
}
