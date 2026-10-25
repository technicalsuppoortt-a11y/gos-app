export const trackingDefaults = Object.freeze({ schemaVersion: 1, metaId: '', googleId: '', enabled: false, customEvents: [], advancedMode: false, webhookUrl: '' });
export function normalizeTrackingConfig(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid tracking configuration.');
  const c = { ...trackingDefaults, ...input,
    metaId: input.metaId ?? input.meta?.pixel?.id ?? '', googleId: input.googleId ?? input.google?.property?.measurementId ?? '',
    enabled: input.enabled ?? Boolean(input.meta?.connected || input.google?.connected),
  };
  const text = (key, max) => { if (typeof c[key] !== 'string' || c[key].length > max) throw new Error(`Invalid ${key}.`); return c[key].trim(); };
  const metaId = text('metaId', 64), googleId = text('googleId', 64).toUpperCase(), webhookUrl = text('webhookUrl', 1000);
  if (metaId && !/^\d{10,16}$/.test(metaId)) throw new Error('Meta Pixel ID must contain 10–16 digits.');
  if (googleId && !/^G-[A-Z0-9]{4,20}$/.test(googleId)) throw new Error('Enter a valid GA4 Measurement ID (G-XXXXXXXX).');
  if (typeof c.enabled !== 'boolean' || typeof c.advancedMode !== 'boolean') throw new Error('Tracking flags must be true or false.');
  if (!Array.isArray(c.customEvents) || c.customEvents.length > 50 || c.customEvents.some(e => typeof e !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(e))) throw new Error('Event names must start with a letter and contain up to 40 letters, digits or underscores.');
  if (webhookUrl) { let url; try { url = new URL(webhookUrl); } catch { throw new Error('Enter a valid HTTPS webhook URL.'); } if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Webhook URL must use HTTPS without embedded credentials.'); }
  return { schemaVersion: 1, metaId, googleId, enabled: c.enabled, customEvents: [...new Set(c.customEvents)], advancedMode: c.advancedMode, webhookUrl };
}
