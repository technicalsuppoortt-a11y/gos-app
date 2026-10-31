import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';

// Generate scoped corrections from authored CSS without changing dark tokens or site content.
const excluded = ':where([data-public-asset],.aw-live-preview,.aw-asset-image,.aw-step-image,.fb-site-window,.fb-live-preview-frame,.fn-focused-canvas,.pf-page,.pf-thumb,.pf-renderer,.pf-canvas,.bk-public,.bk-preview-frame,.bk-live-preview,.lp-page,.product-live-preview,.pp-live-preview,.cw-live-preview,.checkout-screen,.landing-page,.quick-details,[role=switch],.af-switch,.aw-default,.bk-switch-track)';
const guard = `:not([data-form-theme]):not([data-form-theme] *):not(${excluded}):not(${excluded} *)`;
const chrome = '.layout-dashboard-shell,.role-shell,[role=dialog],.bk-dialog,.quick-details,.commerce-select-content';
const scope = `:is(:where(${chrome}),:where(${chrome}) *)`;
const files = [], findings = [], variableFindings = [], utilities = [], rules = new Map(), variableRules = new Map();
function visit(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) visit(p); else if (p.endsWith('.css') && !/landing|auth|preview|theme-surfaces|theme-controls|light-contrast/.test(p)) files.push(p); } }
visit('src');
function scanUtilities(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!/landing|branding/.test(file)) scanUtilities(file); }
    else if (/\.tsx$/.test(file)) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(/(?<![\w:-])text-(?:slate|gray|zinc)-(?:100|200|300|400|500)\b(?:\/\d{1,3})?/g))
        utilities.push({ file: file.replaceAll('\\', '/'), line: source.slice(0, match.index).split('\n').length, utility: match[0] });
    }
  }
}
scanUtilities('src');
function rgb(value) {
  if (!/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(value)) return null;
  let hex = value.slice(1); if (hex.length === 3) hex = [...hex].map(c => c + c).join('');
  return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
}
function contrastWhite(color) {
  const c = color.map(n => { const v = n / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  return 1.05 / (.2126 * c[0] + .7152 * c[1] + .0722 * c[2] + .05);
}
for (const file of files.sort()) {
  const css = postcss.parse(fs.readFileSync(file, 'utf8'));
  css.walkRules(rule => {
    if (!/dark|preview|\.bk-public|\.fb-site|\.pf-|\.lp-/.test(rule.selector)) {
      rule.walkDecls(/^--.*(?:text|ink|muted)/i, decl => {
        const color = rgb(decl.value);
        if (!color || Math.max(...color) - Math.min(...color) > 52 || Math.min(...color) > 250 || contrastWhite(color) >= 4.5) return;
        const selector = rule.selector === ':root' ? `html:not(.dark) :where(${chrome})` : `html:not(.dark) :is(${rule.selector})${scope}${guard}`;
        const key = JSON.stringify([selector, decl.prop]);
        variableRules.set(key, { selector, prop: decl.prop });
        variableFindings.push({ file: file.replaceAll('\\', '/'), line: decl.source.start.line, selector: rule.selector, property: decl.prop, before: decl.value, after: '#475569', contrastOnWhite: Number(contrastWhite(color).toFixed(2)) });
      });
    }
    if (/dark|:root|html|body|avatar|artwork|hero|banner|gradient|primary|\.active|\.selected|\.bk-public|\.fb-site|\.pf-|\.lp-|\.preview/.test(rule.selector)) return;
    let darkSurface = false;
    rule.walkDecls(/^(background|background-color)$/, d => { const c = rgb(d.value); if (c && contrastWhite(c) >= 4.5) darkSurface = true; });
    if (darkSurface) return;
    rule.walkDecls('color', decl => {
      const color = rgb(decl.value);
      if (!color || Math.max(...color) - Math.min(...color) > 52 || Math.min(...color) > 250 || contrastWhite(color) >= 4.5) return;
      const selectors = rule.selectors.filter(s => !/::|:before|:after/.test(s));
      if (!selectors.length) return;
      const muted = /muted|small|meta|subtitle|secondary|placeholder|hint|footer/.test(rule.selector);
      const replacement = muted ? '#475569' : '#334155';
      const wrappers = [];
      for (let p = rule.parent; p && p.type !== 'root'; p = p.parent) { if (p.type === 'atrule' && ['media', 'supports'].includes(p.name)) wrappers.push({ name: p.name, params: p.params }); else if (p.type === 'atrule') return; }
      for (const selector of selectors) {
        const specificity = [(selector.match(/#[\w-]+/g) || []).length, (selector.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) || []).length, (selector.match(/(?:^|[\s>+~])\w+/g) || []).length];
        const key = JSON.stringify([specificity, replacement, wrappers]);
        if (!rules.has(key)) rules.set(key, { selectors: new Set(), replacement, wrappers });
        rules.get(key).selectors.add(selector);
      }
      findings.push({ file: file.replaceAll('\\', '/'), line: decl.source.start.line, selector: rule.selector, before: decl.value, after: replacement, contrastOnWhite: Number(contrastWhite(color).toFixed(2)) });
    });
  });
}
const output = postcss.root();
output.append(postcss.comment({ text: 'Generated by scripts/build-light-contrast.mjs. Scoped to light app UI; authored customer content and dark mode are excluded.' }));
for (const { selector, prop } of variableRules.values()) {
  const rule = postcss.rule({ selector }); rule.append({ prop, value: '#475569' }); output.append(rule);
}
for (const { selectors, replacement, wrappers } of rules.values()) {
  let node = postcss.rule({ selector: `html:not(.dark) :is(${[...selectors].join(',')})${scope}${guard}` });
  node.append({ prop: 'color', value: replacement });
  for (const config of wrappers) { const wrapper = postcss.atRule(config); wrapper.append(node); node = wrapper; }
  output.append(node);
}
output.append(`html:not(.dark) :is(.layout-dashboard-shell,[role=dialog],.bk-dialog,.quick-details,.commerce-select-content) :is(.text-slate-100,.text-slate-200,.text-slate-300,.text-slate-400,.text-slate-500,.text-gray-100,.text-gray-200,.text-gray-300,.text-gray-400,.text-gray-500,.text-zinc-100,.text-zinc-200,.text-zinc-300,.text-zinc-400,.text-zinc-500)${guard}{color:#475569}`);
output.append('html:not(.dark) .layout-footer{color:#475569}');
const opacityUtilities = [...new Set(utilities.map(u => u.utility).filter(u => u.includes('/')))];
if (opacityUtilities.length) output.append(`html:not(.dark) :is(.layout-dashboard-shell,[role=dialog],.bk-dialog,.quick-details,.commerce-select-content) :is(${opacityUtilities.map(u => `[class~="${u}"]`).join(',')})${guard}{color:#475569}`);
fs.writeFileSync('src/light-contrast.css', output.toString() + '\n');
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/light-contrast-audit.json', JSON.stringify({ scannedStylesheets: files.length, correctedDeclarations: findings.length, correctedVariables: variableFindings.length, referenceSurface: '#ffffff', minimumRatio: 4.5, utilityOccurrences: utilities.length, utilities, variableFindings, findings }, null, 2) + '\n');
console.log(`Light contrast: ${files.length} stylesheets inspected; ${findings.length} neutral declarations and ${variableFindings.length} text tokens corrected; ${utilities.length} utility occurrences audited.`);
