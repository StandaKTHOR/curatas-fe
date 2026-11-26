// Actual installed Chrome + owned PG17 HTTP. Bounded generated hierarchy fixture, no API mocks.
import fs from 'node:fs';
import {chromium,expect} from '@playwright/test';
import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const base=`http://127.0.0.1:${process.env.CURATAS_TEST_HTTP_PORT??18213}`;
let browser,server,page;const checks=[];
const table=()=>page.getByRole('table',{name:'Evidence materiálu a techniky',exact:true});
const row=id=>table().locator(`[data-professional-record-id="${id}"]`);
const group=(type,id)=>page.locator(`[data-mattech-group="${type}"][data-record-id="${id}"]`);
const level=(type,id,n)=>group(type,id).getByLabel(`${type==='MATERIAL'?'Materiál':'Technika'} — úroveň ${n}`,{exact:true});
async function open(id){await page.goto(base+`/admin/items/edit/${id}?catalog=1`);await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:'MatTech',exact:true}).click();await expect(table()).toBeVisible();}
async function edit(id){await row(id).getByRole('button',{name:'Upravit',exact:true}).click();}
async function save(){const response=page.waitForResponse(r=>['POST','PATCH'].includes(r.request().method())&&/\/professional-records\/MATERIAL_TECHNIQUE(?:\/\d+)?$/.test(new URL(r.url()).pathname));await page.getByRole('button',{name:'Uložit záznam',exact:true}).click();const r=await response;expect([200,201]).toContain(r.status());const id=(await r.json()).record.id;await expect(page.getByText('Záznam uložen.',{exact:true})).toBeVisible();return id;}
try{
 server=await startSyntheticHttp(input);browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1366,height:768}});page.setDefaultTimeout(15000);
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto(base+'/login');await page.locator('input[type=text]').fill('gen-root');await page.locator('input[type=password]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');
 const writes=[];page.on('request',r=>{if(['POST','PATCH','PUT','DELETE'].includes(r.method())&&new URL(r.url()).pathname.startsWith('/api/v2/'))writes.push(new URL(r.url()).pathname);});
 await open(1002);for(const entry of input.many)await expect(level('MATERIAL',entry.record,1)).toHaveValue(entry.uuid);expect(writes).toEqual([]);checks.push('five independent material groups automatically display exact existing assignments; opening causes no writes');
 await open(1001);await expect(level('MATERIAL',6,1)).toHaveValue(input.material);await expect(level('TECHNIQUE',7,1)).toHaveValue(input.technique);
 expect(await row(6).innerText()).not.toContain(input.material);expect(await row(7).innerText()).not.toContain(input.technique);expect(await table().innerText()).not.toContain('materialTuples');
 await row(6).getByText('Technické údaje záznamu',{exact:true}).click();await expect(row(6).getByText('Materiál ID: '+input.material,{exact:false})).toBeVisible();await row(6).getByText('Technické údaje záznamu',{exact:true}).click();checks.push('normal rows show labels and paths; technical UUID stays available in an explicit disclosure');
 for(const [id,type,label,original] of [[6,'MATERIAL','Materiál',input.material],[7,'TECHNIQUE','Technika',input.technique]]){
  await edit(id);const path=input.trees[label];for(let n=1;n<=3;n++)await level(type,id,n).selectOption(path[n-1]);expect(await save()).toBe(id);await open(1001);
  for(let n=1;n<=3;n++)await expect(level(type,id,n)).toHaveValue(path[n-1]);await edit(id);await level(type,id,1).selectOption(original);expect(await save()).toBe(id);await open(1001);await expect(level(type,id,1)).toHaveValue(original);for(const n of [2,3])await expect(level(type,id,n)).toHaveValue('');checks.push(`${type}: edit full three-level path, save/reload, restore original with exact row identity`);
 }
 await open(1002);const selected=input.many[1];await edit(selected.record);await level('MATERIAL',selected.record,1).selectOption(input.material);expect(await save()).toBe(selected.record);await open(1002);
 await expect(level('MATERIAL',input.many[0].record,1)).toHaveValue(input.many[0].uuid);await expect(level('MATERIAL',input.many[4].record,1)).toHaveValue(input.many[4].uuid);await expect(table().locator('[data-professional-record-id]')).toHaveCount(5);checks.push('changing the second independent material preserves first/fifth and total count');
 await page.getByRole('button',{name:'Přidat další materiál / techniku',exact:true}).click();await level('MATERIAL','new',1).selectOption(selected.uuid);const added=await save();await open(1002);await expect(table().locator('[data-professional-record-id]')).toHaveCount(6);await expect(level('MATERIAL',added,1)).toHaveValue(selected.uuid);checks.push('sixth independent material created, persisted and reloaded without losing existing assignments');
 await page.screenshot({path:input.output+'/six-independent-materials.png',fullPage:true});
 fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',checks,addedRecord:added,apiMocks:false,fixture:'bounded generated current hierarchy contract',liveUatVerified:false},null,2));
}catch(e){fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'FAIL',checks,error:e.message},null,2));await page?.screenshot({path:input.output+'/failure.png'}).catch(()=>{});throw e;}finally{await browser?.close();await server?.close();}
