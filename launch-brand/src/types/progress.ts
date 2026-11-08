export type TaskStatus =
  | 'backlog'
  | 'ready'
  | 'in_progress'
  | 'needs_review'
  | 'verified'
  | 'blocked'
  | 'skipped';

export type MilestoneStatus =
  | 'locked'
  | 'ready'
  | 'in_progress'
  | 'verified'
  | 'blocked';

export type VerificationPolicy = 'none' | 'team_review' | 'system_check';

export type VerificationState =
  | 'unverified'
  | 'pending'
  | 'needs_review'
  | 'verified'
  | 'rejected';

export interface Milestone {
  id: string;
  planId: string;
  key: string;
  title: string;
  titleAr?: string;
  description?: string;
  status: MilestoneStatus;
  verifiedProgress: number;
  executionProgress: number;
  weight: number;
  prerequisiteKeys?: string[];
  sourceLabel?: 'marketing' | 'upclick' | 'launch';
  sourceRoute: string;
  order?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Task {
  id: string;
  planId: string;
  userId: string;
  milestoneId: string;
  milestoneKey: string;
  sourceKey: string;
  title: string;
  titleAr?: string;
  status: TaskStatus;
  verificationPolicy: VerificationPolicy;
  verificationState: VerificationState;
  dependencyIds: string[];
  sourceEventId?: string | null;
  verifiedBy?: string | null;
  blockedReason?: string | null;
  completedAt?: unknown;
  verifiedAt?: unknown;
  updatedAt?: unknown;
  createdAt?: unknown;
  version?: number;
  weight?: number;
  order?: number;
}

export interface LaunchPlan {
  id: string;
  userId: string;
  verifiedProgress: number;
  executionProgress: number;
  status: 'active' | 'completed' | 'paused';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProductProgressEvent {
  id: string;
  userId: string;
  source: 'launch' | 'marketing' | 'upclick' | 'admin' | 'system';
  sourceKey: string;
  outcome: 'started' | 'completed' | 'submitted_for_review' | 'verified' | 'failed';
  occurredAt: unknown;
  metadata?: Record<string, unknown>;
}

export const SYSTEM_SOURCE_KEYS = {
  BRAND_IDENTITY: 'brand_identity',
  BRAND_LOGO: 'brand_logo',
  WEBSITE_WORKSPACE: 'website_workspace',
  WEBSITE_BRANDING: 'website_branding',
  WEBSITE_HOMEPAGE: 'website_homepage',
  WEBSITE_LEAD_FORM: 'website_lead_form',
  WEBSITE_FUNNEL: 'website_funnel',
  CONTENT_SOCIAL_KIT: 'content_social_kit',
  CONTENT_PACK: 'content_pack',
  CONTENT_APPROVAL: 'content_approval',
  MARKETING_FACEBOOK_PAGE: 'marketing_facebook_page',
  MARKETING_INSTAGRAM: 'marketing_instagram',
  MARKETING_BIZ_MANAGER: 'marketing_biz_manager',
  MARKETING_AD_ACCOUNT: 'marketing_ad_account',
  MARKETING_PAYMENT: 'marketing_payment',
  CAMPAIGN_OBJECTIVE: 'campaign_objective',
  CAMPAIGN_AUDIENCE: 'campaign_audience',
  CAMPAIGN_BUDGET: 'campaign_budget',
  CAMPAIGN_CREATIVE: 'campaign_creative',
  CAMPAIGN_PUBLISH: 'campaign_publish',
  LEAD_FIRST: 'lead_first',
} as const;

export type SystemSourceKey = typeof SYSTEM_SOURCE_KEYS[keyof typeof SYSTEM_SOURCE_KEYS];
