import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { createServer } from 'vite';
import ts from 'typescript';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const fixtureId = 'virtual:studio-ux-fixture';
const server = await createServer({
  root: path.resolve('launch-brand'),
  configFile: path.resolve('launch-brand/vite.config.ts'),
  cacheDir: 'node_modules/.vite-studio-ux-test',
  plugins: [{
    name: 'studio-ux-fixture',
    resolveId: id => id === fixtureId ? '\0' + id : null,
    load(id) {
      if (id !== '\0' + fixtureId) return null;
      return ts.transpileModule(`
        import React, {useState} from 'react';
        import {createRoot} from 'react-dom/client';
        import {Provider} from 'react-redux';
        import {store} from '@/modules/brand-engine/store';
        import {actions} from '@/modules/brand-engine/store/brandSlice';
        import {StudioGuidedChoices} from '@/modules/brand-engine/components/brandengine/StudioGuidedChoices';
        import {StudioElementGenerator} from '@/modules/brand-engine/components/brandengine/StudioElementGenerator';
        import {LogoDrawingPreview} from '@/modules/brand-engine/components/brandengine/LogoDrawingPreview';
        import '@/launch-brand-tokens.css';
        import '@/index.css';
        import '@/modules/brand-engine/components/brandengine/BrandStudio.css';
        import '@/modules/brand-engine/components/brandengine/StudioGuided.css';
        import '@/modules/brand-engine/components/brandengine/BrandStudioWorkspace.css';
        import '@/modules/brand-engine/components/brandengine/StudioCompactWorkspace.css';
        import '@/pages/launch-brand-page.css';
        store.dispatch(actions.setLanguage('en'));
        window.currentPalette = () => store.getState().brand.brandTheme?.paletteId;
        function Fixture() {
          const [section, setSection] = useState('name');
          const [element, setElement] = useState(null);
          const [busy, setBusy] = useState(false);
          const [showLogo, setShowLogo] = useState(true);
          const [primary, setPrimary] = useState('#13756A');
          window.remountLogo = () => { setShowLogo(false); setTimeout(() => setShowLogo(true), 50); };
          window.recolorLogo = () => setPrimary('#2255AA');
          const logo = {...store.getState().brand.selectedBrandIdentity, id: 'fresh-logo', name: 'Juniper Studio'};
          return <div className="launch-brand-page"><header style={{height:120,flexShrink:0}}>Launch Brand workspace</header><div className="launch-brand-content"><div className="brand-engine-module compact-workspace-shell">
            <div className="bs-root studio-theme studio-workspace studio-compact-workspace" style={{height:'100%',padding:16,display:'flex',flexDirection:'column'}}>
              <div className="studio-workspace-grid"><div className="studio-workspace-column studio-workspace-primary">
                <StudioGuidedChoices busy={busy} connected activeSection={section} onSectionChange={setSection}
                  onGenerate={setElement} onApply={() => true} logoPanel={<div>Saved logo</div>}
                  generatorPanel={<div className="studio-generator-slot" hidden={element !== section}>
                    <StudioElementGenerator element={element} busy={busy} connected error="" onClose={() => setElement(null)} onApply={() => true}
                      onGenerate={async (kind, answers) => {
                        setBusy(true);
                        await new Promise(resolve => setTimeout(resolve, 150));
                        store.dispatch(actions.setPageParameter({pageId:'branding',key:'elementGenerations',value:{name:{answers,suggestions:[
                          {id:'one',name:'Prospect Path'}, {id:'two',name:'Qualify Connect'}, {id:'three',name:'Business Elevate'}
                        ]}}}));
                        setBusy(false);
                        return true;
                      }}/>
                  </div>}/>
              </div><div className="studio-workspace-column studio-workspace-secondary">
                {showLogo && <LogoDrawingPreview identity={logo} primary={primary} ar={false} animate/>}
              </div></div>
            </div>
          </div></div><footer style={{height:60,flexShrink:0}}>Saved</footer></div>;
        }
        createRoot(document.getElementById('root')).render(<Provider store={store}><Fixture/></Provider>);
      `, {compilerOptions: {jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext}}).outputText;
    },
    configureServer(vite) {
      vite.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/launch-brand/__studio-ux') return next();
        res.setHeader('Content-Type', 'text/html');
        res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/launch-brand/@id/__x00__virtual:studio-ux-fixture"></script></body></html>');
      });
    },
  }],
  server: {host: '127.0.0.1', port: 0, hmr: false},
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({executablePath: process.env.FUNNEL_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true});
  const page = await browser.newPage();
  await page.addInitScript(() => {
    window.scrollCalls = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function(options) {
      window.scrollCalls.push({className:this.className, ...options});
      return original.call(this, options);
    };
  });
  const errors = [];
  // Vite's dev WebSocket is unrelated to this network-isolated component fixture.
  page.on('pageerror', error => { if (error.message !== 'WebSocket closed without opened.') errors.push(error.message); });
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.setViewportSize({width: 1366, height: 768});
  await page.goto('http://127.0.0.1:' + server.httpServer.address().port + '/launch-brand/__studio-ux');
  await page.locator('#studio-generate-name').waitFor({timeout: 60000});
  await page.locator('.logo-drawing-preview.is-complete').waitFor();
  await page.evaluate(() => window.recolorLogo());
  assert.equal(await page.locator('.logo-drawing-preview.is-animating').count(), 0);
  await page.evaluate(() => window.remountLogo());
  await page.locator('.logo-drawing-preview.is-complete').waitFor();
  assert.equal(await page.getByRole('button', {name: 'Replay reveal'}).count(), 0);
  await page.locator('#studio-generate-name').click();
  await page.locator('.studio-generation-actions button').click();
  await page.locator('.studio-element-result').first().waitFor();
  assert(await page.evaluate(() => window.scrollCalls.some(call => call.className.includes('ai-generation-progress') && call.behavior === 'smooth' && call.block === 'center')), 'generation automatically centers progress');
  for (const size of [{width:1366,height:768},{width:1024,height:768},{width:768,height:1024},{width:1180,height:820},{width:1024,height:600}]) {
    await page.setViewportSize(size);
    await page.locator('.studio-generation-active-region').evaluate(el => el.scrollIntoView({block:'center'}));
    await page.waitForTimeout(500);
    for (const selector of ['.ai-generation-progress', '.studio-element-result']) {
      for (const element of await page.locator(selector).all()) {
        const box = await element.boundingBox();
        assert(box && box.y >= 0 && box.y + box.height <= size.height, selector + ' fits ' + JSON.stringify(size) + ': ' + JSON.stringify(box));
      }
    }
    assert(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), 'page stays within viewport');
  }
  await page.screenshot({path:path.resolve('node_modules/.cache/launch-brand-studio-ux.png')});
  await page.getByRole('button', {name:'Close', exact:true}).click();
  await page.locator('#studio-tab-colors').click();
  await page.locator('#studio-color-palette').click();
  const gallery = page.locator('.studio-palettes-gallery-dialog');
  await gallery.waitFor();
  await gallery.locator('.studio-gallery-palette-card').nth(1).click();
  assert.equal(await gallery.isVisible(), true);
  const before = await page.evaluate(() => window.currentPalette());
  await gallery.getByRole('button', {name:'Done', exact:true}).click();
  await gallery.waitFor({state:'hidden'});
  const after = await page.evaluate(() => window.currentPalette());
  assert.notEqual(after, before, 'Done applies the selected palette');
  assert.deepEqual(errors, []);
  console.log('PASS: name progress and three options fit desktop/tablet; page contained; logo stays complete after recolor/remount; palette Done applies and closes.');
} finally {
  await browser?.close();
  await server.close();
}
