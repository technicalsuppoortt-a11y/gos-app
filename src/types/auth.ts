export type PlatformTeamRole = 'SUPER_ADMIN' | 'PLATFORM_SUPPORT' | 'PLATFORM_FINANCE';
export type Role = 'USER' | 'ADMIN' | 'CUSTOMER' | PlatformTeamRole;

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  accountType?: 'agency';
  cashWalletRestricted?: boolean;
  allowedTabs?: string[];
  isTeamMember?: boolean;
  teamRole?: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
}

export interface Tenant {
  id: string;
  name: string;
  domain?: string;
  logo?: string;
}

export interface AuthState {
  impersonation: StoredAuth | null;
  isAuthenticated: boolean;
  user: User | null;
  role: Role | null;
  tenant: Tenant | null;
  token: string | null;
}

export interface StoredAuth {
  user: User;
  role: Role;
  tenant: Tenant | null;
  token: string;
}
