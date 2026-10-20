type Row = { id: string; [key: string]: any };
type AssetWorkspace = { assets: Row[]; domains: Row[] };
export type AssetWrite = { resource: 'assets' | 'domains'; id: string; value?: Row };

export function workspaceWrites(previous: AssetWorkspace, next: AssetWorkspace, retry: AssetWrite[] = []): AssetWrite[] {
  const writes: AssetWrite[] = [];
  for (const resource of ['assets', 'domains'] as const) {
    const rows = next[resource];
    if (!Array.isArray(rows) || rows.some(row => !row || typeof row.id !== 'string' || !/^[\w-]{1,150}$/.test(row.id)) || new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Each workspace record must have a unique valid ID.');
    const before = new Map(previous[resource].map(row => [row.id, row]));
    const dirty = new Set(retry.filter(write => write.resource === resource).map(write => write.id));
    // Include earlier unconfirmed writes so a newer draft repairs a failed save.
    for (const row of rows) if (dirty.has(row.id) || JSON.stringify(before.get(row.id)) !== JSON.stringify(row)) writes.push({ resource, id: row.id, value: row });
    const ids = new Set(rows.map(row => row.id));
    for (const id of new Set([...before.keys(), ...dirty])) if (!ids.has(id)) writes.push({ resource, id });
  }
  if (writes.length > 450) throw new Error('Save fewer than 450 assets and domains together.');
  for (const domain of next.domains) {
    if (domain.assetId && !next.assets.some(asset => asset.id === domain.assetId)) throw new Error('Choose an existing asset for this domain.');
  }
  return writes;
}

/** Serializes saves, protects optimistic drafts from older listener echoes, and
 * commits asset/domain reassignment in one atomic backend operation. */
export function createAssetPersistence(deps: {
  scope: () => string;
  read: () => AssetWorkspace;
  publish: (workspace: AssetWorkspace) => void;
  commit: (scope: string, writes: AssetWrite[]) => Promise<unknown>;
}) {
  let queue: Promise<unknown> = Promise.resolve();
  let generation = 0;
  let revision = 0;
  let protectedDraft = false;
  let lastError: unknown;
  const dirty = new Map<string, AssetWrite>();
  return {
    isProtected: () => protectedDraft,
    mergeSnapshot(resource: 'assets' | 'domains', rows: Row[]) {
      if (!protectedDraft) return rows;
      const changed = new Set([...dirty.values()].filter(write => write.resource === resource).map(write => write.id));
      return [...rows.filter(row => !changed.has(row.id)), ...deps.read()[resource].filter(row => changed.has(row.id))];
    },
    reset() { generation++; revision++; protectedDraft = false; lastError = undefined; dirty.clear(); queue = Promise.resolve(); },
    flush: async () => {
      for (;;) {
        const tail = queue;
        try { await tail; } catch (error) { if (tail === queue) throw error; }
        if (tail === queue) break;
      }
      if (lastError) throw lastError;
    },
    save(next: AssetWorkspace): Promise<unknown> {
      const scope = deps.scope();
      if (!scope) throw new Error('Your workspace is still loading. Please try again.');
      const previous = deps.read();
      const writes = workspaceWrites(previous, next, [...dirty.values()]);
      if (!writes.length) return queue;
      for (const write of writes) dirty.set(`${write.resource}/${write.id}`, write);
      const currentRevision = ++revision, currentGeneration = generation;
      protectedDraft = true; lastError = undefined;
      deps.publish(next);
      const pending = queue.catch(() => {}).then(async () => {
        if (generation !== currentGeneration || deps.scope() !== scope) throw new Error('The workspace changed before this draft could be saved.');
        await deps.commit(scope, writes);
        if (currentRevision === revision && generation === currentGeneration) { protectedDraft = false; lastError = undefined; dirty.clear(); }
      }).catch(error => {
        // Keep the current draft in memory on backend failure; never replace it
        // with an older snapshot or call it a browser-storage problem.
        if (currentRevision === revision && generation === currentGeneration) lastError = error;
        throw error;
      });
      queue = pending;
      void pending.catch(() => {});
      return pending;
    },
  };
}
