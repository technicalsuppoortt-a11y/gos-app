import { cloudStorage } from '../../backend/workspace';
import { store } from '../../store';
import { settingsKey } from './data';

export type PermissionItem = {
  id: string;
  label: string;
  path: string;
  category: 'module' | 'settings';
  description?: string;
};

/**
 * Platform Modules (Main Sidebar Navigation)
 */
export const platformModulePermissions: PermissionItem[] = [
  { id: 'home', label: 'Dashboard', path: '/dashboard', category: 'module', description: 'Main overview & KPIs' },
  { id: 'copilot', label: 'AI Copilot', path: '/dashboard/copilot', category: 'module', description: 'AI assistant & prompts' },
  { id: 'funnels', label: 'Funnel & Website', path: '/dashboard/funnels', category: 'module', description: 'Funnels, websites & forms' },
  { id: 'inbox', label: 'Inbox', path: '/dashboard/inbox', category: 'module', description: 'Unified customer conversations' },
  { id: 'crm', label: 'CRM & Leads', path: '/dashboard/crm', category: 'module', description: 'Pipelines & lead tracking' },
  { id: 'contacts', label: 'Contacts', path: '/dashboard/contacts', category: 'module', description: 'Customer directory & segments' },
  { id: 'follow-up', label: 'AI Follow-up', path: '/dashboard/follow-up', category: 'module', description: 'Automated follow-up workflows' },
  { id: 'booking', label: 'Booking & Calendar', path: '/dashboard/booking', category: 'module', description: 'Appointments & schedules' },
  { id: 'products', label: 'Products & Payments', path: '/dashboard/products-payments', category: 'module', description: 'Catalog, orders, requests & discounts' },
  { id: 'analytics', label: 'Analytics', path: '/dashboard/analytics', category: 'module', description: 'Traffic & revenue reports' },
];

/**
 * Settings Tabs (/dashboard/settings/*)
 */
export const settingsTabPermissions: PermissionItem[] = [
  { id: 'settings:profile', label: 'Profile', path: '/dashboard/settings/profile', category: 'settings' },
  { id: 'settings:business', label: 'Business', path: '/dashboard/settings/business', category: 'settings' },
  { id: 'settings:domains', label: 'Domains', path: '/dashboard/settings/domains', category: 'settings' },
  { id: 'settings:billing', label: 'Plans & Billing', path: '/dashboard/settings/billing', category: 'settings' },
  { id: 'settings:payment-methods', label: 'Payment Methods', path: '/dashboard/settings/payment-methods', category: 'settings' },
  { id: 'settings:integrations', label: 'Integrations', path: '/dashboard/settings/integrations', category: 'settings' },
  { id: 'settings:tools', label: 'Tools', path: '/dashboard/settings/tools', category: 'settings' },
  { id: 'settings:team', label: 'Team & roles', path: '/dashboard/settings/team', category: 'settings' },
  { id: 'settings:pixel', label: 'Pixel', path: '/dashboard/settings/pixel', category: 'settings' },
  { id: 'settings:security', label: 'Security', path: '/dashboard/settings/security', category: 'settings' },
  { id: 'settings:privacy', label: 'Privacy Policy', path: '/dashboard/settings/privacy', category: 'settings' },
];

/**
 * Combined permissions list (preserves backwards compatibility with `modulePermissions`)
 */
export const modulePermissions: PermissionItem[] = [
  ...platformModulePermissions,
  ...settingsTabPermissions,
];

export type RolePresetKey = 'full' | 'commerce' | 'support' | 'custom';

export const ROLE_PRESETS: Record<
  RolePresetKey,
  { label: string; description: string; permissions: string[] }
> = {
  full: {
    label: 'Full Access',
    description: 'All platform modules and all workspace settings tabs',
    permissions: modulePermissions.map(m => m.id),
  },
  commerce: {
    label: 'Commerce & Funnels Only',
    description: 'Products & Payments, Funnels, Booking, Contacts, Analytics & Commerce settings',
    permissions: [
      'home',
      'funnels',
      'contacts',
      'booking',
      'products',
      'analytics',
      'settings:profile',
      'settings:domains',
      'settings:payment-methods',
      'settings:pixel',
    ],
  },
  support: {
    label: 'Support Only',
    description: 'Inbox, CRM & Leads, Contacts, AI Follow-up & Booking',
    permissions: [
      'home',
      'inbox',
      'crm',
      'contacts',
      'follow-up',
      'booking',
      'settings:profile',
      'settings:security',
    ],
  },
  custom: {
    label: 'Custom',
    description: 'Manually select allowed modules and settings tabs below',
    permissions: [],
  },
};

export function permissionsForRole(role: string): { preset: RolePresetKey; permissions: string[] } {
  const norm = role.trim().toLowerCase();
  if (norm === 'owner' || norm === 'admin' || norm === 'manager') {
    return { preset: 'full', permissions: [...ROLE_PRESETS.full.permissions] };
  }
  if (norm === 'editor' || norm === 'sales') {
    return { preset: 'commerce', permissions: [...ROLE_PRESETS.commerce.permissions] };
  }
  if (norm === 'viewer' || norm === 'support' || norm === 'member') {
    return { preset: 'support', permissions: [...ROLE_PRESETS.support.permissions] };
  }
  return { preset: 'custom', permissions: ['home', 'settings:profile'] };
}

export function buildTabPermissionsMap(allowed: string[]): Record<string, boolean> {
  const set = new Set(allowed);
  const hasWildcard = set.has('*');
  const map: Record<string, boolean> = {};
  for (const item of modulePermissions) {
    map[item.id] = hasWildcard || set.has(item.id);
  }
  return map;
}

export type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  isOwner?: boolean;
  preset?: RolePresetKey;
  permissions: string[];
  allowedModules?: string[];
  tabPermissions?: Record<string, boolean>;
  password?: string;
  hasPassword?: boolean;
  authUid?: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  updatedAt?: string;
};

export type TeamState = { members: Member[]; audit: string[] };
export type Session = { id: string; device: string; lastActive: string; current: boolean };
export type SecurityState = {
  sessions: Session[];
  history: string[];
  mfa: boolean;
  passwordHash?: string;
  salt?: string;
};

const localMemoryStore = new Map<string, string>();

function sectionKey(section: string) {
  return section === 'knowledge'
    ? 'gos.ai-followup.knowledge.v1'
    : section === 'team'
    ? 'gos-settings-team-v1:' + (store.getState().auth.tenant?.id ?? 'demo')
    : settingsKey() + ':' + section;
}

export function readLocal<T>(section: string, defaults: () => T): T {
  const key = sectionKey(section);
  try {
    if (section === 'team' || section === 'security') {
      const fromMem = localMemoryStore.get(key);
      const fromBrowser =
        fromMem ?? (typeof window !== 'undefined' ? window.localStorage.getItem(key) : null);
      if (fromBrowser) {
        const parsed = JSON.parse(fromBrowser);
        if (parsed && typeof parsed === 'object') return parsed as T;
      }
    }
    const saved = JSON.parse(cloudStorage.getItem(key) ?? 'null');
    if (saved && typeof saved === 'object') return saved as T;
  } catch {
    /* Recover malformed storage. */
  }
  return defaults();
}

export function saveLocal(section: string, data: unknown) {
  if (section === 'knowledge' && Array.isArray(data)) {
    data = data.map(item => ({
      ...item,
      title: item.title || item.name,
      name: item.title || item.name,
      type: item.type || 'text',
      detail: item.content || item.detail,
      content: item.content || item.detail,
      approved: true,
    }));
  }
  const key = sectionKey(section);
  const serialized = JSON.stringify(data);
  if (section === 'team' || section === 'security') {
    localMemoryStore.set(key, serialized);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, serialized);
      }
    } catch {
      /* Ignore browser storage quota errors */
    }
    window.dispatchEvent(new Event('gos-settings-changed'));
    return;
  }
  try {
    void cloudStorage.setItem(key, serialized, { silent: true });
  } catch {
    throw new Error('Changes could not be saved. Browser storage is full or unavailable.');
  }
  window.dispatchEvent(new Event('gos-settings-changed'));
}

export function defaultTeam(): TeamState {
  const user = store.getState().auth.user;
  const allIds = modulePermissions.map(module => module.id);
  return {
    members: user
      ? [
          {
            id: user.id,
            name: user.name,
            email: user.email,
            role: 'Owner',
            isOwner: true,
            active: true,
            preset: 'full',
            permissions: allIds,
            allowedModules: allIds,
            tabPermissions: buildTabPermissionsMap(allIds),
          },
        ]
      : [],
    audit: [],
  };
}

export function normalizeMemberRecord(raw: Partial<Member> & Record<string, any>): Member {
  const isOwner = Boolean(raw.isOwner || String(raw.role || '').toLowerCase() === 'owner');
  const allIds = modulePermissions.map(m => m.id);
  let perms: string[] = [];
  if (isOwner) {
    perms = allIds;
  } else if (Array.isArray(raw.allowedModules) && raw.allowedModules.length > 0) {
    perms = raw.allowedModules.includes('*') ? allIds : raw.allowedModules;
  } else if (Array.isArray(raw.permissions) && raw.permissions.length > 0) {
    perms = raw.permissions.includes('*') ? allIds : raw.permissions;
  } else if (raw.tabPermissions && typeof raw.tabPermissions === 'object') {
    perms = Object.entries(raw.tabPermissions)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([k]) => k);
  } else {
    perms = allIds;
  }

  // Expand legacy 'settings' into all settings:* tabs if no specific settings:* keys are present
  if (perms.includes('settings') && !perms.some(p => p.startsWith('settings:'))) {
    perms = [...new Set([...perms, ...settingsTabPermissions.map(s => s.id)])];
  }
  // If any settings:* tab is enabled, also include 'settings' for top-level compatibility
  if (perms.some(p => p.startsWith('settings:')) && !perms.includes('settings')) {
    perms = [...perms, 'settings'];
  }

  return {
    id: String(raw.id || ''),
    name: String(raw.name || ''),
    email: String(raw.email || ''),
    role: isOwner ? 'Owner' : String(raw.role || 'Manager'),
    isOwner,
    active: raw.active !== false,
    preset: (raw.preset as RolePresetKey) || undefined,
    permissions: perms,
    allowedModules: perms,
    tabPermissions: raw.tabPermissions ?? buildTabPermissionsMap(perms),
    hasPassword: Boolean(raw.hasPassword || raw.authPassword),
    authUid: typeof raw.authUid === 'string' ? raw.authUid : undefined,
    ownerId: typeof raw.ownerId === 'string' ? raw.ownerId : undefined,
    ownerName: typeof raw.ownerName === 'string' ? raw.ownerName : undefined,
    ownerEmail: typeof raw.ownerEmail === 'string' ? raw.ownerEmail : undefined,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
}

export function readTeam(): TeamState {
  const value = readLocal('team', defaultTeam);
  if (!Array.isArray(value.members) || !Array.isArray(value.audit)) return defaultTeam();
  return {
    ...value,
    members: value.members
      .filter(
        member =>
          typeof member?.id === 'string' &&
          typeof member.email === 'string' &&
          typeof member.name === 'string',
      )
      .map(m => normalizeMemberRecord(m)),
  };
}

export function defaultSecurity(): SecurityState {
  return { sessions: [], history: [], mfa: false };
}

export function readSecurity(): SecurityState {
  const value = readLocal('security', defaultSecurity);
  return Array.isArray(value.sessions) &&
    Array.isArray(value.history) &&
    typeof value.mfa === 'boolean'
    ? value
    : defaultSecurity();
}

export async function passwordDigest(password: string, salt: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(salt + ':' + password),
  );
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function changeDemoPassword(
  state: SecurityState,
  current: string,
  next: string,
): Promise<SecurityState> {
  if (next.length < 8) throw new Error('Use at least 8 characters.');
  if (current === next) throw new Error('Choose a different new password.');
  const valid =
    state.passwordHash && state.salt
      ? (await passwordDigest(current, state.salt)) === state.passwordHash
      : current === 'DemoPassword123!';
  if (!valid) throw new Error('The current demo password is incorrect.');
  const salt = crypto.randomUUID();
  return {
    ...state,
    salt,
    passwordHash: await passwordDigest(next, salt),
    history: [`${new Date().toLocaleString('en-GB')} · Demo password changed`, ...state.history],
  };
}
