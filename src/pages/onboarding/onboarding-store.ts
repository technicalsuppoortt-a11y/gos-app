import { useSyncExternalStore } from 'react';
import type { Role } from '../../types/auth';
import { showToast } from '../../utils/toast';

export type Setup = {
  step: number;
  onboarding_completed: boolean;
  name: string;
  logo: string;
  color: string;
  industry: string;
  goal: string;
  country: string;
  timezone: string;
  currency: string;
  language: 'en' | 'ar';
  description: string;
  website: string;
  facts: string[];
  integrations: string[];
  asset: { name: string; type: string; duration: string; price: string; id?: string } | null;
};

export type Invite = {
  id: string;
  name?: string;
  email: string;
  role: Role;
  status: 'Active' | 'Pending' | 'Deactivated' | 'Inactive' | 'Invited' | 'Activated';
  created: string;
  mfa: boolean;
  avatar?: string;
  passwordDigest?: string;
  tenantId?: string;
  activatedAt?: string;
  updatedAt?: string;
  credits?: number;
};

export const INITIAL_MOCK_USERS: Invite[] = [];

type State = { invites: Invite[]; setups: Record<string, Setup> };

export const emptySetup = (): Setup => ({
  step: 0,
  onboarding_completed: false,
  name: '',
  logo: '',
  color: '#7560eb',
  industry: 'Consulting',
  goal: 'Get more bookings',
  country: 'Egypt',
  timezone: 'Africa/Cairo',
  currency: 'EGP',
  language: 'en',
  description: '',
  website: '',
  facts: [],
  integrations: [],
  asset: null,
});

const key = 'gos.onboarding.v3';

function read(): State {
  try {
    const raw =
      localStorage.getItem(key) ||
      localStorage.getItem('gos.onboarding.v2') ||
      localStorage.getItem('gos.onboarding.v1');
    const data = raw ? JSON.parse(raw) : null;
    if (Array.isArray(data?.invites) && data.invites.length >= 8 && data?.setups) {
      // Normalize any SUPER_ADMIN to ADMIN
      const normalizedInvites = data.invites.map((inv: Invite) =>
        inv.role === 'SUPER_ADMIN' ? { ...inv, role: 'ADMIN' as const } : inv
      );
      return {
        invites: normalizedInvites,
        setups: data.setups,
      };
    }
    return {
      invites: INITIAL_MOCK_USERS,
      setups: data?.setups || {},
    };
  } catch {
    return { invites: INITIAL_MOCK_USERS, setups: {} };
  }
}

let state = read();
const listeners = new Set<() => void>();

export function updateOnboarding(fn: (current: State) => State) {
  state = fn(state);
  try {
    localStorage.setItem(key, JSON.stringify(state));
    localStorage.setItem('gos.onboarding.v2', JSON.stringify(state));
    localStorage.setItem('gos.onboarding.v1', JSON.stringify(state));
  } catch {
    showToast.error('Changes are saved for this session. Browser storage is unavailable.');
  }
  listeners.forEach(listener => listener());
}

window.addEventListener('storage', event => {
  if (
    event.key === key ||
    event.key === 'gos.onboarding.v2' ||
    event.key === 'gos.onboarding.v1' ||
    event.key === null
  ) {
    state = read();
    listeners.forEach(listener => listener());
  }
});

export function useOnboarding() {
  return useSyncExternalStore(
    fn => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => state
  );
}

export function saveSetup(email: string, patch: Partial<Setup>) {
  updateOnboarding(s => ({
    ...s,
    setups: {
      ...s.setups,
      [email]: { ...(s.setups[email] || emptySetup()), ...patch },
    },
  }));
}

export const activationUrl = (id: string) =>
  `${window.location.origin}/activate?invite=${encodeURIComponent(id)}`;

export async function mockPasswordDigest(password: string, salt: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${password}`));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function authenticateInvitedUser(email: string, password: string) {
  const invite = state.invites.find(
    i => i.email === email.trim().toLowerCase() && (i.status === 'Activated' || i.status === 'Active')
  );
  if (!invite?.passwordDigest || (await mockPasswordDigest(password, invite.id)) !== invite.passwordDigest) {
    return null;
  }
  const setup = state.setups[invite.email];
  return {
    user: { id: invite.id, email: invite.email, name: invite.name || invite.email.split('@')[0] },
    role: invite.role,
    tenant: { id: invite.id, name: setup?.name || 'Your workspace', logo: setup?.logo },
    token: `mock-${invite.id}`,
  };
}
