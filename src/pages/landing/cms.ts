import { landingContent, type LandingCopy } from './landing-content';
import { storageGet, storageSet } from '../../utils/browserStorage';
import { isDemoSessionActive } from '../../demo/mode';

export type LandingCMS = {
  en: LandingCopy;
  ar: LandingCopy;
  bookingUrl: string;
  loginUrl: string;
  pricingTitle: { en: string; ar: string };
  pricingDescription: { en: string; ar: string };
  pricingCTA: { en: string; ar: string };
  pricing: {
    name: string;
    nameAr: string;
    monthly: number;
    annual: number;
    features: string;
    featuresAr: string;
  }[];
  publishedAt?: string;
  updatedAt?: string;
};

export const cmsEvent = 'gos:landing-published';

export function defaultCMS(): LandingCMS {
  return {
    en: structuredClone(landingContent.en),
    ar: structuredClone(landingContent.ar),
    bookingUrl: '/dashboard/booking',
    loginUrl: '/login',
    pricingTitle: { en: 'A plan for every stage', ar: 'خطة مناسبة لكل مرحلة' },
    pricingDescription: {
      en: 'Choose the right plan for your business growth.',
      ar: 'اختر الخطة المناسبة لنمو أعمالك.',
    },
    pricingCTA: { en: 'Get started', ar: 'ابدأ الآن' },
    pricing: [
      {
        name: 'Starter',
        nameAr: 'البداية',
        monthly: 29,
        annual: 290,
        features: 'CRM · Booking · 3 users',
        featuresAr: 'علاقات العملاء · الحجوزات · 3 مستخدمين',
      },
      {
        name: 'Pro',
        nameAr: 'احترافي',
        monthly: 79,
        annual: 790,
        features: 'All tools · AI · 15 users',
        featuresAr: 'كل الأدوات · الذكاء الاصطناعي · 15 مستخدماً',
      },
      {
        name: 'Agency',
        nameAr: 'وكالة',
        monthly: 199,
        annual: 1990,
        features: 'White label · 100 users',
        featuresAr: 'علامة تجارية مخصصة · 100 مستخدم',
      },
    ],
  };
}

function mergeMatchingShape<T>(candidate: unknown, base: T): T {
  if (Array.isArray(base)) {
    if (!Array.isArray(candidate) || candidate.length !== base.length) return structuredClone(base);
    return base.map((item, idx) => mergeMatchingShape(candidate[idx], item)) as unknown as T;
  }
  if (base && typeof base === 'object') {
    if (!candidate || typeof candidate !== 'object') return structuredClone(base);
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(base as Record<string, unknown>)) {
      out[key] = mergeMatchingShape((candidate as Record<string, unknown>)[key], item);
    }
    return out as T;
  }
  if (typeof candidate === typeof base && (typeof base !== 'number' || Number.isFinite(candidate as number))) {
    return candidate as T;
  }
  return base;
}

export function normalizeCMS(rawValue: unknown, fallback = defaultCMS()): LandingCMS | null {
  if (!rawValue || typeof rawValue !== 'object') return null;
  const src = rawValue as Record<string, unknown>;
  const bookingUrl = typeof src.bookingUrl === 'string' && safeLink(src.bookingUrl) ? src.bookingUrl : fallback.bookingUrl;
  const loginUrl = typeof src.loginUrl === 'string' && safeLink(src.loginUrl) ? src.loginUrl : fallback.loginUrl;
  const merged: LandingCMS = {
    en: mergeMatchingShape(src.en, fallback.en),
    ar: mergeMatchingShape(src.ar, fallback.ar),
    bookingUrl,
    loginUrl,
    pricingTitle: mergeMatchingShape(src.pricingTitle, fallback.pricingTitle),
    pricingDescription: mergeMatchingShape(src.pricingDescription, fallback.pricingDescription),
    pricingCTA: mergeMatchingShape(src.pricingCTA, fallback.pricingCTA),
    pricing: Array.isArray(src.pricing) && src.pricing.length > 0
      ? src.pricing
          .slice(0, 12)
          .map((item, idx) => mergeMatchingShape(item, fallback.pricing[idx % fallback.pricing.length]!))
      : structuredClone(fallback.pricing),
    ...(typeof src.publishedAt === 'string' ? { publishedAt: src.publishedAt } : {}),
    ...(typeof src.updatedAt === 'string' ? { updatedAt: src.updatedAt } : {}),
  };
  return merged;
}

export function readCMS(draft = false): LandingCMS {
  const fallback = defaultCMS();
  try {
    const raw = storageGet(draft ? 'gos.landing.draft.v1' : 'gos.landing.published.v1');
    if (!raw && draft) return readCMS(false);
    if (!raw) return fallback;
    const normalized = normalizeCMS(JSON.parse(raw), fallback);
    if (normalized) return normalized;
  } catch {
    /* Use shipped copy. */
  }
  return fallback;
}

export function writeCMS(value: LandingCMS, draft = false) {
  const saved = storageSet(draft ? 'gos.landing.draft.v1' : 'gos.landing.published.v1', JSON.stringify(value));
  if (saved) window.dispatchEvent(new Event(cmsEvent));
  return saved;
}

export async function publishCMS(value: LandingCMS, draft = false): Promise<{ local: boolean; cloud: boolean }> {
  const timestamp = new Date().toISOString();
  const payload: LandingCMS = {
    ...value,
    ...(draft ? {} : { publishedAt: timestamp }),
    updatedAt: timestamp,
  };
  const local = writeCMS(payload, draft);
  if (!draft && local) {
    writeCMS(payload, true);
  }
  if (isDemoSessionActive()) return { local, cloud: false };
  try {
    const [{ doc, setDoc }, firebaseMod] = await Promise.all([
      import('firebase/firestore'),
      import('../../backend/firebase'),
    ]);
    const targetDb = firebaseMod.primaryDb ?? firebaseMod.db;
    if (!targetDb) return { local, cloud: false };
    await setDoc(doc(targetDb, 'settings', draft ? 'landingContentDraft' : 'landingContent'), payload);
    if (!draft) {
      await setDoc(doc(targetDb, 'settings', 'landingContentDraft'), payload).catch(() => {});
    }
    return { local, cloud: true };
  } catch {
    return { local, cloud: false };
  }
}

export function subscribeCMS(draft: boolean, onChange: (cms: LandingCMS) => void): () => void {
  const refreshLocal = () => onChange(readCMS(draft));
  window.addEventListener(cmsEvent, refreshLocal);
  window.addEventListener('storage', refreshLocal);
  let disposed = false;
  let unsubscribeFirestore: (() => void) | null = null;

  if (!isDemoSessionActive()) {
    void (async () => {
      try {
        const [{ doc, onSnapshot }, firebaseMod] = await Promise.all([
          import('firebase/firestore'),
          import('../../backend/firebase'),
        ]);
        const targetDb = firebaseMod.primaryDb ?? firebaseMod.db;
        if (disposed || !targetDb) return;
        unsubscribeFirestore = onSnapshot(
          doc(targetDb, 'settings', draft ? 'landingContentDraft' : 'landingContent'),
          snapshot => {
            if (disposed || !snapshot.exists()) return;
            const normalized = normalizeCMS(snapshot.data());
            if (!normalized) return;
            storageSet(draft ? 'gos.landing.draft.v1' : 'gos.landing.published.v1', JSON.stringify(normalized));
            onChange(normalized);
          },
          () => {
            /* Keep local/shipped copy when offline or unauthenticated on draft. */
          },
        );
      } catch {
        /* Demo or offline environment without Firestore. */
      }
    })();
  }

  return () => {
    disposed = true;
    window.removeEventListener(cmsEvent, refreshLocal);
    window.removeEventListener('storage', refreshLocal);
    unsubscribeFirestore?.();
  };
}

export function safeLink(value: string) {
  if (typeof value !== 'string' || /[\\\s]/.test(value) || Array.from(value).some(c => c.charCodeAt(0) < 32)) return false;
  if (/^\/(?!\/)/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function contentLeaves(value: unknown, path: string[] = []): { path: string[]; value: string | number }[] {
  if (typeof value === 'string' || typeof value === 'number') {
    return ['id', 'kind', 'suffix', 'langLabel', 'from'].includes(path.at(-1) ?? '') ? [] : [{ path, value }];
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => contentLeaves(item, [...path, key]));
  }
  return [];
}

export function setContentValue(copy: LandingCopy, path: string[], value: string | number): LandingCopy {
  const next = structuredClone(copy);
  let cursor = next as unknown as Record<string, unknown>;
  for (const key of path.slice(0, -1)) cursor = cursor[key] as Record<string, unknown>;
  cursor[path.at(-1)!] = value;
  return next;
}
