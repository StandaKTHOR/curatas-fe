import fs from 'node:fs';
import {chromium,expect} from '@playwright/test';
import {startSyntheticHttp} from './synthetic-http-proxy.mjs';

const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const base=`http://127.0.0.1:${process.env.CURATAS_TEST_HTTP_PORT??18213}`;
const sizes=[[2560,1440],[1920,1080],[1366,768],[1024,768],[640,768]];
const records=[], checks=[];
let browser,server,page;
const pin=()=>page.getByRole('complementary',{name:'Permanentní identifikace předmětu'});
const flags=()=>page.locator('.curator-record-status');
const tabs=()=>page.getByRole('navigation',{name:'Karty DEMUS'});
const tab=name=>tabs().getByRole('button',{name,exact:true}).click();
const reference=()=>page.getByRole('region',{name:'Současné bibliografické vazby'});
const shot=name=>page.screenshot({path:`${input.output}/${name}.png`,animations:'disabled'});
const top=()=>page.evaluate(()=>scrollTo(0,0));
async function login(username) {
    await page.goto(base+'/login');await page.locator('input[type=text]').fill(username);
    await page.locator('input[type=password]').fill(input.password);
    await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();
    await page.getByLabel('Katalog',{exact:true}).selectOption('1');
}
async function open(id,mode) {
    await page.goto(base+(id==='new'?'/admin/items/new?catalog=1':`/admin/items/${mode}/${id}?catalog=1${mode==='edit'?'&edit=professional':''}`));
    await expect(tabs().getByRole('button')).toHaveCount(20);
    if(mode==='edit')await expect(page.locator('#title')).toBeEnabled();
    if(id===9001)await expect(pin().locator('[data-identification-field="Autor"]')).toContainText('Soňa Sochová');
    if(typeof id==='number'&&id!==9001)await expect(page.locator('#item-current-audit dl')).toBeVisible();
    await page.evaluate(()=>document.fonts.ready);
}
async function rects(label) {
    const geometry=await page.evaluate(()=>{
        const box=selector=>{
            const node=document.querySelector(selector),r=node?.getBoundingClientRect();
            return r?{top:r.top,bottom:r.bottom,height:r.height}:null;
        };
        return {width:innerWidth,scroll:scrollY,overflow:document.documentElement.scrollWidth>innerWidth,
            toolbar:box('.demus-toolbar'),pin:box('aside[aria-label="Permanentní identifikace předmětu"]'),editors:box('[data-item-editors]'),
            flags:box('.curator-record-status'),tabs:box('.demus-original-tabs'),body:box('#item-editor-body'),
            rows:new Set([...document.querySelectorAll('.item-identity-pin dl > div')].map(n=>n.getBoundingClientRect().top)).size,
            stickyTop:parseFloat(getComputedStyle(document.querySelector('.item-identity-pin,aside[aria-label="Permanentní identifikace předmětu"]')).top)};
    });
    records.push({label,...geometry});return geometry;
}
function inFlow(r,label) {
    expect(r.overflow,label).toBe(false);
    expect(r.pin.top-r.toolbar.bottom,label).toBeGreaterThanOrEqual(-1);
    expect(r.pin.top-r.toolbar.bottom,label).toBeLessThanOrEqual(16);
    if(r.editors)expect(r.editors.top-r.pin.bottom,label).toBeGreaterThanOrEqual(-1);
    const previous=r.editors??r.pin;
    if(r.flags)expect(r.flags.top-previous.bottom,label).toBeGreaterThanOrEqual(-1);
    expect(r.tabs.top-(r.flags??previous).bottom,label).toBeGreaterThanOrEqual(-1);
    expect(r.body.top-r.tabs.bottom,label).toBeGreaterThanOrEqual(-1);
}

try {
    server=await startSyntheticHttp({...input,frontendRoot:input.before});
    browser=await chromium.launch({channel:'chrome',headless:true});
    const ctx=await browser.newContext({viewport:{width:1366,height:768}});
    await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
    page=await ctx.newPage();page.setDefaultTimeout(6500);await login('gen-root');
    await open(9001,'view'); await rects('before historic view');await shot('before-historical-view-1366');
    await open(9001,'edit'); await rects('before historic edit');await shot('before-historical-edit-1366');
    await open('new','edit');await page.getByLabel('Inventární číslo: Hlavní číslo',{exact:true}).fill('6472');
    await page.locator('#title').fill('Zkušební nový předmět');await page.getByRole('button',{name:'Uložit',exact:true}).click();
    await page.waitForURL(/\/admin\/items\/view\/\d+/);const created=Number(new URL(page.url()).pathname.split('/').at(-1));
    await page.goto('about:blank');await server.close();server=await startSyntheticHttp({...input,frontendRoot:input.after});

    for(const [id,mode] of [[9001,'view'],[9001,'edit'],[created,'view'],[created,'edit'],['new','edit']]) {
        await page.setViewportSize({width:2560,height:1440});await open(id,mode);
        for(const [width,height] of sizes) {
            await page.setViewportSize({width,height});await top();
            const name=`${id===9001?'historical':id==='new'?'new-draft':'new-saved'}-${mode}-${width}`;
            const closed=await rects(name+' closed');inFlow(closed,name);
            if(width>=1366)expect(closed.rows,`${name} desktop row`).toBe(1);
            if(id!=='new') {
                const summary=flags().locator(':scope > summary');
                for(let i=0;i<(width===1366?3:1);i++) {
                    await summary.click();await top();const opened=await rects(name+' opened');inFlow(opened,name);
                    expect(opened.tabs.top-closed.tabs.top).toBeCloseTo(opened.flags.height-closed.flags.height,0);
                    await summary.click();await top();expect((await rects(name+' restored')).tabs.top).toBeCloseTo(closed.tabs.top,0);
                }
            }
            if(id===9001&&width===1366)await shot('after-'+name);
            // Tall window may have no scroll until a normal-flow section opens.
            if(id!=='new')await flags().locator(':scope > summary').click();
            await page.evaluate(()=>scrollTo(0,Math.min(600,document.documentElement.scrollHeight-innerHeight)));
            const scrolled=await rects(name+' scrolled');
            if(scrolled.scroll>closed.pin.top-scrolled.stickyTop+2) {
                expect(scrolled.pin.top).toBeCloseTo(scrolled.stickyTop,0);
                expect(await pin().evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));})).toBe(true);
            }
            if(id!=='new'){await top();await flags().locator(':scope > summary').click();}
        }
    }
    checks.push('Five widths, one row at desktop, sticky view/edit, flags occupy intrinsic height, twenty tabs.');

    await page.setViewportSize({width:1366,height:768});await open(9001,'edit');
    await page.getByRole('button',{name:/Otevřít současné odborné vazby/}).click();
    const classification=page.getByRole('region',{name:'Současné odborné vazby a rozsah inventárního čísla'});
    await expect(classification.getByRole('heading',{name:/odborné vazby a role \(Prázdné\)/})).toBeVisible();
    await expect(classification.locator('option:checked').first()).toHaveText('Prázdné');
    expect(await classification.locator('select').first().inputValue()).toBe('');
    await tab('Reference');
    const publications=reference().getByLabel('Publikace',{exact:true});
    for(const label of ['Původní zkušební publikace — H-01','Současná zkušební publikace — S-01'])
        await expect(publications.locator('option').filter({hasText:label})).toHaveCount(1);
    const search=reference().getByLabel('Hledat publikaci');
    await search.fill('H-01');await expect(publications.locator('option')).toHaveCount(2);
    await publications.selectOption({label:'Původní zkušební publikace — H-01'});
    await expect(reference().getByRole('button',{name:'Přidat odbornou vazbu'})).toBeDisabled();
    await expect(reference().getByRole('link',{name:'Otevřít detail publikace'})).toHaveAttribute('href',/value=s%3A8{64}/);
    await shot('publications-search');
    await page.locator('#title').fill('Neuložený kurátorský titul');
    await reference().getByLabel('Strany citace').fill('12–14');
    await reference().getByRole('button',{name:'Nová publikace',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Nová publikace'});
    await dialog.getByLabel('Titul publikace').fill('Publikace založená z Reference');
    await dialog.getByLabel('Kód citace').fill('H41-001');await shot('publication-create');
    const posted=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/professional-registers/LITERATURE'));
    await dialog.getByRole('button',{name:'Uložit publikaci'}).click();
    const made=await posted;expect(made.status()).toBe(201);const publicationId=(await made.json()).id;
    await expect(dialog).not.toBeVisible();await expect(publications).toHaveValue(String(publicationId));
    await expect(page.locator('#title')).toHaveValue('Neuložený kurátorský titul');
    await expect(reference().getByLabel('Strany citace')).toHaveValue('12–14');await shot('publication-auto-selected');
    await page.locator('#title').fill('');
    const linked=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/items/9001/professional-links'));
    await reference().getByRole('button',{name:'Přidat odbornou vazbu'}).click();
    const relation=await linked;expect(relation.status()).toBe(201);
    const saved=(await relation.json()).items.find(item=>item.entryId===publicationId);
    expect(saved.fields.Str_RF).toBe('12–14');
    await open(9001,'edit');const read=page.waitForResponse(r=>r.request().method()==='GET'&&r.url().endsWith('/items/9001/professional-links'));
    await tab('Reference');const persisted=(await (await read).json()).items.find(item=>item.id===saved.id);
    expect(persisted.entryId).toBe(publicationId);await expect(reference()).toContainText('Publikace založená z Reference');

    await reference().getByRole('button',{name:'Upravit vazbu',exact:true}).click();await reference().getByLabel('Strany citace').fill('Zachovaný konflikt');
    const original=page;
    page=await ctx.newPage();await open(9001,'edit');await page.locator('#title').fill('Souběžná změna');
    await page.getByRole('button',{name:'Uložit',exact:true}).click();await page.waitForURL(/\/items\/view\/9001/);
    page=original;
    const stale=page.waitForResponse(r=>r.request().method()==='PUT'&&r.url().endsWith(`/professional-links/${saved.id}`));
    await reference().getByRole('button',{name:'Uložit změnu vazby'}).click();expect((await stale).status()).toBe(412);
    await expect(reference().getByLabel('Strany citace')).toHaveValue('Zachovaný konflikt');
    checks.push('Unified results, exact historical read-only identity, shared publication editor, draft retained, selected new ID retained on reload, 412 CAS.');
    await open(9001,'edit');await tab('MatTech');
    const material=page.locator('[data-mattech-group="MATERIAL"][data-record-id="new"]');
    const root=material.getByLabel('Materiál — úroveň 1',{exact:true});
    const child=material.getByLabel('Materiál — úroveň 2',{exact:true});
    await root.selectOption(input.material);await child.selectOption(input.materialChild);
    await expect(root).toHaveValue(input.material);await expect(child).toHaveValue(input.materialChild);
    await material.getByLabel('Hledat: Materiál',{exact:true}).fill('Zkušební větev');
    await expect(material.getByLabel('Výsledky hledání: Materiál',{exact:true}).locator('option').filter({hasText:'Zkušební větev materiálu'})).toHaveCount(1);
    checks.push('Material hierarchy selects two exact distinct identities and finds the child by name.');
    const reader=await browser.newContext();await reader.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
    page=await reader.newPage();await login('gen-reader');await open(9001,'view');await tab('Reference');
    await expect(reference()).toContainText('Publikace založená z Reference');await expect(reference().getByRole('button',{name:'Nová publikace'})).toHaveCount(0);
    await expect(reference().getByRole('button',{name:'Upravit vazbu'})).toBeDisabled();
    checks.push('Read-only account can read the exact saved link and cannot create or edit.');
    fs.writeFileSync(`${input.output}/result.json`,JSON.stringify({status:'PASS',chrome:browser.version(),checks,records,publicationId,savedLinkId:saved.id,apiResponsesMocked:false},null,2));
} catch(e) {
    fs.writeFileSync(`${input.output}/result.json`,JSON.stringify({status:'FAIL',checks,records,error:String(e.stack??e)},null,2));
    await shot('failure').catch(()=>{});throw e;
} finally {await browser?.close();await server?.close();}
