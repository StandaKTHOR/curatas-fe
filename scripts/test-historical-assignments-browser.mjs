// Real production React -> owned HTTP backend -> PostgreSQL; no mocked responses.
import {startSyntheticHttp} from './synthetic-http-proxy.mjs';import {chromium,expect} from '@playwright/test';import fs from 'node:fs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));if(input.dataKind!=='ACTUAL_POLAKOVA_VOCABULARY_FIXTURE')throw Error('Owned fixture required');let server,browser,page;const checks=[],responses=[],editorReadyMs=[],base='http://127.0.0.1:18213',uuidWrites=[];
try{server=await startSyntheticHttp(input);browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1366,height:900}});page.setDefaultTimeout(15000);page.on('response',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))responses.push({method:r.request().method(),path:new URL(r.url()).pathname,status:r.status()});});page.on('request',r=>{if(['POST','PUT','PATCH'].includes(r.method())&&/dictionaries\/[^/]+\/values/.test(r.url()))uuidWrites.push(r.url());});page.on('dialog',d=>d.accept());
 await page.goto(base+'/login');await page.locator('input[type="text"]').fill('gen-root');await page.locator('input[type="password"]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');await page.getByRole('table',{name:'Sbírky — tabulkové zobrazení'}).waitFor();
 // Keep read-only navigation within the router; reopen editor in a fresh document.
 // This bounds refresh rotations below the unchanged 30/minute authentication limit.
 const navigate=async path=>page.evaluate(path=>{window.history.pushState({},'',path);window.dispatchEvent(new PopStateEvent('popstate'));},path);
 const edit=async()=>{const start=Date.now();await page.goto(base+'/admin/items/edit/1001?catalog=1&edit=professional');await expect(page.locator('[data-scoped-save]').first()).toBeVisible();await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:'Základ',exact:true}).click();await expect(page.getByLabel('Současná autorita FUND',{exact:true})).toBeEnabled({timeout:30000});editorReadyMs.push(Date.now()-start);};
 const save=async()=>{const pending=page.waitForResponse(r=>r.request().method()==='PUT'&&new URL(r.url()).pathname.endsWith('/curator-records'));await page.locator('[data-scoped-save]').first().click();const r=await pending;if(r.status()!==200)throw Error('Save failed '+r.status()+': '+await r.text());await page.reload();};
 const tab=async(type)=>{await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:['MATERIAL','TECHNIQUE'].includes(type)?'MatTech':'Základ',exact:true}).click();};
 const control=type=>['MATERIAL','TECHNIQUE'].includes(type)?page.getByLabel((type==='MATERIAL'?'Materiál':'Technika')+' (Číselník) — úroveň 1',{exact:true}):page.getByLabel('Současná autorita '+type,{exact:true});
 const automaticChecks=[];const beforeAutomaticWrites=[];
 const collect=r=>{if(['POST','PUT','PATCH','DELETE'].includes(r.method())&&new URL(r.url()).pathname.includes('/items/'))beforeAutomaticWrites.push(new URL(r.url()).pathname);};page.on('request',collect);
 for(const original of input.originals){
  await navigate('/admin/items/view/'+original.id+'?catalog=1');
  const tabs=page.getByRole('navigation',{name:'Karty DEMUS'});await expect(tabs.getByRole('button')).toHaveCount(20);await tabs.getByRole('button',{name:'Základ',exact:true}).click();
  for(const [type,text] of [['FUND','nábytek'],['OBJECT_TYPE',String(original.ordinal)==='3'?'kredenc kuchyňská':'židle'],['COLLECTION','1'],['CUSTODIAN','6MM']]){
   const field=page.getByLabel('Současná autorita '+type,{exact:true});await expect(field.locator('option:checked')).toContainText(text+' (původní DEMUS:');await expect(field).toHaveValue('');
  }
  await expect(page.getByLabel('Současná autorita CUSTODIAN',{exact:true}).locator('option:checked')).toContainText('vazba na Adresář nedoložena');
  await tabs.getByRole('button',{name:'MatTech',exact:true}).click();await expect(page.getByText('Původní text DEMUS: '+(String(original.ordinal)==='3'?'dřevo, sklo':'dřevo')+' (DEMUS)',{exact:true})).toBeVisible();
  automaticChecks.push('N '+original.ordinal+': original FUND/OBJECT_TYPE/COLLECTION/CUSTODIAN/MATERIAL visible without assignment');
 }
 page.off('request',collect);if(beforeAutomaticWrites.length)throw Error('Opening originals wrote current data');
 await edit();await expect(page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button')).toHaveCount(20);
 for(const type of ['MATERIAL','TECHNIQUE','AUTHOR','AUTHOR_ROLE']){
  for(const {id,query} of input.choices[type]){await tab(type);let selector;
   if(['MATERIAL','TECHNIQUE'].includes(type)){const label=(type==='MATERIAL'?'Materiál':'Technika')+' (Číselník)';await page.getByLabel('Hledat: '+label,{exact:true}).fill(query);selector=page.getByLabel('Výsledky hledání: '+label,{exact:true});}
   else{await page.getByLabel('Hledat současnou autoritu '+type,{exact:true}).fill(query);selector=control(type);}
   await expect(selector.locator('option[value="demus:'+id+'"]')).toHaveCount(1);await selector.selectOption('demus:'+id);await save();await tab(type);await expect(control(type)).toHaveValue('demus:'+id);checks.push(type+' exact identity save/reload '+id.slice(0,12));
   await navigate('/admin/items/view/1001?catalog=1');await tab(type);await expect(control(type)).toHaveValue('demus:'+id);await edit();await tab(type);await expect(control(type)).toHaveValue('demus:'+id);
  }
  await control(type).selectOption('');await save();await tab(type);await expect(control(type)).toHaveValue('');checks.push(type+' remove/reload');
 }
 if(uuidWrites.length)throw Error('Historical selection created a UUID authority');checks.push('no UUID creation; 20 original tabs');await page.screenshot({path:input.output+'/historical-assignment-lifecycle.png',fullPage:true});fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',checks,automaticChecks,editorReadyMs,httpFailures:responses.filter(r=>r.status>=400),liveUatVerified:false},null,2));
}catch(e){fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'FAIL',checks,error:e.message},null,2));if(page){fs.writeFileSync(input.output+'/response-statuses.json',JSON.stringify(responses,null,2));fs.writeFileSync(input.output+'/private-failure.txt',await page.locator('body').innerText().catch(()=>''));await page.screenshot({path:input.output+'/failure.png',fullPage:true}).catch(()=>{});}process.exitCode=1;}
finally{if(browser)await browser.close();if(server)await server.close();}
