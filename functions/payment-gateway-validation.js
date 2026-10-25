import { HttpsError } from 'firebase-functions/v2/https';
import { gatewayFields, paytabsRegions } from './payment-gateway-model.js';

export function validateGatewayConfiguration(provider, input, previous = {}) {
  if (!Object.hasOwn(gatewayFields, provider) || !input || typeof input !== 'object' || Array.isArray(input)) throw new HttpsError('invalid-argument', 'Invalid gateway configuration.');
  if (!['sandbox', 'live'].includes(input.mode)) throw new HttpsError('invalid-argument', 'Choose Sandbox or Live mode.');
  if (provider === 'paytabs' && !paytabsRegions.includes(input.region)) throw new HttpsError('invalid-argument', 'Choose a valid PayTabs region.');
  const result = { mode: input.mode, ...(provider === 'paytabs' ? { region: input.region } : {}) };
  // Secrets may be retained only for the same environment and merchant identity.
  const identityChanged = previous.mode !== input.mode || provider === 'paytabs' && previous.region !== input.region || gatewayFields[provider].some(f => !f.secret && previous[f.key] !== input[f.key]?.trim());
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
  }
  if (provider === 'paytabs' && !/^\d+$/.test(result.profileId)) throw new HttpsError('invalid-argument', 'Profile ID must contain digits only.');
  return result;
}
