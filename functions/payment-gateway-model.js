// Shared field definitions only. Credential values are kept in server-only documents.
export const gatewayFields = {
  paddle: [{ key: 'clientToken', label: 'Client-side Token' }, { key: 'apiKey', label: 'API Key', secret: true }, { key: 'webhookSecret', label: 'Webhook Secret', secret: true }],
  paymob: [{ key: 'publicKey', label: 'Public Key' }, { key: 'secretKey', label: 'Secret Key', secret: true }, { key: 'integrationIds', label: 'Integration IDs (comma-separated)' }, { key: 'hmacSecret', label: 'HMAC Secret', secret: true }],
  stripe: [{ key: 'publishableKey', label: 'Publishable Key' }, { key: 'secretKey', label: 'Secret Key', secret: true }, { key: 'webhookSecret', label: 'Webhook Secret', secret: true, optional: true }],
  paypal: [{ key: 'clientId', label: 'Client ID' }, { key: 'clientSecret', label: 'Client Secret', secret: true }],
  paytabs: [{ key: 'profileId', label: 'Profile ID' }, { key: 'serverKey', label: 'Server Key', secret: true }],
  fawry: [{ key: 'merchantCode', label: 'Merchant Code' }, { key: 'secureKey', label: 'Secure Key', secret: true }],
  kashier: [{ key: 'merchantId', label: 'Merchant ID' }, { key: 'apiKey', label: 'Payment API Key', secret: true }, { key: 'secretKey', label: 'Secret API Key', secret: true }],
};
export const paytabsRegions = ['SAU', 'ARE', 'EGY', 'OMN', 'JOR', 'IRQ', 'KWT', 'GLOBAL'];
export function gatewaySummary(provider, config = {}) {
  const fields = {}, configuredSecrets = {};
  for (const field of gatewayFields[provider]) {
    if (field.secret) configuredSecrets[field.key] = !!config[field.key];
    else fields[field.key] = config[field.key] ?? '';
  }
  return { fields, configuredSecrets, mode: config.mode ?? 'sandbox', region: config.region ?? 'SAU' };
}
