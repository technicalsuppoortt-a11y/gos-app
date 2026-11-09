import { previewPhoenixBrand, type PhoenixConfiguration } from '../backend/phoenixBrand';

// Launch Brand (gos-app /launch-brand, moved from Joe Academy) shows the real
// gos dashboard and website live in a frame, in Demo Account mode, and sends
// the brand the user is designing. It is applied here as a preview only;
// nothing is saved. Any change to gos pages therefore shows up in Launch Brand.
const PARAM = 'launch-brand-preview';
let active = false;
let workspaceBack = false;

export function isLaunchBrandPreview() {
  return active;
}

export function canReturnToLaunchBrandWorkspace() {
  return workspaceBack;
}

export function returnToLaunchBrandWorkspace() {
  if (workspaceBack) window.parent.postMessage({ type: 'launch-brand:back' }, window.location.origin);
}

export function installLaunchBrandPreview() {
  const params = new URLSearchParams(window.location.search);
  if (window.parent === window || params.get(PARAM) !== '1') return;
  let parentPath = '';
  try { parentPath = window.parent.location.pathname; } catch { return; } // Another site: never.
  if (!/^\/launch-brand(?:\/|$)/.test(parentPath)) return;
  active = true;
  workspaceBack = params.get('launch-brand-back') === '1';
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    if (event.data?.type !== 'launch-brand:brand' || !event.data.configuration?.brand) return;
    previewPhoenixBrand(event.data.configuration as PhoenixConfiguration);
  });
  window.parent.postMessage({ type: 'launch-brand:ready' }, window.location.origin);
}
