/**
 * Central role → capability map for Phoenix.
 *
 * The role decides WHAT a person can do. For coaches, the student's `coachId`
 * decides WHICH students they can see. This map drives the UI only; the same
 * decisions are enforced by firestore.rules and the trusted functions in
 * functions/src/access.
 */

export const ROLES = ['admin', 'user', 'coach', 'support'] as const;
export type Role = (typeof ROLES)[number];

export const STAFF_ROLES: readonly Role[] = ['admin', 'coach', 'support'];

export type Capability =
  | 'admin.panel'
  | 'users.viewAll'
  | 'users.viewOwnStudents'
  | 'users.viewUnassigned'
  | 'users.changeRole'
  | 'users.delete'
  | 'students.create'
  | 'students.assignToSelf'
  | 'students.assignToCoach'
  | 'codes.manage'
  | 'monitor.chat'
  | 'monitor.appointments'
  | 'academy.manage'
  | 'contracts.view'
  | 'contracts.create'
  | 'contracts.clauses'
  | 'platform.open'
  | 'businessAssets'
  | 'system.admin';

const ALL_CAPABILITIES: Capability[] = [
  'admin.panel', 'users.viewAll', 'users.viewOwnStudents', 'users.viewUnassigned', 'users.changeRole',
  'users.delete', 'students.create', 'students.assignToSelf', 'students.assignToCoach', 'codes.manage',
  'monitor.chat', 'monitor.appointments', 'academy.manage', 'contracts.view', 'contracts.create',
  'contracts.clauses', 'platform.open', 'businessAssets', 'system.admin',
];

export const ROLE_CAPABILITIES: Record<Role, readonly Capability[]> = {
  admin: ALL_CAPABILITIES,
  // Students keep every student feature they have today. "Open your platform"
  // and Business Assets are shown locked.
  user: [],
  coach: [
    'admin.panel', 'users.viewOwnStudents', 'users.viewUnassigned', 'students.create',
    'students.assignToSelf', 'students.assignToCoach', 'codes.manage', 'monitor.chat',
    'monitor.appointments', 'academy.manage',
  ],
  support: [
    'admin.panel', 'users.viewAll', 'users.viewOwnStudents', 'users.viewUnassigned', 'students.create',
    'students.assignToCoach', 'codes.manage', 'monitor.chat', 'monitor.appointments',
    'contracts.view', 'contracts.create',
  ],
};

/** Unknown or missing roles fall back to the least privileged role. */
export function normalizeRole(value: unknown): Role {
  const role = String(value ?? '').trim().toLowerCase();
  return (ROLES as readonly string[]).includes(role) ? (role as Role) : 'user';
}

export function can(role: unknown, capability: Capability): boolean {
  return ROLE_CAPABILITIES[normalizeRole(role)].includes(capability);
}

export function isStaffRole(role: unknown): boolean {
  return STAFF_ROLES.includes(normalizeRole(role));
}

export const ROLE_LABELS: Record<Role, { ar: string; en: string }> = {
  admin: { ar: 'مدير النظام', en: 'Admin' },
  user: { ar: 'مستخدم', en: 'User' },
  coach: { ar: 'كوتش', en: 'Coach' },
  support: { ar: 'سابورت', en: 'Support' },
};

/** Admin panel routes and the capability each one needs. */
export const ADMIN_ROUTE_CAPABILITY: Record<string, Capability> = {
  '/admin/users': 'users.viewOwnStudents',
  '/admin/codes': 'codes.manage',
  '/admin/inbox': 'monitor.chat',
  '/admin/bookings': 'monitor.appointments',
  '/admin/contracts': 'contracts.view',
  '/admin/ai-center': 'system.admin',
  '/admin/business-discovery': 'system.admin',
  '/admin/tour': 'system.admin',
  '/admin/academy': 'academy.manage',
  '/admin/assets': 'businessAssets',
  '/admin/system': 'system.admin',
};

export function capabilityForAdminPath(pathname: string): Capability | null {
  const match = Object.keys(ADMIN_ROUTE_CAPABILITY)
    .filter(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
    .sort((a, b) => b.length - a.length)[0];
  return match ? ADMIN_ROUTE_CAPABILITY[match] : null;
}

export function canAccessAdminPath(role: unknown, pathname: string): boolean {
  if (!can(role, 'admin.panel')) return false;
  const capability = capabilityForAdminPath(pathname);
  return capability ? can(role, capability) : normalizeRole(role) === 'admin';
}
