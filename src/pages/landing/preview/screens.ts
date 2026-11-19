// Mirrors the current user sidebar order (src/components/layout/UserLayout.tsx → userItems).
export const previewScreens = [
  { id: 'copilot', path: '/dashboard/copilot', page: 'copilot' },
  { id: 'dashboard', path: '/dashboard', page: 'home' },
  { id: 'funnels', path: '/dashboard/funnels', page: 'funnels' },
  { id: 'inbox', path: '/dashboard/inbox', page: 'inbox' },
  { id: 'crm', path: '/dashboard/crm', page: 'crm' },
  { id: 'contacts', path: '/dashboard/contacts', page: 'contacts' },
  { id: 'automation', path: '/dashboard/automation', page: 'automation' },
  { id: 'follow-up', path: '/dashboard/follow-up', page: 'follow-up' },
  { id: 'booking', path: '/dashboard/booking', page: 'booking' },
  { id: 'products', path: '/dashboard/products', page: 'products' },
  { id: 'analytics', path: '/dashboard/analytics', page: 'analytics' },
  { id: 'settings', path: '/dashboard/settings/profile', page: null },
] as const;
