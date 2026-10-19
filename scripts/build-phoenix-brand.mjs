// Apply the same color-role conversion used by Phoenix's GOS preview.
import fs from 'node:fs/promises';
import path from 'node:path';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import { themeColorValue } from '../src/branding/themeColors.ts';
const files = [];
async function visit(folder) {
  for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
    const name = path.join(folder, entry.name);
    if (entry.isDirectory()) await visit(name);
    else if (name.endsWith('.css') && !name.includes('phoenix-brand')) files.push(name);
  }
}
await visit('src');
const excluded = ':where(.aw-live-preview,.aw-thumbnail,.fb-live-preview-frame,.fn-focused-canvas,.pf-page,.pf-thumb,.pf-renderer,.pf-canvas,.bk-public,.bk-preview-frame,.bk-live-preview,.lp-page,.product-live-preview,.pp-live-preview,.cw-live-preview,.checkout-screen,.landing-page)';
const guard = `:not(${excluded}):not(${excluded} *)`;
const output = [];
for (const file of files.sort()) {
  const input = await fs.readFile(file, 'utf8');
  const root = file === path.join('src','index.css')
    ? (await postcss([tailwind()]).process(input, { from: file })).root
    : postcss.parse(input);
  root.walkAtRules(rule => { if (!['media', 'supports', 'layer'].includes(rule.name)) rule.remove(); });
  root.walkRules(rule => {
    if (rule.selector.includes('data-gp-')) { rule.remove(); return; }
    rule.walkDecls(declaration => {
      if (!/^(?:color|background(?:-color)?|border(?:-[\w-]+)?|outline(?:-color)?|fill|stroke|stop-color|box-shadow|--[\w-]+)$/.test(declaration.prop)) { declaration.remove(); return; }
      const themed = themeColorValue(declaration.value, declaration.prop);
      if (themed === declaration.value) declaration.remove();
      else { declaration.value = themed; declaration.important = true; }
    });
    if (!rule.nodes.length) { rule.remove(); return; }
    rule.selectors = rule.selectors.map(selector => {
      const scope = 'html[data-gp-brand="true"]';
      const scoped = /^(?:html|:root)(?=[\s.:[#]|$)/.test(selector) ? selector.replace(/^(html|:root)/, scope)
        : selector.startsWith('.dark ') ? `${scope}.dark ${selector.slice(6)}` : `${scope} ${selector}`;
      const pseudo = scoped.indexOf('::');
      return pseudo < 0 ? scoped + guard : scoped.slice(0, pseudo) + guard + scoped.slice(pseudo);
    });
  });
  root.walkComments(comment => comment.remove());
  root.walkRules(rule => { if (!rule.nodes?.length) rule.remove(); });
  root.walkAtRules(rule => { if (!rule.nodes?.length) rule.remove(); });
  const prune = container => {
    for (const node of [...(container.nodes || [])]) {
      if (node.nodes) { prune(node); if (!node.nodes.length) node.remove(); }
    }
  };
  prune(root);
  output.push(root.toString());
}
await fs.writeFile('src/context/phoenix-brand-generated.css', `/* Generated from GOS styles with Phoenix color roles. */\n${output.join('\n')}`);
console.log(`Generated Phoenix brand colors for ${files.length} stylesheets.`);
