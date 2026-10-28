import { retryImport, installChunkRecovery } from './router/chunkRecovery';
import { isDemoSessionActive } from './demo/mode';

installChunkRecovery();

// Demo Account runs inside this same SPA and router. Choose the module graph
// before importing the app: the demo graph swaps every backend transport for
// local adapters, so live Firebase/session modules never load in demo mode and
// the demo can never touch a real session.
const bootstrap = isDemoSessionActive()
  ? () => import('./demo/bootstrap')
  : () => import('./liveApp');
void retryImport(bootstrap).catch(error => {
  console.error('Application startup failed:', error);
  // A failed entry chunk must not leave the static splash visible forever.
  const root = document.getElementById('root');
  if (!root) return;
  const panel = document.createElement('section');
  panel.className = 'route-error-panel'; panel.setAttribute('role', 'alert');
  const title = document.createElement('h1'); title.textContent = 'This page could not load';
  const message = document.createElement('p'); message.textContent = 'Reload to get the latest version.';
  const button = document.createElement('button'); button.textContent = 'Reload page';
  button.onclick = () => window.location.reload();
  panel.append(title, message, button); root.replaceChildren(panel);
});
