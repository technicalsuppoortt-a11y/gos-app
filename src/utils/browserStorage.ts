export function storageGet(key: string): string | null {
 try { return typeof localStorage === 'undefined' ? null : localStorage.getItem(key); } catch { return null; }
}
export function storageSet(key: string, value: string): boolean {
 try { if (typeof localStorage === 'undefined') return false; localStorage.setItem(key, value); return true; } catch { return false; }
}
