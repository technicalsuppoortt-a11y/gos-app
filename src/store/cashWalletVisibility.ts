import type { AuthState } from '../types/auth';

export function canViewCashWallet({ auth }: { auth: AuthState }): boolean {
  return auth.role === 'USER' && !auth.impersonation && !auth.user?.cashWalletRestricted;
}
