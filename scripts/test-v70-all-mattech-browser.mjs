import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
import {chromium,expect as browserExpect} from '@playwright/test';
import fs from 'node:fs';
const expect=browserExpect.configure({timeout:15000}),input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(input.dataKind!=='REPORTED_V70_UUID_LOCAL_CONTRACT_FIXTURE')throw Error('Owned V70 fixture required');
let server,browser,page;const checks=[],writes=[];
try{
 server=await startSyntheticHttp(input);browser=await chromium.launch({channel:'chrome',headless:false});page=await browser.newPage({viewport:{width:1366,height:900}});
 await page.goto('http://127.0.0.1:18213/login');await page.locator('input[type="text"]').fill('gen-root');await page.locator('input[type="password"]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');await page.getByRole('table',{name:'Sbírky — tabulkové zobrazení'}).waitFor();
 page.on('request',r=>{if(!['GET','HEAD','OPTIONS'].includes(r.method())&&new URL(r.url()).pathname.startsWith('/api/v2/catalogs/'))writes.push(r);});
 const form=()=>page.getByRole('heading',{name:/Přidat záznam materiálu a techniky|Úprava záznamu #/}).locator('../..');
 const group=(type,id)=>form().locator(`[data-mattech-group="${type}"][data-record-id="${id}"]`);
 const level=(type,id,n=1)=>group(type,id).getByLabel((type==='MATERIAL'?'Materiál':'Technika')+' — úroveň '+n,{exact:true});
 const open=async id=>{await page.goto('http://127.0.0.1:18213/admin/items/edit/'+id+'?catalog=1');await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:'MatTech',exact:true}).click();await form().waitFor();await expect(page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button')).toHaveCount(20);};
 const verify=async(rows,m,t)=>{await expect(form().locator('[data-mattech-group="MATERIAL"]:not([data-record-id="new"])')).toHaveCount(m);await expect(form().locator('[data-mattech-group="TECHNIQUE"]:not([data-record-id="new"])')).toHaveCount(t);for(const r of rows)await expect(level(r.type,r.record)).toHaveValue(r.uuid);};
 await open(input.zv.itemId);await verify(input.zv.rows,3,1);for(const r of input.zv.rows)await expect(level(r.type,r.record).locator('option:checked')).toHaveText(r.label);
 await page.setViewportSize({width:1366,height:2200});const box=await level('MATERIAL',69).boundingBox();await page.evaluate(offset=>window.scrollBy({top:offset,behavior:'instant'}),box.y-380);await page.screenshot({path:input.output+'/zv829-all-four-select-groups.png'});await page.setViewportSize({width:1366,height:900});
 checks.push('ZV829: paper/textile/wire/handwork all four selected groups rendered simultaneously without Edit; record69/70/71/72 retained');
 await open(input.kr.itemId);await verify([{type:'MATERIAL',record:20,uuid:input.kr.material},{type:'TECHNIQUE',record:21,uuid:input.kr.technique}],1,1);
 await open(input.n184.itemId);await verify([{type:'MATERIAL',record:19,uuid:input.n184.uuid}],1,0);await expect(level('TECHNIQUE','new')).toHaveValue('');
 const eight=[...input.many.map(r=>({...r,type:'MATERIAL'})),...input.manyTech.map(r=>({...r,type:'TECHNIQUE'}))];
 await open(1002);await verify(eight,5,3);await open(90001);await verify(input.capacity,10,6);checks.push('all 8 and all 16 UUID assignments simultaneously selected; original row order and identity preserved');
 if(writes.length)throw Error('Opening performed write requests');checks.push('ZV829/KR8223/N184/8/16 opening: zero write HTTP requests');
 const save=async(record,type)=>{const response=page.waitForResponse(r=>['POST','PATCH'].includes(r.request().method())&&/\/professional-records\/MATERIAL_TECHNIQUE(?:\/\d+)?$/.test(new URL(r.url()).pathname));await form().getByRole('button',{name:'Uložit záznam',exact:true}).click();const r=await response;if(![200,201].includes(r.status()))throw Error('Save rejected '+r.status());if(record&&!new URL(r.url()).pathname.endsWith('/'+record))throw Error('Wrong save record');const sent=JSON.stringify(r.request().postDataJSON());if(type==='MATERIAL'&&sent.includes('techniqueAuthorityId')||type==='TECHNIQUE'&&sent.includes('materialAuthorityId'))throw Error('Opposite assignment leaked into save');await page.getByText('Záznam uložen.',{exact:true}).waitFor();return (await r.json()).record.id;};
 for(const [type,index,replacement] of [['MATERIAL',2,input.material],['TECHNIQUE',1,input.technique]]){
  const target=type==='MATERIAL'?input.many[index]:input.manyTech[index];await open(1002);await group(type,target.record).getByRole('button',{name:new RegExp('#'+target.record+'$')}).click();await level(type,target.record).selectOption(replacement);await save(target.record,type);await open(1002);await verify(eight.map(r=>r.record===target.record?{...r,uuid:replacement}:r),5,3);
  await group(type,target.record).getByRole('button',{name:new RegExp('#'+target.record+'$')}).click();await level(type,target.record).selectOption(target.uuid);await save(target.record,type);await open(1002);await verify(eight,5,3);
 }
 checks.push('third material and second technique save/reload affect only their own record IDs; every other UUID unchanged; originals restored');
 await form().getByRole('button',{name:'Přidat nový záznam',exact:true}).click();await verify(eight,5,3);await expect(level('MATERIAL','new')).toHaveValue('');await expect(level('TECHNIQUE','new')).toHaveValue('');await level('MATERIAL','new').selectOption(input.material);const added=await save(null,'MATERIAL');await open(1002);await verify([...eight,{type:'MATERIAL',record:added,uuid:input.material}],6,3);checks.push('explicit Add retains all existing groups and creates exactly one new row');
 fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',browser:'Installed Chrome headful + actual PostgreSQL V70 API, no HTTP mocks',checks,addedRecord:added,liveUatVerified:false},null,2));
}catch(e){fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'FAIL',checks,error:e.message},null,2));if(page){await page.screenshot({path:input.output+'/failure.png',fullPage:true}).catch(()=>{});fs.writeFileSync(input.output+'/private-failure.txt',await page.locator('body').innerText().catch(()=>''));}process.exitCode=1;}
finally{if(browser)await browser.close();if(server)await server.close();}
