import { hasStandardAccess, isRestrictedAccount } from '../userExperience';
import type { AccountAccessSummary, ResourceKey } from '../../types/billing';
import { isStaffRole } from '../permissions';
import {
  R_DASHBOARD,
  R_ACADEMY,
  R_MESSAGES,
  R_ASSETS_LIBRARY,
  R_CALENDAR,
  R_PROGRESS,
  R_CONTENT_GENERATOR,
  R_MARKETING_HUB,
  R_COMMUNITY,
  R_MY_BOOKINGS,
  R_COACH_CHAT,
  R_LAUNCH_BRAND,
  ALL_RESOURCES,
} from './resources';

export type RouteAccess = ResourceKey | ResourceKey[] | null;

export const ROUTE_ACCESS: Record<string, RouteAccess> = {
  '/dashboard': R_DASHBOARD,
  '/academy': R_ACADEMY,
  '/assets': R_ASSETS_LIBRARY,
  '/messages': R_MESSAGES,
  '/monitor': R_MESSAGES,
  '/monitor/support': R_MESSAGES,
  '/monitor/appointments': R_CALENDAR,
  '/coach': R_MESSAGES,
  '/ai-coach': R_COACH_CHAT,
  '/content-generator': R_CONTENT_GENERATOR,
  '/marketing': R_MARKETING_HUB,
  '/community': R_COMMUNITY,
  '/my-bookings': R_MY_BOOKINGS,
  '/progress': R_PROGRESS,
  '/calendar': R_CALENDAR,
  '/launch-brand': R_LAUNCH_BRAND,
  '/launch-your-brand': R_LAUNCH_BRAND, // Added just in case
};

export function normalizeResourceKey(input: string): string {
  if (!input) return '';
  const val = input.toLowerCase().trim();
  
  // Clean paths like '/academy' -> 'academy'
  const cleanVal = val.startsWith('/') ? val.substring(1) : val;

  // Check ROUTE_ACCESS mapping (e.g. '/dashboard' -> 'dashboard.view')
  const fromRoute = ROUTE_ACCESS[val] || ROUTE_ACCESS['/' + cleanVal];
  if (fromRoute && typeof fromRoute === 'string') {
    return fromRoute;
  }
  if (Array.isArray(fromRoute) && fromRoute.length > 0) {
    return fromRoute[0];
  }

  // Check ALL_RESOURCES for label matches
  for (const res of ALL_RESOURCES) {
    if (
      res.key.toLowerCase() === val || 
      res.key.toLowerCase() === cleanVal ||
      res.labelAr.toLowerCase() === val ||
      res.labelEn.toLowerCase() === val
    ) {
      return res.key;
    }
  }

  return val; // Fallback to original
}


export function hasPlanAccess(_access: AccountAccessSummary | null, userProfile: any | null, requirement: RouteAccess, isAdmin = false): boolean {
  if (isRestrictedAccount(userProfile)) return false;
  return isAdmin || requirement === null || hasStandardAccess(userProfile);
}

export function getDefaultRoute(userProfile: any, role: string): string {
  if (isStaffRole(role)) return '/admin';
  // Legacy tier redirect: if (userProfile?.userTier === 'low_ticket') return '/academy';
  void userProfile;
  return '/dashboard';
}

// Legacy subscription/trial entitlement resolution retained for re-enablement.
// export function hasPlanAccess(access: AccountAccessSummary | null, userProfile: any | null, requirement: RouteAccess, isAdmin = false): boolean {
//   if (userProfile && ['blocked', 'suspended'].includes(userProfile.accountStatus || userProfile.status)) return false;
//   if (isAdmin || requirement === null || hasStandardAccess(userProfile)) return true;
//
//   // Evaluate Trial & User Profile Allowed Tools
//   const isTrialActive = userProfile?.trialEndDate ? new Date(userProfile.trialEndDate.toDate ? userProfile.trialEndDate.toDate() : userProfile.trialEndDate).getTime() > Date.now() : false;
//   const isPlanActive = userProfile?.accountStatus === 'active' || userProfile?.status === 'active';
//
//   if (userProfile?.allowedTools && Array.isArray(userProfile.allowedTools)) {
//     if (isTrialActive || isPlanActive) {
//       // Use EXACT match against stored keys - do NOT normalize stored values.
//       // The stored allowedTools must contain canonical keys (e.g. 'dashboard.view').
//       // We only normalize the requirement for comparison.
//       const storedTools = new Set<string>(userProfile.allowedTools);
//
//       const requirementKeys = Array.isArray(requirement) ? requirement as string[] : [requirement as string];
//
//       const isAllowedViaProfile = requirementKeys.some(reqKey => {
//         // Exact match first
//         if (storedTools.has(reqKey)) return true;
//         // Normalize the requirement and check again (handles '/dashboard' -> 'dashboard.view')
//         const normalizedReq = normalizeResourceKey(reqKey);
//         if (storedTools.has(normalizedReq)) return true;
//         return false;
//       });
//
//       if (isAllowedViaProfile) {
//         return true;
//       } else {
//         return false; // userProfile.allowedTools is the definitive source of truth
//       }
//     }
//   }
//
//   // Fallback to legacy accountAccess subscription logic
//   if (!access || !['active', 'trialing'].includes(access.subscriptionStatus ?? '')) return false;
//   if (access.validUntil && new Date(access.validUntil).getTime() <= Date.now()) return false;
//
//   const granted = new Set(access.entitlements ?? []);
//   return Array.isArray(requirement) ? requirement.some(key => granted.has(key)) : granted.has(requirement);
// }
//
