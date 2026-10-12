const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'src/pages/pagefly/templates.ts');
const outDir = path.join(__dirname, 'src/pages/pagefly/templates');
const content = fs.readFileSync(srcPath, 'utf-8');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir);
}

// Find all top-level functions using a regex
const functionRegex = /function\s+([a-zA-Z0-9_]+)\s*\([\s\S]*?\)\s*:\s*PFNode\[\]\s*\{([\s\S]*?^\})/gm;

// Wait, the regex might not capture the full body if there are nested braces.
// Let's just find the start index of each "function "
let functionStarts = [];
let match;
const fnRegex = /function\s+([a-zA-Z0-9_]+)\s*\(/g;
while ((match = fnRegex.exec(content)) !== null) {
  functionStarts.push({ name: match[1], index: match.index });
}

let functions = {};
for (let i = 0; i < functionStarts.length; i++) {
  const start = functionStarts[i].index;
  const name = functionStarts[i].name;
  // If it's a helper like navbar, thankYouPage, etc, we skip it here and keep it in helpers
  const end = i < functionStarts.length - 1 ? functionStarts[i+1].index : content.indexOf('export const PAGE_TEMPLATES');
  
  functions[name] = content.slice(start, end);
}

const templatesToExtract = [
  'dentalArticle',
  'dentalClinic',
  'sonicProduct',
  'auraHeadphones',
  'coaching',
  'productLaunch',
  'saas',
  'bookingPage',
  'saasSignup'
];

let indexImports = `import { PageTemplate } from '../templates';\n`;

for (const name of templatesToExtract) {
  if (functions[name]) {
    let fnCode = functions[name].trim();
    // Some trailing comments might be included, strip them
    fnCode = fnCode.replace(/\/\* -+\s*\*\/\n\/\* \d+\. .*?\s*\*\/\n\/\* -+\s*\*\//g, '');
    const fileContent = `import { el, IMG, inDays } from '../factory';\nimport type { PFNode } from '../types';\nimport { rs, named, region, withId, anim, act, hideMobile, eyebrow, row, card, centerBlock, linkBtn, navbar, footer, faq, thankYouPage, checkoutPage } from './helpers';\n\nexport ${fnCode}\n`;
    fs.writeFileSync(path.join(outDir, `${name}.ts`), fileContent);
    console.log(`Wrote ${name}.ts`);
    indexImports += `import { ${name} } from './${name}';\n`;
  } else {
    console.log(`Could not find function ${name}`);
  }
}

// Re-write the PAGE_TEMPLATES export
const exportsStart = content.indexOf('export const PAGE_TEMPLATES');
const exportsCode = content.slice(exportsStart);
fs.writeFileSync(path.join(outDir, 'index.ts'), indexImports + '\n' + exportsCode);
console.log('Wrote index.ts');

// Re-write helpers.ts
// It should contain everything before the first template function
const firstTemplateIndex = functionStarts.find(f => templatesToExtract.includes(f.name)).index;
let helpersCode = content.slice(0, firstTemplateIndex);

let exportedHelpersCode = helpersCode
  .replace(/const rs =/g, 'export const rs =')
  .replace(/const named =/g, 'export const named =')
  .replace(/const region =/g, 'export const region =')
  .replace(/const withId =/g, 'export const withId =')
  .replace(/const anim =/g, 'export const anim =')
  .replace(/const act =/g, 'export const act =')
  .replace(/const hideMobile =/g, 'export const hideMobile =')
  .replace(/const eyebrow =/g, 'export const eyebrow =')
  .replace(/const row =/g, 'export const row =')
  .replace(/const card =/g, 'export const card =')
  .replace(/const centerBlock =/g, 'export const centerBlock =')
  .replace(/const linkBtn =/g, 'export const linkBtn =')
  .replace(/function navbar/g, 'export function navbar')
  .replace(/function footer/g, 'export function footer')
  .replace(/function faq/g, 'export function faq')
  .replace(/function thankYouPage/g, 'export function thankYouPage')
  .replace(/function checkoutPage/g, 'export function checkoutPage');

fs.writeFileSync(path.join(outDir, 'helpers.ts'), exportedHelpersCode);
console.log('Wrote helpers.ts');

