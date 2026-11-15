export function isOwnedSwitchAccount(uid: string | undefined, account: Record<string, unknown>) {
  const owner = account.accountType === 'agency'
    ? account.billingOwnerId || account.createdBy || account.supportParentId
    : account.supportParentId || account.createdBy;
  return Boolean(uid && account.role === 'USER' && owner === uid);
}
