import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium,expect} from '@playwright/test';
import {startSyntheticHttp} from './synthetic-http-proxy.mjs';

const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const base='http://127.0.0.1:'+ (process.env.CURATAS_TEST_HTTP_PORT??18213);
const checks=[], screens=[], httpErrors=[], layouts=[], authErrors=[];
let app,chrome,browser,context,page;
const tabs=()=>page.getByRole('navigation',{name:'Karty DEMUS'});
const tab=name=>tabs().getByRole('button',{name,exact:true});
const pinned=field=>page.locator('.item-identity-pin [data-identification-field="'+field+'"] dd');
const photo=async name=>{await page.screenshot({path:input.output+'/'+name+'.png',animations:'disabled',mask:[page.locator('.curator-card-location output')],maskColor:'#e5eaf1'});screens.push(name);};
const save=()=>page.getByRole('button',{name:'Uložit předmět (dole)',exact:true});
async function settleBrowserReloadBudget(){
    // Each full navigation rotates the real refresh cookie. Use the next auth window
    // for the remaining workflows instead of changing the application's rate limit.
    const wait=60000-Date.now()%60000+100;
    await new Promise(resolve=>setTimeout(resolve,wait));
}
function result(state,error){
    const filename=input.mode==='new'?'browser.json':input.mode+'-browser.json';
    fs.writeFileSync(input.output+'/'+filename,JSON.stringify({state,chrome:browser?.version(),checks,screens,layouts,error,
        httpErrors,authErrors,apiResponsesMocked:false},null,2));
}
async function measureLayout(stage,mode){
    await page.evaluate(()=>window.scrollTo(0,0));
    const measured=await page.evaluate(()=>{
        const rect=query=>{const element=document.querySelector(query);if(!element)return null;
            const {top,bottom,width,height}=element.getBoundingClientRect();return {top,bottom,width,height};};
        return {width:innerWidth,height:innerHeight,documentHeight:document.documentElement.scrollHeight,
            form:rect('#item-editor'),tabs:rect('nav[aria-label="Karty DEMUS"]'),main:rect('.curator-card-main'),
            left:rect('.curator-card-column'),right:rect('.curator-card-column + .curator-card-column')};
    });
    layouts.push({stage,mode,...measured});
    return measured;
}
async function compareView(stage){
    for(const mode of ['view','edit']){
        await page.goto(base+'/admin/items/'+mode+'/1001?catalog=1'+(mode==='edit'?'&edit=professional':''));
        await expect(pinned('Inventární číslo')).toHaveText('ZV 640/1');
        await expect(tabs().getByRole('button')).toHaveCount(20);
        await page.waitForLoadState('networkidle');
        for(const [width,height] of [[1366,768],[1920,1080]]){
        await page.setViewportSize({width,height});
        const geometry=await measureLayout(stage,mode);
        if(stage==='after'){
            if(mode==='view'||width===1920)expect(geometry.tabs.bottom).toBeLessThan(height);
            expect(geometry.tabs.bottom).toBeLessThanOrEqual(geometry.main.top+1);
            expect(geometry.left.width).toBeGreaterThan(200);
            expect(Math.abs(geometry.left.top-geometry.right.top)).toBeLessThan(2);
            await expect(page.getByRole('region',{name:'Identifikace a vznik'})).toBeVisible();
            await expect(page.getByRole('region',{name:'Popis a fyzická evidence'})).toBeVisible();
            await expect(page.locator('.curator-card-main').getByText(/\(DEMUS\)/)).toHaveCount(0);
        }
        await photo(stage+'-'+width+'-'+mode);
        }
        await page.setViewportSize({width:1366,height:768});
    }
}
async function edit(domain='professional'){
    await page.goto(base+'/admin/items/edit/1001?catalog=1&edit='+domain);
    await expect(page.locator('#title')).toBeEnabled();
}
async function saveAndRead(method,suffix){
    const then=page.waitForResponse(r=>r.request().method()===method&&new URL(r.url()).pathname.endsWith(suffix));
    await save().click();
    const response=await then;
    expect(response.status(),await response.text()).toBe(200);
    await page.waitForURL('**/admin/items/view/1001?catalog=1');
}

try {
    app=await startSyntheticHttp(input);
    chrome=await chromium.launchServer({channel:'chrome',headless:true});
    browser=await chromium.connect(chrome.wsEndpoint());
    context=await browser.newContext({viewport:{width:1366,height:768}});
    await context.route('**/*', route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
    page=await context.newPage(); page.setDefaultTimeout(6500);
    page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).pathname.startsWith('/api/v2/'))
        httpErrors.push({path:new URL(r.url()).pathname,status:r.status()});
        if(r.status()>=400&&new URL(r.url()).pathname.startsWith('/api/auth/'))
            authErrors.push({path:new URL(r.url()).pathname,status:r.status()});});
    await page.goto(base+'/login');
    await page.locator('input[type=text]').fill('gen-root');
    await page.locator('input[type=password]').fill(input.password);
    await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();
    await page.getByLabel('Katalog',{exact:true}).selectOption('1');

    if(input.mode==='before'){
        await compareView('before');
        result('PASS');
    } else if(input.mode==='rollback'){
        await edit();
        await tab('Reference').click();
        await expect(page.getByRole('region',{name:'Současné bibliografické vazby'}).getByText('Stejný titul',{exact:false}).first()).toBeVisible();
        checks.push('Previous Update4.2 FE opens the saved original publication relation after rollback');
        result('PASS');
    } else {
    if(input.completion)await compareView('after');
    await page.goto(base+'/admin/dictionaries?catalog=1&type=CADASTRE');
    await expect(page.getByLabel('Typ číselníku')).toHaveValue('CADASTRE');
    await expect(page.getByText(/Celkem .* položek .* Zobrazeno 100/)).toBeVisible();
    await page.getByLabel('Hledat v číselníku').fill('velky');
    await expect(page.getByText(/Výsledky hledání 6 .* Zobrazeno 6/)).toBeVisible();
    const cadastral=page.getByRole('table').locator('tbody tr td:first-child');
    await expect(cadastral).toHaveText(['Velký Hrad','Velký Hrad','Velký Chlum','Velký Javor','Velký Štít','Velký Žleb']);
    await photo('01-dictionary-search');
    checks.push('Czech collation including Ch, accent-insensitive search and scoped counts in Chrome');
    if(input.completion){
        const author='s:'+createHash('sha256').update('Osobnosti1').digest('hex');
        await page.goto(base+'/admin/dictionaries?'+new URLSearchParams({catalog:'1',type:'AUTHOR',value:author}));
        await page.getByText('Skutečně přiřazené předměty',{exact:true}).click();
        const related=page.getByRole('region',{name:'Předměty podle přesné autority'});
        await expect(related.getByRole('link',{name:'ZV 640/1',exact:true})).toBeVisible();
        await expect(related).toContainText('Hlavní autor · Další tvůrce');
        await page.getByRole('button',{name:'Upravit tuto položku',exact:true}).click();
        await page.getByLabel('Medailon',{exact:true}).fill('Medailon ověřený v Chrome');
        await page.getByLabel('Důvod úpravy',{exact:true}).fill('Kontrola typované Osobnosti');
        await page.getByRole('button',{name:'Uložit položku',exact:true}).click();
        await expect(page.getByLabel('Odborné údaje položky').getByText('Medailon ověřený v Chrome',{exact:true})).toBeVisible();
        await page.reload();
        await expect(page.getByLabel('Odborné údaje položky').getByText('Medailon ověřený v Chrome',{exact:true})).toBeVisible();
        await photo('13-explicit-author-fields');
        checks.push('Exact historical author links and typed author biography were verified in Chrome');
    }

    await edit();
    await expect(page.locator('#custodianCode')).toBeEnabled();
    await expect(page.locator('#custodianCode')).toHaveValue('');
    await expect(page.locator('#custodianCode')).toHaveAttribute('placeholder','6MM');
    await page.locator('#custodianCode').fill('6MM-CHROME');
    await page.locator('#description').fill('Ověřený popis z Chrome');
    if(input.completion){
        await page.locator('#originNote').fill('Ověřená poznámka ke vzniku');
        await page.locator('#cardNote').fill('Ověřená poznámka k předmětu');
        await page.locator('#determinationDate').fill('2026-11-26');
        await page.locator('#yearFrom').fill('1890');
        await page.locator('#yearTo').fill('1899');
    }
    const dating=page.locator('summary').filter({hasText:'Nabídka datace'});
    await dating.click();
    await page.getByLabel('Hledat – Nabídka datace').fill('pulka');
    await expect(page.getByRole('option',{name:'Půlka 19. století',exact:true})).toHaveCount(1);
    await page.getByLabel('Nabídka datace',{exact:true}).selectOption({label:'Půlka 19. století'});
    await expect(page.locator('#datingText')).toHaveValue('Půlka 19. století');
    if(input.completion){
        await page.getByLabel('Hledat – Nabídka datace').press('ArrowDown');
        await expect(page.getByLabel('Nabídka datace',{exact:true})).toBeFocused();
        await page.getByLabel('Nabídka datace',{exact:true}).press('Escape');
        await expect(dating).toBeFocused();
    }
    const recorded=page.locator('summary').filter({hasText:'Vybrat osobu, která předmět zapsala'});
    await recorded.click();
    await page.getByLabel('Hledat – Vybrat osobu, která předmět zapsala').fill('Zkusebni radek 2');
    const recordedSelect=page.getByLabel('Vybrat osobu, která předmět zapsala',{exact:true});
    const option=recordedSelect.getByRole('option',{name:'Zkušební řádek 2',exact:true});
    await expect(option).toHaveCount(1);
    await recordedSelect.selectOption({label:'Zkušební řádek 2'});
    await expect(page.getByLabel('Zapsal',{exact:true})).toHaveText('Zkušební řádek 2');
    await photo('02-card-edited');
    await saveAndRead('PUT','/items/1001/curator-records');
    await page.reload();
    await expect(page.locator('#custodianCode')).toHaveValue('6MM-CHROME');
    await expect(page.getByLabel('Zapsal',{exact:true})).toHaveText('Zkušební řádek 2');
    if(input.completion){
        await expect(page.getByText('Ověřená poznámka ke vzniku',{exact:true})).toBeVisible();
        await expect(page.getByText('Ověřená poznámka k předmětu',{exact:true})).toBeVisible();
        await expect(page.getByText('1890',{exact:true})).toBeVisible();
        await expect(page.getByText('1899',{exact:true})).toBeVisible();
    }
    if(input.completion)await expect(page.getByRole('region',{name:'Popis a fyzická evidence'})).toContainText('Ověřený popis z Chrome');
    else await expect(page.locator('#description')).toHaveValue('Ověřený popis z Chrome');
    await photo('03-card-reloaded');
    checks.push('Edited custodian, directory choice, dating and description saved together and reloaded');

    await edit();
    await expect(page.locator('#description')).toHaveValue('Ověřený popis z Chrome');
    await page.locator('#description').fill('');
    await saveAndRead('PUT','/items/1001/curator-record/professional');
    await page.reload();
    if(input.completion)await expect(page.getByRole('region',{name:'Popis a fyzická evidence'})).not.toContainText('Původní popis');
    else await expect(page.locator('#description')).toHaveValue('');
    checks.push('An explicitly cleared professional value stayed empty after reload');

    await edit();
    await tab('Míry').click();
    const measurements=page.getByRole('region',{name:'Evidované míry',exact:true});
    await expect(measurements.getByRole('row').nth(1)).toContainText('hmot');
    await measurements.getByRole('button',{name:'Upravit míru 1',exact:true}).click();
    await measurements.getByLabel('Evidovaná míra 1',{exact:true}).fill('2,125');
    await measurements.getByRole('button',{name:'Uložit míru',exact:true}).click();
    await expect(measurements.getByRole('row').nth(1)).toContainText('2.125');
    await edit(); await tab('Míry').click();
    await expect(measurements.getByRole('row').nth(1)).toContainText('2.125');
    await expect(measurements.getByRole('row').nth(2)).toContainText('3');
    await measurements.getByRole('row').nth(1).scrollIntoViewIfNeeded();
    await photo('05-source-measurement-reloaded');
    checks.push('Exact source measure corrected without rounding; second row and its original order retained');

    await page.getByRole('button',{name:'Přidat rozměr',exact:true}).click();
    if(input.completion){
        const kind=page.getByLabel('Typ nového rozměru',{exact:true});
        await expect(kind.getByRole('option')).toHaveCount(17);
        await kind.selectOption({label:'hmot — Hmotnost — kg'});
        await expect(page.getByLabel('Jednotka nového rozměru',{exact:true})).toHaveValue('kg');
        await page.getByLabel('Hodnota nového rozměru',{exact:true}).fill('0');
        await page.getByRole('button',{name:'Uložit nový rozměr',exact:true}).click();
        await expect(measurements.getByRole('row').nth(3).getByRole('cell').nth(2)).toHaveText('0');
        await page.reload(); await tab('Míry').click();
        await expect(measurements.getByRole('row').nth(3).getByRole('cell').nth(2)).toHaveText('0');
    }else{
        const kind=page.getByLabel('Typ rozměru 1',{exact:true});
        await expect(kind.getByRole('option',{name:'hmot — Hmotnost — kg',exact:true})).toHaveCount(1);
        await kind.selectOption('hmot');
        await expect(page.getByLabel('Jednotka rozměru 1',{exact:true})).toHaveValue('kg');
        await page.getByPlaceholder('Hodnota',{exact:true}).last().fill('0');
        await saveAndRead('PUT','/items/1001/curator-records');
        await page.reload(); await tab('Míry').click();
        await expect(page.getByLabel('Typ rozměru 1',{exact:true})).toHaveValue('hmot');
        await expect(page.getByPlaceholder('Hodnota',{exact:true}).last()).toHaveValue(/^0(?:[.]0+)?$/);
    }
    checks.push('A new current measurement uses the dictionary code and unit and preserves zero after reload');

    await edit();
    await tab('Historie').click();
    const history=page.getByRole('region',{name:'Současná odborná historie',exact:true});
    if(input.completion){
        await history.getByRole('button',{name:'Upravit evidovaný příběh'}).click();
        await history.getByLabel('Text evidovaného příběhu').fill('Opravený převzatý příběh');
        await history.getByLabel('Kde se příběh odehrál').fill('Zkušební místo');
        await history.getByRole('button',{name:'Uložit příběh',exact:true}).click();
        await expect(history.getByText('Opravený převzatý příběh',{exact:true})).toBeVisible();
        await photo('08-source-story');
    }
    await history.getByLabel('Typ současné události').selectOption('STORY');
    await history.getByLabel('Popis současné události').fill('Odborný příběh předmětu z Chrome');
    await history.getByRole('button',{name:'Uložit událost historie',exact:true}).click();
    await expect(history.getByText('Odborný příběh předmětu z Chrome',{exact:true})).toBeVisible();
    await edit();await tab('Historie').click();
    await expect(history.getByText('Odborný příběh předmětu z Chrome',{exact:true})).toBeVisible();
    await history.getByText('Odborný příběh předmětu z Chrome',{exact:true}).scrollIntoViewIfNeeded();
    await photo('06-history-reloaded');
    checks.push('Object story written under History and reloaded independently of system audit');

    await edit('inventory');
    await expect(page.locator('#inventoryNumber')).toHaveValue('ZV 640/1');
    await page.locator('#inventoryNumber').fill('ZV 640/1 – oprava');
    await saveAndRead('PUT','/items/1001/curator-records');
    await page.reload();
    await expect(page.getByText('ZV 640/1 – oprava',{exact:true}).first()).toBeVisible();
    checks.push('Inventory correction preserved the exact typed separators and survived reload');

    await edit();
    await tab('Dokumentace').click();
    const documentation=page.getByRole('region',{name:'Soubory k odborné dokumentaci',exact:true});
    await documentation.locator('summary').filter({hasText:'Přidat soubor dokumentace'}).click();
    await documentation.getByLabel('Soubor dokumentace',{exact:true}).setInputFiles({
      name:'curator-test.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7 GENERATED')
    });
    await documentation.getByLabel('Popis souboru dokumentace',{exact:true}).fill('Testovací dokument');
    await documentation.getByRole('button',{name:'Nahrát do dokumentace',exact:true}).click();
    const docRow=documentation.getByRole('row').filter({hasText:'curator-test.pdf'});
    await expect(docRow).toContainText('Testovací dokument');
    await docRow.getByLabel(/Popis přílohy/).fill('Upravený odborný popis');
    await docRow.getByRole('button',{name:'Uložit popis přílohy',exact:true}).click();
    await expect(docRow).toContainText('Upravený odborný popis');
    await edit(); await tab('Dokumentace').click();
    await expect(docRow).toContainText('Upravený odborný popis');
    await docRow.scrollIntoViewIfNeeded();
    await photo('07-documentation-reloaded');
    checks.push('Upload and caption edit from Documentation retain the same stored attachment after reload');
    if(input.completion){
        await page.locator('[data-demus-field="Dokument_DK"]').fill('Odborný list');
        await page.locator('[data-demus-field="Pozn_DK"]').fill('Testovací obsah dokumentu');
        await page.getByRole('button',{name:'Uložit záznam',exact:true}).click();
        const binding=page.getByRole('region',{name:'Vazby dokumentace'});
        await binding.getByRole('button',{name:'Upravit typ a soubor · Odborný list',exact:true}).click();
        await expect(binding.getByLabel('Typ dokumentu',{exact:true}).getByRole('option').nth(1)).toBeAttached();
        await binding.getByLabel('Typ dokumentu',{exact:true}).selectOption({index:1});
        await binding.getByLabel('Existující soubor',{exact:true}).selectOption({label:'curator-test.pdf'});
        await binding.getByRole('button',{name:'Uložit vazbu dokumentace',exact:true}).click();
        await expect(binding.getByRole('button',{name:/Stáhnout připojený soubor/})).toBeVisible();
        await edit();await tab('Dokumentace').click();
        await expect(binding.getByRole('button',{name:/Stáhnout připojený soubor/})).toBeVisible();
        await expect(page.getByText('Testovací obsah dokumentu',{exact:true})).toBeVisible();
        await photo('12-document-type-and-existing-file');
        checks.push('Documentation metadata and an exact document type were saved with a link to the same existing private PDF');
    }
    if(input.completion){
        await edit();
        await tab('MatTech').click();
        const table=page.getByRole('table',{name:'Evidence materiálu a techniky',exact:true});
        const row=table.getByRole('row').filter({hasText:'Testovací záznam MatTech'});
        await row.getByRole('button',{name:'Upravit',exact:true}).click();
        const id=await row.getAttribute('data-professional-record-id');
        const group=page.locator(`[data-mattech-group="MATERIAL"][data-record-id="${id}"]`);
        const level=group.locator('select').first();
        await expect(level).toHaveValue('00000000-0000-4000-8000-000000044001');
        await level.selectOption('00000000-0000-4000-8000-000000044002');
        const response=page.waitForResponse(r=>r.request().method()==='PATCH'&&
            new URL(r.url()).pathname.endsWith('/professional-records/MATERIAL_TECHNIQUE/'+id));
        await page.getByRole('button',{name:'Uložit záznam',exact:true}).click();
        expect((await response).status()).toBe(200);
        await expect(row).toContainText('Zkušební materiál nový');
        await edit();await tab('MatTech').click();
        await expect(group.locator('select').first()).toHaveValue('00000000-0000-4000-8000-000000044002');
        await photo('14-mattech-reloaded');
        checks.push('MatTech kept the same row and saved a newly selected exact material on the integrated production build');
    }

    await page.goto(base+'/admin/items/new?catalog=1');
    await page.getByLabel('Inventární číslo: Prefix',{exact:true}).fill('U43-');
    await page.getByLabel('Inventární číslo: Hlavní číslo',{exact:true}).fill('00042');
    await page.getByLabel('Inventární číslo: Postfix',{exact:true}).fill('/Ž');
    await page.locator('#title').fill('Nový předmět Update4.3');
    const createRequest=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/v2/catalogs/1/items');
    await save().click();
    const created=await createRequest;
    expect(created.status(),await created.text()).toBe(201);
    await page.waitForURL(/[/]admin[/]items[/]view[/][0-9]+[?]catalog=1/);
    const newId=Number(new URL(page.url()).pathname.split('/').pop());
    await page.reload();
    await expect(pinned('Titul')).toHaveText('Nový předmět Update4.3');
    await expect(pinned('Inventární číslo')).toHaveText('U43-00042/Ž');
    await expect(pinned('Přírůstkové číslo')).toHaveText('—');
    checks.push('New item, exact inventory number and unassigned accession survive a full reload');

    if(input.completion){
        await settleBrowserReloadBudget();
        await edit();
        await page.getByRole('button',{name:/Otevřít současné odborné vazby/}).click();
        const choose=page.locator('summary').filter({hasText:'Nabídka osob pro údaj Určil'});
        await choose.click();
        await page.getByLabel('Hledat – Nabídka osob pro údaj Určil').fill('Polakova');
        const choices=page.getByLabel('Nabídka osob pro údaj Určil',{exact:true});
        await expect(choices.getByRole('option',{name:'Poláková (test)',exact:true})).toHaveCount(1);
        await choices.selectOption({label:'Poláková (test)'});
        await page.getByRole('button',{name:'Uložit odborné vazby a role',exact:true}).click();
        await expect(page.getByText('Současné odborné vazby a role byly uloženy a znovu načteny.')).toBeVisible();
        await photo('09-determiner');
    }
    const copies=[];
    for(let n=1;n<=2;n++){
        await page.goto(base+'/admin/items/view/1001?catalog=1');
        await page.getByRole('button',{name:'📋 Klonovat',exact:true}).click();
        await page.locator('input#cloneTitle, #cloneTitle input').fill('Nezávislý klon '+n);
        await page.locator('input#targetInv, #targetInv input').fill('U43-KLON/'+n);
        const request=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname.endsWith('/items/1001/clone'));
        await page.getByRole('button',{name:'Vytvořit klon',exact:true}).click();
        const cloned=await request;
        expect(cloned.status(),await cloned.text()).toBe(201);
        await page.waitForURL(url=>/[/]admin[/]items[/]view[/][0-9]+$/.test(url.pathname)&&!url.pathname.endsWith('/1001'));
        copies.push(Number(new URL(page.url()).pathname.split('/').pop()));
        await page.reload();
        await expect(pinned('Inventární číslo')).toHaveText('U43-KLON/'+n);
        if(input.completion){
            const copy=copies.at(-1);
            await page.waitForLoadState('networkidle');
            await page.goto(base+'/admin/items/edit/'+copy+'?catalog=1&edit=professional');
            await expect(page.locator('#title')).toBeEnabled();
            await tab('Míry').click();
            const rows=page.getByRole('region',{name:'Evidované míry',exact:true});
            await expect(rows.getByRole('row').nth(1)).toContainText('2.125');
            await rows.getByRole('button',{name:'Upravit míru 1',exact:true}).click();
            const value=n===1?'2,1265':'2,1299';
            await rows.getByLabel('Evidovaná míra 1',{exact:true}).fill(value);
            await rows.getByRole('button',{name:'Uložit míru',exact:true}).click();
            await expect(rows.getByRole('row').nth(1)).toContainText(value.replace(',','.'));
            await page.reload(); await tab('Míry').click();
            await expect(rows.getByRole('row').nth(1)).toContainText(value.replace(',','.'));
            await rows.getByRole('row').nth(1).scrollIntoViewIfNeeded();
            await photo('10-independent-measure-'+n);
            await tab('Historie').click();
            await expect(history.getByText('Opravený převzatý příběh',{exact:true})).toBeVisible();
            await expect(history.getByText('Odborný příběh předmětu z Chrome',{exact:true})).toBeVisible();
            await tab('Reference').click();
            await expect(page.getByRole('region',{name:'Současné bibliografické vazby'}).getByText('Stejný titul',{exact:false}).first()).toBeVisible();
        }

    }
    expect(new Set([1001,newId,...copies]).size).toBe(4);
    await page.goto(base+'/admin/items/view/1001?catalog=1');
    await expect(pinned('Inventární číslo')).toHaveText('ZV 640/1 – oprava');
    checks.push('Two independent clones use separate persisted identities and preserve the original');

    if(input.completion){
        await edit(); await tab('Míry').click();
        await measurements.getByRole('button',{name:'Upravit míru 2',exact:true}).click();
        await measurements.getByLabel('Evidovaná míra 2',{exact:true}).fill('');
        await measurements.getByLabel('Evidovaná jednotka 2',{exact:true}).fill('g');
        await measurements.getByRole('button',{name:'Uložit míru',exact:true}).click();
        await expect(measurements.getByRole('row').nth(2).getByRole('cell').nth(3)).toHaveText('g');
        await page.reload(); await tab('Míry').click();
        await expect(measurements.getByRole('row').nth(2).getByRole('cell').nth(2)).toHaveText('—');
        await expect(measurements.getByRole('row').nth(2).getByRole('cell').nth(3)).toHaveText('g');
        await photo('11-source-measure-cleared');
        checks.push('Explicit missing source amount and edited unit survived a whole reload');
    }

    const tabNames=(await tabs().getByRole('button').allTextContents()).map(name=>name.trim());
    expect(tabNames).toHaveLength(20);
    for(const name of tabNames){
        await tab(name).click();
        await page.waitForLoadState('networkidle');
        await expect(tabs()).toBeVisible();
    }
    expect(httpErrors).toEqual([]);
    expect(authErrors.filter(entry=>entry.status===429)).toEqual([]);
    checks.push('Opened and loaded all 20 professional tabs with Unified Dictionaries and Publication Links enabled');

    for (const mode of ['view','edit']){
        await page.goto(base+'/admin/items/'+mode+'/1001?catalog=1'+(mode==='edit'?'&edit=professional':''));
        await expect(tabs().getByRole('button')).toHaveCount(20);
        for(const [width,height] of [[2560,1440],[1920,1080],[1366,768],[1024,768],[640,768]]){
            await page.setViewportSize({width,height});
            const identity=page.locator('.item-identity-pin');
            await expect(identity).toBeVisible();
            expect(await identity.evaluate(el=>getComputedStyle(el).position)).toBe('sticky');
            const summary=page.getByText('Karta, Opsáno, Ověřeno a další zařazení',{exact:true});
            await expect(summary).toBeVisible();
            await summary.click();
            let geometry=await summary.evaluate(el=>{
                const box=el.closest('details').getBoundingClientRect();
                const nav=document.querySelector('nav[aria-label="Karty DEMUS"]').getBoundingClientRect();
                return {bottom:box.bottom,top:nav.top,height:box.height};
            });
            expect(geometry.top).toBeGreaterThanOrEqual(geometry.bottom-1);
            await summary.click();
            const collapsed=await summary.evaluate(el=>el.closest('details').getBoundingClientRect().height);
            expect(collapsed).toBeLessThan(geometry.height);
            if(input.completion)await measureLayout('regression',mode);
            if(width===640)await photo('04-layout-mobile-'+mode);
        }
    }
    checks.push('All 20 tabs retained; five viewports in view and edit, disclosure collapses without overlapping tabs');
    result('PASS');
    }
} catch(error){
    result('FAIL',error.stack);
    if(page)await photo('failure').catch(()=>{});
    throw error;
} finally {
    if(app)await app.close();
    console.log('Loopback proxy closed');
    if(chrome){
        const owned=chrome.process();
        const exited=new Promise(resolve=>{
            if(owned.exitCode!==null||owned.signalCode!==null)resolve(true);
            else owned.once('exit',()=>resolve(true));
        });
        void chrome.close().catch(()=>{});
        const closed=await Promise.race([exited,new Promise(resolve=>setTimeout(()=>resolve(false),8000))]);
        if(!closed){
            console.log('Stopping only the owned Chrome process after the graceful shutdown deadline');
            await chrome.kill();
            await exited;
        }
    }
    console.log('Chrome closed');
}
process.exit(0);
