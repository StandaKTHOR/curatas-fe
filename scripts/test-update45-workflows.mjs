import fs from 'node:fs';
import {chromium,expect} from '@playwright/test';
import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const base='http://127.0.0.1:18213',checks=[],run=Date.now().toString();
let server,browser,page;let token;
const result=(status,error)=>fs.writeFileSync(input.output+'/workflows.json',JSON.stringify({status,checks,error,apiMocks:false,chrome:browser?.version()},null,2));
const tab=name=>page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name,exact:true});
async function api(path,method='GET',data,etag,auth=token){
 const r=await page.request.fetch(base+'/api/v2/catalogs/1/'+path,{method,headers:{Authorization:'Bearer '+auth,Origin:base,'X-CURATAS-CSRF':'1',...(etag?{'If-Match':etag}:{})},...(data?{data}:{})});return r;
}
async function login(context,name){
 const p=await context.newPage();await p.goto(base+'/login');await p.locator('input[type=text]').fill(name);await p.locator('input[type=password]').fill(input.password);
 const pending=p.waitForResponse(r=>r.url().endsWith('/api/auth/local/login'));
 await p.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();const credentials=await (await pending).json();
 await p.getByLabel('Katalog',{exact:true}).selectOption('1');return {page:p,token:credentials.token};
}
async function open(id,mode='edit'){
 await page.goto(base+`/admin/items/${mode}/${id}?catalog=1`+(mode==='edit'?'&edit=professional':''));
 await expect(page.locator('.curator-card-main')).toBeVisible();await page.waitForLoadState('networkidle');
}
async function saveMain(){
 const pending=page.waitForResponse(r=>['POST','PUT'].includes(r.request().method())&&(/\/items$/.test(new URL(r.url()).pathname)||/\/items\/\d+\/curator-record/.test(new URL(r.url()).pathname)));
 await page.getByRole('button',{name:'Uložit předmět (dole)',exact:true}).click();const r=await pending;expect([200,201]).toContain(r.status());
 await page.waitForURL(/\/items\/view\/\d+\?catalog=1/);await page.reload();await page.waitForLoadState('networkidle');return Number(new URL(page.url()).pathname.split('/').at(-1));
}
try{
 server=await startSyntheticHttp(input);browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1920,height:1080}});
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 ({page,token}=await login(context,'gen-root'));page.setDefaultTimeout(10000);
 // Bounded generated hierarchy setup via the unchanged production API.
 const trees={};for(const type of ['MATERIAL','TECHNIQUE']){
  trees[type]=[];let parentId=null;
  for(let n=1;n<=3;n++){
   const r=await api('dictionaries/'+type+'/values','POST',{label:`UI45 ${type} ${n} ${run}`,code:`UI45_${type}_${n}_${run}`,parentId,reason:'Generated isolated UI regression fixture'});
   expect(r.status(),await r.text()).toBe(201);parentId=(await r.json()).id;trees[type].push(parentId);
  }
 }
 await page.goto(base+'/admin/items/new?catalog=1');
 await page.getByLabel('Inventární číslo: Prefix',{exact:true}).fill('U45-');await page.getByLabel('Inventární číslo: Hlavní číslo',{exact:true}).fill(run);
 const fields={title:'Kompletní UI45 '+run,description:'Odborný popis UI45',originPlace:'Zkušební místo',originNote:'Poznámka vzniku UI45',determinationDate:'2026-11-26',yearFrom:'1900',yearTo:'1901',signature:'Signatura UI45',markant:'Značení UI45',materialNote:'Poznámka materiálu UI45',cardNote:'Poznámka karty UI45'};
 const afterCreation=[];
 for(const [id,value] of Object.entries(fields)){
  if(await page.locator('#'+id).count())await page.locator('#'+id).fill(value);
  else {expect(['originNote','determinationDate','yearFrom','yearTo','cardNote']).toContain(id);afterCreation.push(id);}
 }
 await page.locator('#quantity').fill('0');await page.locator('#objectCondition').selectOption('Dobrý');
 const subject=page.getByRole('region',{name:'Námět',exact:true});
 await subject.getByRole('button',{name:'+ Nová autorita Námět',exact:true}).click();
 const label=page.locator('input#dictLabel, #dictLabel input');await label.fill('Nový námět UI45 '+run);
 const made=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/dictionaries/SUBJECT/values'));
 await page.getByRole('button',{name:'Přidat a vybrat',exact:true}).click();expect((await made).status()).toBe(201);
 await expect(subject.locator('select')).toHaveValue(/.+/);
 const subjectId=await subject.locator('select').inputValue();const id=await saveMain();
 await open(id);for(const key of afterCreation)await page.locator('#'+key).fill(fields[key]);
 await saveMain();await open(id);
 for(const [key,value] of Object.entries(fields))await expect(page.locator('#'+key)).toHaveValue(value);
 await expect(page.locator('#quantity')).toHaveValue('0');await expect(subject.locator('select')).toHaveValue(subjectId);
 checks.push('A/C: new item with supported main professional values, zero, exact newly created SUBJECT identity, save and full reload');
 const locality=page.locator('#current-LOCALITY');await expect(locality.locator('option')).not.toHaveCount(1);
 const localityId=await locality.locator('option').nth(1).getAttribute('value');
 await locality.selectOption(localityId);await saveMain();await open(id);await expect(locality).toHaveValue(localityId);
 checks.push('F: main locality editor persists the explicitly selected exact dictionary identity and reloads it');
 // Main-card historical assignments: independent positions for both types.
 for(const [index,type] of ['MATERIAL','TECHNIQUE'].entries()){
  const details=page.locator('.curator-card-material-row > details').nth(index);await details.locator(':scope > summary').click();
  await details.getByLabel('Hledat: '+(index?'Technika':'Materiál')+' (Číselník)',{exact:true}).fill('Zkusebni radek');
  const first=details.getByLabel((index?'Technika':'Materiál')+' — přiřazení 1',{exact:true});
  await expect(first.locator('option')).not.toHaveCount(1);await first.selectOption({index:1});
  const second=details.getByLabel((index?'Technika':'Materiál')+' — přiřazení 2',{exact:true});await second.selectOption({index:1});
 }
 const selected=await page.locator('.curator-card-material-row select[aria-label*="přiřazení"]').evaluateAll(list=>list.map(el=>({label:el.getAttribute('aria-label'),value:el.value})).filter(v=>v.value));
 await saveMain();await open(id);
 for(const d of await page.locator('.curator-card-material-row > details').all())await d.locator(':scope > summary').click();
 for(const entry of selected)await expect(page.getByLabel(entry.label,{exact:true})).toHaveValue(entry.value);
 checks.push('D: independent original material and technique positions saved together and reloaded with exact IDs');
 // The existing MatTech editor persists a current three-level path for each type.
 await open(1001);await tab('MatTech').click();
 const table=page.getByRole('table',{name:'Evidence materiálu a techniky',exact:true});
 const row=table.getByRole('row').filter({hasText:'Testovací záznam MatTech'});const recordId=await row.getAttribute('data-professional-record-id');
 await row.getByRole('button',{name:'Upravit',exact:true}).click();
 const group=page.locator(`[data-mattech-group="MATERIAL"][data-record-id="${recordId}"]`);
 for(let n=1;n<=3;n++)await group.getByLabel('Materiál — úroveň '+n,{exact:true}).selectOption(trees.MATERIAL[n-1]);
 let pending=page.waitForResponse(r=>r.request().method()==='PATCH'&&r.url().endsWith('/professional-records/MATERIAL_TECHNIQUE/'+recordId));
 await page.getByRole('button',{name:'Uložit záznam',exact:true}).click();expect((await pending).status()).toBe(200);
 await open(1001);await tab('MatTech').click();for(let n=1;n<=3;n++)await expect(group.getByLabel('Materiál — úroveň '+n,{exact:true})).toHaveValue(trees.MATERIAL[n-1]);
 await page.getByRole('button',{name:'Přidat další materiál / techniku',exact:true}).click();
 const tech=page.locator('[data-mattech-group="TECHNIQUE"][data-record-id="new"]');
 for(let n=1;n<=3;n++)await tech.getByLabel('Technika — úroveň '+n,{exact:true}).selectOption(trees.TECHNIQUE[n-1]);
 pending=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/professional-records/MATERIAL_TECHNIQUE'));
 await page.getByRole('button',{name:'Uložit záznam',exact:true}).click();const techReply=await pending;expect(techReply.status()).toBe(201);const techId=(await techReply.json()).record.id;
 await open(1001);await tab('MatTech').click();
 for(let n=1;n<=3;n++)await expect(page.locator(`[data-mattech-group="TECHNIQUE"][data-record-id="${techId}"]`).getByLabel('Technika — úroveň '+n,{exact:true})).toHaveValue(trees.TECHNIQUE[n-1]);
 checks.push('D/F: current MATERIAL and TECHNIQUE three-level hierarchies saved as independent MatTech records and confirmed after reload');
 // Dirty-state cancellation is tested without losing the actual draft.
 await open(id);await page.locator('#description').fill('Neuložený draft UI45');
 const dialog=page.waitForEvent('dialog');const back=page.getByRole('button',{name:'Zrušit a zpět na detail',exact:true}).first().click();
 const prompt=await dialog;await prompt.dismiss();await back;await expect(page.locator('#description')).toHaveValue('Neuložený draft UI45');
 page.once('dialog',d=>d.accept());await open(id);checks.push('G: dirty-state navigation refusal retains the draft');
 // A second real editor changes the same item; the original editor must receive 412.
 await page.locator('#description').fill('Neuložený konflikt UI45');
 const other=await context.newPage();await other.goto(base+`/admin/items/edit/${id}?catalog=1&edit=professional`);await expect(other.locator('#description')).toBeEnabled();
 await other.locator('#description').fill('Souběžná změna UI45');await other.getByRole('button',{name:'Uložit předmět (dole)',exact:true}).click();await other.waitForURL(/\/items\/view\//);
 pending=page.waitForResponse(r=>r.request().method()==='PUT'&&r.url().includes('/items/'+id+'/curator-record'));
 await page.getByRole('button',{name:'Uložit předmět (dole)',exact:true}).click();expect((await pending).status()).toBe(412);await expect(page.locator('#description')).toHaveValue('Neuložený konflikt UI45');
 checks.push('G: actual competing main-form save returns 412 and preserves the unsaved conflicting value');
 const readerContext=await browser.newContext();const reader=await login(readerContext,'gen-reader');
 const denied=await api('items/'+id+'/curator-record/professional','PUT',{description:'FORBIDDEN'},'"0"',reader.token);expect(denied.status()).toBe(403);
 await reader.page.goto(base+`/admin/items/view/${id}?catalog=1`);await expect(reader.page.locator('.curator-card-main')).toBeVisible();await expect(reader.page.locator('.curator-card-location')).toHaveCount(0);
 await expect(reader.page.getByRole('button',{name:'Uložit předmět (dole)',exact:true})).toHaveCount(0);
 checks.push('G: existing reader cannot write and receives no physical-storage block');
 result('PASS');
}catch(e){result('FAIL',e.stack);await page?.screenshot({path:input.output+'/workflow-failure.png',mask:[page.locator('.curator-card-location output')]}).catch(()=>{});throw e;}
finally{await browser?.close();await server?.close();}
