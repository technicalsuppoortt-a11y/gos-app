// ─── Billing & Subscription System — Core Type Contracts ─────────────────────
// These interfaces define the full data model stored in Firestore.
// Never let the client compute prices or tier mismatches — always derive from
// a locked PlanVersion document.

// ── Tier / Audience ────────────────────────────────────────────────────────────
export type AudienceTier = 'high_ticket' | 'low_ticket' | 'all' | 'custom';

// ── Plan lifecycle ─────────────────────────────────────────────────────────────
export type PlanStatus = 'draft' | 'published' | 'archived';

// ── Subscription lifecycle ─────────────────────────────────────────────────────
export type SubscriptionStatus =
  | 'active'        // currently running, within validity window
  | 'past_due'      // end date passed but grace period still open
  | 'expired'       // definitively ended
  | 'cancelled'     // voluntarily cancelled by admin or user
  | 'trialing';     // free trial window (future)

// ── Billing order lifecycle ────────────────────────────────────────────────────
export type OrderStatus =
  | 'pending_review'   // receipt uploaded, waiting for admin to confirm
  | 'approved'         // admin approved → subscription created / extended
  | 'rejected'         // admin rejected (reason stored separately)
  | 'cancelled'        // user withdrew the request before approval
  | 'archived';        // archived by admin

// ── Payment method ─────────────────────────────────────────────────────────────
export type PaymentMethod = 'bank_transfer' | 'vodafone_cash' | 'instapay' | 'stripe' | 'other';

// ── Duration interval ──────────────────────────────────────────────────────────
export type BillingInterval = 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom_days' | 'lifetime';

// ── Resource key (entitlement atom) ───────────────────────────────────────────
// Canonical keys live in src/shared/billing/resources.ts.
// Always reference a ResourceKey constant rather than a raw string.
export type ResourceKey = string;

// ─── Plan ─────────────────────────────────────────────────────────────────────

/** A single price / duration tier inside a plan version. */
export interface PlanPricing {
  amount: number;
  currency: string;        // 'USD' | 'EGP' | etc.
  interval: BillingInterval;
  customDays?: number;     // set when interval === 'custom_days'
}

// ─── System Payment Settings ──────────────────────────────────────────────────

export type ManualMethodKey = 'vodafone' | 'instapay' | 'etisalat' | 'orange' | 'bank' | 'stc' | 'other';
export type GatewayId = 'stripe' | 'paypal' | 'paytabs' | 'fawry';

export interface ManualMethodSettings {
  key: ManualMethodKey;
  enabled: boolean;
  details: string; // Legacy or short summary
  accountNumber?: string;
  accountName?: string;
  instructions?: string;
}

export interface GatewaySettings {
  id: GatewayId;
  enabled: boolean;
  credentials?: {
    publicKey?: string;
    secretKey?: string;
    merchantId?: string;
    webhookSecret?: string;
    profileId?: string;
  };
}

export interface PaymentSettings {
  manualMethods: ManualMethodSettings[];
  gateways: GatewaySettings[];
}

/** A locked, immutable snapshot of a plan at a specific moment.
 *  Stored at: plans/{planId}/versions/{versionNumber}
 */
export interface PlanVersion {
  versionNumber: number;
  publishedAt: any;         // Firestore Timestamp
  pricing: PlanPricing;
  featureListAr: string[];
  featureListEn: string[];
  /** Resource keys granted by this version (e.g. 'dashboard.view', 'course:abc123') */
  entitlements: ResourceKey[];
  /** Number of 1-on-1 coaching sessions included (0 = none) */
  sessionsQuota: number;
  /** Optional badge shown on the plan card (e.g. 'الأكثر شيوعاً') */
  badgeAr?: string;
  badgeEn?: string;
  actionTextAr?: string;
  actionTextEn?: string;
  includedCourseIds?: string[];
}

/** The main plan document (admin-writable, referenced by publicPlans). */
export interface SubscriptionPlan {
  id: string;                         // Firestore doc ID
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  audienceTier: AudienceTier;          // who can see / buy this plan
  status: PlanStatus;
  currentVersionNumber: number;        // pointer to latest locked version
  createdAt: any;                      // Firestore Timestamp
  updatedAt: any;
  // Draft fields — freely editable before publishing
  draftPricing?: PlanPricing;
  draftFeatureListAr?: string[];
  draftFeatureListEn?: string[];
  draftEntitlements?: ResourceKey[];
  draftSessionsQuota?: number;
  draftBadgeAr?: string;
  draftBadgeEn?: string;
  draftActionTextAr?: string;
  draftActionTextEn?: string;
  draftIncludedCourseIds?: string[];
  displayOnSite?: boolean;
}

/** The public-readable copy of a plan (filtered by audienceTier on Firestore rules). */
export interface PublicPlan {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  audienceTier: AudienceTier;
  pricing: PlanPricing;
  featureListAr: string[];
  featureListEn: string[];
  entitlements: ResourceKey[];
  sessionsQuota: number;
  versionNumber: number;
  badgeAr?: string;
  badgeEn?: string;
  actionTextAr?: string;
  actionTextEn?: string;
  includedCourseIds?: string[];
  displayOnSite?: boolean;
  publishedAt: any;
}

// ─── Subscription ─────────────────────────────────────────────────────────────

/** The active contract between a user and a specific PlanVersion.
 *  Stored at: subscriptions/{subscriptionId}
 */
export interface Subscription {
  id: string;                         // Firestore doc ID (usually uid)
  uid: string;                         // user's Firebase UID
  planId: string;
  planVersionNumber: number;
  audienceTier: AudienceTier;
  status: SubscriptionStatus;
  /** Firestore Timestamp — when the current period started */
  currentPeriodStart: any;
  /** Firestore Timestamp — when the current period ends (validity boundary) */
  currentPeriodEnd: any;
  pricing: PlanPricing;               // snapshot locked at subscription time
  entitlements: ResourceKey[];         // granted features (snapshot)
  sessionsQuota: number;
  sessionsUsed: number;
  /** Which billingOrder approved this subscription (audit trail) */
  approvedByOrderId: string;
  createdAt: any;
  updatedAt: any;
}

// ─── Billing Order ────────────────────────────────────────────────────────────

/** A purchase request — created by user, reviewed by admin.
 *  Stored at: billingOrders/{orderId}
 *  IMPORTANT: Creating or rejecting an order NEVER cancels the current
 *  active subscription.  Only an approval can mutate the subscription document.
 */
export interface BillingOrder {
  id: string;
  uid: string;
  userEmail?: string;
  userDisplayName?: string;
  orderType?: 'plan' | 'course';
  itemId?: string; // used for courseId or planId moving forward
  itemNameAr?: string;
  itemNameEn?: string;
  planId?: string; // legacy support for older plans
  planVersionNumber?: number; // optional since courses don't have versions
  audienceTier: AudienceTier;
  /** Locked price from the plan version — client must not send this */
  pricingSnapshot: PlanPricing;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  /** Path in mediaStorage where the receipt image was uploaded */
  receiptStoragePath?: string;
  receiptDownloadURL?: string;
  /** Admin fills this when rejecting */
  rejectionReason?: string;
  /** Admin UID who reviewed */
  reviewedByUid?: string;
  reviewedAt?: any;
  createdAt: any;
  updatedAt: any;
  /** Notes the user may add (e.g. transaction reference) */
  userNotes?: string;
}

// ─── Payment Record ───────────────────────────────────────────────────────────

/** Finalized payment after admin approval.
 *  Stored at: payments/{paymentId}
 */
export interface PaymentRecord {
  id: string;
  uid: string;
  orderId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paidAt: any;                          // Firestore Timestamp
  receiptDownloadURL?: string;
  /** Stripe payment intent ID, if electronic */
  stripePaymentIntentId?: string;
}

// ─── Account Access Summary ───────────────────────────────────────────────────

/** Fast-read entitlement snapshot maintained by admin transactions.
 *  Written only by backend (Cloud Functions or Admin SDK).
 *  Stored at: accountAccess/{uid}
 */
export interface AccountAccessSummary {
  uid: string;
  audienceTier: AudienceTier;
  subscriptionStatus: SubscriptionStatus | null;  // null = no subscription
  planId: string | null;
  /** ISO date string for validity end (for UI countdown) */
  validUntil: string | null;
  /** Flat set of granted ResourceKey strings for O(1) lookup */
  entitlements: ResourceKey[];
  sessionsQuota: number;
  sessionsUsed: number;
  updatedAt: any;
}

// ─── Course Grant (independent purchase) ──────────────────────────────────────

/** Standalone course ownership that persists even if the subscription expires.
 *  Stored at: courseGrants/{uid}/items/{courseId}
 */
export interface CourseGrant {
  courseId: string;
  uid: string;
  paidAt: any;
  orderId: string;
  amount: number;
  currency: string;
}

// ─── Bank Transfer Settings (per audienceTier) ────────────────────────────────

/** Payment method details shown to users when choosing manual transfer.
 *  Stored at: billingSettings/{audienceTier}
 */
export interface BillingSettings {
  audienceTier: AudienceTier;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  iban?: string;
  vodafoneCashNumber?: string;
  instapayHandle?: string;
  instructionsAr?: string;
  instructionsEn?: string;
}
