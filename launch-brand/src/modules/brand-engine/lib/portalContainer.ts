/** Keep floating UI inside the unscaled workspace's CSS/theme boundary.
 * The header also contains a .brand-engine-module portal, so selecting the
 * first module would attach dialogs to the compact toolbar instead.
 */
export function brandEnginePortalContainer(): HTMLElement | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.querySelector<HTMLElement>('.launch-brand-content > .brand-engine-module')
    ?? document.querySelector<HTMLElement>('.brand-engine-module:not(.launch-brand-toolbar)')
    ?? undefined;
}
