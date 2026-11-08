// Launch Brand code requests a few files by absolute path (/joe-academy-logo.svg,
// /fonts/...), exactly as on Joe Academy. Put them at gos-app's hosting root
// without overwriting any gos-app file.
import fs from 'node:fs';
import path from 'node:path';
const from = path.resolve('public');
const to = path.resolve('../dist');
function copy(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const source = path.join(dir, entry.name);
    const target = path.join(to, path.relative(from, source));
    if (entry.isDirectory()) { fs.mkdirSync(target, { recursive: true }); copy(source); continue; }
    if (fs.existsSync(target)) { console.warn(`[launch-brand] kept gos-app's ${path.relative(to, target)}`); continue; }
    fs.copyFileSync(source, target);
  }
}
if (fs.existsSync(from)) copy(from);
