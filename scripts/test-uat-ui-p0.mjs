import fs from 'node:fs';
import {chromium, expect} from '@playwright/test';
import {startSyntheticHttp} from './synthetic-http-proxy.mjs';

const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const base = `http://127.0.0.1:${process.env.CURATAS_TEST_HTTP_PORT ?? 18213}`;
const sizes = [[2560,1440],[1920,1080],[1366,768],[1024,768],[640,768]];
const measurements = [], checks = [];
const targets = {toolbar:'.demus-toolbar', header:'#item-editor > aside', flags:'.curator-record-status', history:'.curator-record-history', tabs:'.demus-original-tabs', body:'#item-editor-body', evidence:'[data-clean-item-card] > [data-demus-technical]'};
let server, browser, page;
const flags = () => page.locator(targets.flags);
const summary = () => flags().locator(':scope > summary');
const header = () => page.locator(targets.header);
const tabs = () => page.locator(targets.tabs);
const top = () => page.evaluate(() => scrollTo(0,0));
const clickTab = name => tabs().getByRole('button', {name,exact:true}).click();
const screenshot = name => page.screenshot({path:`${input.output}/${name}.png`,animations:'disabled'});
const viewport = ([width,height]) => page.setViewportSize({width,height});
const save = value => fs.writeFileSync(`${input.output}/result.json`,JSON.stringify({fixture:'Generated analogue of KR 6471', apiResponsesMocked:false, checks, measurements, ...value},null,2));

async function geometry(label, enforce) {
    const snapshot = await page.evaluate(selectors => {
        const boxes = {};
        for (const [name, selector] of Object.entries(selectors)) {
            const node = document.querySelector(selector);
            if (!node?.getClientRects().length) continue;
            const r = node.getBoundingClientRect(), style = getComputedStyle(node);
            boxes[name] = {top:r.top+scrollY,bottom:r.bottom+scrollY,height:r.height,left:r.left,right:r.right,position:style.position,offset:style.top};
        }
        return {boxes, width:innerWidth,height:innerHeight,scrollY,documentWidth:document.documentElement.scrollWidth};
    }, targets);
    const {boxes} = snapshot;
    measurements.push({label,...snapshot});
    if (enforce) {
        for (const [previous,next] of [['toolbar','header'],['header',boxes.flags?'flags':'tabs'],['flags','history'],[boxes.history?'history':boxes.flags?'flags':'header','tabs'],['tabs','body'],['body','evidence']]) {
            if (boxes[previous] && boxes[next]) expect(boxes[next].top-boxes[previous].bottom,`${label} ${previous} → ${next}`).toBeGreaterThanOrEqual(-1);
        }
        expect(boxes.header.top-boxes.toolbar.bottom,`${label} toolbar gap`).toBeLessThanOrEqual(16);
        expect(boxes.toolbar.height,`${label} bounded action bar`).toBeLessThanOrEqual(210);
        if (boxes.flags) expect(boxes.flags.top-boxes.header.bottom,`${label} flags gap`).toBeLessThanOrEqual(16);
        expect(snapshot.documentWidth,`${label} page width`).toBeLessThanOrEqual(snapshot.width);
    }
    return boxes;
}

async function openItem(id, mode) {
    const route = id === 'new' ? '/admin/items/new?catalog=1' : `/admin/items/${mode}/${id}?catalog=1${mode==='edit'?'&edit=professional':''}`;
    await page.goto(base+route);
    await expect(tabs().getByRole('button')).toHaveCount(20);
    if (mode==='edit') await expect(page.locator('#title')).toBeEnabled();
    if (id!=='new') await expect(summary()).toBeVisible();
    if (id===9001) await expect(header().locator('[data-identification-field="Autor"]')).toContainText('Soňa Sochová');
    if (typeof id==='number' && id!==9001) await expect(page.locator('#item-current-audit dl')).toBeVisible();
    await expect(page.locator('.demus-toolbar').getByRole('button').first()).toBeVisible();
    await page.evaluate(()=>document.fonts.ready);
    await top();
}

async function cycles(name, count) {
    const closed = await geometry(name+' closed',true);
    for (let i=0;i<count;i++) {
        await summary().click();
        const opened = await geometry(`${name} open ${i+1}`,true);
        expect(opened.flags.height-closed.flags.height).toBeGreaterThan(24);
        expect(Math.abs(opened.tabs.top-closed.tabs.top-(opened.flags.height-closed.flags.height))).toBeLessThanOrEqual(1);
        await summary().click();
        const collapsed = await geometry(`${name} closed ${i+1}`,true);
        expect(Math.abs(collapsed.tabs.top-closed.tabs.top)).toBeLessThanOrEqual(1);
        expect(Math.abs(collapsed.flags.height-closed.flags.height)).toBeLessThanOrEqual(1);
    }
}

try {
    server=await startSyntheticHttp({...input,frontendRoot:input.before});
    browser=await chromium.launch({channel:'chrome',headless:true});
    const context=await browser.newContext({viewport:{width:1366,height:768}});
    await context.route('**/*', route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
    page=await context.newPage(); page.setDefaultTimeout(7000);
    await page.goto(base+'/login'); await page.locator('input[type=text]').fill('gen-root');
    await page.locator('input[type=password]').fill(input.password);
    await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();
    await page.getByLabel('Katalog',{exact:true}).selectOption('1');
    await openItem('new','edit');
    await page.getByLabel('Inventární číslo: Hlavní číslo',{exact:true}).fill('6472');
    await page.locator('#title').fill('Zkušební nový předmět');
    await page.getByRole('button',{name:'Uložit',exact:true}).click();
    await page.waitForURL(/\/admin\/items\/view\/\d+/);
    const created=Number(new URL(page.url()).pathname.split('/').at(-1));
    await openItem(9001,'view');
    const before=await geometry('before historical view closed',false);
    await screenshot('before-historical-view-1366-closed');
    await expect(header()).toContainText('Soňa Sochová (DEMUS)');
    expect(before.header.top-before.toolbar.bottom).toBeGreaterThan(60);
    expect(before.header.bottom-before.flags.top).toBeGreaterThan(24);
    await summary().focus(); await summary().press('Enter'); await top();
    await expect(flags()).toHaveAttribute('open','');
    await geometry('before historical view open',false);
    await screenshot('before-historical-view-1366-open');
    checks.push('Baseline reproduced a toolbar gap, header/flags intersection and generated DEMUS suffix.');

    await page.goto('about:blank'); await server.close(); server=await startSyntheticHttp({...input,frontendRoot:input.after});
    for (const [id,mode] of [[9001,'view'],[9001,'edit'],[created,'view'],[created,'edit'],['new','edit']]) {
        await viewport(sizes[0]); await openItem(id,mode);
        for (const [width,height] of sizes) {
            await viewport([width,height]); await top();
            const name=`${id===9001?'historical':id==='new'?'new-draft':'new-saved'}-${mode}-${width}`;
            await geometry(name,true);
            if (id!=='new') await cycles(name,width===1366?10:1);
            if (id===9001 && mode==='view') {
                for (const [field,value] of [['Předmět','kraslice'],['Autor','Soňa Sochová'],['Datace','1998'],['Titul','Pokusný titul (DEMUS)']])
                    await expect(header().locator(`[data-identification-field="${field}"] [data-identification-value]`)).toHaveText(value);
                await expect(header().locator('[data-identification-field="Fond"] [data-identification-value]')).toHaveText('Etnografie');
                await top(); await screenshot(`after-${name}-closed`);
                await summary().click(); await top(); await screenshot(`after-${name}-open`);
                const control=page.getByLabel('Současný příznak Karta',{exact:true});
                await expect(control).toBeDisabled();
                const styles=await control.evaluate(el=> {
                    const label=el.closest('label');
                    const fieldset=el.closest('fieldset');
                    const rgb=color=>color.match(/[\d.]+/g).slice(0,3).map(Number);
                    const lum=color=>rgb(color).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
                    let container=label;
                    while (container&&getComputedStyle(container).backgroundColor==='rgba(0, 0, 0, 0)') container=container.parentElement;
                    const a=lum(getComputedStyle(label).color),b=lum(container?getComputedStyle(container).backgroundColor:'rgb(255, 255, 255)');
                    return {opacity:getComputedStyle(fieldset).opacity,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
                });
                expect(styles.opacity).toBe('1');
                expect(styles.contrast).toBeGreaterThanOrEqual(4.5);
                await summary().click();
            }
            if (mode==='edit') for (const selector of ['#title','#current-author-authority','#datingText','#accessionNumber']) {
                const editor=page.locator(selector); await expect(editor).toBeVisible();
                if (width>=1024) await expect(editor).toBeInViewport();
            }
            await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
            await geometry(name+' down',true);
            await top(); await geometry(name+' back up',true);
        }
    }
    checks.push('Five viewports, historical and MES view/edit, creation form, 10 consecutive flag cycles at 1366px in each saved mode, scroll and exact close geometry.');

    await viewport([1366,768]); await openItem(9001,'view');
    const tech=page.locator(targets.evidence);
    await tech.locator(':scope > summary').click();
    await tech.getByText('Identita předmětu',{exact:true}).click();
    await expect(tech.getByText('ID předmětu: #9001',{exact:true})).toBeVisible();
    await screenshot('after-technical-open-1366');
    await tech.locator(':scope > summary').click();
    await expect(tech.getByText('ID předmětu: #9001',{exact:true})).not.toBeVisible();
    for (const name of ['MatTech','Vznik','Dokumentace','Základ']) { await clickTab(name); await geometry('tab '+name,true); }
    await page.reload(); await expect(summary()).toBeVisible(); await geometry('historical view reload',true);

    // The router state contains exactly the page IDs that the catalogue normally supplies.
    await page.evaluate(({created})=>history.replaceState({...history.state,usr:{catalogIds:[9001,created],returnPath:'/admin/items'}},''),{created});
    await page.reload(); await page.getByRole('button',{name:'Následující předmět',exact:true}).click();
    await page.waitForURL(new RegExp(`/items/${created}\\?`)); await geometry('next item',true);
    await page.getByRole('button',{name:'Předchozí předmět',exact:true}).click();
    await page.waitForURL(/\/items\/9001\?/); await expect(header()).toContainText('TEST KR 6471');
    await geometry('previous item',true);

    await openItem(created,'view');
    await page.locator('.curator-record-history > summary').click();
    await expect(page.getByText('Vytvořil v MES',{exact:true})).toBeVisible();
    await page.locator('.curator-record-history > summary').click();
    await tech.locator(':scope > summary').click();
    await tech.getByText('Identita předmětu',{exact:true}).click();
    await expect(tech.getByText(`ID předmětu: #${created}`,{exact:true})).toBeVisible();
    await geometry('new saved technical panel open',true);
    await tech.locator(':scope > summary').click();
    await clickTab('Míry'); await geometry('new saved measurements',true);
    await page.reload(); await expect(header()).toContainText('Zkušební nový předmět');
    await geometry('new saved view reload',true);

    let unblock, started;
    const gate=new Promise(resolve=>{unblock=resolve;});
    const requestSeen=new Promise(resolve=>{started=resolve;});
    await page.route(/\/unified-dictionaries\/FUND(?:\?|$)/,async route=>{started();await gate;await route.continue();});
    try {
        await page.goto(base+'/admin/items/edit/9001?catalog=1&edit=professional');
        await Promise.race([requestSeen,new Promise((_,reject)=>setTimeout(()=>reject(Error('No scoped FUND request')),6000))]);
        await geometry('before delayed dictionary',true);unblock();
        await expect(page.getByLabel('Autorita FUND',{exact:true}).locator('option').filter({hasText:'Zkušební fond'})).toHaveCount(1);
        await geometry('after delayed dictionary',true);
    } finally { unblock(); }
    checks.push('Technical evidence, tab changes, reload, neighbour navigation, and delayed real dictionary response.');
    save({status:'PASS',chrome:browser.version(),created,baselineIntersectionPx:before.header.bottom-before.flags.top,baselineToolbarGapPx:before.header.top-before.toolbar.bottom});
} catch(error) {
    save({status:'FAIL',error:String(error.stack??error)});
    await screenshot('failure').catch(()=>{});
    throw error;
} finally {
    await browser?.close();
    await server?.close();
}
