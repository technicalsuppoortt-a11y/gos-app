// Local preview without Joe Academy sign-in: starts the Firebase Auth emulator
// and the Launch Brand dev server, then open
//   http://127.0.0.1:5175/launch-brand/?devpreview=1
// (needs VITE_USE_EMULATORS=true in .env.development, which is already set).
import { spawn } from 'node:child_process';
const run = (command, args, cwd) => spawn(command, args, { cwd, stdio: 'inherit', shell: true, env: { ...process.env, VITE_USE_EMULATORS: 'true', LB_HMR_PORT: '5175' } });
const children = [
  run('firebase', ['emulators:start', '--only', 'auth', '--project', 'gos-app-3c7fb'], '..'),
  run('npx', ['vite', '--host', '127.0.0.1'], '.'),
];
console.log('Launch Brand preview: http://127.0.0.1:5175/launch-brand/?view=branding&devpreview=1');
const stop = () => children.forEach(child => child.kill());
process.on('SIGINT', stop); process.on('exit', stop);
