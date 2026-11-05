export function agencyBillingOwnerId(account) {
  if (account?.accountType !== 'agency') return null;
  // Older accounts recorded the provisioning administrator as createdBy.
  const id = account.billingOwnerId || account.createdBy || account.supportParentId;
  return typeof id === 'string' && /^[\w-]{1,128}$/.test(id) ? id : null;
}

export function isAgencyBillingOwner(account) {
  return ['ADMIN', 'SUPER_ADMIN'].includes(account?.role)
    && (!account.status || ['active', 'activated'].includes(String(account.status).toLowerCase()));
}
