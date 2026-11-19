import { previewPhoenixBrand, type PhoenixConfiguration } from '../backend/phoenixBrand';

// Launch Brand (gos-app /launch-brand, moved from Joe Academy) shows the real
// gos dashboard and website live in a frame, in Demo Account mode, and sends
// the brand the user is designing. It is applied here as a preview only;
// nothing is saved. Any change to gos pages therefore shows up in Launch Brand.
const PARAM = 'launch-brand-preview';
let active = false;
let workspaceBack = false;
let installed = false;

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
  if (installed) return;
  const params = new URLSearchParams(window.location.search);
  if (window.parent === window || params.get(PARAM) !== '1') return;
  let parentPath = '';
  try { parentPath = window.parent.location.pathname; } catch { return; } // Another site: never.
  if (!/^\/launch-brand(?:\/|$)/.test(parentPath)) return;
  installed = true;
  active = true;
  workspaceBack = params.get('launch-brand-back') === '1';
  // Same-origin parent frame provides the current brand synchronously so the
  // very first React render already uses the chosen colors, logo, and mode.
  try {
    const initial = (window.frameElement as (Element & { __launchBrandConfig?: PhoenixConfiguration }) | null)?.__launchBrandConfig;
    if (initial?.brand) previewPhoenixBrand(initial);
  } catch { /* postMessage fallback below still applies the brand. */ }
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    if (event.data?.type !== 'launch-brand:brand' || !event.data.configuration?.brand) return;
    previewPhoenixBrand(event.data.configuration as PhoenixConfiguration);
  });
  window.parent.postMessage({ type: 'launch-brand:ready' }, window.location.origin);
}
