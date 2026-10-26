// Refresh the landing mock from the original read-only native preview after a build.
// Visitors receive only static markup/styles: no iframe, router, store or backend.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { preview } from 'vite';
import postcss from 'postcss';
import { previewScreens } from '../src/pages/landing/preview/screens.ts';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const server = await preview({ configFile:false, preview:{ host:'127.0.0.1', port:0 } });
let browser;
try {
  browser = await chromium.launch({ executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless:true });
  const page = await browser.newPage({ viewport:{width:1440,height:990}, reducedMotion:'reduce' });
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType:'text/css', body:'' }));
  await page.goto(origin+'/landing-preview.html',{waitUntil:'networkidle'});
  await page.locator('.gos-home-dashboard').waitFor({timeout:60000});
  const output = { width:1200, height:990, styles:'', images:[], screens:{} };
  const images = new Map();
  const styleRules = new Map();
  const embed = async src => {
    if (!src || /^(data:|#)/.test(src)) return src;
    const url = new URL(src,origin); if(url.origin!==origin)return src;
    const filename = path.join('dist',decodeURIComponent(url.pathname));
    if(!images.has(filename)) {
      try {
        const data = await fs.readFile(filename);
        const mime = {'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'}[path.extname(filename)];
        if(mime){
          let image=`data:${mime};base64,${data.toString('base64')}`;
          if(['image/png','image/jpeg'].includes(mime))image=await page.evaluate(async source=>{const img=new Image();img.src=source;await img.decode();const scale=Math.min(1,1024/img.naturalWidth);const canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/webp',.94);},image);
          const id=output.images.length;output.images.push(image);images.set(filename,`__UPCLICK_IMAGE_${id}__`);
        }else images.set(filename,src);
      } catch { images.set(filename,src); }
    }
    return images.get(filename);
  };
  for(const language of ['en','ar']) for(const theme of ['light','dark']) for(const screen of previewScreens) {
    await page.evaluate(data=>window.postMessage({type:'gos-demo-view',...data},location.origin),{screen:screen.id,language,theme});
    await page.locator(`[data-demo-screen="${screen.id}"]`).waitFor();
    await page.waitForFunction(({language,theme})=>document.documentElement.dir===(language==='ar'?'rtl':'ltr') && document.documentElement.classList.contains('dark')===(theme==='dark'),{language,theme});
    // Native effects resolve here, during generation only. No loading runs in the shipped mock.
    await page.waitForTimeout(120);
    const snapshot = await page.evaluate(() => {
      const clone=document.querySelector('.lp-demo-root').cloneNode(true);
      clone.querySelectorAll('.layout-sidebar,.layout-header,.layout-footer,script,style').forEach(node=>node.remove());
      const inputs=document.querySelectorAll('.lp-demo-root input');
      clone.querySelectorAll('input').forEach((input,index)=>{input.setAttribute('value',inputs[index]?.value || '');input.tabIndex=-1;});
      const styles=[];
      const collect=(rules,prefix)=>{for(const [index,rule] of [...rules].entries()){
        const id=prefix+'.'+String(index).padStart(6,'0');
        if(rule instanceof CSSMediaRule){if(matchMedia(rule.conditionText).matches)collect(rule.cssRules,id);}
        else if(rule instanceof CSSSupportsRule){if(CSS.supports(rule.conditionText))collect(rule.cssRules,id);}
        else if(rule.constructor.name==='CSSContainerRule')styles.push([id,rule.cssText]);
        else if(rule instanceof CSSStyleRule){
          let matches=true;try{matches=!!document.querySelector(rule.selectorText.replace(/::[\w-]+(?:\([^)]*\))?/g,''));}catch{/* Keep unusual selectors intact. */}
          if(matches)styles.push([id,rule.cssText.replace(/:root\b/g,'.lp-static-document').replace(/(^|[\s>,+~])html(?=[\s.#:[>+~]|$)/g,'$1.lp-static-document').replace(/(^|[\s>,+~])body(?=[\s.#:[>+~]|$)/g,'$1.lp-static-body').replace(/#root\b/g,'.lp-static-app')]);
        }
        else if(rule.cssRules)collect(rule.cssRules,id);
      }};
      for(const [index,sheet] of [...document.styleSheets].entries()){try{collect(sheet.cssRules,String(index).padStart(6,'0'));}catch{/* External font sheets are unnecessary to capture app structure. */}}
      return {html:clone.outerHTML,styles,images:[...clone.querySelectorAll('img')].map(image=>image.getAttribute('src'))};
    });
    for(const src of [...new Set(snapshot.images)])snapshot.html=snapshot.html.split(`src="${src}"`).join(`src="${await embed(src)}"`);
    output.screens[`${language}-${theme}-${screen.id}`]=snapshot.html;
    for(const [id,css] of snapshot.styles)styleRules.set(id,css);
    console.log(`Captured ${language}/${theme}/${screen.id}`);
  }
  output.styles=[...styleRules].sort(([a],[b])=>a.localeCompare(b)).map(([,css])=>css).join('\n');
  for(const match of [...output.styles.matchAll(/url\(["']?([^"')]+)["']?\)/g)]) {
    const embedded=await embed(match[1]);if(embedded!==match[1])output.styles=output.styles.split(match[0]).join(`url("${embedded}")`);
  }
  output.styles+='\n.lp-static-document,.lp-static-body,.lp-static-app{width:1200px;height:var(--lp-static-height,990px);margin:0;overflow:hidden}.lp-static-document *,.lp-static-document *::before,.lp-static-document *::after{animation:none!important;transition:none!important;caret-color:transparent!important}.lp-static-document{pointer-events:none}.lp-demo-root{height:var(--lp-static-height,990px)}.lp-static-document .layout-sidebar,.lp-static-document .layout-header,.lp-static-document .layout-footer{display:none!important}';
  const stylesheet=postcss.parse(output.styles);
  stylesheet.walkDecls(declaration=>{declaration.value=declaration.value.replace(/([\d.]+)(?:d|s|l)?v(h|w)\b/g,(_,value,axis)=>axis==='h'?`calc(var(--lp-static-height,990px) * ${Number(value)/100})`:`${Number(value)*1440/100}px`);});
  output.styles=stylesheet.toString();
  await fs.writeFile('src/pages/landing/preview/static-snapshots.json',JSON.stringify(output));
  console.log(`Saved ${(JSON.stringify(output).length/1024/1024).toFixed(2)} MB of original markup and isolated styles.`);
}finally{await browser?.close();server.httpServer.closeAllConnections();await new Promise(resolve=>server.httpServer.close(resolve));}
