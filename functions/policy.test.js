import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mayManageUser, maySend, validateBooking } from './policy.js';
test('admins cannot elevate or modify peer accounts or themselves', () => {
  assert.equal(mayManageUser({ uid: 'a', role: 'ADMIN' }, { id: 'b', role: 'ADMIN' }), false);
  assert.equal(mayManageUser({ uid: 'a', role: 'SUPER_ADMIN' }, { id: 'a', role: 'SUPER_ADMIN' }), false);
  assert.equal(mayManageUser({ uid: 'a', role: 'ADMIN' }, { id: 'b', role: 'USER' }), true);
});
test('booking validation enforces real availability, buffers and capacity', () => {
  const now = Date.parse('2026-10-18T00:00:00Z');
  const page = { active: true, durationOptions: [30], hostTimezone: 'UTC', availability: [{ day: 1, enabled: true, start: '09:00', end: '17:00' }], minNotice: 30, maxAdvanceBooking: 30, bufferTime: 15, groupCapacity: 1, dailyLimit: 5 };
  const booking = { id: 'new', calendarId: 'calendar', date: '2026-10-19', start: '2026-10-19T10:00:00Z', duration: 30, status: 'Confirmed' };
  assert.equal(validateBooking(page, booking, [], now), null);
  assert.match(validateBooking(page, booking, [{ ...booking, id: 'existing' }], now), /already booked/);
  assert.match(validateBooking(page, { ...booking, start: '2026-10-19T17:00:00Z' }, [], now), /availability/);
  assert.match(validateBooking(page, { ...booking, duration: 60 }, [], now), /duration/);
  assert.match(validateBooking(page, { ...booking, date: '2026-10-20' }, [], now), /timezone/);
});
test('human takeover prevents AI sends even with consent', () => {
  assert.equal(maySend({ ai: true, lead: { hasWhatsAppConsent: true }, conversation: { takenOver: true, channel: 'whatsapp' }, integration: { status: 'CONNECTED' } }).allowed, false);
});
test('outreach rejects opt-outs, disconnected channels and missing consent', () => {
  const context = { lead: {}, conversation: { channel: 'whatsapp', lastInboundAt: new Date().toISOString() }, integration: { status: 'CONNECTED' } };
  assert.equal(maySend(context).allowed, false);
  assert.equal(maySend({ ...context, lead: { hasWhatsAppConsent: true } }).allowed, true);
  assert.equal(maySend({ ...context, lead: { hasWhatsAppConsent: true, optedOut: true } }).allowed, false);
  assert.equal(maySend({ ...context, integration: null }).allowed, false);
});
