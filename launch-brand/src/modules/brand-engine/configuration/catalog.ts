import seed from './discoverySeed.json';
import type { DiscoveryCatalog } from '../data/discovery';

// The original source catalog keeps new unified accounts usable before an
// administrator publishes a custom catalog. Live releases always take priority.
export const starterCatalog = seed as unknown as DiscoveryCatalog;
export function catalogOrStarter(value: unknown, version?: string): unknown {
  return value ?? (!version || version === starterCatalog.version ? starterCatalog : undefined);
}
