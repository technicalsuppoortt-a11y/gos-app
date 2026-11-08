import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

// Deploy only the bridge and Hosting. Copilot's Secret Manager parameters do
// not belong to Launch Brand, which uses its saved AI Center connection.
const root = path.resolve(import.meta.dirname, '..');
const source = '.firebase/phoenix-bridge-deploy';
const temporaryConfig = path.join(root, '.firebase.launch-brand-deploy.json');
const functionsOnly = process.argv.includes('--functions-only');
if (!functionsOnly) {
  await readFile(path.join(root, 'dist/index.html'));
  await readFile(path.join(root, 'dist/launch-brand/index.html'));
}
await mkdir(path.join(root, source), { recursive: true });
for (const name of ['phoenix.js', 'bridge.js', 'phoenix-public-config.json', 'launch-brand-admin.js']) {
  await copyFile(path.join(root, 'functions', name), path.join(root, source, name));
}
const backend = JSON.parse(await readFile(path.join(root, 'functions/package.json'), 'utf8'));
await writeFile(path.join(root, source, 'package.json'), JSON.stringify({
  name: 'gos-launch-brand-bridge', private: true, type: 'module', main: 'phoenix.js',
  engines: backend.engines,
  dependencies: { 'firebase-admin': backend.dependencies['firebase-admin'], 'firebase-functions': backend.dependencies['firebase-functions'] },
}, null, 2));
const config = JSON.parse(await readFile(path.join(root, 'firebase.json'), 'utf8'));
config.functions = [{ source, codebase: 'user-dashboard', ignore: ['node_modules', '*.test.js'] }];
const require = createRequire(import.meta.url);
let cli;
try { cli = require.resolve('firebase-tools/lib/bin/firebase.js'); }
catch {
  if (!process.env.APPDATA) throw new Error('Install firebase-tools before deploying.');
  cli = path.join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib/bin/firebase.js');
}
try {
  await writeFile(temporaryConfig, JSON.stringify(config, null, 2));
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, 'deploy', '--config', path.basename(temporaryConfig), '--project', 'gos-app-3c7fb', '--only', functionsOnly ? 'functions:user-dashboard:phoenixPlatform' : 'functions:user-dashboard:phoenixPlatform,hosting', '--non-interactive', ...(process.argv.includes('--debug') ? ['--debug'] : [])], {
      cwd: root, stdio: 'inherit', env: { ...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: '120' },
    });
    child.once('error', reject); child.once('exit', resolve);
  });
  if (code !== 0) process.exitCode = typeof code === 'number' ? code : 1;
} finally { await rm(temporaryConfig, { force: true }); }
