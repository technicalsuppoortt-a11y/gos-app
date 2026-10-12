const fs = require('fs');
const path = require('path');
const templatesDir = path.join('src', 'pages', 'pagefly', 'templates');

const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.ts') && f !== 'helpers.ts' && f !== 'index.ts');
for (const file of files) {
  const filePath = path.join(templatesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(/import \{.*?\} from '\.\/helpers';\n/, '');
  
  const fullImport = "import { rs, named, region, withId, anim, act, hideMobile, eyebrow, row, card, centerBlock, linkBtn, navbar, footer, faq, thankYouPage, checkoutPage } from './helpers';\n";
  content = fullImport + content;
  
  fs.writeFileSync(filePath, content);
}
console.log('Restored imports');
