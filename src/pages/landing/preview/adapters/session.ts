import type { ReactNode } from 'react';
export class SessionError extends Error {}
export const forceSignOut = async () => {};
export const logoutFirebase = async () => {};
export const consumeAuthNotice = () => null;
export const sessionErrorMessage = () => 'Demo preview';
export function FirebaseSession({ children }: { children: ReactNode }) { return children; }
