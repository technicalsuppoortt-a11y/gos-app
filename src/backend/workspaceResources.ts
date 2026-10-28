/** List views do not need builder documents, media, messages or commerce history.
 * Detail panels retain all cross-module dependencies. Membership is authoritative.
 */
export function workspaceResources(pathname: string, allowed: readonly string[]): string[] {
  if (/^\/(?:dashboard\/)?crm(?:\/(?:pipeline|contacts|activities|tasks|overview|templates))?\/?$/.test(pathname)) {
    const needed = new Set(['workspaceState', 'members', 'leads', 'pipelines', 'contacts', 'userTemplates']);
    return allowed.filter(resource => needed.has(resource));
  }
  return [...allowed];
}
