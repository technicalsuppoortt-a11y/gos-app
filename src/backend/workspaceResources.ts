/** List views do not need builder documents, media, messages or commerce history.
 * Detail panels retain all cross-module dependencies. Membership is authoritative.
 */
export function workspaceResources(pathname: string, allowed: readonly string[]): string[] {
  if (isAnalyticsRoute(pathname)) {
    return allowed.filter(resource => resource === 'workspaceState' || resource === 'members');
  }
  // 1. Dashboard home & general overview routes
  if (/^\/(?:dashboard\/?|\?.*)?$/.test(pathname) || pathname === '/') {
    const needed = new Set([
      'workspaceState',
      'members',
      'assets',
      'leads',
      'bookings',
      'calendars',
      'products',
      'conversations',
      'events',
      'transactions',
    ]);
    return allowed.filter(resource => needed.has(resource));
  }

  // 2. CRM & Contacts routes
  if (/^\/(?:dashboard\/)?(crm|contacts)(?:\/(?:pipeline|contacts|activities|tasks|overview|templates))?\/?$/.test(pathname)) {
    const needed = new Set(['workspaceState', 'members', 'leads', 'pipelines', 'contacts', 'userTemplates', 'products', 'orders', 'transactions', 'calendars', 'bookings']);
    return allowed.filter(resource => needed.has(resource));
  }

  // 3. Booking & Calendar routes
  if (/^\/(?:dashboard\/)?booking(?:\/.*)?$/.test(pathname)) {
    const needed = new Set(['workspaceState', 'members', 'calendars', 'bookings', 'contacts', 'leads']);
    return allowed.filter(resource => needed.has(resource));
  }

  return [...allowed];
}

export function isAnalyticsRoute(pathname: string) {
  return /^\/(?:dashboard\/)?analytics\/?$/.test(pathname);
}

