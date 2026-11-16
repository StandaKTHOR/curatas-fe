// Production FE -> real local HTTP backend -> owned PostgreSQL and pinned archival rows.
import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
import {chromium,expect} from '@playwright/test';import fs from 'node:fs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(input.dataKind!=='ACTUAL_POLAKOVA_VOCABULARY_FIXTURE')throw Error('Owned fixture required');
let server,browser,page,createdItemId;const base='http://127.0.0.1:18213',checks=[],searchExamples=[],uuidWrites=[],failures=[];
const types=['SUBJECT',...Object.keys(input.choices).filter(type=>type!=='SUBJECT')],mat=type=>['MATERIAL','TECHNIQUE'].includes(type);
const tabName=type=>mat(type)?'MatTech':type==='GROUP'?'Zařazení':['LOCALITY','COUNTRY'].includes(type)?'Akvizice':'Základ';
try{
 server=await startSyntheticHttp(input);browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1366,height:900}});page.setDefaultTimeout(15000);page.on('dialog',d=>d.accept());
 page.on('request',r=>{if(['POST','PUT','PATCH','DELETE'].includes(r.method())&&/dictionaries\/[^/]+\/values/.test(r.url()))uuidWrites.push(new URL(r.url()).pathname);});
 page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).pathname.startsWith('/api/'))failures.push({path:new URL(r.url()).pathname,status:r.status()});});
 const tabs=()=>page.getByRole('navigation',{name:'Karty DEMUS'});
 const tab=async type=>tabs().getByRole('button',{name:tabName(type),exact:true}).click();
 const control=type=>mat(type)?page.getByLabel((type==='MATERIAL'?'Materiál':'Technika')+' (Číselník) — úroveň 1',{exact:true}):page.getByLabel('Současná autorita '+type,{exact:true});
 const verify=async index=>{for(const type of types){await tab(type);await expect(control(type)).toHaveValue(index===null?'':'demus:'+input.choices[type][index].id);}};
 const choose=async(type,index,mode)=>{
  await tab(type);const value=input.choices[type][index];
  const result=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/dictionaries/'+type+'/historical')&&new URL(r.url()).searchParams.get('q')===value.query);
  const search=mat(type)?page.getByLabel('Hledat: '+(type==='MATERIAL'?'Materiál':'Technika')+' (Číselník)',{exact:true}):page.getByLabel('Hledat současnou autoritu '+type,{exact:true});
  await expect(search).toBeEnabled();await search.fill(value.query);const response=await result,body=await response.json();
  if(response.status()!==200||body.catalogId!==1||body.state!=='AVAILABLE'||body.sourceSha256!==value.sourceSha256||!body.items.some(v=>v.recordId===value.id))throw Error(type+' actual partial search did not return exact source');
  const selector=mat(type)?page.getByLabel('Výsledky hledání: '+(type==='MATERIAL'?'Materiál':'Technika')+' (Číselník)',{exact:true}):control(type);
  await expect(selector.locator('option[value="demus:'+value.id+'"]')).toHaveCount(1);await expect(selector.locator('option[value="demus:'+value.id+'"]')).toContainText(value.display);if(index===0&&['MATERIAL','COLLECTION','LOCALITY','COUNTRY','FUND'].includes(type))searchExamples.push({mode,type,query:value.query,display:value.display,recordId:value.id});await selector.selectOption('demus:'+value.id);await expect(control(type)).toHaveValue('demus:'+value.id);
  checks.push(mode+' '+type+' partial HTTP 200/exact selectable record');
 };
 const saveEdit=async()=>{const result=page.waitForResponse(r=>r.request().method()==='PUT'&&new URL(r.url()).pathname.endsWith('/curator-records'));await page.locator('[data-scoped-save]').first().click();if((await result).status()!==200)throw Error('Edit save rejected');await page.reload();};
 await page.goto(base+'/login');await page.locator('input[type="text"]').fill('gen-root');await page.locator('input[type="password"]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');await page.getByRole('table',{name:'Sbírky — tabulkové zobrazení'}).waitFor();
 await page.getByRole('button',{name:'Nový předmět',exact:true}).click();await page.waitForURL('**/admin/items/new?catalog=1');await expect(tabs().getByRole('button')).toHaveCount(20);
 for(const type of types){await tab(type);await expect.poll(()=>control(type).locator('option[value^="demus:"]').count()).toBeGreaterThan(0);checks.push('CREATE '+type+' concrete initial option before typing');}
 await tab('SUBJECT');await expect(page.getByText(/DEMUS Spravce_S je původní kód správce/)).toBeVisible();await expect(page.getByLabel('Současná autorita CUSTODIAN',{exact:true}).locator('option[value^="demus:"]')).toHaveCount(0);
 await page.getByLabel('Inventární číslo: Prefix',{exact:true}).fill('GENERATED-7Q-PICKER-');await page.getByLabel('Inventární číslo: Hlavní číslo',{exact:true}).fill('1');await page.locator('#title').fill('GENERATED source picker create');
 for(const type of types)await choose(type,0,'CREATE');
 const creation=page.waitForResponse(r=>r.request().method()==='POST'&&/\/api\/v2\/catalogs\/1\/items$/.test(new URL(r.url()).pathname));await page.locator('[data-scoped-save]').first().click();const response=await creation;if(response.status()!==201)throw Error('CREATE save rejected '+response.status());createdItemId=(await response.json()).item.id;
 await page.waitForURL('**/admin/items/view/'+createdItemId+'?catalog=1');await page.reload();await verify(0);checks.push('CREATE save/reload preserves all 11 exact identities');
 await page.goto(base+'/admin/items/edit/'+createdItemId+'?catalog=1&edit=professional');await expect(page.getByLabel('Současná autorita FUND',{exact:true})).toBeEnabled({timeout:30000});
 for(const type of ['COLLECTION','MATERIAL','LOCALITY','COUNTRY','FUND'])await choose(type,0,'EDIT');
 for(const type of types)await choose(type,1,'EDIT');await saveEdit();await verify(1);checks.push('EDIT change/save/reload preserves all 11 exact identities');
 for(const type of types){await tab(type);await control(type).selectOption('');}await saveEdit();await verify(null);checks.push('EDIT remove/save/reload clears only 11 current decisions');
 // Existing originals retain their separate read-only source values after the picker fix.
 for(const original of input.originals){await page.goto(base+'/admin/items/view/'+original.id+'?catalog=1');await expect(page.getByLabel('Současná autorita FUND',{exact:true}).locator('option:checked')).toContainText('nábytek (původní DEMUS:');await expect(page.getByLabel('Současná autorita CUSTODIAN',{exact:true}).locator('option:checked')).toContainText('6MM (původní DEMUS:');checks.push('N '+original.ordinal+' original FUND/CUSTODIAN automatic presentation');}
 if(uuidWrites.length)throw Error('Historical selection mutated UUID dictionary');checks.push('no UUID writes; 20 original tabs');
 fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',checks,searchExamples,createdItemId,failures,liveUatVerified:false},null,2));
}catch(e){fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'FAIL',checks,error:e.message,failures},null,2));if(page){fs.writeFileSync(input.output+'/private-failure.txt',await page.locator('body').innerText().catch(()=>''));await page.screenshot({path:input.output+'/failure.png',fullPage:true}).catch(()=>{});}process.exitCode=1;}
finally{if(browser)await browser.close();if(server)await server.close();}
