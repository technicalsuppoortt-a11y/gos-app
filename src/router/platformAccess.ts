import type { PlatformTeamRole, Role } from '../types/auth';

export const platformTeamRoles: PlatformTeamRole[] = ['SUPER_ADMIN', 'PLATFORM_SUPPORT', 'PLATFORM_FINANCE'];

const platformPages: Record<PlatformTeamRole, readonly string[]> = {
  SUPER_ADMIN: ['', 'clients', 'templates', 'dashboard-management', 'plans', 'analytics', 'wallet', 'users', 'settings', 'integrations', 'payment-methods', 'payments', 'logs', 'support', 'marketing-tracking'],
  PLATFORM_SUPPORT: ['support', 'logs'],
  PLATFORM_FINANCE: ['analytics', 'wallet', 'payments'],
};

export function isPlatformTeamRole(role: unknown): role is PlatformTeamRole {
  return platformTeamRoles.some(value => value === role);
}

export function canOpenPlatformPage(role: Role | null, path: string) {
  const [, base, page = '', nested] = path.replace(/\/+$/, '').split('/');
  return base === 'super-admin' && !nested && isPlatformTeamRole(role) && platformPages[role].includes(page);
}

export function platformHome(role: PlatformTeamRole) {
  const page = platformPages[role][0];
  return page ? `/super-admin/${page}` : '/super-admin';
}
