import {useEffect,useState} from 'react';
import {originalSession} from './originalAdapter';
import type {ItemOrigin} from '../scoped/scopedApi';
export default function CreationOrigin({itemId,parentEtag}:{itemId:number;parentEtag?:string}){
 const {api,signal}=originalSession();const [value,setValue]=useState<ItemOrigin|null>(null),[error,setError]=useState('');
 useEffect(()=>{let alive=true;setValue(null);setError('');api.itemOrigin(itemId,signal).then(v=>{if(alive&&!signal.aborted){if(parentEtag&&parentEtag!==`"${v.itemVersion}"`)throw new Error('Verze metadat se změnila.');setValue(v);}}).catch(()=>{if(alive&&!signal.aborted)setError('Metadata založení se nepodařilo ověřit.');});return()=>{alive=false;};},[itemId,signal,parentEtag]);
 if(error)return <p role="status">{error}</p>;
 if(!value||value.origin!=='MES_CREATED'&&!value.modifiedAt)return null;
 return <dl aria-label="Založení v MES">{value.origin==='MES_CREATED'&&<><dt>Vytvořil v MES</dt><dd>{value.createdByLabel??(value.createdBy?`Uživatel #${value.createdBy}`:'Autor není dostupný')}</dd><dt>Datum založení v MES</dt><dd><time dateTime={value.createdAt!}>{value.createdAt}</time></dd></>}{value.modifiedAt&&<><dt>Změnil v MES</dt><dd>{value.modifiedByLabel??(value.modifiedBy?`Uživatel #${value.modifiedBy}`:'Autor není dostupný')}</dd><dt>Datum poslední doložené změny v MES</dt><dd><time dateTime={value.modifiedAt}>{value.modifiedAt}</time></dd></>}</dl>;
}
