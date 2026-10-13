import fs from 'node:fs';
import ts from 'typescript';
import path from 'node:path';
import './localization-inventory.mjs';
const dictionary = JSON.parse(fs.readFileSync('src/i18n/locales/display-ar.json','utf8'));
let source = fs.readFileSync('src/i18n/translate.ts','utf8').replace("import catalog from './locales/display-ar.json';",`const catalog = ${JSON.stringify(dictionary)};`).replace("import patterns from './locales/patterns-ar.json';",`const patterns=${fs.readFileSync('src/i18n/locales/patterns-ar.json','utf8')};`);
source = ts.transpile(source,{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext});
const {resolveDisplayTranslation} = await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function files(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):/\.tsx?$/.test(e.name)?[path.join(dir,e.name)]:[]); }
const direct = new Map();
const uiData = new Set();
// These are names, technical examples and formatting tokens, rather than interface copy.
const preservedNames=new Set(['alex morgan','fitzone','gos','gos pro','facebook','instagram','linkedin','mastercard','messenger','paypal','soundcloud','stripe','visa','whatsapp','youtube','trustpilot','jordan admin','mohamed joe','mohamed joe team','northstar studio','sarah chen','northstar','n.','cname','ssl','123 wellness avenue · cairo']);
const isPreserved=s=>preservedNames.has(s.toLowerCase())||['CoachJoe','NutriPro','Amira H.','James P.','after_booking','after_event','before_event','enrollment.created','order.paid','order.refunded','subscription.renewed','tel','textarea'].includes(s)||/^(?:https?:|\/|#|avatar-|⌘|★ Trustpilot|\{[A-Z_a-z])/.test(s)||/^[A-Z]{1,2}$/.test(s)||/^(?:[€$£]?\d[\d,.]*[KM]|[\w.+-]+@[\w.-]+|[\w.-]+\.(?:com|co)|LAUNCH20|AED|EGP|EUR|GBP|SAR|USD)$/i.test(s)||s==='g';
for (const file of files('src').filter(f=>!f.includes(`${path.sep}i18n${path.sep}`)&&!f.includes(`${path.sep}landing${path.sep}`)&&!f.includes(`${path.sep}templates${path.sep}`))) {
  const sf=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  function visit(n) {
    if(ts.isStringLiteral(n)&& !resolveDisplayTranslation(n.text.trim())) {
      const parent=n.parent;
      const isCopy=ts.isPropertyAssignment(parent)&&/^(label|title|description|placeholder|hint|helper|message|tooltip|subtitle|heading|text)$/.test(parent.name.getText(sf));
      const isAttribute=ts.isJsxAttribute(parent)&&/^(description|subtitle|label|hint|helperText|message|emptyText|actionLabel|text|heading)$/.test(parent.name.getText(sf));
      const isFeedback=ts.isCallExpression(parent)&&/showToast\.|setError|new Error|notify|\.confirm/.test(parent.expression.getText(sf));
      const isField=ts.isCallExpression(parent)&&/^(field|select|color|group|check|text|area|range|toggle|label|section)$/.test(parent.expression.getText(sf))&&parent.arguments[0]===n;
      if((isCopy||isAttribute||isFeedback||isField)&&/[A-Za-z]/.test(n.text))uiData.add(n.text.trim());
    }
    if (ts.isCallExpression(n) && ['translateText','localizeNode'].includes(n.expression.getText(sf)) && n.arguments.length && ts.isStringLiteral(n.arguments[0])) {
      const s=n.arguments[0].text.trim();
      if (/[A-Za-z]/.test(s) && !resolveDisplayTranslation(s) && !isPreserved(s)) direct.set(s,[...(direct.get(s)||[]),file]);
    }
    if(ts.isCallExpression(n)&&['translateText','localizeNode'].includes(n.expression.getText(sf))&&n.arguments[0]) {
      function displayed(expr) {
        if(ts.isStringLiteral(expr)) {
          const s=expr.text.trim();
          if(/[A-Za-z]/.test(s)&&!resolveDisplayTranslation(s)&&!isPreserved(s))direct.set(s,[...(direct.get(s)||[]),file]);
        } else if(ts.isConditionalExpression(expr)) {displayed(expr.whenTrue);displayed(expr.whenFalse);}
        else if(ts.isParenthesizedExpression(expr))displayed(expr.expression);
        else if(ts.isArrayLiteralExpression(expr))expr.elements.forEach(displayed);
        else if(ts.isCallExpression(expr)&&ts.isPropertyAccessExpression(expr.expression)&&['map','filter','slice'].includes(expr.expression.name.text))displayed(expr.expression.expression);
      }
      displayed(n.arguments[0]);
    }
    ts.forEachChild(n,visit);
  }
  visit(sf);
}
fs.writeFileSync('scripts/localization-missing.json',JSON.stringify(Object.fromEntries([...direct].sort()),null,2));
console.log(`${direct.size} static interface strings need translation (names and technical examples preserved)`);
const candidates=JSON.parse(fs.readFileSync('scripts/localization-inventory.json','utf8')).filter(s=>!resolveDisplayTranslation(s));
fs.writeFileSync('scripts/localization-data-missing.json',JSON.stringify(candidates,null,2));
fs.writeFileSync('scripts/localization-ui-data-missing.json',JSON.stringify([...uiData].sort(),null,2));
console.log(`${candidates.length} other candidates (including brands, code and authored content)`);
