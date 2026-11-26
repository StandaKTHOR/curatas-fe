import fs from 'node:fs';
import {chromium,expect} from '@playwright/test';
import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),base='http://127.0.0.1:18213';const results=[];let server,context;const deadline=Date.now()+6*60000;
const signal=(browser,stage,detail={})=>fs.writeFileSync(input.output+'/native-ready.json',JSON.stringify({browser,stage,...detail}));
async function wait(browser,stage){const path=input.output+'/native-'+browser+'-'+stage+'.done';while(!fs.existsSync(path)&&Date.now()<deadline)await new Promise(r=>setTimeout(r,200));if(!fs.existsSync(path))throw Error('Native keyboard deadline: '+browser+' '+stage);}
try{
 server=await startSyntheticHttp(input);
 for(const [name,options] of [['Chrome',{channel:'chrome'}],['Brave',{executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe'}]]){
  context=await chromium.launchPersistentContext(input.output+'/native-profile-'+name,{...options,headless:false,viewport:null,args:['--window-size=1920,1080']});await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const page=context.pages()[0]??await context.newPage();
  await page.goto(base+'/login');await page.locator('input[type=text]').fill('gen-root');await page.locator('input[type=password]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');await page.goto(base+'/admin/items/edit/1001?catalog=1&edit=professional');await expect(page.locator('#description')).toBeEnabled();await page.waitForLoadState('networkidle');
  const writes=[];page.on('request',r=>{if(r.url().includes('/api/v2/')&&!['GET','HEAD','OPTIONS'].includes(r.method()))writes.push(r.url());});
  const draft='Nativní klávesnice '+name;await page.locator('#description').fill(draft);const identity=await page.locator('#current-author-authority').inputValue();await page.locator('[data-tab-name="Míry"]').click();await page.locator('#description').focus();await page.evaluate(n=>document.title='MES Update4.6.1 '+n+' keyboard',name);await page.bringToFront();
  const title='MES Update4.6.1 '+name+' keyboard';signal(name,'F1',{title});await wait(name,'F1');
  const f1=await page.locator('dialog[open]').count()===1;const extra=context.pages().filter(p=>p!==page).map(p=>p.url());
  if(f1){await expect(page.getByRole('dialog').getByRole('heading',{name:'Míry a rozměry',exact:true})).toBeVisible();signal(name,'EscapeF1',{title});await wait(name,'EscapeF1');await expect(page.locator('dialog[open]')).toHaveCount(0);}
  for(const other of context.pages().filter(p=>p!==page))await other.close();await page.bringToFront();await page.locator('#description').focus();signal(name,'AltH',{title});await wait(name,'AltH');await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog').getByRole('heading',{name:'Míry a rozměry',exact:true})).toBeVisible();await page.screenshot({path:input.output+'/native-'+name+'-AltH.png',mask:[page.locator('.curator-card-location output')]});
  signal(name,'Escape',{title});await wait(name,'Escape');await expect(page.locator('dialog[open]')).toHaveCount(0);await expect(page.locator('#description')).toBeFocused();await expect(page.locator('#description')).toHaveValue(draft);await expect(page.locator('#current-author-authority')).toHaveValue(identity);await expect(page.locator('[data-tab-name="Míry"]')).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Nápověda MES',exact:true}).focus();await page.evaluate(()=>{window.__nativeKeys=[];window.addEventListener('keydown',e=>window.__nativeKeys.push({key:e.key,ctrl:e.ctrlKey,alt:e.altKey,altGraph:e.getModifierState('AltGraph'),prevented:e.defaultPrevented}),true);});signal(name,'AltGr',{title});await wait(name,'AltGr');await expect(page.locator('dialog[open]')).toHaveCount(0);const keys=await page.evaluate(()=>window.__nativeKeys);expect(writes).toEqual([]);
  results.push({browser:name,version:context.browser().version(),F1:f1?'APP_CONTEXT_HELP':'BROWSER_RESERVED',reservedTargets:extra,AltH:'PASS',Escape:'PASS',focusDraftTabIdentity:'PASS',CtrlAltRightH:'PASS',keys,apiWrites:writes});fs.writeFileSync(input.output+'/native-progress.json',JSON.stringify(results,null,2));
  await context.close();context=null;
 }
 fs.writeFileSync(input.output+'/native-shortcuts.json',JSON.stringify({status:'PASS',method:'Windows native keyboard input; owned browser profiles; external requests aborted',results},null,2));signal('all','complete');
}catch(error){fs.writeFileSync(input.output+'/native-shortcuts.json',JSON.stringify({status:'FAIL',results,error:error.stack},null,2));throw error;}finally{await server?.close();await context?.close();}
process.exit(0);
