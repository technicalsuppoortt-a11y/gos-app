let recoveryTimer: ReturnType<typeof setTimeout> | undefined;
function clearRecoveryTimer() { if (recoveryTimer !== undefined) { clearTimeout(recoveryTimer); recoveryTimer = undefined; } }
export function isChunkError(error: unknown): boolean {
 const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
 return /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(message);
}
export async function retryImport<T>(loader: () => Promise<T>, delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))): Promise<T> {
 for (let attempt = 0; ; attempt++) {
  try { const result = await loader(); clearRecoveryTimer(); return result; }
  catch (error) { if (attempt >= 2 || !isChunkError(error)) throw error; await delay(250 * (attempt + 1)); }
 }
}
const reloadKey = 'gos.chunk-reload.at';
export function reloadForChunkError(error: unknown): boolean {
 if (!isChunkError(error) || typeof window === 'undefined') return false;
 try {
  const storage = window.sessionStorage;
  const last = Number(storage.getItem(reloadKey));
  if (last && Date.now() - last < 600000) return false;
  storage.setItem(reloadKey, String(Date.now()));
 } catch { return false; } // A persistent marker is required to prevent reload loops.
 try { window.location.reload(); return true; } catch { return false; }
}
export function installChunkRecovery(): () => void {
 if (typeof window === 'undefined') return () => {};
 const listener = (event: Event) => {
  const failure = event as Event & { payload?: unknown };
  if (!isChunkError(failure.payload)) return;
  clearRecoveryTimer();
  // Give the lazy loader time to finish its retries before refreshing the document.
  recoveryTimer = setTimeout(() => { recoveryTimer = undefined; reloadForChunkError(failure.payload); }, 1500);
 };
 window.addEventListener('vite:preloadError', listener);
 return () => { window.removeEventListener('vite:preloadError', listener); clearRecoveryTimer(); };
}
