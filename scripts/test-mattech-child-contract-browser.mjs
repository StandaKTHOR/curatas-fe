import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(input.dataKind!=='ACTUAL_POLAKOVA_VOCABULARY_FIXTURE')throw Error('Owned archival fixture required');
expect.configure({timeout:15000});
let server,browser,page;const checks=[],children=[],base='http://127.0.0.1:18213';
try{
 server=await startSyntheticHttp(input);browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1366,height:900}});page.setDefaultTimeout(15000);
 await page.goto(base+'/login');await page.locator('input[type="text"]').fill('gen-root');await page.locator('input[type="password"]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');await page.getByRole('table',{name:'Sbírky — tabulkové zobrazení'}).waitFor();
 const tab=async()=>page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:'MatTech',exact:true}).click();
 const tuple=()=>page.getByRole('heading',{name:/Přidat záznam materiálu a techniky|Úprava záznamu #/}).locator('../..');
 const choose=async(type,label,query)=>{await tuple().getByLabel('Hledat: '+label,{exact:true}).fill(query);const option='demus:'+input.references[type].recordId;const found=tuple().getByLabel('Výsledky hledání: '+label,{exact:true});await expect(found.locator('option[value="'+option+'"]')).toHaveCount(1);await found.selectOption(option);await expect(tuple().getByLabel(label+' — úroveň 1',{exact:true})).toHaveValue(option);};
 for(const mode of ['EDIT','CREATE']){
  let item=input.itemId;
  if(mode==='CREATE'){
   await page.goto(base+'/admin/items?catalog=1');await page.getByRole('button',{name:'Nový předmět',exact:true}).click();await page.locator('#title').fill('GENERATED historical child CREATE');await page.getByLabel('Inventární číslo: Prefix',{exact:true}).fill('GENERATED-CHILD-');await page.getByLabel('Inventární číslo: Hlavní číslo',{exact:true}).fill('1');
   const pending=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/v2/catalogs/1/items');await page.locator('[data-scoped-save]').first().click();const created=await pending;if(created.status()!==201)throw Error('Parent CREATE rejected');item=(await created.json()).item.id;await page.waitForURL('**/admin/items/view/'+item+'?catalog=1');
  }
  await page.goto(base+'/admin/items/edit/'+item+'?catalog=1&edit=professional');await tab();
  for(const [type,label,query] of [['MATERIAL','Materiál','sklo'],['TECHNIQUE','Technika','batika']])await choose(type,label,query);
  const note='GENERATED historical child '+mode;await tuple().getByLabel('Poznámka k materiálu a technice',{exact:true}).fill(note);
  const saved=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname.endsWith('/professional-records/MATERIAL_TECHNIQUE'));await tuple().getByRole('button',{name:'Uložit záznam',exact:true}).click();const response=await saved;if(response.status()!==201)throw Error('Child CREATE rejected '+await response.text());const id=(await response.json()).record.id;children.push({itemId:item,childId:id});
  await page.getByText('Záznam uložen.',{exact:true}).waitFor();await page.reload();await tab();const table=page.getByRole('table',{name:'Evidence materialTuples',exact:true});const row=table.getByRole('row').filter({hasText:note});await expect(row).toContainText('sklo (DEMUS');await expect(row).toContainText('batika vosková - špendlík (DEMUS');await row.getByRole('button',{name:'Upravit',exact:true}).click();
  for(const [type,label] of [['MATERIAL','Materiál'],['TECHNIQUE','Technika']])await expect(tuple().getByLabel(label+' — úroveň 1',{exact:true})).toHaveValue('demus:'+input.references[type].recordId);
  checks.push(mode+' child material+technique precise source identities survive save/close/reopen');
  await page.screenshot({path:input.output+'/'+mode.toLowerCase()+'-child-reloaded.png',fullPage:true});
  await tuple().getByLabel('Materiál — úroveň 1',{exact:true}).selectOption('');const patched=page.waitForResponse(r=>r.request().method()==='PATCH'&&new URL(r.url()).pathname.endsWith('/'+id));await tuple().getByRole('button',{name:'Uložit záznam',exact:true}).click();if((await patched).status()!==200)throw Error('Child remove rejected');await page.getByText('Záznam uložen.',{exact:true}).waitFor();await page.reload();await tab();await table.getByRole('row').filter({hasText:note}).getByRole('button',{name:'Upravit',exact:true}).click();await expect(tuple().getByLabel('Materiál — úroveň 1',{exact:true})).toHaveValue('');await expect(tuple().getByLabel('Technika — úroveň 1',{exact:true})).toHaveValue('demus:'+input.references.TECHNIQUE.recordId);checks.push(mode+' material removal leaves technique and child identity intact');
  await choose('MATERIAL','Materiál','sklo');const restored=page.waitForResponse(r=>r.request().method()==='PATCH'&&new URL(r.url()).pathname.endsWith('/'+id));await tuple().getByRole('button',{name:'Uložit záznam',exact:true}).click();if((await restored).status()!==200)throw Error('Restore source rejected');await page.getByText('Záznam uložen.',{exact:true}).waitFor();await expect(page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button')).toHaveCount(20);
 }
 fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',browser:'Installed Chrome, real interactive actions in headless mode',checks,children,liveUatVerified:false},null,2));
}catch(e){fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'FAIL',checks,error:e.message},null,2));if(page){await page.screenshot({path:input.output+'/failure.png',fullPage:true}).catch(()=>{});fs.writeFileSync(input.output+'/private-failure.txt',await page.locator('body').innerText().catch(()=>''));}process.exitCode=1;}
finally{if(browser)await browser.close();if(server)await server.close();}
