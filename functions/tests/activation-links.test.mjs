import test from 'node:test';
import assert from 'node:assert/strict';
import { buildActivationLink } from '../activation-links.js';

test('invite links open the React handler with every Firebase action parameter intact', () => {
  const original = new URL('https://gos-app-3c7fb.firebaseapp.com/__/auth/action');
  for (const [key, value] of Object.entries({ mode: 'resetPassword', oobCode: 'test-code+A/b==', apiKey: 'public-project-key', lang: 'ar', continueUrl: 'https://gos-app-3c7fb.web.app/dashboard?tab=home' })) original.searchParams.set(key, value);
  const result = new URL(buildActivationLink(original.toString(), 'https://gos-app-3c7fb.web.app'));
  assert.equal(result.origin, 'https://gos-app-3c7fb.web.app');
  assert.equal(result.pathname, '/onboarding/activate-account');
  assert.deepEqual([...result.searchParams], [...original.searchParams]);
});
test('link builder rejects absent reset codes and unsafe app origins', () => {
  const good = 'https://example.com/__/auth/action?mode=resetPassword&oobCode=test';
  assert.throws(() => buildActivationLink('https://example.com/?mode=resetPassword', 'https://app.example.com'), /invalid/);
  assert.throws(() => buildActivationLink(good.replace('resetPassword', 'verifyEmail'), 'https://app.example.com'), /invalid/);
  assert.throws(() => buildActivationLink(good, 'http://app.example.com'), /HTTPS/);
  assert.equal(new URL(buildActivationLink(good, 'http://localhost:5173')).origin, 'http://localhost:5173');
});
