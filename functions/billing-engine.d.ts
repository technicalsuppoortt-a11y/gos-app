export type BillingType = 'monthly' | 'annual' | 'fixed' | 'lifetime';
export type PlanKind = 'plan' | 'trial' | 'addon';
export type AddonType = 'credits' | 'seats' | 'tool';
export type Currency = 'USD' | 'EGP' | 'SAR' | 'AED' | 'EUR';
export type SubscriptionStatus = 'active' | 'trialing' | 'expired' | 'cancelled';
export type LocalizedText = { en: string; ar: string };

export interface BillingPlan {
  id: string;
  ownerId: string;
  audience: 'admin' | 'user';
  kind: PlanKind;
  name: LocalizedText;
  description: LocalizedText;
  badge: LocalizedText;
  cta: LocalizedText;
  features: { en: string[]; ar: string[] };
  price: number;
  currency: Currency;
  billingType: BillingType | 'once';
  durationDays: number | null;
  credits: number;
  tools: string[];
  channels?: string[];
  limits: { clients?: number; seats?: number };
  addonType: AddonType | null;
  addonSeats: number | null;
  addonTool: string | null;
  visible: boolean;
  enabled: boolean;
  sortOrder: number;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface PlanSnapshot {
  id: string; kind: PlanKind; name: LocalizedText; billingType: BillingPlan['billingType']; durationDays: number | null;
  price: number; currency: Currency; credits: number; tools: string[]; limits: BillingPlan['limits'];
  channels?: string[];
}

export interface BillingSubscription {
  id: string;
  subscriberId: string;
  subscriberRole: 'ADMIN' | 'USER';
  subscriberName: string;
  subscriberEmail: string;
  providerId: string;
  planId: string;
  plan: PlanSnapshot;
  status: SubscriptionStatus;
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  creditCycleStart: string;
  creditCycleEnd: string | null;
  trialUsedAt: string | null;
  extraSeats: number;
  extraTools: string[];
  renewals: number;
  creditBlocked: boolean;
  updatedAt: string;
}

export interface BillingWallet { id: string; ownerId: string; role: 'ADMIN' | 'USER'; providerId: string; balance: number; updatedAt: string }

export interface LedgerEntry {
  id: string; walletId: string; providerId: string;
  type: 'grant' | 'topup' | 'transfer_out' | 'expire' | 'adjustment' | 'usage';
  amount: number; balanceAfter: number; description: string; actorId: string; createdAt: string;
  counterpartyId?: string; refType?: string; refId?: string;
}

export interface BillingRequest {
  id: string; requesterId: string; requesterRole: 'ADMIN' | 'USER'; requesterName: string; requesterEmail: string;
  providerId: string; type: 'plan' | 'renewal' | 'addon'; planId: string; quantity: number;
  plan: { name: LocalizedText; kind: PlanKind; price: number; currency: Currency; credits: number; billingType: BillingPlan['billingType']; addonType: AddonType | null };
  total: number; note: string; status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string; decidedAt?: string; decidedBy?: string; reason?: string;
}

export interface BillingActor { uid: string; role: string; name?: string; email?: string; supportParentId?: string }
export interface BillingStore {
  get(path: string): Promise<any>;
  query(collection: string, field: string, value: unknown): Promise<any[]>;
  id(): string;
  commit(writes: [string, any][]): void | Promise<void>;
}

export const PLATFORM: 'platform';
export const CHANNEL_IDS: readonly ['ai', 'whatsapp', 'messenger', 'instagram', 'email', 'sms'];
export const BILLING_TYPES: BillingType[];
export const PLAN_KINDS: PlanKind[];
export const ADDON_TYPES: AddonType[];
export const CURRENCIES: Currency[];
export const TOOL_IDS: string[];
export const DEFAULT_TRIAL: { admin: { days: number; credits: number }; user: { days: number; credits: number } };
export class BillingError extends Error { code: string; constructor(code: string, message: string) }
export function addDays(start: string, days: number): string;
export function addMonths(start: string, months: number): string;
export function periodEndFor(plan: Pick<BillingPlan, 'kind' | 'billingType' | 'durationDays'>, start: string): string | null;
export function effectiveStatus(sub: BillingSubscription | null | undefined, now?: string): SubscriptionStatus | 'none';
export function isLive(sub: BillingSubscription | null | undefined, now?: string): boolean;
export function entitledTools(sub: BillingSubscription | null | undefined, now?: string): string[];
export function planSnapshot(plan: BillingPlan): PlanSnapshot;
export function normalizePlan(input: unknown, options: { ownerId: string; allowedTools?: string[] | null; existing?: BillingPlan | null; id: string; now: string }): BillingPlan;
export function executeBilling(operation: string, data: Record<string, unknown>, actor: BillingActor, store: BillingStore, now?: string): Promise<any>;
