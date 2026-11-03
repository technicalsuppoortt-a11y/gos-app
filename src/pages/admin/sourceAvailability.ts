export type SourceAvailability = 'ready' | 'loading' | 'partial' | 'unavailable';
export function sourceAvailability(resources: readonly string[], workspaceIds: readonly string[], failures: Readonly<Record<string, string>>, pending: readonly string[], directoryError = ''): SourceAvailability {
  if (directoryError) return 'unavailable';
  if (pending.includes('directory')) return 'loading';
  const relevant = (source: string) => resources.includes(source.split('/').at(-1) ?? '');
  if (pending.some(relevant)) return 'loading';
  const failed = Object.keys(failures).filter(relevant);
  if (!failed.length) return 'ready';
  if (workspaceIds.length > 0 && resources.every(resource => workspaceIds.every(id => !!failures[`${id}/${resource}`]))) return 'unavailable';
  return 'partial';
}
