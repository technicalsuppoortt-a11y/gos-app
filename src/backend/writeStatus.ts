let writes = 0;
export const hasPendingWrites = () => writes > 0;
export function beginWrite() { writes++; let done = false; return () => { if (!done) { done = true; writes = Math.max(0, writes - 1); } }; }
