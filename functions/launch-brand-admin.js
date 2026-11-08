// Shared Launch Brand configuration belongs to the platform, not a tenant admin.
export async function launchBrandAdminSession(bearer, { auth, db, launchBrandDb }) {
  let identity;
  try { identity = await auth.verifyIdToken(bearer || '', true); }
  catch { throw Object.assign(new Error('Sign in to GOS again.'), { status: 401 }); }
  const profile = (await db.doc(`users/${identity.uid}`).get()).data();
  if (profile?.role !== 'SUPER_ADMIN' || profile.disabled === true ||
      [profile.status, profile.accountStatus].some(value => /^(deactivated|disabled|blocked|suspended|inactive|pending)$/i.test(String(value)))) {
    throw Object.assign(new Error('Only the GOS platform administrator can manage shared Launch Brand settings.'), { status: 403 });
  }
  // A separate identity cannot overwrite a student's migrated profile or progress.
  const uid = `gos-admin-${identity.uid}`;
  await launchBrandDb.doc(`users/${uid}`).set({
    uid, role: 'admin', status: 'active', disabled: false,
    displayName: profile.name || profile.displayName || '', email: identity.email || '',
  }, { merge: true });
  return { customToken: await auth.createCustomToken(uid, { launchBrand: true, launchBrandAdmin: true }) };
}
