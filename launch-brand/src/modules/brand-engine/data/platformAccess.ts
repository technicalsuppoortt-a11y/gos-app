type PlatformProfile = { role?: unknown; disabled?: unknown; status?: unknown; accountStatus?: unknown };

export function isActivePlatformMember(profile: PlatformProfile | null | undefined): boolean {
  return Boolean(profile && ['user', 'admin', 'superadmin'].includes(String(profile.role))
    && profile.disabled !== true
    && ![profile.status, profile.accountStatus].some(value =>
      ['blocked', 'suspended', 'inactive', 'disabled'].includes(String(value ?? '').toLowerCase())));
}

/** Phoenix's existing admin role manages the imported platform consoles. */
export function isPlatformAdmin(profile: PlatformProfile | null | undefined): boolean {
  return isActivePlatformMember(profile) && ['admin', 'superadmin'].includes(String(profile?.role));
}
