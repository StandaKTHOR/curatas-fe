import {expect as browserExpect} from '@playwright/test';
import fs from 'node:fs';

const expect = browserExpect.configure({timeout: 15000});

/** Read-only regression called inside the owned real-API browser fixture.
 * Start on the original /admin/items table with at least three different items.
 * No mock response, database write, application CSS or browser style injection.
 */
export async function verifyNeighbourNavigation(page, output) {
  const evidence = {kind:'MES_FINAL_CITEM_NEIGHBOUR_REGRESSION', status:'RUNNING',
    liveUatVerified:false, positions:[]};
  const table = page.getByRole('table', {name:'Sbírky — tabulkové zobrazení'});
  const before = page.url();
  const buttons = {
    previous: page.getByRole('button', {name:'Předchozí předmět',exact:true}),
    next: page.getByRole('button', {name:'Následující předmět',exact:true})
  };
  try {
    await expect(table.locator('tbody tr').nth(2)).toBeVisible();
    await table.locator('tbody tr').first().getByRole('button').first().click();
    await expect(page.getByRole('navigation', {name:'Karty DEMUS'}).getByRole('button')).toHaveCount(20);
    await expect(buttons.previous).toBeDisabled();
    const snapshot = async () => {
      await expect(page.locator('#inventoryNumber')).toBeVisible();
      await expect(buttons.next).toBeVisible();
      await page.evaluate(async () => {
        window.scrollTo(0,0);
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      const position = {path:new URL(page.url()).pathname};
      for (const [name, locator] of Object.entries(buttons)) {
        position[name] = await locator.boundingBox();
        if (!position[name]) throw Error('Missing navigation geometry: '+name);
      }
      evidence.positions.push(position);
    };
    await snapshot();
    for (let step=0; step<2; step++) {
      const previousUrl=page.url();
      await expect(buttons.next).toBeEnabled();
      await buttons.next.click();
      await page.waitForURL(url=>url.href!==previousUrl);
      await snapshot();
    }
    for (const position of evidence.positions.slice(1)) {
      for (const name of Object.keys(buttons)) {
        const first=evidence.positions[0][name], current=position[name];
        for (const axis of ['x','y','width','height']) {
          if (Math.abs(first[axis]-current[axis])>1) {
            throw Error('Neighbour control moved: '+name+'/'+axis+' '+first[axis]+' → '+current[axis]);
          }
        }
      }
    }
    await buttons.previous.click();
    await page.getByRole('button', {name:'← Zpět na seznam',exact:true}).click();
    await expect(page).toHaveURL(before);
    await expect(table).toBeVisible();
    evidence.status='PASS';
    return evidence;
  } catch(error) {
    evidence.status='FAIL';
    evidence.error=error.message;
    throw error;
  } finally {
    fs.writeFileSync(output+'/navigation-regression.json', JSON.stringify(evidence,null,2)+'\n', {flag:'wx'});
  }
}
