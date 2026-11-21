import type { ReactNode } from 'react';
export class SessionError extends Error {}
export const forceSignOut = async () => {};
export const logoutFirebase = async () => {};
export const consumeAuthNotice = () => null;
export const beginActivation = () => {};
export const endActivation = () => {};
export const sessionErrorMessage = () => 'Demo preview';
export const completeCustomerFirstLoginPasswordChange = async () => ({
  user: { id: 'demo-customer', name: 'Customer', email: 'customer@example.com', mustChangePassword: false, requiresPasswordChange: false },
  role: 'CUSTOMER' as const,
  tenant: null,
  token: '',
});
export function FirebaseSession({ children }: { children: ReactNode }) { return children; }
