/** One product experience for every signed-in account. Admin roles remain separate. */
export const STANDARD_USER_TIER = 'high_ticket' as const;

export function standardizeUserProfile<T extends Record<string, any>>(profile: T) {
  return { ...profile, userTier: STANDARD_USER_TIER, tier: STANDARD_USER_TIER };
}

export function hasStandardAccess(profile: Record<string, any> | null): boolean {
  if (!profile) return false;
  if (isRestrictedAccount(profile)) return false;
  return profile.userTier === STANDARD_USER_TIER;
}

export function isRestrictedAccount(profile: Record<string, any> | null): boolean {
  return [profile?.accountStatus, profile?.status].some(status => ['blocked', 'suspended', 'pending'].includes(status));
}
