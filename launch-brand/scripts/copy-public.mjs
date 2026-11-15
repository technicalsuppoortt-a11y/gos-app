// Launch Brand code requests a few files by absolute path (/joe-academy-logo.svg,
// /fonts/...), exactly as on Joe Academy. Put them at gos-app's hosting root
// without overwriting gos-app assets other than Joe Academy's own logo.
import fs from 'node:fs';
import path from 'node:path';
const from = path.resolve('public');
const to = path.resolve('../dist');
function copy(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const source = path.join(dir, entry.name);
    const relPath = path.relative(from, source);
    const target = path.join(to, relPath);
    if (entry.isDirectory()) { fs.mkdirSync(target, { recursive: true }); copy(source); continue; }
    if (fs.existsSync(target) && relPath !== 'joe-academy-logo.svg') { console.warn(`[launch-brand] kept gos-app's ${relPath}`); continue; }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}
if (fs.existsSync(from)) copy(from);
