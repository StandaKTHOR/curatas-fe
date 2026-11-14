// Local browser regression: real React/API client, synthetic intercepted HTTP; never UAT.
import {chromium, expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir, writeFile, createWriteStream} from 'node:fs';
import {promisify} from 'node:util';
import {resolve} from 'node:path';
const makeDir=promisify(mkdir), write=promisify(writeFile);
const root=resolve(import.meta.dirname,'..'), output=resolve(root,'scratch',`batch23-browser-${Date.now()}`);
await makeDir(output,{recursive:true});
await write(resolve(output,'index.html'),`<!doctype html><html lang="cs"><meta charset="utf-8"><title>MatTech synthetic browser check</title><div id="root"></div><script type="module">
import React from 'react';
import {createRoot} from 'react-dom/client';
import MuseumSection from '/src/components/MuseumSection.tsx';
import '/src/index.css';
const version=await fetch('/api/v1/items/7/version');
const session={itemId:7,etag:version.headers.get('ETag')};
createRoot(document.getElementById('root')).render(React.createElement(MuseumSection,{itemId:7,section:'materialTuples',editSession:session}));
</script></html>`);
const log=createWriteStream(resolve(output,'vite.log'));
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5187','--strictPort'],{cwd:root,windowsHide:true,env:{...process.env,VITE_APP_BASE:'/',VITE_API_BASE:'http://127.0.0.1:5187'},stdio:['ignore','pipe','pipe']});
server.stdout.pipe(log);server.stderr.pipe(log);
let browser, page;
try {
    const base='http://127.0.0.1:5187';let ready=false;
    for(let i=0;i<40;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}
    if(!ready)throw new Error('Owned Vite server did not become ready');
    browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1280,height:1000}});
    const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('Browser pageerror:',e.message);});
    const rows=[],writes=[];let version=0;
    const tree=offset=>[{id:offset+1,code:null,label:offset?'Postupy':'Kovy',children:[{id:offset+2,code:null,label:offset?'Tváření':'Železo',children:[{id:offset+3,code:offset?'TECH':'MAT',label:offset?'Kování':'Litina',children:[]}]}]},{id:offset+4,code:'OTHER',label:'Jiná kategorie',children:[]}];
    await page.route('**/api/v1/**',async route=>{
        const request=route.request(),url=new URL(request.url());let data;
        if(url.pathname.endsWith('/dictionaries/tree'))data=tree(url.searchParams.get('type')==='MATERIAL'?0:10);
        else if(request.method()==='POST'||request.method()==='PATCH'){
            expect(request.headers()['if-match']).toBe(`"${version}"`);
            const body=request.postDataJSON();writes.push({method:request.method(),body});version++;
            if(request.method()==='POST')rows.push({id:51,kind:'MATERIAL_TECHNIQUE',dictionaryId:null,partyId:null,payload:{Material_MT:'MAT',Technika_MT:'TECH',Pozn_MT:body.fields.Pozn_MT??''},legacyData:{},materialDictionaryId:body.materialDictionaryId,techniqueDictionaryId:body.techniqueDictionaryId});
            else rows[0].payload.Pozn_MT=body.fields.Pozn_MT;
            data=rows[0];
        }else if(url.pathname.endsWith('/version'))data={rowVersion:version};
        else data={itemId:7,records:rows};
        await route.fulfill({status:request.method()==='POST'?201:200,contentType:'application/json',headers:{ETag:`"${version}"`},body:JSON.stringify(data)});
    });
    const relative=output.slice(root.length+1).replaceAll('\\','/');await page.goto(`${base}/${relative}/index.html`);
    await expect(page.getByRole('heading',{name:'Přidat záznam materiálu a techniky'})).toBeVisible();
    await expect(page.getByRole('combobox')).toHaveCount(6);
    const select=(label,level)=>page.getByRole('combobox',{name:`${label} — úroveň ${level}`});
    for(const [label,offset] of [['Materiál',0],['Technika',10]])for(let n=1;n<=3;n++)await select(label,n).selectOption(String(offset+n));
    await expect(page.getByLabel('Vybraná cesta: Materiál')).toHaveText('Kovy › Železo › Litina');
    await select('Materiál',1).selectOption('4');await expect(select('Materiál',3)).toBeDisabled();await expect(select('Technika',3)).toHaveValue('13');
    for(let n=1;n<=3;n++)await select('Materiál',n).selectOption(String(n));expect(writes).toHaveLength(0);
    await page.getByRole('button',{name:'Uložit záznam'}).click();await expect(page.getByRole('status')).toHaveText('Záznam uložen.');
    await page.reload();await page.getByRole('button',{name:'Upravit',exact:true}).click();
    await expect(select('Materiál',3)).toHaveValue('3');await expect(select('Technika',3)).toHaveValue('13');
    await page.getByLabel('Poznámka k materiálu a technice',{exact:true}).fill('Browser note');await page.getByRole('button',{name:'Uložit záznam'}).click();
    await expect(page.getByRole('status')).toHaveText('Záznam uložen.');expect(writes).toHaveLength(2);
    expect(writes[1].body).toEqual({fields:{kind:'MATERIAL_TECHNIQUE',Pozn_MT:'Browser note'}});
    await page.getByRole('button',{name:'Upravit',exact:true}).click();
    await expect(select('Materiál',3)).toHaveValue('3');expect(await page.locator('body').innerText()).not.toMatch(/tuple/i);
    expect(errors).toEqual([]);await page.screenshot({path:resolve(output,'mattech.png'),fullPage:true});
    await write(resolve(output,'receipt.json'),JSON.stringify({status:'PASS',scope:'Local Chromium real React/API client, synthetic HTTP interception; no live backend or UAT',writes,errors},null,2));
    console.log(`Browser cascading selects/create/reload/patch PASS; evidence ${output}`);
}catch(error){
    if(page){await write(resolve(output,'failure-body.txt'),await page.locator('body').innerText());await page.screenshot({path:resolve(output,'failure.png'),fullPage:true});}
    throw error;
}finally{
    if(browser)await browser.close();
    server.kill();await new Promise(r=>{if(server.exitCode!==null)r();else server.once('exit',r);});log.end();
}
