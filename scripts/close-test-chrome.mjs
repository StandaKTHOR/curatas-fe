export async function closeTestChrome(chrome){
 if(!chrome)return;const process=chrome.process();const exited=new Promise(resolve=>{if(process.exitCode!==null||process.signalCode!==null)resolve();else process.once('exit',resolve);});
 void chrome.close().catch(()=>{});
 const ok=await Promise.race([exited.then(()=>true),new Promise(resolve=>setTimeout(()=>resolve(false),8000))]);
 if(!ok){await chrome.kill();await exited;}
}
