import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { computeAdminTrialRemainingDays, formatAdminTrialDate } from '../src/components/layout/adminTrialCountdown.ts';

test('computeAdminTrialRemainingDays anchors strictly to post-deployment timestamps and handles clock skew', () => {
  const deployStart = '2026-11-26T12:00:00.000Z';
  const deployStartMs = Date.parse(deployStart);
  const deployEnd = new Date(deployStartMs + 90 * 86_400_000).toISOString();

  const sub = {
    status: 'trialing',
    specialCaseFlow: 'phoenix_service_period',
    phoenixServiceDays: 90,
    serviceStartedAt: deployStart,
    trialStartedAt: deployStart,
    currentPeriodStart: deployStart,
    currentPeriodEnd: deployEnd,
    plan: { kind: 'trial', durationDays: 90 },
  };

  // Even if client clock is 3s behind server at activation moment, remaining days never exceeds 90
  const atDeploySkew = computeAdminTrialRemainingDays(sub, deployStartMs - 3000);
  assert.equal(atDeploySkew?.daysLeft, 90);
  assert.equal(atDeploySkew?.endingSoon, false);

  // After 20 days + 2 hours -> 70 days left
  const after20Days = computeAdminTrialRemainingDays(sub, deployStartMs + 20 * 86_400_000 + 7_200_000);
  assert.equal(after20Days?.daysLeft, 70);
  assert.equal(after20Days?.endingSoon, false);

  // Final 5 days -> endingSoon = true
  const final5Days = computeAdminTrialRemainingDays(sub, deployStartMs + 85 * 86_400_000 + 1_000);
  assert.equal(final5Days?.daysLeft, 5);
  assert.equal(final5Days?.endingSoon, true);

  // Final 1 hour -> 1 day left
  const lastHour = computeAdminTrialRemainingDays(sub, Date.parse(deployEnd) - 3_600_000);
  assert.equal(lastHour?.daysLeft, 1);
  assert.equal(lastHour?.endingSoon, true);

  // Expired or paid plan -> null
  assert.equal(computeAdminTrialRemainingDays(sub, Date.parse(deployEnd)), null);
  assert.equal(
    computeAdminTrialRemainingDays(
      { status: 'active', currentPeriodStart: deployStart, currentPeriodEnd: deployEnd, plan: { kind: 'plan', durationDays: 30 } },
      deployStartMs + 1000,
    ),
    null,
  );
});

test('Admin Top Bar trial badge copy is localized across ar, en, nl, and de', () => {
  const patternsAr = JSON.parse(fs.readFileSync(new URL('../src/i18n/locales/patterns-ar.json', import.meta.url), 'utf8'));
  const patternsNl = JSON.parse(fs.readFileSync(new URL('../src/i18n/locales/patterns-nl.json', import.meta.url), 'utf8'));
  const patternsDe = JSON.parse(fs.readFileSync(new URL('../src/i18n/locales/patterns-de.json', import.meta.url), 'utf8'));
  const catalogAr = JSON.parse(fs.readFileSync(new URL('../src/i18n/locales/display-ar.json', import.meta.url), 'utf8'));
  const catalogNl = JSON.parse(fs.readFileSync(new URL('../src/i18n/locales/display-nl.json', import.meta.url), 'utf8'));
  const catalogDe = JSON.parse(fs.readFileSync(new URL('../src/i18n/locales/display-de.json', import.meta.url), 'utf8'));

  assert.equal(patternsAr['{{0}} days left in free trial'].replace('{{0}}', '90'), 'متبقي 90 يوم في الفترة المجانية');
  assert.equal(patternsNl['{{0}} days left in free trial'].replace('{{0}}', '90'), 'Nog 90 dagen in gratis proefperiode');
  assert.equal(patternsDe['{{0}} days left in free trial'].replace('{{0}}', '90'), 'Noch 90 Tage im kostenlosen Testzeitraum');

  assert.equal(catalogAr['1 day left in free trial'], 'متبقي يوم واحد في الفترة المجانية');
  assert.equal(catalogNl['1 day left in free trial'], 'Nog 1 dag in gratis proefperiode');
  assert.equal(catalogDe['1 day left in free trial'], 'Noch 1 Tag im kostenlosen Testzeitraum');

  const sampleDate = new Date('2027-02-24T12:00:00.000Z');
  for (const lang of ['en', 'ar', 'nl', 'de']) {
    assert.ok(formatAdminTrialDate(sampleDate, lang).length > 0, lang);
  }
});
