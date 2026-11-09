import { retryImport, installChunkRecovery } from './router/chunkRecovery';
import { isDemoSessionActive } from './demo/mode';

installChunkRecovery();

function retainPlatformPreloader() {
  const root = document.getElementById('root');
  const splash = document.getElementById('app-preloader');
  if (!root || !splash || location.pathname !== '/auth/phoenix' ||
      !new URLSearchParams(location.hash.slice(1)).get('token')) return;

  document.body.append(splash);
  splash.setAttribute('role', 'status');
  root.inert = true;
  root.setAttribute('aria-hidden', 'true');
  const dismiss = () => {
    observer.disconnect();
    clearTimeout(timeout);
    root.inert = false;
    root.removeAttribute('aria-hidden');
    splash.remove();
  };
  const observer = new MutationObserver(() => {
    const handoffRoute = location.pathname === '/auth/phoenix' || location.pathname === '/dashboard';
    if (!handoffRoute || root.querySelector('.gos-home-dashboard, [data-platform-entry-error], .route-error-panel')) dismiss();
  });
  observer.observe(root, { childList: true, subtree: true });
  const timeout = window.setTimeout(() => {
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Open dashboard';
    retry.className = 'mt-5 rounded-lg border px-4 py-2';
    retry.onclick = () => window.location.assign('/dashboard');
    splash.append(retry);
  }, 120000);
  return dismiss;
}

const dismissPlatformPreloader = retainPlatformPreloader();

// Demo Account runs inside this same SPA and router. Choose the module graph
// before importing the app: the demo graph swaps every backend transport for
// local adapters, so live Firebase/session modules never load in demo mode and
// the demo can never touch a real session.
const bootstrap = isDemoSessionActive()
  ? () => import('./demo/bootstrap')
  : () => import('./liveApp');
void retryImport(bootstrap).catch(error => {
  dismissPlatformPreloader?.();
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
