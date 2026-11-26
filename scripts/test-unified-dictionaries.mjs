import fs from 'node:fs';
import {chromium,expect} from '@playwright/test';
import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),base='http://127.0.0.1:'+(process.env.CURATAS_TEST_HTTP_PORT??18213);
let server,browser,page;const checks=[],errors=[];
try{
 server=await startSyntheticHttp(input);browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1366,height:768}});await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/login');await page.locator('input[type=text]').fill('gen-root');await page.locator('input[type=password]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');
 await page.goto(base+'/admin/dictionaries?catalog=1&type=FUND');const manager=page.getByRole('region',{name:'Číselníky',exact:true});
 await expect(manager.getByRole('cell',{name:'Kurátorský název fondu',exact:true})).toBeVisible();
 await expect(manager.getByLabel('Typ číselníku').locator('option')).toHaveCount(43);
 await manager.getByRole('button',{name:'Nová položka',exact:true}).click();const modal=page.locator('form').filter({has:page.locator('#dictLabel')});
 await modal.locator('input#dictLabel, #dictLabel input').fill('Kurátorský fond nový');await modal.locator('input#dictCode, #dictCode input').fill('F-NEW');
 const created=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().includes('/dictionaries/FUND/values'));
 await modal.getByRole('button',{name:'Založit položku',exact:true}).click();expect((await created).status()).toBe(201);await expect(modal).toHaveCount(0);
 await manager.getByRole('button',{name:'Zpět na přehled číselníku',exact:true}).first().click();await expect(manager.getByRole('cell',{name:'Kurátorský fond nový',exact:true})).toBeVisible();await expect(manager.getByRole('cell',{name:'Kurátorský název fondu',exact:true})).toBeVisible();
 expect(await manager.innerText()).not.toMatch(/DEMUS|historick|současn|[a-f0-9]{64}|[a-f0-9]{8}-[a-f0-9]{4}/i);checks.push('one complete FUND list includes source overlay and explicit newly created value; no provenance labels or IDs');
 await manager.getByRole('button',{name:'Detail Kurátorský název fondu — F-OVR',exact:true}).click();await manager.getByRole('button',{name:'Upravit tuto položku',exact:true}).click();
 await page.getByLabel('Název položky',{exact:true}).fill('Kurátorský fond upravený');await page.getByLabel('Důvod úpravy').fill('Chrome explicit correction');
 const saved=page.waitForResponse(r=>r.request().method()==='PUT'&&r.url().includes('/unified-dictionaries/FUND/'));
 await page.getByRole('button',{name:'Uložit položku',exact:true}).click();expect((await saved).status()).toBe(200);await expect(page.getByRole('form',{name:'Upravit položku'})).toHaveCount(0);await page.reload();await expect(manager.getByRole('heading',{name:'Kurátorský fond upravený — F-OVR',exact:true})).toBeVisible();checks.push('source overlay explicit edit/save/reload keeps exact entry URL');
 await manager.getByRole('button',{name:'Zpět na přehled číselníku',exact:true}).first().click();await manager.getByLabel('Hledat v číselníku').fill('kuratorsky');await expect(manager.getByRole('row')).toHaveCount(3);checks.push('accent insensitive typeahead returns source and current together');
 await page.screenshot({path:input.output+'/unified-fund.png',fullPage:true});
 for(const type of ['DIMENSION','ISO_STATE','LITERATURE','DIRECTORY','CADASTRE']){
  await manager.getByLabel('Typ číselníku').selectOption(type);await expect(manager.getByRole('row').nth(1)).toBeVisible();
  if(type==='CADASTRE'){await expect(manager.getByRole('row')).toHaveCount(101);await manager.getByRole('button',{name:'Další položky číselníku'}).click();await expect(manager.getByRole('row')).toHaveCount(201);}
  checks.push(type+' full source-backed read available, bounded pagination');
 }
 await page.goto(base+'/admin/items/edit/1001?catalog=1&edit=professional');
 const fund=page.getByLabel('Autorita FUND',{exact:true});await expect(fund.locator('option[value="demus:'+input.fund.binding.recordId+'"]')).toHaveCount(1);
 await expect(fund.locator('option[value="demus:'+input.fund.binding.recordId+'"]')).toHaveText('Kurátorský fond upravený — F-OVR');
 expect(await fund.innerText()).not.toMatch(/DEMUS|historick|MES —/);await fund.selectOption('demus:'+input.fund.binding.recordId);await page.locator('#title').fill('Unified dictionary save/reload proof');
 const assigned=page.waitForResponse(r=>r.request().method()==='PUT'&&new URL(r.url()).pathname.endsWith('/curator-records'));
 await page.locator('[data-scoped-save]').first().click();expect((await assigned).status()).toBe(200);await page.reload();await expect(fund).toHaveValue('demus:'+input.fund.binding.recordId);checks.push('overlay caption selected with immutable source binding, actual item save/reload');
 await page.goto(base+'/admin/items/edit/1001?catalog=1&edit=professional');await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:'MatTech',exact:true}).click();const material=page.getByLabel('Materiál — přiřazení 1',{exact:true});await expect(material).toHaveValue('demus:'+input.material.binding.recordId);await expect(material.locator('option:checked')).toHaveText('Kurátorský materiál — M-OVR'+(input.material.binding.groupingCode?' (zařazení '+input.material.binding.groupingCode+')':''));await expect(page.locator('[data-professional-record-id="'+input.materialRecord+'"]')).toContainText('Kurátorský materiál — M-OVR');checks.push('off-page material selection and professional-row display resolve the overlay while stored bindings remain original');

 const measurements=[];
 for(const [phase,root] of [['before',process.env.UPDATE4_UI_BASELINE_ROOT],['after',input.frontendRoot]]){
  if(!root)throw new Error('Explicit preserved baseline build required');
  await server.close();server=await startSyntheticHttp({...input,frontendRoot:root});
  for(const example of ['new','historical'])for(const width of [1920,1366,1024,640]){
   await page.setViewportSize({width,height:width===1920?1080:768});await page.goto(base+(example==='new'?'/admin/items/new?catalog=1':'/admin/items/edit/1001?catalog=1&edit=professional'));await expect(page.locator('#title')).toBeEnabled();await page.waitForTimeout(450);
   const value=await page.evaluate(()=>({scrollHeight:document.documentElement.scrollHeight,form:document.querySelector('#item-editor')?.getBoundingClientRect().height,overflow:document.documentElement.scrollWidth>innerWidth,controls:[...document.querySelectorAll('#item-editor input[id],#item-editor select[id],#item-editor textarea[id]')].map(n=>n.id).filter(id=>!id.startsWith('item-options-')).sort(),editors:['#title','#fundDictionaryId','#objectType','#current-author-authority','#datingText','#accessionNumber'].map(s=>{const n=document.querySelector(s),r=n?.getBoundingClientRect();return {selector:s,height:r?.height,fontSize:n?getComputedStyle(n).fontSize:null};})}));
   measurements.push({phase,example,width,...value});await page.screenshot({path:input.output+`/${phase}-${example}-${width}.png`,fullPage:true});expect(value.overflow).toBe(false);
  }
 }
 for(const after of measurements.filter(v=>v.phase==='after')){const before=measurements.find(v=>v.phase==='before'&&v.example===after.example&&v.width===after.width);expect(after.controls).toEqual(before.controls);expect(after.form).toBeLessThanOrEqual(before.form+1);for(const editor of after.editors){expect(editor.height).toBeGreaterThanOrEqual(36);expect(parseFloat(editor.fontSize)).toBeGreaterThanOrEqual(14);}if(after.example==='new'&&after.width===1366)expect(after.form).toBeLessThanOrEqual(1177.890625);}
 checks.push('same-fixture before/after all four widths, same fields and legibility, no height increase or horizontal overflow');
 expect(errors).toEqual([]);fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',checks,measurements,errors,apiMocks:false,uatVerified:false},null,2));
}catch(e){fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'FAIL',checks,error:e.message},null,2));await page?.screenshot({path:input.output+'/failure.png',fullPage:true}).catch(()=>{});throw e;}
finally{await browser?.close();await server?.close();}
