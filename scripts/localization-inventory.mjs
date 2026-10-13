import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

export function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [path.join(dir, entry.name)] : []);
}
const strings = new Set();
for (const file of files('src').filter(f => !f.includes('i18n') && !f.includes('landing-content'))) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  function visit(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const text = node.text.trim();
      const parent = node.parent;
      const attr = ts.isJsxAttribute(parent) ? parent.name.getText(source) : '';
      const property = ts.isPropertyAssignment(parent) ? parent.name.getText(source) : '';
      if (!['className','id','type','value','key','href','src','style','name','htmlFor','role','dir','lang'].includes(attr) && !['id','slug','className','type','value','href','src','color','icon','path','key'].includes(property) && /[a-zA-Z]/.test(text) && !/^(?:[.#/]|https?:|[\w.+-]+@|\w+:\/\/)/.test(text) && !/[{}<>]|\b(?:px|rem|rgba|grid-cols|items-center|flex-|bg-|text-|border-|rounded-|const |import |function |return |SELECT |INSERT )/.test(text) && text.length < 500 && (/[\s]/.test(text) || /^[A-Z][a-zA-Z]+$/.test(text))) strings.add(text);
    }
    if (ts.isJsxText(node)) {
      const text = node.text.replace(/\s+/g, ' ').trim();
      if (/[a-zA-Z]/.test(text)) strings.add(text.replace(/&amp;/g,'&').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&nbsp;/g,'\u00a0').replace(/&quot;/g,'"').replace(/&#39;/g,"'"));
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
fs.writeFileSync('scripts/localization-inventory.json', JSON.stringify([...strings].sort(), null, 2));
console.log(`${strings.size} candidate display strings`);
