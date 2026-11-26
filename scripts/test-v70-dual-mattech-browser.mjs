import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
import {chromium,expect as browserExpect} from '@playwright/test';
import fs from 'node:fs';
const expect=browserExpect.configure({timeout:15000});
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(input.dataKind!=='REPORTED_V70_UUID_LOCAL_CONTRACT_FIXTURE')throw Error('Owned V70 contract fixture required');
 let server,browser,page;const checks=[];
try{
 server=await startSyntheticHttp(input);browser=await chromium.launch({channel:'chrome',headless:false});
 page=await browser.newPage({viewport:{width:1366,height:900}});page.setDefaultTimeout(15000);
 await page.goto('http://127.0.0.1:18213/login');await page.locator('input[type="text"]').fill('gen-root');
 await page.locator('input[type="password"]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();
 await page.getByLabel('Katalog',{exact:true}).selectOption('1');await page.getByRole('table',{name:'Sbírky — tabulkové zobrazení'}).waitFor();
 const table=()=>page.getByRole('table',{name:'Evidence materialTuples',exact:true});
 const form=()=>page.getByRole('heading',{name:/Přidat záznam materiálu a techniky|Úprava záznamu #/}).locator('../..');
 const level=(label,n)=>form().getByLabel(label+' — úroveň '+n,{exact:true});
 const row=id=>table().getByRole('row').filter({has:page.getByText(new RegExp(' · #'+id+'$'))});
 const currentRows=()=>table().getByRole('row').filter({has:page.getByRole('button',{name:'Upravit',exact:true})});
 const open=async id=>{await page.goto('http://127.0.0.1:18213/admin/items/edit/'+id+'?catalog=1');await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:'MatTech',exact:true}).click();await table().waitFor();await expect(page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button')).toHaveCount(20);};
 const edit=async id=>{await row(id).getByRole('button',{name:'Upravit',exact:true}).click();};
 const save=async()=>{const saved=page.waitForResponse(r=>['PATCH','POST'].includes(r.request().method())&&/\/professional-records\/MATERIAL_TECHNIQUE(?:\/\d+)?$/.test(new URL(r.url()).pathname));await form().getByRole('button',{name:'Uložit záznam',exact:true}).click();const r=await saved;if(![200,201].includes(r.status()))throw Error('Save rejected '+r.status()+': '+await r.text());await page.getByText('Záznam uložen.',{exact:true}).waitFor();return (await r.json()).record.id;};
 const writes=[];page.on('request',r=>{if(!['GET','HEAD','OPTIONS'].includes(r.method())&&new URL(r.url()).pathname.startsWith('/api/v2/catalogs/'))writes.push(r.method()+' '+r.url());});
 if(input.n184){
  await open(input.n184.itemId);await expect(row(19)).toContainText('Materiál ID: '+input.n184.uuid);
  await expect(row(19).locator('[data-current-mattech-path="MATERIAL"]')).toHaveText(' · Materiál: Úroveň 1: dřevo');
  await expect(page.getByTestId('mattech-current-status')).toContainText('materiály 1, techniky 0');
  await expect(page.getByTestId('mattech-current-status')).not.toContainText('REVIEW_REQUIRED');
  await expect(level('Materiál',1)).toHaveValue(input.n184.uuid);await expect(level('Materiál',1).locator('option:checked')).toHaveText('dřevo');
  for(const n of [2,3])await expect(level('Materiál',n)).toHaveValue('');for(const n of [1,2,3])await expect(level('Technika',n)).toHaveValue('');
  const selectedBox=await level('Materiál',1).boundingBox();
  await page.evaluate(offset=>window.scrollBy({top:offset,behavior:'instant'}),selectedBox.y-380);
  await page.screenshot({path:input.output+'/n184-select-drevo-without-edit-click.png'});
  checks.push('N184 opens directly with dřevo selected in level1 before any Edit click; material2/3 and technique1/2/3 empty');
 }
 await open(input.kr.itemId);await expect(level('Materiál',1)).toHaveValue(input.kr.material);await expect(level('Technika',1)).toHaveValue(input.kr.technique);
 await expect(level('Materiál',1).locator('option:checked')).toHaveText('vejce slepičí vyfouknuté');await expect(level('Technika',1).locator('option:checked')).toHaveText('batikování');
 const dualBox=await level('Materiál',1).boundingBox();await page.evaluate(offset=>window.scrollBy({top:offset,behavior:'instant'}),dualBox.y-380);await page.screenshot({path:input.output+'/kr8223-both-selects-without-click.png'});
 checks.push('KR8223 automatically displays material row20 and technique row21 simultaneously, before Edit; distinct IDs retained');
 await open(1002);await expect(currentRows()).toHaveCount(8);
 for(const entry of input.many){await expect(row(entry.record)).toContainText(entry.uuid);await edit(entry.record);await expect(level('Materiál',1)).toHaveValue(entry.uuid);await expect(level('Technika',1)).toHaveValue(input.manyTech[0].uuid);}
 await expect(page.getByTestId('mattech-current-status')).toContainText('materiály 5, techniky 3');
 for(const entry of input.manyTech){await edit(entry.record);await expect(level('Technika',1)).toHaveValue(entry.uuid);await expect(level('Materiál',1)).toHaveValue(input.many[0].uuid);}
 checks.push('all five current material assignments and exact root paths automatically visible before editing');
 await open(1001);
 await expect(row(6)).toContainText('Materiál ID: '+input.material);
 await expect(row(7)).toContainText('Technika ID: '+input.technique);
 await expect(level('Materiál',1)).toHaveValue(input.material);await expect(level('Technika',1)).toHaveValue(input.technique);
 await edit(7);await expect(level('Technika',1)).toHaveValue(input.technique);await expect(level('Materiál',1)).toHaveValue(input.material);
 await expect(row(6).locator('[data-current-mattech-path="MATERIAL"]')).toContainText('Úroveň 1: vejce slepičí vyfouknuté');
 await expect(row(7).locator('[data-current-mattech-path="TECHNIQUE"]')).toContainText('Úroveň 1: batikování voskem reliéfní');
 if(writes.length)throw Error('Opening existing items performed writes: '+writes.join(', '));
 checks.push('opening N184, KR8223, five-material/three-technique item and item1001 causes zero write HTTP requests');
 await open(input.kr.itemId);await level('Materiál',1).selectOption(input.many[2].uuid);await save();await open(input.kr.itemId);await expect(level('Materiál',1)).toHaveValue(input.many[2].uuid);await expect(level('Technika',1)).toHaveValue(input.kr.technique);await expect(row(21)).toContainText(input.kr.technique);
 await level('Materiál',1).selectOption(input.kr.material);await save();await open(input.kr.itemId);await edit(21);await level('Technika',1).selectOption(input.technique);await save();await open(input.kr.itemId);await expect(level('Materiál',1)).toHaveValue(input.kr.material);await expect(level('Technika',1)).toHaveValue(input.technique);await expect(row(20)).toContainText(input.kr.material);
 await edit(21);await level('Technika',1).selectOption(input.kr.technique);await save();await open(input.kr.itemId);await expect(level('Materiál',1)).toHaveValue(input.kr.material);await expect(level('Technika',1)).toHaveValue(input.kr.technique);checks.push('edit/save/reload row20 leaves row21 unchanged; edit/save/reload row21 leaves row20 unchanged; both original UUIDs restored');
 await open(1001);
 for(const [id,label,value] of [[6,'Materiál',input.material],[7,'Technika',input.technique]]){
  await edit(id);await expect(level(label,1)).toHaveValue(value);await expect(level(label,2)).toHaveValue('');await expect(level(label,3)).toHaveValue('');
  checks.push('item1001 record'+id+' API UUID → existing level1; no invented level2/3');
  await page.screenshot({path:input.output+'/record-'+id+'-root-selected.png',fullPage:true});
  const tree=input.trees[label];
  await level(label,1).selectOption(tree[0]);await expect(level(label,1)).toHaveValue(tree[0]);
  await level(label,2).selectOption(tree[1]);await expect(level(label,2)).toHaveValue(tree[1]);
  await level(label,3).selectOption(tree[2]);await expect(level(label,3)).toHaveValue(tree[2]);
  await save();await open(1001);
  await expect(row(id).locator('[data-current-mattech-path]')).toContainText('Úroveň 3: GENERATED explicit current');
  await edit(id);
  for(let n=1;n<=3;n++)await expect(level(label,n)).toHaveValue(tree[n-1]);
  checks.push('record'+id+' explicit GENERATED current three-level path → save → reload');
  await level(label,1).selectOption(value);await save();await open(1001);await edit(id);
  await expect(level(label,1)).toHaveValue(value);await expect(level(label,2)).toHaveValue('');await expect(level(label,3)).toHaveValue('');
  checks.push('record'+id+' restore original UUID → save → reload; identity stable');
 }
 await open(1002);await expect(currentRows()).toHaveCount(8);
 for(const entry of input.many)await expect(row(entry.record)).toContainText(entry.uuid);
 await edit(input.many[1].record);await expect(level('Materiál',1)).toHaveValue(input.many[1].uuid);
 await level('Materiál',1).selectOption(input.material);await save();await open(1002);
 await expect(currentRows()).toHaveCount(8);
 await expect(row(input.many[0].record)).toContainText(input.many[0].uuid);await expect(row(input.many[4].record)).toContainText(input.many[4].uuid);
 checks.push('five independent material rows: second edit preserves first/fifth and total5');
 await page.getByRole('button',{name:'Přidat nový záznam',exact:true}).click();for(const label of ['Materiál','Technika'])for(const n of [1,2,3])await expect(level(label,n)).toHaveValue('');
 await level('Materiál',1).selectOption(input.many[1].uuid);const added=await save();await open(1002);
 await expect(currentRows()).toHaveCount(9);await edit(added);await expect(level('Materiál',1)).toHaveValue(input.many[1].uuid);
 checks.push('sixth independent material record → create → save → reload; no limit3');
 await page.screenshot({path:input.output+'/six-independent-materials.png',fullPage:true});
 fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',browser:'Installed Chrome, headful real UI, owned PostgreSQL V70 API; no response mocks',checks,addedRecord:added,liveUatVerified:false},null,2));
}catch(e){fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'FAIL',checks,error:e.message},null,2));if(page){await page.screenshot({path:input.output+'/failure.png',fullPage:true}).catch(()=>{});fs.writeFileSync(input.output+'/private-failure.txt',await page.locator('body').innerText().catch(()=>''));}process.exitCode=1;}
finally{
 console.log('Closing owned browser');if(browser)await browser.close();
 console.log('Closing owned loopback proxy');if(server)await server.close();
 console.log('Owned browser and proxy closed');
}
