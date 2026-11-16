// Synthetic browser fixtures only. All API calls are intercepted; no museum data is written.
import { chromium } from '@playwright/test';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const out='docs/update2-comparison';
await mkdir(out,{recursive:true});
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser=await chromium.launch({...(existsSync(edge) ? {executablePath:edge} : {}),headless:true});
const context=await browser.newContext({viewport:{width:1366,height:768}});
const token=`test.${Buffer.from(JSON.stringify({roles:['ADMIN'],exp:2000000000})).toString('base64url')}.test`;
await context.addInitScript(token=>{localStorage.setItem('token',token);localStorage.setItem('loginTime',String(Date.now()));},token);
let version=3, reject=false;
const writes=[], errors=[], checks=[];
let item={id:7,inventoryNumber:'TEST-0007',title:'Testovací předmět — syntetická data',objectType:'Testovací předmět',
    description:'Syntetický záznam pro ověření rozložení. Nejde o předmět muzea.',subCollection:'Testovací podsbírka',
    fundDictionaryId:101,fundLegacyCode:'TEST',author:'Testovací autor',parties:[],datingText:'1900',datingFrom:'1900-01-01',
    dimensions:[],quantity:null,material:'Testovací materiál',technique:'Testovací technika',imageUrls:[],attachments:[],
    legacyCreatedBy:'TEST',legacyCreatedAt:'2000-01-01',legacyData:{Plus1T_S:'Testovací původní údaj'},published:false};
let museum={itemId:7,records:[],originNote:'Testovací poznámka k původu'};
await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname;
    if (!['127.0.0.1','localhost'].includes(url.hostname)) return route.abort();
    if(!path.includes('/api/')&&!path.includes('/public/'))return route.continue();
    const json=async (body,status=200)=>route.fulfill({status,headers:{'Content-Type':'application/json','ETag':`"${version}"`},body:JSON.stringify(body)});
    if(request.method()!=='GET'){
        writes.push({path,method:request.method(),headers:request.headers(),body:request.postDataJSON()});
        if(reject)return json({message:'Záznam mezitím změněn',code:'STALE_WRITE'},412);
        if(path.endsWith('/items')) {item={...item,...request.postDataJSON()};return json(item);}
        assert.equal(request.headers()['if-match'],`"${version}"`);
        version++;
        if(path.endsWith('/museum')){museum={...museum,...request.postDataJSON()};return json(museum);}
        if(path.endsWith('/7')){item={...item,...request.postDataJSON()};return json({id:7,status:'SUCCESS'});}
        return json({id:12,...request.postDataJSON()});
    }
    if(path.endsWith('/version'))return json({rowVersion:version});
    if(path.endsWith('/museum'))return json(museum);
    if(path.endsWith('/acquisitions')||path.endsWith('/images')||path.endsWith('/attachments')||path.endsWith('/worksets')||path.endsWith('/parties'))return json([]);
    if(path.endsWith('/attachments/count'))return json({count:0});
    if(path.endsWith('/inventory-identity')) {
        const source=Object.fromEntries(['series','ordinal','division','hierarchyOrdinal','hierarchyDivision','stateCode','custodianCode','departmentCode','collectionCode'].map(key=>[key,null]));
        return json({itemId:7,inventoryNumber:item.inventoryNumber,rowVersion:version,revision:0,components:{...source,series:'TEST-',ordinal:'0007'},sourceComponents:source,edited:false,stale:false,aliases:[]});
    }
    if(path.endsWith('/demus-identity'))return json({message:'Testovací záznam nemá zdrojovou DEMUS identitu'},404);
    if(path.endsWith('/tree'))return json([{id:101,label:'Testovací skupina',code:'TEST',children:[{id:102,label:'Druhá úroveň',code:'TEST2',children:[{id:103,label:'Třetí úroveň',code:'TEST3',children:[]}]}]}]);
    if(path.endsWith('/dictionaries'))return json({funds:[],objectTypes:['Testovací předmět'],materials:[],techniques:[],spravci:[],authors:[],countries:[]});
    if(path.endsWith('/next-numbers'))return json({inventory:'TEST-0008',accession:''});
    if(path.endsWith('/check'))return json({exists:false});
    if(path.endsWith('/7'))return json(item);
    if(path.endsWith('/items'))return json({content:Array.from({length:25},(_,n)=>({...item,id:n+7,inventoryNumber:`TEST-${String(n+7).padStart(4,'0')}`})),totalPages:4,totalElements:100,last:false});
    return json({message:`Uncovered fixture ${path}`},404);
});
const page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
try {
    await page.goto('http://127.0.0.1:5174/admin/items/edit/7');
    await page.getByLabel('Název sbírkového předmětu (nebo typ)',{exact:true}).waitFor();
    await page.screenshot({path:`${out}/edit-desktop.png`,fullPage:false});
    const save=page.getByRole('button',{name:'Uložit',exact:true});
    assert((await save.boundingBox()).y<768);checks.push('Desktop save visible');
    await page.getByRole('button',{name:'MatTech',exact:true}).click();
    await page.getByRole('combobox',{name:'Materiál (Číselník)',exact:true}).selectOption('103');
    checks.push('Third-level dictionary selection');
    await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
    const stickySave=await save.boundingBox();
    assert(stickySave.y >= 0 && stickySave.y < 768);checks.push('Save remains accessible after scrolling');
    const identification=await page.getByRole('complementary',{name:'Permanentní identifikace předmětu'}).boundingBox();
    const toolbar=await page.locator('.demus-toolbar').boundingBox();
    assert(identification.y >= toolbar.y+toolbar.height-1);checks.push('Sticky identification does not overlap toolbar');
    await page.screenshot({path:`${out}/edit-scrolled.png`});
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:'Vznik',exact:true}).click();
    await page.getByLabel('Místo vzniku',{exact:true}).fill('Testovací vznik');
    await page.getByRole('button',{name:'Dokumentace',exact:true}).first().click();
    await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:'Vznik',exact:true}).click();
    await page.getByLabel('Místo vzniku',{exact:true}).waitFor();
    assert.equal(await page.getByLabel('Místo vzniku',{exact:true}).inputValue(),'Testovací vznik');
    checks.push('Origin draft survives tab navigation');
    await page.screenshot({path:`${out}/origin-desktop.png`});
    await page.getByRole('button',{name:'Základ',exact:true}).click();
    reject=true;
    await save.click();
    await page.getByText(/Vaše zadání zůstává zachováno/).waitFor();
    assert.equal(writes.at(-1).headers['if-match'],'"3"'); checks.push('412 keeps draft and snapshot token');
    await page.screenshot({path:`${out}/conflict-desktop.png`});
    reject=false;
    await page.goto('http://127.0.0.1:5174/admin/items');
    await page.locator('tbody tr').first().waitFor();
    await page.screenshot({path:`${out}/catalog-desktop.png`});
    const rowHeight=await page.locator('tbody tr').first().evaluate(el=>el.getBoundingClientRect().height);
    assert(rowHeight<=36);
    checks.push(`Catalogue row height ${rowHeight}px`);
    await page.getByRole('spinbutton',{name:'Číslo stránky evidence'}).first().fill('3');
    await page.waitForURL(/page=2/);checks.push('Direct page navigation');
    const anonymous=await context.newPage();
    await anonymous.addInitScript(()=>localStorage.removeItem('token'));
    await anonymous.goto('http://127.0.0.1:5174/');
    await anonymous.locator('tbody tr').first().waitFor();
    await anonymous.screenshot({path:`${out}/public-catalog-desktop.png`});
    assert.equal(await anonymous.getByRole('button',{name:/Klonovat/}).count(),0);
    const publicHeight=await anonymous.locator('tbody tr').first().evaluate(el=>el.getBoundingClientRect().height);
    assert(publicHeight<=36);checks.push(`Anonymous catalogue row height ${publicHeight}px; no clone action`);
    await anonymous.close();
    await page.goto('http://127.0.0.1:5174/admin/items/new');
    await page.getByRole('textbox',{name:'Inventární číslo: Hlavní číslo'}).fill('0008');
    await page.getByRole('textbox',{name:'Inventární číslo: Prefix'}).fill('TEST-');
    await page.getByLabel('Název sbírkového předmětu (nebo typ)',{exact:true}).fill('Nový testovací předmět');
    await page.screenshot({path:`${out}/create-desktop.png`});
    await page.getByRole('button',{name:'Uložit',exact:true}).click();
    await page.waitForURL(/edit\/7/);
    assert.equal(writes.at(-1).method,'POST');assert.equal(writes.at(-1).body.inventoryNumber,'TEST-0008');
    checks.push('Creation with explicit inventory and optional accession');
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:`${out}/edit-mobile.png`});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
    assert.equal(overflow,false);
    checks.push(`Mobile document overflow: ${overflow}`);
    assert.equal(errors.length,0,JSON.stringify(errors));
    if (existsSync('docs/update2-references/image3.png')) await copyFile('docs/update2-references/image3.png',`${out}/demus-reference-card.png`);
    if (existsSync('docs/update2-references/image17.png')) await copyFile('docs/update2-references/image17.png',`${out}/demus-reference-table.png`);
    await writeFile(`${out}/browser-results.json`,JSON.stringify({fixture:'Synthetic, all API calls intercepted, no live backend writes',checks,errors},null,2));
    console.log(JSON.stringify({checks,errors}));
} finally {await browser.close();}
