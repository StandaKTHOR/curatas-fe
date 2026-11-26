import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {BookOpen} from 'lucide-react';
import {topics,tabGuides} from './content';
import {cloneGroups} from '../catalog/cloneGroups';
import './help.css';
import './responsive.css';
import './helpTrigger.css';
export function helpContext(path=location.pathname,search=location.search){
 if(path.includes('dictionaries')){const type=new URLSearchParams(search).get('type');return type==='LOCALITY'?'locality':['AUTHOR','DIRECTORY','AUTHOR_ROLE','DETERMINER'].includes(type??'')?'people':['MATERIAL','TECHNIQUE'].includes(type??'')?'mattech':'dictionaries';}
 if(path.includes('parties'))return 'people';if(path.includes('literature'))return 'references';
 if(/\/(items|detail)\/\d+|\/items\/(view|edit)\//.test(path)){
  const active=document.querySelector<HTMLElement>('[data-tab-name][aria-pressed="true"]')?.dataset.tabName;
  const guide=tabGuides.find(([name])=>name===active);return guide?(['tabs','evidence'].includes(guide[3])||guide[0]==='Umístění'?'tab-'+guide[0]:guide[3]):(path.includes('/edit/')?'saving':'items');
 }
 if(path.includes('/items/new'))return 'items';if(path==='/admin/items'||path==='/')return 'items';if(path==='/login')return 'start';return 'home';
}
const key=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('cs');
export default function Help({standalone=false}:{standalone?:boolean}){
 const [open,setOpen]=useState(false),[topic,setTopic]=useState('home'),[query,setQuery]=useState('');
 const dialog=useRef<HTMLDialogElement>(null),returnFocus=useRef<HTMLElement|null>(null),heading=useRef<HTMLHeadingElement>(null);
 function show(){if(dialog.current?.open)return;returnFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setTopic(helpContext());setQuery('');setOpen(true);}
 function close(){dialog.current?.close();setOpen(false);const origin=returnFocus.current;requestAnimationFrame(()=>{if(origin?.isConnected)origin.focus();});}
 useEffect(()=>{const listener=(event:KeyboardEvent)=>{if(event.defaultPrevented||event.isComposing||event.keyCode===229)return;if(event.key==='Escape'&&dialog.current?.open){event.preventDefault();event.stopImmediatePropagation();close();return;}if(event.ctrlKey||event.metaKey||event.shiftKey||event.getModifierState('AltGraph'))return;const shortcut=event.key==='F1'&&!event.altKey||event.altKey&&event.key.toLowerCase()==='h';if(shortcut){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)show();}};window.addEventListener('keydown',listener,true);return()=>window.removeEventListener('keydown',listener,true);},[]);
 useEffect(()=>{if(open&&!dialog.current?.open)dialog.current?.showModal();},[open]);
 const current=topics.find(value=>value.id===topic)??topics[0];
 const filtered=topics.filter(value=>key(JSON.stringify(value)).includes(key(query.trim())));
 function select(id:string){setTopic(id);setQuery('');requestAnimationFrame(()=>{heading.current?.focus();heading.current?.scrollIntoView({block:'nearest'});});}
 return <><button className={'mes-help-trigger'+(standalone?' mes-help-login':'')} type="button" onClick={show} aria-haspopup="dialog" aria-label="Nápověda MES" title="Nápověda MES (Alt+H nebo F1 podle prohlížeče)" aria-keyshortcuts="Alt+H F1"><BookOpen size={18} aria-hidden="true" focusable="false"/><span className="mes-help-trigger-label">Nápověda</span></button>
 {createPortal(<dialog ref={dialog} className="mes-help" aria-labelledby="mes-help-title" onCancel={event=>{event.preventDefault();close();}}>
  {open&&<><header><div><p>MES · Uživatelská příručka</p><h2 id="mes-help-title" ref={heading} tabIndex={-1}>{current.title}</h2></div><button type="button" onClick={close} aria-label="Zavřít nápovědu">Zavřít ×</button></header>
  <label className="mes-help-search">Hledat v celé nápovědě<input autoFocus type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Např. uložení, materiál, publikace…"/></label>
  <div className="mes-help-layout"><nav aria-label="Obsah nápovědy"><h3>{query?'Výsledky hledání':'Obsah'}</h3>{filtered.map(value=><button type="button" key={value.id} aria-current={topic===value.id?'page':undefined} onClick={()=>select(value.id)}>{value.title}</button>)}{!filtered.length&&<p role="status">Žádné téma neodpovídá. Zkuste kratší výraz.</p>}</nav>
  <article aria-label="Kapitola nápovědy"><p className="mes-help-intro">{current.intro}</p>{current.sections.map(([title,paragraphs])=><section key={title}><h3>{title}</h3><ol>{paragraphs.map(text=><li key={text}>{text}</li>)}</ol></section>)}
  {topic==='clone'&&<section><h3>Podporované skupiny kopie</h3><ul>{cloneGroups.map(([id,label])=><li key={id}>{label}</li>)}</ul></section>}
  <section><h3>Související témata</h3>{current.related.map(id=><button type="button" key={id} onClick={()=>select(id)}>{topics.find(value=>value.id===id)?.title}</button>)}</section>
  <section><h3>Klávesové zkratky</h3><p>Nápovědu MES otevřete tlačítkem Nápověda nebo klávesovou zkratkou Alt+H. V prohlížečích, které předávají klávesu F1 webové aplikaci, lze použít také F1. Escape zavře nápovědu. Tab a Shift+Tab přecházejí mezi ovladači dialogu. Enter nebo mezerník aktivují tlačítko. V běžných výběrech používejte nativní šipky a potvrzení; rozepsaný formulář se otevřením nápovědy neukládá.</p></section></article></div></>}
 </dialog>,document.body)}</>;
}
