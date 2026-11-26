// The student's service period, from the signed claims of the Launch Brand
// session token. Before deployment ('Start Deployment'), serviceExpiresAt stays
// null so configuring/previewing in Launch Brand never starts the countdown.

const DAY = 86_400_000;
const MAX_SERVICE_DAYS = 3650;

export type PhoenixPackageTier = 'low_ticket' | 'gold' | 'diamond' | 'vip';

export type ServiceEntitlement = {
  ticketType: 'low_ticket' | 'high_ticket';
  packageTier?: PhoenixPackageTier | null;
  serviceDays: number | null;
  serviceExpiresAt: number | null;
};

export type ServicePeriod = {
  totalDays: number | null;
  daysRemaining: number;
  expiresAt: Date;
  /** Share of the period still left, 0 to 1, or null when the length is unknown. */
  remainingShare: number | null;
  state: 'active' | 'ending-soon' | 'expired';
};

export function serviceEntitlementFromClaims(claims: Record<string, unknown>): ServiceEntitlement | null {
  const ticketType = claims.phoenixTicket;
  if (ticketType !== 'low_ticket' && ticketType !== 'high_ticket') return null;
  const rawPkg = typeof claims.phoenixPackage === 'string' ? claims.phoenixPackage.toLowerCase() : null;
  const packageTier: PhoenixPackageTier | null = ticketType === 'low_ticket'
    ? 'low_ticket'
    : (rawPkg === 'gold' || rawPkg === 'diamond' || rawPkg === 'vip' ? rawPkg : null);
  const days = claims.phoenixServiceDays;
  const expires = claims.phoenixServiceExpiresAt;
  return {
    ticketType,
    packageTier,
    serviceDays: typeof days === 'number' && Number.isInteger(days) && days > 0 && days <= MAX_SERVICE_DAYS ? days : null,
    serviceExpiresAt: typeof expires === 'number' && Number.isFinite(expires) && expires > 0 ? expires : null,
  };
}

export function servicePeriod(entitlement: ServiceEntitlement | null | undefined, now = Date.now()): ServicePeriod | null {
  if (!entitlement?.serviceExpiresAt) return null;
  const left = entitlement.serviceExpiresAt - now;
  const daysRemaining = Math.max(0, Math.ceil(left / DAY));
  const totalDays = entitlement.serviceDays;
  const remainingShare = totalDays ? Math.min(1, Math.max(0, left / (totalDays * DAY))) : null;
  const endingSoon = daysRemaining <= 3 || (remainingShare !== null && remainingShare <= 0.2);
  return {
    totalDays,
    daysRemaining,
    expiresAt: new Date(entitlement.serviceExpiresAt),
    remainingShare,
    state: left <= 0 ? 'expired' : endingSoon ? 'ending-soon' : 'active',
  };
}
