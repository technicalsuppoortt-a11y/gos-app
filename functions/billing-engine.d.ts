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
  addons?: AddonItem[];
  updatedAt: string;
}

export interface AddonItem {
  id: string;
  type: 'fixed' | 'unit';
  qty: number;
  credits: number;
  price: number;
  name?: string | LocalizedText;
  addonType?: AddonType;
  addonTool?: string;
}

export interface ProviderBillingSettings {
  providerId: string;
  addonMode: 'fixed' | 'dynamic' | 'both';
  unitRate: {
    creditsPerUnit: number;
    pricePerUnit: number;
    currency: Currency;
    minUnits: number;
    maxUnits: number;
  };
  updatedAt?: string;
}

export interface BillingWallet { id: string; ownerId: string; role: 'ADMIN' | 'USER'; providerId: string; balance: number; updatedAt: string; lifetimeAllocated?: number; lifetimeSpent?: number; }

export interface LedgerEntry {
  id: string; walletId: string; providerId: string;
  type: 'grant' | 'topup' | 'transfer_out' | 'expire' | 'adjustment' | 'usage';
  amount: number; balanceAfter: number; description: string; actorId: string; createdAt: string;
  counterpartyId?: string; refType?: string; refId?: string;
}

/** Pay-as-you-go wallet for external carrier costs. Independent from plan credits (`BillingWallet`). */
export interface CommunicationWallet {
  id: string; ownerId: string; role: 'ADMIN' | 'USER'; providerId: string; currency: Currency;
  balance: number; held: number; lifetimeTopup: number; lifetimeSpent: number;
  lowBalanceThreshold: number; lowBalance: boolean;
  autoRecharge: { enabled: boolean; below: string; amount: string; method: string };
  createdAt: string; updatedAt: string;
}

/** Wallet history row as returned by the `walletLedger` operation (provider cost/margin only for administrators). */
export interface WalletLedgerRow {
  id: string; created_at: string; usage_type: string; channel: string | null; description: string;
  status: 'pending' | 'confirmed' | 'failed' | 'reversed'; amount: number; balance_after: number | null;
  currency: Currency; quantity: number; customer_charge: number; provider_cost?: number; margin?: number;
}

export type CouponType = 'percent' | 'fixed' | 'credit_bonus';
export type CouponScope = 'wallet_topup' | 'plan' | 'addon';

export interface BillingCoupon {
  id: string;
  ownerId: string;
  code: string;
  type: CouponType;
  value: number;
  currency: Currency | null;
  appliesTo: CouponScope[];
  description: string;
  minAmount: number;
  startsAt: string | null;
  expiresAt: string | null;
  maxRedemptions: number;
  perUserLimit: number;
  redemptions: number;
  active: boolean;
  status: 'active' | 'archived';
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WalletAnalyticsReport {
  scope: 'platform' | 'provider';
  summary: {
    period_days: number;
    total_customer_charge: number;
    total_provider_cost: number;
    total_margin: number;
    margin_percentage: number;
    total_topups: number;
    total_messages: number;
    total_wallet_balance: number;
    total_wallet_held: number;
    active_accounts_count: number;
    total_accounts_count: number;
  };
  by_channel: Array<{
    channel: string;
    count: number;
    customer_charge: number;
    provider_cost: number;
    margin: number;
    percentage: number;
    margin_percentage: number;
  }>;
  daily_trend: Array<{
    date: string;
    customer_charge: number;
    provider_cost: number;
    margin: number;
    count: number;
    topups: number;
  }>;
  accounts: Array<{
    id: string;
    name?: string;
    email?: string;
    role?: string;
    currency: Currency;
    balance: number;
    held: number;
    total_spend: number;
    provider_cost: number;
    margin: number;
    messages_count: number;
    last_active: string | null;
  }>;
  entries: Array<WalletLedgerRow & { subscriber_id?: string; tenant_id?: string; account_name?: string }>;
}

export interface BillingRequest {
  id: string; requesterId: string; requesterRole: 'ADMIN' | 'USER'; requesterName: string; requesterEmail: string;
  providerId: string; type: 'plan' | 'renewal' | 'addon' | 'wallet_topup'; planId: string; quantity: number; currency?: Currency;
  plan: { name: LocalizedText; kind: PlanKind; price: number; currency: Currency; credits: number; billingType: BillingPlan['billingType']; addonType: AddonType | null };
  mainPlanPrice?: number;
  addons?: AddonItem[];
  subtotal?: number;
  discount?: number;
  totalAmount?: number;
  total: number;
  creditAmount?: number;
  coupon?: { id: string; code: string; type: CouponType; value: number; discount: number; bonus: number } | null;
  note: string; status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string; decidedAt?: string; decidedBy?: string; reason?: string;
  paymentMethod?: string; paymentType?: 'manual' | 'gateway';
  receiptUrl?: string; receiptPath?: string; imageUrl?: string; fileUrl?: string;
  receiptName?: string; fileName?: string; transactionId?: string;
}

export interface BillingActor { uid: string; role: string; name?: string; email?: string; supportParentId?: string; accountType?: 'agency'; status?: string; billingOwnerId?: string; createdBy?: string }
export interface BillingStore {
  get(path: string): Promise<any>;
  query(collection: string, field: string, value: unknown): Promise<any[]>;
  list?(collection: string, options?: any): Promise<any[]>;
  id(): string;
  commit(writes: [string, any][]): void | Promise<void>;
}

export const PLATFORM: 'platform';
export const DEFAULT_BILLING_SETTINGS: ProviderBillingSettings;
export const CHANNEL_IDS: readonly ['ai', 'whatsapp', 'messenger', 'instagram', 'email', 'sms'];
export const AI_CAPABILITIES: readonly ['ai'];
export const COMMUNICATION_CHANNELS: readonly ['whatsapp', 'messenger', 'instagram', 'email', 'sms', 'webchat'];
export const WALLET_CURRENCY: 'EUR';
export const COUPON_TYPES: readonly ['percent', 'fixed', 'credit_bonus'];
export const COUPON_SCOPES: readonly ['wallet_topup', 'plan', 'addon'];
export function normalizeCouponCode(value: string): string;
export function couponDocId(ownerId: string, code: string): string;
export function normalizeCoupon(input: unknown, options: { ownerId: string; existing?: BillingCoupon | null; now: string }): BillingCoupon;
export function couponEffect(coupon: BillingCoupon, subtotal: number, currency: Currency, context?: CouponScope): { subtotal: number; discount: number; bonus: number; payable: number };
export function buildWalletAnalytics(rows: any[], wallets: any[], options?: { now?: string; days?: number }): any;
export function round4(value: number): number;
export function newCommunicationWallet(uid: string, role: 'ADMIN' | 'USER', providerId: string, now: string, currency?: Currency): CommunicationWallet;
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
