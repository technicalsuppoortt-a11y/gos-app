import type { AuthState } from '../types/auth';

export function canViewCashWallet({ auth }: { auth: AuthState }): boolean {
  return auth.role === 'USER' && !auth.impersonation && !auth.user?.cashWalletRestricted;
}

export function canViewTopbarWallet({ auth }: { auth: AuthState }): boolean {
  if (!auth.isAuthenticated) return false;
  if (auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN') return true;
  if (auth.role === 'USER') {
    if (auth.user?.cashWalletRestricted) return false;
    if (auth.impersonation && auth.user?.accountType !== 'agency') return false;
    return true;
  }
  return false;
}
