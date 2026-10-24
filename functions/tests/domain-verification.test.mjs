import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHost, isPlatformHostname, expectedTargets, verifyDomainDns } from '../domain-verification.js';
import { pickPublishedStep } from '../domain-proxy.js';

test('normalizeHost handles various protocol and path variations', () => {
  assert.equal(normalizeHost('https://talk.com/'), 'talk.com');
  assert.equal(normalizeHost('http://offers.brand.com:8080/path'), 'offers.brand.com');
  assert.equal(normalizeHost('WWW.MYBRAND.COM.'), 'www.mybrand.com');
  assert.equal(normalizeHost('  custom.domain.net/  '), 'custom.domain.net');
});

test('isPlatformHostname properly filters reserved platform domains', () => {
  assert.equal(isPlatformHostname('localhost'), true);
  assert.equal(isPlatformHostname('127.0.0.1'), true);
  assert.equal(isPlatformHostname('app.vercel.app'), true);
  assert.equal(isPlatformHostname('gos-app-3c7fb.web.app'), true);
  assert.equal(isPlatformHostname('upklick.net'), true);
  assert.equal(isPlatformHostname('www.upklick.com'), true);
  assert.equal(isPlatformHostname('talk.com'), false);
  assert.equal(isPlatformHostname('mycustomfunnel.io'), false);
});

test('expectedTargets includes cname.vercel-dns.com', () => {
  const targets = expectedTargets();
  assert.ok(targets.includes('cname.vercel-dns.com'));
});

test('pickPublishedStep correctly resolves path matching', () => {
  const site = {
    steps: [
      { id: 'step-1', name: 'Home', path: '/', published: true },
      { id: 'step-2', name: 'Pricing', path: '/pricing', published: true },
      { id: 'step-3', name: 'Thank You', path: '/thank-you', published: true }
    ]
  };

  const rootStep = pickPublishedStep(site, '/');
  assert.equal(rootStep?.id, 'step-1');

  const pricingStep = pickPublishedStep(site, '/pricing');
  assert.equal(pricingStep?.id, 'step-2');

  const pricingNoSlash = pickPublishedStep(site, 'pricing');
  assert.equal(pricingNoSlash?.id, 'step-2');

  const fallbackStep = pickPublishedStep(site, '/non-existent');
  assert.equal(fallbackStep?.id, 'step-1');
});
