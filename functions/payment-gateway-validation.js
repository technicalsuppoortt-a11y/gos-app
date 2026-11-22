import { HttpsError } from 'firebase-functions/v2/https';
import { gatewayFields, paytabsRegions } from './payment-gateway-model.js';

export function validateGatewayConfiguration(provider, input, previous = {}) {
  if (!Object.hasOwn(gatewayFields, provider) || !input || typeof input !== 'object' || Array.isArray(input)) throw new HttpsError('invalid-argument', 'Invalid gateway configuration.');
  if (!['sandbox', 'live'].includes(input.mode)) throw new HttpsError('invalid-argument', 'Choose Sandbox or Live mode.');
  if (provider === 'paytabs' && !paytabsRegions.includes(input.region)) throw new HttpsError('invalid-argument', 'Choose a valid PayTabs region.');
  const result = { mode: input.mode, ...(provider === 'paytabs' ? { region: input.region } : {}) };
  // Secrets may be retained only for the same environment and merchant identity.
  const identityChanged = previous.mode !== input.mode || provider === 'paytabs' && previous.region !== input.region || gatewayFields[provider].some(f => !f.secret && !f.link && (previous[f.key] ?? '') !== (input[f.key]?.trim() ?? ''));
  for (const field of gatewayFields[provider]) {
    const value = input[field.key];
    if (value !== undefined && (typeof value !== 'string' || value.length > 4096)) throw new HttpsError('invalid-argument', `Invalid ${field.label}.`);
    const text = value?.trim() ?? '';
    result[field.key] = text || (field.secret && !identityChanged ? previous[field.key] ?? '' : '');
    if (!result[field.key] && !field.optional) throw new HttpsError('invalid-argument', `Enter ${field.label}${identityChanged && field.secret ? ' for this account and mode' : ''}.`);
  }
  if (provider === 'stripe') {
    const mode = input.mode === 'live' ? 'live' : 'test';
    if (!new RegExp(`^pk_${mode}_[A-Za-z0-9]+$`).test(result.publishableKey)) throw new HttpsError('invalid-argument', 'Publishable Key must match the selected Stripe mode.');
    if (!new RegExp(`^(sk|rk)_${mode}_[A-Za-z0-9]+$`).test(result.secretKey)) throw new HttpsError('invalid-argument', 'Secret Key must match the selected Stripe mode.');
    if (result.webhookSecret && !/^whsec_[A-Za-z0-9]+$/.test(result.webhookSecret)) throw new HttpsError('invalid-argument', 'Enter a valid Webhook Secret.');
    for (const key of ['paymentLink', 'paymentLinkAnnual']) {
      if (result[key] && !/^https:\/\/[^\s]+$/.test(result[key])) throw new HttpsError('invalid-argument', 'Payment links must be secure https:// URLs (for example https://buy.stripe.com/...).');
    }
  }
  if (provider === 'paymob') {
    const expectedKeyMode = input.mode === 'live' ? 'live' : 'test';
    const pkMatch = /^(?:[a-z]{3}_)?pk_(test|live)_/i.exec(result.publicKey);
    if (pkMatch && pkMatch[1].toLowerCase() !== expectedKeyMode) {
      throw new HttpsError('invalid-argument', 'Public Key must match the selected Paymob mode.');
    }
    const skMatch = /^(?:[a-z]{3}_)?sk_(test|live)_/i.exec(result.secretKey);
    if (skMatch && skMatch[1].toLowerCase() !== expectedKeyMode) {
      throw new HttpsError('invalid-argument', 'Secret Key must match the selected Paymob mode.');
    }
    if (result.cardIntegrationId && !/^\d+$/.test(result.cardIntegrationId)) {
      throw new HttpsError('invalid-argument', 'Card Integration ID must contain digits only.');
    }
    if (result.walletIntegrationId && !/^\d+$/.test(result.walletIntegrationId)) {
      throw new HttpsError('invalid-argument', 'Mobile Wallet Integration ID must contain digits only.');
    }
    if (result.iframeId && !/^\d+$/.test(result.iframeId)) {
      throw new HttpsError('invalid-argument', 'Iframe ID must contain digits only.');
    }
    if (result.integrationIds && !/^\d+(\s*,\s*\d+)*$/.test(result.integrationIds)) {
      throw new HttpsError('invalid-argument', 'Enter numeric Paymob integration IDs separated by commas.');
    }
    if (!result.integrationIds && !result.cardIntegrationId && !result.walletIntegrationId) {
      throw new HttpsError('invalid-argument', 'Enter at least one Paymob Integration ID (Card, Mobile Wallet, or comma-separated IDs).');
    }
    if (!result.integrationIds) {
      result.integrationIds = [result.cardIntegrationId, result.walletIntegrationId].filter(Boolean).join(', ');
    }
  }
  if (provider === 'paddle' && !result.clientToken.startsWith(input.mode === 'live' ? 'live_' : 'test_')) throw new HttpsError('invalid-argument', 'Client-side Token must match the selected Paddle mode.');
  if (provider === 'paytabs' && !/^\d+$/.test(result.profileId)) throw new HttpsError('invalid-argument', 'Profile ID must contain digits only.');
  return result;
}
