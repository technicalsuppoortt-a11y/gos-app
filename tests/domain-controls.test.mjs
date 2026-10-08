import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const output = process.env.FUNNEL_SCREENSHOT_DIR || await mkdtemp(join(tmpdir(), 'gos-domains-qa-'));
const server = await createServer({ server: { host: '127.0.0.1', port: 5198, strictPort: true } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.FUNNEL_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('gos.auth', JSON.stringify({ user: { id: 'test', email: 'test@example.com', name: 'Mohamed Joe' }, role: 'USER', token: 'test', tenant: { id: 'test', name: 'GOS' } }));
  });
  async function visit(section) {
    await page.goto(`http://127.0.0.1:5198/dashboard/${section}`);
    await page.locator('.aw-workspace').waitFor();
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.layout-route-content')).opacity) === 1);
  }
  async function fits() {
    const dimensions = await page.evaluate(() => ({
      viewport: innerHeight,
      body: document.documentElement.scrollHeight,
      cta: document.querySelector('.aw-domain-cta').getBoundingClientRect().bottom,
      containers: [...document.querySelectorAll('.layout-main,.layout-content,.aw-workspace')].map(el => ({ class: el.className, height: el.clientHeight, content: el.scrollHeight, overflow: getComputedStyle(el).overflowY })),
    }));
    console.log('Domains dimensions:', JSON.stringify(dimensions));
    assert.ok(dimensions.body <= dimensions.viewport + 1, JSON.stringify(dimensions));
    assert.ok(dimensions.cta <= dimensions.viewport, JSON.stringify(dimensions));
    dimensions.containers.forEach(el => { if (['auto', 'scroll'].includes(el.overflow)) assert.ok(el.content <= el.height + 1, JSON.stringify(el)); });
  }
  await visit('domains');
  assert.equal(await page.locator('tbody tr').count(), 5);
  assert.equal(await page.locator('.aw-workspace select:visible').count(), 0);
  for (const [width, height] of [[1366,768],[1440,900],[1920,1080]]) {
    await page.setViewportSize({ width, height });
    await fits();
    await page.screenshot({ path: join(output, `domains-polished-${width}.png`) });
  }
  await page.setViewportSize({ width:1366, height:768 });
  await page.keyboard.press('/');
  await page.getByPlaceholder('Search domains...').fill('.com');
  assert.equal(await page.getByPlaceholder('Search domains...').evaluate(el => el === document.activeElement), true);
  await fits();
  await page.getByRole('button', {name:'Clear Search domains...',exact:true}).click();
  assert.equal(await page.getByPlaceholder('Search domains...').inputValue(), '');
  const status = page.getByRole('combobox', {name:'Domain status'});
  await status.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('option', {name:'Pending',exact:true}).click();
  assert.equal(await page.locator('tbody tr').count(), 1);
  await page.getByRole('button', {name:'Remove Pending filter',exact:true}).click();
  assert.equal(await page.locator('tbody tr').count(), 5);
  await page.getByRole('combobox', {name:'Connection type'}).click();
  await page.getByRole('option', {name:'Websites',exact:true}).click();
  assert.equal(await page.locator('tbody tr').count(), 2);
  await page.getByRole('button', {name:'Clear all',exact:true}).click();
  await page.getByLabel('Select fitzone.com', {exact:true}).check();
  await page.getByRole('button', {name:'Export',exact:true}).click();
  let modal = page.getByRole('dialog');
  await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Close dialog');
  await modal.getByRole('combobox', {name:'Export scope'}).click();
  await page.getByRole('listbox').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('listbox').waitFor({state:'hidden'});
  await modal.waitFor({state:'visible'});
  assert.equal(await modal.count(), 1, 'Escape should close the select before the modal');
  assert.equal(await page.getByRole('listbox').count(), 0);
  for(let attempt=0;attempt<5;attempt++) {
    await modal.getByRole('combobox',{name:'Export scope'}).click();
    await page.getByRole('listbox').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('listbox').waitFor({state:'hidden'});
    await modal.waitFor({state:'visible'});
    assert.equal(await modal.count(),1,'Nested menu dismissal must preserve the modal');
    assert.equal(await page.getByRole('listbox').count(),0);
  }
  await modal.getByRole('combobox', {name:'Export scope'}).click();
  await page.getByRole('option', {name:'Filtered domains (5)',exact:true}).click();
  await page.screenshot({path:join(output,'domain-export-dialog.png')});
  for (const format of ['csv','json','pdf']) {
    if (format !== 'csv') {
      await page.getByRole('button', {name:'Export',exact:true}).click();
      modal = page.getByRole('dialog');
      await modal.getByRole('combobox', {name:'Export scope'}).click();
      await page.getByRole('option', {name:'Filtered domains (5)',exact:true}).click();
    }
    await modal.getByRole('radio', {name:new RegExp(format.toUpperCase())}).click();
    const downloaded = page.waitForEvent('download');
    await modal.getByRole('button', {name:`Export ${format.toUpperCase()}`,exact:true}).click();
    const download = await downloaded;
    assert.equal(await download.failure(), null);
    const path = join(output, `domains-report.${format}`);
    await download.saveAs(path);
    const data = await readFile(path);
    if (format === 'csv') {
      assert.ok(data.toString('utf8').includes('Renewal timestamp (UTC)'));
      assert.ok(data.toString('utf8').includes('Fitness Coaching Funnel'));
      assert.equal(data.toString('utf8').split('\r\n').length, 6);
    } else if (format === 'json') {
      const report = JSON.parse(data.toString('utf8'));
      assert.equal(report.count, 5);
      assert.equal(report.domains[0].renewalAt, null);
      assert.equal(report.domains[0].assignedAsset, 'Fitness Coaching Funnel');
    } else {
      assert.equal(data.subarray(0,8).toString(), '%PDF-1.4');
      const xref = Number(/startxref\n(\d+)/.exec(data.toString('latin1'))[1]);
      assert.equal(data.subarray(xref,xref+4).toString(), 'xref');
    }
  }
  await page.getByRole('button', {name:'Export',exact:true}).click();
  modal = page.getByRole('dialog');
  assert.ok((await modal.getByRole('combobox', {name:'Export scope'}).innerText()).includes('Selected domains (1)'));
  const selectedDownload = page.waitForEvent('download');
  await modal.getByRole('radio', {name:/JSON/}).click();
  await modal.getByRole('button', {name:'Export JSON',exact:true}).click();
  const selectedReport = await selectedDownload;
  const selectedPath = join(output,'selected-domain.json');
  await selectedReport.saveAs(selectedPath);
  assert.equal(JSON.parse(await readFile(selectedPath,'utf8')).count,1);
  const reportData = await page.evaluate(async () => {
    const {domainReportRows, domainCSV, domainJSON, domainPDF, renderDomainReportPage} = await import('/src/pages/domain-export.ts');
    const {seedWorkspace} = await import('/src/pages/asset-model.ts');
    const workspace = seedWorkspace();
    workspace.assets[0].name = '=SUM(1,2), "Coach"\nالعربية';
    workspace.domains[0].renewalAt = '2027-10-08T12:30:00Z';
    const rows = domainReportRows(workspace.domains,workspace);
    const many = Array.from({length:25},(_,index)=>({...rows[0],domain:`example-${index}.com`}));
    const pdf = new Uint8Array(await domainPDF(many).arrayBuffer());
    const pdfText = new TextDecoder('latin1').decode(pdf);
    const image = renderDomainReportPage(rows,0,new Date().toISOString(),rows.length).toDataURL('image/png');
    return {csv:domainCSV(rows),json:domainJSON(rows),pages:/\/Count 3 /.test(pdfText),image};
  });
  assert.ok(reportData.csv.includes("'="));
  assert.ok(reportData.csv.includes('""Coach""'));
  assert.ok(reportData.csv.includes('العربية'));
  assert.equal(JSON.parse(reportData.json).domains[0].renewalAt,'2027-10-08T12:30:00.000Z');
  assert.equal(reportData.pages,true);
  await writeFile(join(output,'domains-report-preview.png'),Buffer.from(reportData.image.split(',')[1],'base64'));
  for (const section of ['funnels','websites']) {
    await visit(section);
    await page.getByRole('combobox', {name:'Asset status'}).click();
    await page.getByRole('option', {name:'Draft',exact:true}).click();
    assert.equal(await page.locator('.aw-asset-card').count(),1);
    await page.getByRole('combobox', {name:'Sort assets'}).click();
    await page.getByRole('option', {name:'Name',exact:true}).click();
    assert.equal(await page.locator('.aw-filter-chip').count(),2);
    await page.getByRole('button', {name:'Clear all',exact:true}).click();
    assert.equal(await page.locator('.aw-workspace select:visible').count(),0);
  }
  assert.deepEqual(errors,[]);
  console.log(`Control and export checks passed. Reports and screenshots: ${output}`);
} finally {
  await browser?.close();
  await server.close();
}
