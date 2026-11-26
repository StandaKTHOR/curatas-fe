// Actual Chrome, production FE and owned loopback PG17 backend. No API response mocks.
import fs from 'node:fs';
import {chromium,expect} from '@playwright/test';
import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),base=`http://127.0.0.1:${process.env.CURATAS_TEST_HTTP_PORT??18213}`;
let browser,server,page;const checks=[],items=[],layout=[],rejections=[];
async function reveal(c){await c.waitFor({state:'attached'});for(const container of await c.locator('xpath=ancestor::*[@data-top-option]').all())if(!await container.isVisible()){await page.locator('summary[aria-controls="'+await container.getAttribute('id')+'"]').click();}for(const d of await c.locator('xpath=ancestor::details').all())if(await d.getAttribute('open')===null)await d.locator(':scope > summary').click();}
async function type(c,value){await reveal(c);await c.click();await expect(c).toBeFocused();await c.press('Control+A');await c.pressSequentially(value,{delay:2});await expect(c).toHaveValue(value);}
async function select(c,value){await reveal(c);await expect(c).toBeEnabled();const options=await c.locator('option').evaluateAll(ns=>ns.filter(n=>!n.disabled).map(n=>n.value));const i=options.indexOf(value);expect(i).toBeGreaterThanOrEqual(0);await c.click();await page.keyboard.press('Home');for(let n=0;n<i;n++)await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(c).toHaveValue(value);}
const tabs=()=>page.getByRole('navigation',{name:'Karty DEMUS'});
async function tab(name){await tabs().getByRole('button',{name,exact:true}).click();}
async function edit(id){await page.goto(base+`/admin/items/edit/${id}?catalog=1&edit=professional`);await expect(page.locator('#title')).toBeEnabled();}
async function reloadEdit(id){await page.reload();await expect(page.locator('#title')).toBeEnabled();expect(new URL(page.url()).pathname).toBe('/admin/items/edit/'+id);}
async function savedSection(action){const response=page.waitForResponse(r=>['POST','PUT'].includes(r.request().method())&&new URL(r.url()).pathname.includes('/items/'));await action();const result=await response;expect([200,201],await result.text()).toContain(result.status());}
try{
 server=await startSyntheticHttp(input);browser=await chromium.launch({channel:'chrome',headless:true});const ctx=await browser.newContext({viewport:{width:1366,height:768}});await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());ctx.on('response',r=>{if(r.status()>=400&&new URL(r.url()).pathname.startsWith('/api/'))rejections.push({status:r.status(),method:r.request().method(),path:new URL(r.url()).pathname});});page=await ctx.newPage();page.setDefaultTimeout(15000);
 await page.goto(base+'/login');await type(page.locator('input[type=text]'),input.username??'gen-root');await type(page.locator('input[type=password]'),input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await select(page.getByLabel('Katalog',{exact:true}),'1');
 // Same database/session and examples, before and after UPDATE4; no API mocks.
 for(const [phase,root] of [['before',process.env.UPDATE4_UI_BASELINE_ROOT??input.frontendRoot+'/../../baseline-frontend'],['after',input.frontendRoot]]){
  await server.close();server=await startSyntheticHttp({...input,frontendRoot:root});
  for(const example of ['new','historical'])for(const width of [1920,1366,1024,640]){
   await page.setViewportSize({width,height:width===1920?1080:768});
   if(width===1920)await page.goto(base+(example==='new'?'/admin/items/new?catalog=1':'/admin/items/edit/9001?catalog=1&edit=professional'));
   await expect(page.locator('#title')).toBeEnabled();await page.waitForTimeout(400);await page.evaluate(()=>scrollTo(0,0));
   layout.push(await page.evaluate(({phase,example,width})=>{
    const rect=n=>{const r=n?.getBoundingClientRect();return r?{height:r.height,top:r.top,bottom:r.bottom,width:r.width}:null;},box=s=>rect(document.querySelector(s));
    const controls=[...document.querySelectorAll('#item-editor input[id],#item-editor select[id],#item-editor textarea[id]')].map(n=>n.id).filter(id=>!id.startsWith('item-options-')).sort();
    const blocks=[...document.querySelectorAll('.demus-primary-fields > *')].map(n=>({label:n.querySelector('label,h3,h4')?.textContent??n.textContent.slice(0,70),...rect(n),controls:[...n.querySelectorAll('input[id],select[id],textarea[id]')].map(c=>c.id)}));
    const editors=['#title','#fundDictionaryId','#objectType','#current-author-authority','#datingText','#accessionNumber'].map(s=>{const n=document.querySelector(s),style=getComputedStyle(n);return {selector:s,...rect(n),fontSize:style.fontSize};});
    return {phase,example,width,pageHeight:document.documentElement.scrollHeight,form:box('#item-editor'),header:box('.demus-identification'),body:box('#item-editor-body'),status:box('.curator-record-status'),tabs:box('.demus-original-tabs'),overflow:document.documentElement.scrollWidth>innerWidth,controls,blocks,editors};
   },{phase,example,width}));
   await page.screenshot({path:input.output+'/'+phase+'-'+example+'-'+width+'.png',fullPage:true});
   if(phase==='after'&&example==='historical'&&width===1366){
    await page.locator('.curator-record-status > summary').click();await page.locator('.curator-record-history > summary').click();await page.screenshot({path:input.output+'/after-historical-status-1366.png'});await page.locator('.curator-record-status > summary').click();await page.locator('.curator-record-history > summary').click();await page.evaluate(()=>scrollTo(0,0));
   }
   if(phase==='after'){
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect(tabs().getByRole('button')).toHaveCount(20);
    for(const selector of ['#title','#fundDictionaryId','#objectType','#current-author-authority','#datingText','#accessionNumber'])await expect(page.locator(selector)).toHaveCount(1);
    await expect(page.locator('input[aria-label="Současný příznak Karta"]')).toHaveCount(example==='new'?0:1);
    if(width>=1024)for(const selector of ['#title','#fundDictionaryId','#objectType','#current-author-authority','#datingText','#accessionNumber'])await expect(page.locator(selector)).toBeInViewport();
   }
  }
 }
 if(process.env.UPDATE4_UI_BASELINE_ROOT){
  for(const after of layout.filter(row=>row.phase==='after')){
   const before=layout.find(row=>row.phase==='before'&&row.example===after.example&&row.width===after.width);
   expect(after.controls,'all controls remain mounted, including collapsed search').toEqual(before.controls);
   for(const editor of after.editors){expect(editor.height).toBeGreaterThanOrEqual(36);expect(parseFloat(editor.fontSize)).toBeGreaterThanOrEqual(14);}
   if(after.example==='historical')expect(after.form.height).toBeLessThanOrEqual(before.form.height+1);
   if(after.example==='new'&&after.width===1366)expect(after.form.height).toBeLessThanOrEqual(1176.890625+1);
  }
  fs.writeFileSync(input.output+'/compactness-comparison.json',JSON.stringify({status:'PASS',layout,baseline:process.env.UPDATE4_UI_BASELINE_ROOT,target1366:1176.890625},null,2));
  await page.setViewportSize({width:1366,height:768});await page.goto(base+'/admin/items/new?catalog=1');await expect(page.locator('#title')).toBeEnabled();
  const expectedTabIds=['accessionNumber','fundDictionaryId','objectType','title','current-author-authority','datingText'],focusOrder=[];
  for(const id of expectedTabIds)await expect(page.locator('#'+id)).toBeEnabled();
  await page.getByLabel('Inventární číslo: Prefix',{exact:true}).focus();
  for(let i=0;i<60&&!expectedTabIds.every(id=>focusOrder.includes(id));i++){await page.keyboard.press('Tab');focusOrder.push(await page.evaluate(()=>document.activeElement.id));}
  expect(focusOrder.filter(id=>expectedTabIds.includes(id))).toEqual(expectedTabIds);expect(await page.locator('#item-editor [tabindex]').evaluateAll(nodes=>nodes.some(n=>Number(n.getAttribute('tabindex'))>0))).toBe(false);
  fs.writeFileSync(input.output+'/keyboard-order.json',JSON.stringify({status:'PASS',expectedTabIds,focusOrder},null,2));checks.push({name:'main editors follow the visual DOM order with native Tab; no positive tabindex',status:'PASS'});
  await page.goto(base+'/admin/items/new?catalog=1');
  const search=page.getByLabel('Hledat autoritu SUBJECT',{exact:true});const details=search.locator('xpath=ancestor::details');const summary=details.locator(':scope > summary');
  await expect(search).toBeHidden();await summary.focus();await summary.press('Enter');await expect(search).toBeVisible();await type(search,'GENERATED');await search.press('Control+A');await search.press('Backspace');await expect(search).toHaveValue('');await summary.click();await expect(search).toBeHidden();
  checks.push({name:'creation dictionary search opens from keyboard, edits and closes beside its selector',status:'PASS'});
 }
 // The visual phase and write/reload phase have independent minute budgets.
 // Keep the backend's existing refresh rate limit intact; no responses are intercepted.
 await new Promise(resolve=>setTimeout(resolve,60000-Date.now()%60000+100));
 await page.setViewportSize({width:1366,height:768});
 for(const [index,name] of ['A','B'].entries()){
  await page.goto(base+'/admin/items/new?catalog=1');await expect(page.locator('#title')).toBeEnabled();
  expect(await page.locator('button[type=submit][form=item-editor]').count()).toBe(2);
  if(index===0){await page.getByRole('button',{name:'Uložit předmět (dole)',exact:true}).click();await expect(page.getByLabel('Inventární číslo: Hlavní číslo',{exact:true})).toBeFocused();await expect(page.locator('#new-inventory-error[role=alert]')).toContainText('Inventární číslo je povinné.');await expect(page.locator('div[role=alert]')).toContainText('Inventární číslo je povinné.');}
  await type(page.getByLabel('Inventární číslo: Prefix',{exact:true}),'STAB-');await type(page.getByLabel('Inventární číslo: Hlavní číslo',{exact:true}),String(860001+index));
  await type(page.locator('#title'),'GENERATED stabilization '+name);await type(page.locator('#current-object-type'),'GENERATED supported type '+name);await type(page.locator('#datingText'),'kolem roku '+(1900+index));await type(page.locator('#accessionNumber'),'STAB-ACC-'+name);await type(page.locator('#quantity'),String(2+index));
  for(const kind of ['FUND','AUTHOR','OBJECT_TYPE']){const c=page.getByLabel('Autorita '+kind,{exact:true});if(input[kind+'1'])await select(c,input[kind+'1']);}
  await page.screenshot({path:input.output+'/new-'+name+'-typed.png'});
  if(index===0){let warned=false;page.once('dialog',dialog=>{warned=true;void dialog.dismiss();});await page.getByRole('button',{name:'← Zpět na seznam',exact:true}).click();expect(warned).toBe(true);expect(new URL(page.url()).pathname).toBe('/admin/items/new');await expect(page.locator('#title')).toHaveValue('GENERATED stabilization '+name);checks.push({name:'creation dirty state refuses navigation and preserves typed values',status:'PASS'});}
  await page.getByRole('button',{name:index===0?'Uložit předmět (dole)':'Uložit',exact:true}).click();await page.waitForURL(/\/admin\/items\/view\/\d+/);const id=Number(new URL(page.url()).pathname.split('/').at(-1));items.push({name,id});await page.reload();await expect(page.getByRole('complementary',{name:'Permanentní identifikace předmětu'})).toContainText('GENERATED stabilization '+name);checks.push({name:'create '+name+' visible typing, '+(index===0?'bottom':'top')+' submit, detail and reload',id,status:'PASS'});
  await edit(id);await tab('Míry');await type(page.locator('#weight'),String(12+index));await page.getByRole('button',{name:'Přidat rozměr',exact:true}).click();await type(page.getByPlaceholder('Hodnota',{exact:true}),String(20+index)+',5');await type(page.getByPlaceholder('Poznámka k míře...',{exact:true}),'GENERATED size '+name);await page.getByRole('button',{name:'Uložit',exact:true}).click();await page.waitForURL(/items\/view/);await edit(id);await tab('Míry');await expect(page.locator('#weight')).toHaveValue(String(12+index));expect(Number(await page.getByPlaceholder('Hodnota',{exact:true}).inputValue())).toBe(20+index+0.5);await expect(page.getByPlaceholder('Poznámka k míře...',{exact:true})).toHaveValue('GENERATED size '+name);await tab('Základ');await expect(page.locator('#quantity')).toHaveValue(String(2+index));checks.push({name:'dimensions and weight actual save/reload '+name,status:'PASS'});
  for(const [tabName,field,value] of [['Určení','Predmet_UR','GENERATED determination '+name],['Vznik','Pozn_VZ','GENERATED origin '+name],['Dokumentace','Dokument_DK','GENERATED document '+name],['Zařazení','SysKat_ZS','GENERATED category '+name]]){
   await tab(tabName);const control=page.locator('[data-demus-field="'+field+'"]');await type(control,value);await savedSection(()=>page.getByRole('button',{name:'Uložit záznam',exact:true}).click());await expect(page.getByText('Záznam uložen.',{exact:true})).toBeVisible();await reloadEdit(id);await tab(tabName);await expect(page.getByRole('table',{name:/^Evidence /}).first()).toContainText(value);checks.push({name:tabName+' actual section save/reload '+name,status:'PASS'});
  }
  await tab('Historie');const history=page.getByRole('region',{name:'Současná odborná historie'});await type(history.getByLabel('Popis současné události',{exact:true}),'GENERATED history '+name);await tab('Základ');await tab('Historie');await expect(history.getByLabel('Popis současné události',{exact:true})).toHaveValue('GENERATED history '+name);await savedSection(()=>history.getByRole('button',{name:'Uložit událost historie',exact:true}).click());await expect(history.getByText('Historie byla uložena a znovu načtena.',{exact:true})).toBeVisible();await reloadEdit(id);await tab('Historie');await expect(history).toContainText('GENERATED history '+name);checks.push({name:'history draft survives tab change and confirmed save/reload '+name,status:'PASS'});
  await tab('Základ');const archive=page.getByLabel('Současný příznak Archiválie',{exact:true});await reveal(archive);await expect(archive).toBeEnabled();await archive.check();await savedSection(()=>page.getByRole('button',{name:'Uložit sekci',exact:true}).click());await expect(page.getByText(/Současné příznaky byly uloženy a znovu načteny/)).toBeVisible();let discard=false;const dialog=d=>{discard=true;void d.dismiss();};page.on('dialog',dialog);await page.getByRole('button',{name:'Zrušit a zpět na detail',exact:true}).first().click();await page.waitForURL(/items\/view/);page.off('dialog',dialog);expect(discard).toBe(false);await edit(id);await tab('Základ');await expect(page.getByLabel('Současný příznak Archiválie',{exact:true})).toBeChecked();await expect(page.getByLabel('Zveřejněno',{exact:true})).toBeDisabled();checks.push({name:'archive save clears dirty, reload confirms flag; publication explicitly unsupported '+name,status:'PASS'});
  await page.screenshot({path:input.output+'/saved-'+name+'.png'});
  if(index===0){for(const name of ['Určení','Vznik','Historie','Akvizice','Míry','Zařazení','MatTech']){await tab(name);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:input.output+'/professional-'+name+'.png'});}await tab('Základ');}
  if(index===0){for(const width of [1920,1366,1024,640]){await page.setViewportSize({width,height:width===1920?1080:768});await expect(tabs().getByRole('button')).toHaveCount(20);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:input.output+'/save-layout-'+width+'.png'});const box=await page.locator('#item-editor-body').boundingBox();expect(box.width).toBeGreaterThan(width-45);checks.push({name:'unchanged full-width editor and20tabs viewport '+width,status:'PASS',width:box.width});}await page.setViewportSize({width:1366,height:768});}
 }
 await edit(9001);await type(page.locator('#title'),'UPDATE4 ověření historického předmětu');await page.getByRole('button',{name:'Uložit',exact:true}).click();await page.waitForURL(/items\/view/);await edit(9001);await expect(page.locator('#title')).toHaveValue('UPDATE4 ověření historického předmětu');checks.push({name:'whitelisted real museum excerpt 9001: edit/save/reload; raw lineage fingerprint checked by Java',status:'PASS'});
 const id=items[0].id;await edit(id);await type(page.locator('#title'),'GENERATED losing concurrent draft');const losing=page;page=await ctx.newPage();await edit(id);await type(page.locator('#title'),'GENERATED confirmed concurrent winner');await page.getByRole('button',{name:'Uložit',exact:true}).click();await page.waitForURL(/items\/view/);const winning=page;page=losing;const conflict=page.waitForResponse(r=>r.request().method()==='PUT'&&r.status()===412);await page.getByRole('button',{name:'Uložit',exact:true}).click();await conflict;await expect(page.locator('#title')).toHaveValue('GENERATED losing concurrent draft');await expect(page.getByText(/Předmět se mezitím změnil/).first()).toBeVisible();await winning.reload();await expect(winning.getByRole('complementary',{name:'Permanentní identifikace předmětu'})).toContainText('GENERATED confirmed concurrent winner');checks.push({name:'two real Chrome pages CAS412 preserves losing draft without overwriting winner',status:'PASS'});
 fs.writeFileSync(input.output+'/layout.json',JSON.stringify(layout,null,2));
 fs.writeFileSync(input.output+'/save-browser-result.json',JSON.stringify({status:'PASS',checks,items,rejections,apiMocks:false,liveUatVerified:false},null,2));
}catch(e){fs.writeFileSync(input.output+'/save-browser-result.json',JSON.stringify({status:'FAIL',checks,items,rejections,error:e.message},null,2));await page?.screenshot({path:input.output+'/save-failure.png'}).catch(()=>{});throw e;}
finally{if(browser?.isConnected()){const closed=new Promise(r=>browser.once('disconnected',r));const cdp=await browser.newBrowserCDPSession();await cdp.send('Browser.close').catch(()=>{});await closed;}await server?.close();}
process.exit(0);
