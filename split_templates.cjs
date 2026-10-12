const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'src/pages/pagefly/templates.ts');
const outDir = path.join(__dirname, 'src/pages/pagefly/templates');
const content = fs.readFileSync(srcPath, 'utf-8');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir);
}

// Extract helpers and types
const helperEndMatch = content.indexOf('/* 1. Dental advertorial');
if (helperEndMatch === -1) {
  console.log('Could not find helper end');
  process.exit(1);
}

const helpersCode = content.slice(0, helperEndMatch);
let remainingCode = content.slice(helperEndMatch);

const templates = [
  { name: 'dentalArticle', file: 'dentalArticle.ts' },
  { name: 'dentalClinic', file: 'dentalClinic.ts' },
  { name: 'sonicProduct', file: 'sonicProduct.ts' },
  { name: 'auraHeadphones', file: 'auraHeadphones.ts' },
  { name: 'coaching', file: 'coaching.ts' },
  { name: 'saas', file: 'saas.ts' },
  { name: 'productLaunch', file: 'productLaunch.ts' } // Need to check if this exists
];

const mainExportsEnd = remainingCode.indexOf('export const PAGE_TEMPLATES');
const templatesCode = remainingCode.slice(0, mainExportsEnd);
const exportsCode = remainingCode.slice(mainExportsEnd);

// For each template, we need to extract its function definition.
// They start with "function X(): PFNode[] {" and end before the next "/* ---" or the exports.
const parts = templatesCode.split(/\/\* -+\s*\*\/\n\/\* \d+\. .*?\s*\*\/\n\/\* -+\s*\*\//);
// parts[0] is empty or whitespace
// parts[1] is dentalArticle, etc.

let indexImports = `import { PageTemplate } from '../templates';\n`;
let indexExports = exportsCode;

for (let i = 1; i < parts.length; i++) {
  let part = parts[i].trim();
  if (!part) continue;
  
  // Find the function name
  const match = part.match(/function\s+(\w+)\s*\(/);
  if (!match) continue;
  const funcName = match[1];
  
  const fileContent = `import { el, IMG, inDays } from '../factory';\nimport type { PFNode } from '../types';\nimport { rs, named, region, withId, anim, act, hideMobile, eyebrow, row, card, centerBlock, linkBtn, navbar, footer, faq, thankYouPage, checkoutPage } from './helpers';\n\nexport ${part}\n`;
  
  fs.writeFileSync(path.join(outDir, `${funcName}.ts`), fileContent);
  console.log(`Wrote ${funcName}.ts`);
  
  indexImports += `import { ${funcName} } from './${funcName}';\n`;
}

// Create helpers.ts
// We need to export all helpers so the individual files can use them.
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

// Create index.ts
fs.writeFileSync(path.join(outDir, 'index.ts'), indexImports + '\n' + indexExports);
console.log('Wrote index.ts');
