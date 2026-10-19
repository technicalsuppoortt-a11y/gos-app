export function buildActivationLink(firebaseLink, appOrigin) {
  const action = new URL(firebaseLink);
  const app = new URL(appOrigin);
  if (app.protocol !== 'https:' && !(app.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(app.hostname))) throw new Error('APP_ORIGIN must use HTTPS.');
  if (action.searchParams.get('mode') !== 'resetPassword' || !action.searchParams.get('oobCode')) throw new Error('Firebase returned an invalid password setup link.');
  const link = new URL('/onboarding/activate-account', app.origin);
  // Keep the genuine one-time code, apiKey, language and continue URL intact.
  link.search = action.search;
  return link.toString();
}
