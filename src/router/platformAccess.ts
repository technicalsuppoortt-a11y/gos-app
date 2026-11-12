import type { PlatformTeamRole, Role } from '../types/auth';

export const platformTeamRoles: PlatformTeamRole[] = ['SUPER_ADMIN', 'PLATFORM_SUPPORT', 'PLATFORM_FINANCE'];

export type PlatformTabKey =
  | 'overview'
  | 'all_admins'
  | 'plans_billing'
  | 'templates'
  | 'usage_revenue'
  | 'team_management'
  | 'system_settings'
  | 'integrations'
  | 'payments'
  | 'logs_monitoring'
  | 'support';

export interface PlatformTabDefinition {
  key: PlatformTabKey;
  label: string;
  ar: string;
  pages: readonly string[];
  defaultPath: string;
}

export const PLATFORM_SIDEBAR_TABS: readonly PlatformTabDefinition[] = [
  { key: 'overview', label: 'Overview', ar: 'نظرة عامة', pages: [''], defaultPath: '/super-admin' },
  { key: 'all_admins', label: 'All Admins', ar: 'جميع المسؤولين', pages: ['clients'], defaultPath: '/super-admin/clients' },
  { key: 'plans_billing', label: 'Plans & Billing', ar: 'الباقات والفوترة', pages: ['plans', 'subscriptions'], defaultPath: '/super-admin/plans' },
  { key: 'templates', label: 'Templates', ar: 'القوالب', pages: ['dashboard-management', 'templates'], defaultPath: '/super-admin/dashboard-management' },
  { key: 'usage_revenue', label: 'Usage & Revenue', ar: 'الاستخدام والإيرادات', pages: ['analytics'], defaultPath: '/super-admin/analytics' },
  { key: 'team_management', label: 'Team Management', ar: 'إدارة الفريق', pages: ['users'], defaultPath: '/super-admin/users' },
  { key: 'system_settings', label: 'System Settings', ar: 'إعدادات النظام', pages: ['settings'], defaultPath: '/super-admin/settings' },
  {
    key: 'integrations',
    label: 'Integrations / Payment Methods / Meta App',
    ar: 'التكاملات وطرق الدفع وتطبيق Meta',
    pages: ['integrations', 'payment-methods', 'meta-app', 'marketing-tracking'],
    defaultPath: '/super-admin/integrations',
  },
  { key: 'payments', label: 'Payments', ar: 'المدفوعات', pages: ['payments', 'payment-methods'], defaultPath: '/super-admin/payments' },
  { key: 'logs_monitoring', label: 'Logs & Monitoring', ar: 'السجلات والمراقبة', pages: ['logs'], defaultPath: '/super-admin/logs' },
  { key: 'support', label: 'Support', ar: 'الدعم الفني', pages: ['support'], defaultPath: '/super-admin/support' },
] as const;

export const ALL_PLATFORM_TAB_KEYS: PlatformTabKey[] = PLATFORM_SIDEBAR_TABS.map(tab => tab.key);

const roleDefaultTabKeys: Record<PlatformTeamRole, readonly PlatformTabKey[]> = {
  SUPER_ADMIN: ALL_PLATFORM_TAB_KEYS,
  PLATFORM_SUPPORT: ['support', 'logs_monitoring'],
  PLATFORM_FINANCE: ['usage_revenue', 'payments'],
};

export function defaultTabsForRole(role: PlatformTeamRole): PlatformTabKey[] {
  return [...(roleDefaultTabKeys[role] ?? roleDefaultTabKeys.PLATFORM_SUPPORT)];
}

export function isValidPlatformTabKey(value: unknown): value is PlatformTabKey {
  return typeof value === 'string' && ALL_PLATFORM_TAB_KEYS.includes(value as PlatformTabKey);
}

export function resolveAllowedTabKeys(
  role: Role | null,
  allowedTabs?: readonly string[] | null
): PlatformTabKey[] {
  if (!isPlatformTeamRole(role)) return [];
  const validCustom = Array.isArray(allowedTabs)
    ? allowedTabs.filter(isValidPlatformTabKey)
    : [];
  if (validCustom.length > 0) return validCustom;
  return defaultTabsForRole(role);
}

export function isPlatformTeamRole(role: unknown): role is PlatformTeamRole {
  return platformTeamRoles.some(value => value === role);
}

export function canOpenPlatformPage(
  role: Role | null,
  path: string,
  allowedTabs?: readonly string[] | null
) {
  if (!isPlatformTeamRole(role)) return false;
  const [, base, page = '', nested, leaf, extra] = path.replace(/\/+$/, '').split('/');
  const templateEditor = page === 'dashboard-management' && !extra
    && ((nested === 'new' && !leaf) || (Boolean(nested) && leaf === 'edit'));
  const validSubRoute = !nested || templateEditor || (page === 'clients' && Boolean(nested) && leaf === 'sub-users' && !extra);
  if (base !== 'super-admin' || !validSubRoute) return false;

  const activeTabKeys = resolveAllowedTabKeys(role, allowedTabs);
  const allowedPages = new Set(
    PLATFORM_SIDEBAR_TABS.filter(tab => activeTabKeys.includes(tab.key)).flatMap(tab => tab.pages)
  );
  return allowedPages.has(page);
}

export function platformHome(
  role: PlatformTeamRole,
  allowedTabs?: readonly string[] | null
) {
  const activeTabKeys = resolveAllowedTabKeys(role, allowedTabs);
  const firstTab = PLATFORM_SIDEBAR_TABS.find(tab => activeTabKeys.includes(tab.key));
  return firstTab ? firstTab.defaultPath : '/super-admin';
}
