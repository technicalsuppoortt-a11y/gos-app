export interface WorkspacePreferences {
  name: string; email: string; currency: string; timezone: string;
  stripe: boolean; paypal: boolean; applePay: boolean; googlePay: boolean;
  taxRate: number; inclusiveTax: boolean; receipts: boolean; receiptPrefix: string;
  guestCheckout: boolean; collectName: boolean; requirePhone: boolean; redirectUrl: string;
}
export const defaultWorkspacePreferences: WorkspacePreferences = {
  name: 'GOS Store', email: 'billing@example.com', currency: 'EUR', timezone: 'Africa/Cairo',
  stripe: true, paypal: true, applePay: true, googlePay: true,
  taxRate: 0, inclusiveTax: false, receipts: true, receiptPrefix: 'GOS',
  guestCheckout: true, collectName: true, requirePhone: false, redirectUrl: '',
};
export function readWorkspacePreferences(key: string): WorkspacePreferences {
  try { return { ...defaultWorkspacePreferences, ...JSON.parse(localStorage.getItem(`${key}:settings`) ?? '{}') }; }
  catch { return { ...defaultWorkspacePreferences }; }
}
export function saveWorkspacePreferences(key: string, preferences: WorkspacePreferences) {
  if (!preferences.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(preferences.email)) throw new Error('Enter a store name and valid billing email.');
  if (!Number.isFinite(preferences.taxRate) || preferences.taxRate < 0 || preferences.taxRate > 100) throw new Error('Tax rate must be between 0 and 100.');
  if (preferences.redirectUrl) { try { if (!['https:', 'http:'].includes(new URL(preferences.redirectUrl).protocol)) throw new Error(); } catch { throw new Error('Enter an HTTP or HTTPS redirect URL.'); } }
  try { localStorage.setItem(`${key}:settings`, JSON.stringify(preferences)); }
  catch { throw new Error('Settings could not be saved. Browser storage is unavailable.'); }
}
