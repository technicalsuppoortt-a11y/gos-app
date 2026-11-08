// ─── Resource Key Catalog ─────────────────────────────────────────────────────
// Each constant is a canonical ResourceKey string that maps to a feature gate.
// Reference these constants everywhere (route guards, admin editor, plan editor)
// so a typo never silently breaks access control.
//
// Convention: '<domain>.<action>' or 'course:<courseId>'

import type { ResourceKey } from '../../types/billing';

// ── Navigation / Page Access ───────────────────────────────────────────────────
export const R_DASHBOARD          : ResourceKey = 'dashboard.view';
export const R_ACADEMY            : ResourceKey = 'academy';
export const R_MESSAGES           : ResourceKey = 'messages.access';
export const R_ASSETS_LIBRARY     : ResourceKey = 'assets.library';
export const R_CALENDAR           : ResourceKey = 'calendar.access';
export const R_PROGRESS           : ResourceKey = 'progress.view';
export const R_CONTENT_GENERATOR  : ResourceKey = 'content.generator';
export const R_MARKETING_HUB      : ResourceKey = 'marketing.hub';
export const R_COMMUNITY          : ResourceKey = 'community';
export const R_MY_BOOKINGS        : ResourceKey = 'my-bookings';
export const R_COACH_CHAT         : ResourceKey = 'coach.chat';
export const R_BILLING            : ResourceKey = 'billing';
export const R_PROFILE            : ResourceKey = 'profile';
export const R_LAUNCH_BRAND       : ResourceKey = 'launch-your-brand';

// ── Support Channels ───────────────────────────────────────────────────────────
export const R_SUPPORT_EXECUTION  : ResourceKey = 'support.execution';
export const R_SUPPORT_MARKETING  : ResourceKey = 'support.marketing';

// ── Session Types ──────────────────────────────────────────────────────────────
export const R_SESSION_STRATEGY   : ResourceKey = 'session.strategy';
export const R_SESSION_COACHING   : ResourceKey = 'session.coaching';

// ─── Helper: build a course-specific resource key ─────────────────────────────
export function courseKey(courseId: string): ResourceKey {
  return `course:${courseId}`;
}

// ─── Groupings used in the PlanEditor ─────────────────────────────────────────

/** Ordered list of all selectable resources for admin plan editor */
export const ALL_RESOURCES: { key: ResourceKey; labelAr: string; labelEn: string; group: string }[] = [
  // Pages
  { key: R_DASHBOARD,         labelAr: 'الرئيسية',          labelEn: 'Dashboard',          group: 'pages' },
  { key: R_ACADEMY,           labelAr: 'الأكاديمية',        labelEn: 'Academy',            group: 'pages' },
  { key: R_MESSAGES,          labelAr: 'الرسائل',           labelEn: 'Messages',           group: 'pages' },
  { key: R_ASSETS_LIBRARY,    labelAr: 'أصول البيزنس',      labelEn: 'Business Assets',    group: 'pages' },
  { key: R_CALENDAR,          labelAr: 'إدارة المواعيد',    labelEn: 'Calendar',           group: 'pages' },
  { key: R_PROGRESS,          labelAr: 'المهام والإنجاز',   labelEn: 'Tasks & Progress',   group: 'pages' },
  { key: R_CONTENT_GENERATOR, labelAr: 'مولد المحتوى',      labelEn: 'Content Generator',  group: 'pages' },
  { key: R_MARKETING_HUB,     labelAr: 'التسويق',           labelEn: 'Marketing',          group: 'pages' },
  { key: R_COMMUNITY,         labelAr: 'المجتمع',           labelEn: 'Community',          group: 'pages' },
  { key: R_MY_BOOKINGS,       labelAr: 'حجوزاتي',           labelEn: 'My Bookings',        group: 'pages' },
  { key: R_COACH_CHAT,        labelAr: 'جو كوتش (AI)',      labelEn: 'Joe AI Coach',       group: 'pages' },
  { key: R_BILLING,           labelAr: 'الفوترة والاشتراك', labelEn: 'Billing',            group: 'pages' },
  { key: R_PROFILE,           labelAr: 'الملف الشخصي',      labelEn: 'Profile',            group: 'pages' },
  { key: R_LAUNCH_BRAND,      labelAr: 'رحلة بناء البراند', labelEn: 'Launch Your Brand',  group: 'pages' },

  // Support
  { key: R_SUPPORT_EXECUTION, labelAr: 'دعم التنفيذ',       labelEn: 'Execution Support',  group: 'support' },
  { key: R_SUPPORT_MARKETING, labelAr: 'دعم التسويق',       labelEn: 'Marketing Support',  group: 'support' },
  // Sessions
  { key: R_SESSION_STRATEGY,  labelAr: 'جلسة استراتيجية',  labelEn: 'Strategy Session',   group: 'sessions' },
  { key: R_SESSION_COACHING,  labelAr: 'جلسة كوتشينج',     labelEn: 'Coaching Session',   group: 'sessions' },
];

/** Quick lookup: resource key → metadata */
export const RESOURCE_LOOKUP = Object.fromEntries(
  ALL_RESOURCES.map(r => [r.key, r])
) as Record<ResourceKey, typeof ALL_RESOURCES[number]>;

/** Pages always accessible regardless of plan (billing, profile, etc.) */
export const ALWAYS_ALLOWED_PATHS: string[] = [
  '/billing',
  '/profile',
];
