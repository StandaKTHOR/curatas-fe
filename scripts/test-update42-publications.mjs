import fs from 'node:fs';
import {chromium,expect} from '@playwright/test';
import {startSyntheticHttp} from './synthetic-http-proxy.mjs';

const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const base=`http://127.0.0.1:${process.env.CURATAS_TEST_HTTP_PORT??18213}`;
const first='b'.repeat(64),other='d'.repeat(64),checks=[];
let app,browser,page;
const section=()=>page.getByRole('region',{name:'Současné bibliografické vazby'});
const publications=()=>section().getByLabel('Publikace',{exact:true});
const pages=()=>section().getByLabel('Strany citace');
const note=()=>section().getByLabel('Poznámka k odborné vazbě');
const order=()=>section().getByLabel('Pořadí odborné vazby',{exact:true});
const row=id=>section().locator(`[data-professional-link="${id}"]`);
const response=(method,id)=>page.waitForResponse(r=>r.request().method()===method&&new URL(r.url()).pathname.endsWith(`/items/1001/professional-links${id?'/'+id:''}`));
const photo=name=>page.screenshot({path:`${input.output}/${name}.png`,animations:'disabled'});
const result=value=>fs.writeFileSync(`${input.output}/${input.mode}-browser.json`,JSON.stringify({checks,chrome:browser?.version(),apiResponsesMocked:false,...value},null,2));

async function open() {
    await page.goto(base+'/admin/items/edit/1001?catalog=1&edit=professional');
    await expect(page.locator('#title')).toBeEnabled();
    const pending=response('GET');
    await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:'Reference',exact:true}).click();
    const loaded=await pending;
    expect(loaded.status()).toBe(200);
    await expect(publications()).toBeEnabled();
    return (await loaded.json()).items;
}
async function write(method,label,id,expected) {
    const pending=response(method,id);
    await (id?row(id):section()).getByRole('button',{name:label,exact:true}).click();
    const saved=await pending;
    expect(saved.status(),await saved.text()).toBe(expected);
    const body=await saved.json();
    if(method!=='DELETE')await expect(section().getByRole('status').filter({hasText:'Vazba byla uložena.'})).toBeVisible();
    return body.items;
}
async function edit(id) {
    await row(id).getByRole('button',{name:'Upravit vazbu',exact:true}).click();
    await expect(section().getByRole('button',{name:'Uložit změnu vazby'})).toBeEnabled();
}
async function update(id) {
    const pending=response('PUT',id);
    await section().getByRole('button',{name:'Uložit změnu vazby'}).click();
    const saved=await pending;
    expect(saved.status(),await saved.text()).toBe(200);
    await expect(section().getByRole('status').filter({hasText:'Vazba byla uložena.'})).toBeVisible();
    return (await saved.json()).items;
}

try {
    app=await startSyntheticHttp(input);
    browser=await chromium.launch({channel:'chrome',headless:true});
    const ctx=await browser.newContext({viewport:{width:1366,height:768}});
    await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
    page=await ctx.newPage();page.setDefaultTimeout(7000);
    await page.goto(base+'/login');await page.locator('input[type=text]').fill('gen-root');await page.locator('input[type=password]').fill(input.password);
    await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');
    let links=await open();
    expect(links.find(link=>link.id===input.preservedId).fields.Str_RF).toBe('4');
    if(input.mode==='rollback') {
        expect(links).toHaveLength(3);
        const legacy=links.find(link=>link.entryId===input.currentId);
        expect(legacy.fields.Str_RF).toBe('7');
        await edit(legacy.id);await pages().fill('8');links=await update(legacy.id);
        expect(links.find(link=>link.id===legacy.id).fields.Str_RF).toBe('8');
        expect((await open()).find(link=>link.id===legacy.id).entryId).toBe(input.currentId);
        checks.push('Previous BE JAR and FE can edit and reload an existing register publication after revoke.');
        result({status:'PASS'});
    } else {
        const search=section().getByLabel('Hledat publikaci');
        await search.fill('Stejný titul');
        for(const caption of ['Stejný titul — PUB-01','Stejný titul — MES-01'])
            await expect(publications().locator('option').filter({hasText:caption})).toHaveCount(1);
        await publications().selectOption({label:'Stejný titul — PUB-01'});
        await expect(section().getByRole('button',{name:'Přidat odbornou vazbu'})).toBeEnabled();
        await pages().fill('12–14');await note().fill('Přesná citace');await order().fill('3');
        await publications().focus();await photo('01-source-publication-selected');
        links=await write('POST','Přidat odbornou vazbu',null,201);
        const source=links.find(link=>link.sourceRecordId===first);
        expect(source.entryId).toBeNull();expect(source.fields.Str_RF).toBe('12–14');expect(source.note).toBe('Přesná citace');expect(source.sortOrder).toBe(3);
        await row(source.id).scrollIntoViewIfNeeded();await photo('02-reference-saved');
        links=await open();expect(links.find(link=>link.id===source.id)).toEqual(source);
        await row(source.id).scrollIntoViewIfNeeded();await photo('03-reference-reloaded');
        await edit(source.id);await expect(publications()).toHaveValue('s:'+first);
        await pages().fill('15');links=await update(source.id);
        expect(links.find(link=>link.id===source.id).fields.Str_RF).toBe('15');
        await edit(source.id);await publications().selectOption(String(input.currentId));links=await update(source.id);
        expect(links.find(link=>link.id===source.id).entryId).toBe(input.currentId);
        await edit(source.id);await publications().selectOption('s:'+first);links=await update(source.id);
        expect(links.find(link=>link.id===source.id).sourceRecordId).toBe(first);
        expect(links.find(link=>link.id===source.id).note).toBe('Přesná citace');

        await publications().selectOption(String(input.currentId));await pages().fill('7');
        links=await write('POST','Přidat odbornou vazbu',null,201);
        const current=links.find(link=>link.entryId===input.currentId);
        expect(current.id).not.toBe(source.id);expect((await open()).find(link=>link.id===current.id).entryId).toBe(input.currentId);
        await publications().selectOption('s:'+other);
        links=await write('POST','Přidat odbornou vazbu',null,201);
        const second=links.find(link=>link.sourceRecordId===other);
        links=await write('DELETE','Odebrat vazbu',second.id,200);
        expect(links.map(link=>link.id).sort()).toEqual([source.id,current.id,input.preservedId].sort());
        checks.push('Same title with separate exact IDs, source and register create and reload, edit and retarget both ways, remove without affecting other links.');

        await section().getByRole('button',{name:'Nová publikace',exact:true}).click();
        const dialog=page.getByRole('dialog',{name:'Nová publikace'});
        await dialog.getByLabel('Titul publikace').fill('Nová publikace z Reference');
        await dialog.getByLabel('Kód citace').fill('NOV-42');
        const posted=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/professional-registers/LITERATURE'));
        await dialog.getByRole('button',{name:'Uložit publikaci'}).click();
        const made=await posted;expect(made.status()).toBe(201);
        const newId=(await made.json()).id;
        await expect(publications()).toHaveValue(String(newId));
        links=await write('POST','Přidat odbornou vazbu',null,201);
        expect((await open()).find(link=>link.entryId===newId)).toEqual(links.find(link=>link.entryId===newId));
        checks.push('Creation inside Reference selects new catalogue publication and preserves exact saved ID.');

        await edit(source.id);await pages().fill('Neuložený konflikt');
        const original=page;
        page=await ctx.newPage();await open();await page.locator('#title').fill('Souběžná změna 4.2');
        await page.getByRole('button',{name:'Uložit',exact:true}).click();await page.waitForURL(/items\/view\/1001/);
        page=original;const stale=response('PUT',source.id);
        await section().getByRole('button',{name:'Uložit změnu vazby'}).click();expect((await stale).status()).toBe(412);
        await expect(pages()).toHaveValue('Neuložený konflikt');
        checks.push('Actual concurrent save rejects stale source edit with 412 and retains the draft.');
        result({status:'PASS',sourceSameAfterReload:true,sourceLinkId:source.id,currentLinkId:current.id,newPublicationId:newId});
    }
} catch(error) {
    result({status:'FAIL',error:String(error.stack??error)});
    await photo(input.mode+'-failure').catch(()=>{});throw error;
} finally {await browser?.close();await app?.close();}
