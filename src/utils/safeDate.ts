/** Accept persisted ISO strings, milliseconds and Firestore timestamps. */
export function safeDate(value: unknown): Date | null {
  try {
    if (value === null || value === undefined || value === '') return null;
    let date: Date;
    if (value instanceof Date) date = value;
    else if (typeof value === 'string' || typeof value === 'number') date = new Date(value);
    else if (typeof value === 'object') {
      const raw = value as { toDate?: () => Date; toMillis?: () => number; seconds?: number; nanoseconds?: number };
      if (typeof raw.toDate === 'function') date = raw.toDate();
      else if (typeof raw.toMillis === 'function') date = new Date(raw.toMillis());
      else if (typeof raw.seconds === 'number') date = new Date(raw.seconds * 1000 + (raw.nanoseconds ?? 0) / 1000000);
      else return null;
    } else return null;
    return Number.isFinite(date.getTime()) ? date : null;
  } catch { return null; }
}
