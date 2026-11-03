import bundledZones from './timezones.json';
export function getTimeZoneOptions(current = '') {
  let zones: readonly string[] = bundledZones;
  try { if (typeof Intl.supportedValuesOf === 'function') zones = [...bundledZones, ...Intl.supportedValuesOf('timeZone')]; } catch { /* Bundled IANA catalog supports older browsers. */ }
  const values = new Set(['UTC', ...zones]);
  if (current) { try { new Intl.DateTimeFormat('en', { timeZone: current }); values.add(current); } catch { /* Reject invalid persisted values. */ } }
  return [...values].sort((a, b) => a === 'UTC' ? -1 : b === 'UTC' ? 1 : a.localeCompare(b)).map(value => ({ value, label: value.replaceAll('_', ' ') }));
}
