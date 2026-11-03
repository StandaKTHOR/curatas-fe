import {useEffect,useState} from 'react';
import {originalSession} from './originalAdapter';
import type {ItemOrigin} from '../scoped/scopedApi';
export default function CreationOrigin({itemId}:{itemId:number}){
 const {api,signal}=originalSession();const [value,setValue]=useState<ItemOrigin|null>(null),[error,setError]=useState('');
 useEffect(()=>{let alive=true;setValue(null);setError('');api.itemOrigin(itemId,signal).then(v=>{if(alive&&!signal.aborted)setValue(v);}).catch(()=>{if(alive&&!signal.aborted)setError('Metadata založení se nepodařilo ověřit.');});return()=>{alive=false;};},[itemId,signal]);
 if(error)return <p role="status">{error}</p>;
 if(value?.origin!=='MES_CREATED')return null;
 return <dl aria-label="Založení v MES"><dt>Vytvořil v MES</dt><dd>{value.createdBySubject??value.createdBy??'Autor není dostupný'}</dd><dt>Datum založení v MES</dt><dd><time dateTime={value.createdAt!}>{value.createdAt}</time></dd></dl>;
}
