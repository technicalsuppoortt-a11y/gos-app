import { previewPhoenixBrand, type PhoenixConfiguration } from '../backend/phoenixBrand';

// Launch Brand (gos-app /launch-brand, moved from Joe Academy) shows the real
// gos dashboard and website live in a frame, in Demo Account mode, and sends
// the brand the user is designing. It is applied here as a preview only;
// nothing is saved. Any change to gos pages therefore shows up in Launch Brand.
const PARAM = 'launch-brand-preview';
let active = false;

export function isLaunchBrandPreview() {
  return active;
}

export function installLaunchBrandPreview() {
  if (window.parent === window || !new URLSearchParams(window.location.search).has(PARAM)) return;
  let parentPath = '';
  try { parentPath = window.parent.location.pathname; } catch { return; } // Another site: never.
  if (!parentPath.startsWith('/launch-brand')) return;
  active = true;
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    if (event.data?.type !== 'launch-brand:brand' || !event.data.configuration?.brand) return;
    previewPhoenixBrand(event.data.configuration as PhoenixConfiguration);
  });
  window.parent.postMessage({ type: 'launch-brand:ready' }, window.location.origin);
}
