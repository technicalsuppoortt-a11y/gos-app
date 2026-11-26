import type { BillingSubscription } from '../../backend/billing';

const DAY_MS = 86_400_000;

export interface AdminTrialCountdownInfo {
  daysLeft: number;
  totalDays: number | null;
  startsAt: Date | null;
  endsAt: Date;
  endingSoon: boolean;
}

export type TrialSubscriptionInput = Partial<BillingSubscription> & {
  kind?: string;
  durationDays?: number | null;
};

/**
 * Computes remaining free/service days anchored strictly to the post-deployment
 * Admin activation window (`serviceStartedAt` / `trialStartedAt` / `currentPeriodStart` -> `currentPeriodEnd`).
 */
export function computeAdminTrialRemainingDays(
  sub: TrialSubscriptionInput | null | undefined,
  nowMs = Date.now(),
): AdminTrialCountdownInfo | null {
  if (!sub) return null;
  if (sub.status === 'cancelled' || sub.status === 'expired') return null;

  const isTrialPeriod =
    sub.status === 'trialing' ||
    sub.plan?.kind === 'trial' ||
    sub.kind === 'trial' ||
    sub.specialCaseFlow === 'phoenix_service_period';
  if (!isTrialPeriod) return null;

  const endRaw = sub.currentPeriodEnd || sub.expiresAt || null;
  if (!endRaw) return null;
  const endMs = Date.parse(endRaw);
  if (!Number.isFinite(endMs) || endMs <= nowMs) return null;

  const startRaw = sub.serviceStartedAt || sub.trialStartedAt || sub.currentPeriodStart || sub.startedAt || null;
  const startMs = startRaw ? Date.parse(startRaw) : NaN;
  const effectiveNow = Number.isFinite(startMs) ? Math.max(nowMs, startMs) : nowMs;
  const rawDaysLeft = Math.max(1, Math.ceil((endMs - effectiveNow) / DAY_MS));

  const configuredDays = sub.phoenixServiceDays ?? sub.plan?.durationDays ?? sub.durationDays ?? null;
  const validTotalDays =
    typeof configuredDays === 'number' && Number.isInteger(configuredDays) && configuredDays >= 1
      ? configuredDays
      : Number.isFinite(startMs) && endMs > startMs
        ? Math.max(1, Math.round((endMs - startMs) / DAY_MS))
        : null;

  const daysLeft = validTotalDays !== null ? Math.min(validTotalDays, rawDaysLeft) : rawDaysLeft;

  return {
    daysLeft,
    totalDays: validTotalDays,
    startsAt: Number.isFinite(startMs) ? new Date(startMs) : null,
    endsAt: new Date(endMs),
    endingSoon: daysLeft <= 7,
  };
}

export function resolveTrialLocaleTag(language: string): 'ar' | 'nl' | 'de' | 'en' {
  const normalized = (language || 'en').toLowerCase();
  if (normalized.startsWith('ar')) return 'ar';
  if (normalized.startsWith('nl')) return 'nl';
  if (normalized.startsWith('de')) return 'de';
  return 'en';
}

export function formatAdminTrialDate(date: Date, language: string): string {
  const localeTag = resolveTrialLocaleTag(language);
  const intlLocale =
    localeTag === 'ar'
      ? 'ar-EG-u-nu-latn'
      : localeTag === 'nl'
        ? 'nl-NL'
        : localeTag === 'de'
          ? 'de-DE'
          : 'en-US';
  try {
    return new Intl.DateTimeFormat(intlLocale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
