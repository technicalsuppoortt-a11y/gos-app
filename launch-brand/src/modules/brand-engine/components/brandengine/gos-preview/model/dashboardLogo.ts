/** Prefer the exact Studio asset. A pending saved asset must not become a fallback logo. */
export function dashboardLogo(loadedUrl: string | undefined, asset: { assetId?: string; url?: string } | undefined, fallback: string) {
  return loadedUrl || asset?.url || (asset?.assetId ? '' : fallback);
}
