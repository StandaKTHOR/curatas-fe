import fs from 'node:fs';
import {chromium,expect} from '@playwright/test';
import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),base='http://127.0.0.1:18213',checks=[];
let app,browser,page;
const section=()=>page.getByRole('region',{name:'Současné bibliografické vazby'});
const row=id=>section().locator(`[data-professional-link="${id}"]`);
const publications=()=>section().getByLabel('Publikace',{exact:true});
const pending=(method,id)=>page.waitForResponse(r=>r.request().method()===method&&new URL(r.url()).pathname.endsWith('/items/1001/professional-links'+(id?'/'+id:'')));
async function open(){await page.goto(base+'/admin/items/edit/1001?catalog=1&edit=professional');await expect(page.locator('#title')).toBeEnabled();const p=pending('GET');await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:'Reference',exact:true}).click();const r=await p;expect(r.status()).toBe(200);return (await r.json()).items;}
async function write(method,button,id){const p=pending(method,id);await (method==='DELETE'?row(id):section()).getByRole('button',{name:button,exact:true}).click();const r=await p;expect(r.status(),await r.text()).toBe(method==='POST'?201:200);return (await r.json()).items;}
async function edit(id){await row(id).getByRole('button',{name:'Upravit vazbu',exact:true}).click();await expect(section().getByRole('button',{name:'Uložit změnu vazby'})).toBeEnabled();}
try{
 app=await startSyntheticHttp(input);browser=await chromium.launch({channel:'chrome',headless:true});const ctx=await browser.newContext({viewport:{width:1366,height:768}});page=await ctx.newPage();page.setDefaultTimeout(8000);
 await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto(base+'/login');await page.locator('input[type=text]').fill('gen-root');await page.locator('input[type=password]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');
 let links=await open();const source=links.find(v=>v.sourceRecordId==='b'.repeat(64));expect(source).toBeTruthy();const untouched=links.filter(v=>v.id!==source.id);
 await edit(source.id);await expect(publications()).toHaveValue('s:'+'b'.repeat(64));await section().getByLabel('Strany citace').fill('19–20');await section().getByLabel('Poznámka k odborné vazbě').fill('UI45 přesná původní publikace');
 links=await write('PUT','Uložit změnu vazby',source.id);const updated=links.find(v=>v.id===source.id);expect(updated.sourceRecordId).toBe(source.sourceRecordId);expect((await open()).find(v=>v.id===source.id)).toEqual(updated);checks.push('Original publication exact identity edited, saved and reloaded');
 await section().getByRole('button',{name:'Nová publikace',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Nová publikace'});await dialog.getByLabel('Titul publikace').fill('Nová publikace UI45');await dialog.getByLabel('Kód citace').fill('UI45-'+Date.now());
 const made=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/professional-registers/LITERATURE'));await dialog.getByRole('button',{name:'Uložit publikaci'}).click();const created=await made;expect(created.status()).toBe(201);const currentId=(await created.json()).id;await expect(publications()).toHaveValue(String(currentId));
 await section().getByLabel('Strany citace').fill('21');links=await write('POST','Přidat odbornou vazbu');const current=links.find(v=>v.entryId===currentId);expect(current).toBeTruthy();expect((await open()).find(v=>v.id===current.id)).toEqual(current);checks.push('New current publication created in Reference, selected by exact ID, assigned and reloaded');
 await edit(current.id);await section().getByLabel('Strany citace').fill('22');links=await write('PUT','Uložit změnu vazby',current.id);expect((await open()).find(v=>v.id===current.id).fields.Str_RF).toBe('22');
 links=await write('DELETE','Odebrat vazbu',current.id);expect(links.some(v=>v.id===current.id)).toBe(false);links=await open();for(const old of untouched)expect(links.find(v=>v.id===old.id)).toEqual(old);expect(links.find(v=>v.id===source.id)).toEqual(updated);checks.push('New reference edited and removed without changing other original/current relationships');
 fs.writeFileSync(input.output+'/publications.json',JSON.stringify({status:'PASS',checks,apiMocks:false,chrome:browser.version()},null,2));
}catch(e){fs.writeFileSync(input.output+'/publications.json',JSON.stringify({status:'FAIL',checks,error:e.stack},null,2));throw e;}finally{await browser?.close();await app?.close();}
