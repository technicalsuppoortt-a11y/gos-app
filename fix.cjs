const fs = require('fs');
const path = require('path');
const templatesDir = path.join('src', 'pages', 'pagefly', 'templates');

// 1. Fix helpers.ts
const helpersPath = path.join(templatesDir, 'helpers.ts');
let helpersContent = fs.readFileSync(helpersPath, 'utf8');
helpersContent = helpersContent.replace(/import \{ el, IMG, inDays \} from '\.\/factory';/, "import { el } from '../factory';");
helpersContent = helpersContent.replace(/import type \{ (.*?) \} from '\.\/types';/, "import type { $1 } from '../types';");
fs.writeFileSync(helpersPath, helpersContent);

// 2. Fix index.ts
const indexPath = path.join(templatesDir, 'index.ts');
let indexContent = fs.readFileSync(indexPath, 'utf8');
indexContent = "import { IMG } from '../factory';\nimport type { PFNode } from '../types';\nimport { checkoutPage, thankYouPage } from './helpers';\n" + indexContent;
fs.writeFileSync(indexPath, indexContent);

// 3. Fix unused imports in all template files
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.ts') && f !== 'helpers.ts' && f !== 'index.ts');
for (const file of files) {
  const filePath = path.join(templatesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  const unused = ['region', 'hideMobile', 'eyebrow', 'row', 'card', 'centerBlock', 'linkBtn', 'navbar', 'footer', 'faq', 'thankYouPage', 'checkoutPage', 'withId', 'anim', 'act', 'inDays'];
  for (const u of unused) {
    const regex = new RegExp('(\\{\\s*|,\\s*)\\b' + u + '\\b(\\s*,|\\s*\\})', 'g');
    content = content.replace(regex, (match, p1, p2) => {
      if (p1.includes('{') && p2.includes('}')) return '{ }';
      if (p1.includes('{')) return '{ ';
      if (p2.includes('}')) return ' }';
      return ', ';
    });
  }
  fs.writeFileSync(filePath, content);
}
console.log("Done");
