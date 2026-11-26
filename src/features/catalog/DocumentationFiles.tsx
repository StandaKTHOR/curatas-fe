import AttachmentCaptionEditor from '../../components/AttachmentCaptionEditor';
import {useState} from 'react';
import PhotoPreview from '../../components/PhotoPreview';
export interface DocumentationFile {id:string;name:string;kind:'IMAGE'|'ATTACHMENT';caption?:string|null;mimeType?:string;byteSize?:number;download:()=>Promise<void>;preview?:(signal:AbortSignal)=>Promise<Blob>}
/** One read-only overview of the existing media identities; no second upload or storage. */
export default function DocumentationFiles({files,loaded,busy,error,more,onMore,onPhotos,onAttachments,itemId,onUpload,onCaption}:{files:DocumentationFile[];loaded:boolean;busy:boolean;error:string;more:boolean;onMore:()=>void;onPhotos:()=>void;onAttachments:()=>void;itemId?:number;onUpload?:(file:File,kind:DocumentationFile['kind'],caption:string)=>Promise<void>;onCaption?:(id:string,caption:string)=>Promise<void>}){
 const [downloadError,setDownloadError]=useState('');
 const [draftFile,setDraftFile]=useState<File|null>(null),[kind,setKind]=useState<DocumentationFile['kind']>('ATTACHMENT');
 const [caption,setCaption]=useState(''),[sending,setSending]=useState(false);
 const [fileInput,setFileInput]=useState<HTMLInputElement|null>(null);
 async function upload(){
  if(!onUpload||!draftFile||sending)return;
  setSending(true);setDownloadError('');
  try{await onUpload(draftFile,kind,caption);setDraftFile(null);setCaption('');if(fileInput)fileInput.value='';}
  catch(error){setDownloadError((error as Error).message);}
  finally{setSending(false);}
 }
 return <section aria-label="Soubory k odborné dokumentaci"><h3>Fotografie a přílohy k dokumentaci</h3>{onUpload&&<details data-scoped-media><summary>Přidat soubor dokumentace</summary>
  <fieldset disabled={sending}><legend>Nový soubor</legend>
   <label>Druh souboru<select aria-label="Druh souboru dokumentace" value={kind} onChange={e=>setKind(e.target.value==='IMAGE'?'IMAGE':'ATTACHMENT')}><option value="ATTACHMENT">Příloha</option><option value="IMAGE">Fotografie</option></select></label>
   <label>Soubor<input ref={setFileInput} type="file" aria-label="Soubor dokumentace" accept={kind==='IMAGE'?'image/*':undefined} onChange={e=>setDraftFile(e.target.files?.[0]??null)}/></label>
   <label>Popis<input aria-label="Popis souboru dokumentace" value={caption} maxLength={1000} onChange={e=>setCaption(e.target.value)}/></label>
   <button type="button" disabled={!draftFile} onClick={()=>void upload()}>Nahrát do dokumentace</button>
  </fieldset>
 </details>}{busy&&<p role="status">Načítání souborů dokumentace…</p>}{(error||downloadError)&&<p role="alert">{error||downloadError}</p>}{loaded&&!busy&&!error&&!files.length&&<p>Na načtené stránce nejsou žádné soubory. Úplnost závisí na dočtení všech stran.</p>}<div style={{overflowX:'auto'}}><table className="demus-datasheet" aria-label="Soubory dokumentace"><thead><tr><th>Druh</th><th>Název</th><th>Popis</th><th>Formát</th><th>Velikost</th><th>Otevřít</th></tr></thead><tbody>{files.map(file=><tr key={file.id}><td>{file.kind==='IMAGE'?'Fotografie':'Příloha'}</td><td>{file.name}</td><td style={{whiteSpace:'pre-wrap'}}>{file.caption??'—'}{onCaption&&itemId&&(!file.id.startsWith('legacy:'))&&
  <AttachmentCaptionEditor itemId={itemId} attachmentId={file.id} caption={file.caption??null} saveCaption={text=>onCaption(file.id,text)} onSaved={async()=>{}}/>}</td><td>{file.mimeType??'—'}</td><td>{file.byteSize==null?'—':`${file.byteSize} B`}</td><td>{file.preview&&<PhotoPreview src="" alt={file.caption||file.name} load={file.preview}/>}<button className="demus-save" data-scoped-read type="button" onClick={()=>{setDownloadError('');void file.download().catch(e=>setDownloadError((e as Error).message));}}>Stáhnout {file.name}</button></td></tr>)}</tbody></table></div>{more&&<button className="demus-save" data-scoped-read type="button" disabled={busy} onClick={onMore}>Další soubory dokumentace</button>}<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button className="demus-save" data-scoped-navigation type="button" onClick={onPhotos}>Spravovat fotografie na kartě Foto</button><button className="demus-save" data-scoped-navigation type="button" onClick={onAttachments}>Spravovat soubory na kartě Přílohy</button></div></section>;
}
