export type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Tenant {
  id: string;
  name: string;
  domain?: string;
  logo?: string;
}

export interface AuthState {
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
