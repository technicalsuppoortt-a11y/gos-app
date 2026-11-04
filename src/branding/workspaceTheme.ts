import type { PhoenixBrand } from '../backend/phoenixBrand';
import type { WorkspacePreferences } from '../backend/workspacePreferences';

export const themePaletteDetails: Record<
  WorkspacePreferences['theme'],
  {
    primary: string;
    accent: string;
    soft: string;
    hover: string;
    darkBg: string;
    badge: [string, string];
    desc: [string, string];
  }
> = {
  violet: {
    primary: '#6d28d9',
    accent: '#c4b5fd',
    soft: '#ede9fe',
    hover: '#5b21b6',
    darkBg: '#111827',
    badge: ['Default Brand', 'السمة الافتراضية'],
    desc: ['Signature royal violet & indigo contrast', 'بنفسجي ملكي متوازن وعصري'],
  },
  slate: {
    primary: '#334155',
    accent: '#cbd5e1',
    soft: '#e2e8f0',
    hover: '#1e293b',
    darkBg: '#0f172a',
    badge: ['Minimal Pro', 'احترافي هادئ'],
    desc: ['Crisp architectural slate & neutral tones', 'درجات رمادية نظيفة ومريحة للعين'],
  },
  midnight: {
    primary: '#4338ca',
    accent: '#a5b4fc',
    soft: '#e0e7ff',
    hover: '#3730a3',
    darkBg: '#080e21',
    badge: ['High Contrast', 'تباين عالي'],
    desc: ['Electric indigo with deep midnight surfaces', 'نيلي غامق مع تباين واضح وحديث'],
  },
  emerald: {
    primary: '#047857',
    accent: '#6ee7b7',
    soft: '#d1fae5',
    hover: '#065f46',
    darkBg: '#0c1917',
    badge: ['Enterprise', 'مؤسسي'],
    desc: ['Refined emerald green for growth & finance', 'أخضر زمردي أنيق للنمو والأعمال'],
  },
  amber: {
    primary: '#d97706',
    accent: '#fcd34d',
    soft: '#fef3c7',
    hover: '#b45309',
    darkBg: '#18130d',
    badge: ['Warm Energy', 'دافئ وحيوي'],
    desc: ['Golden sunset amber with warm highlights', 'عنبر ذهبي دافئ بلمسات مشرقة'],
  },
  ocean: {
    primary: '#0284c7',
    accent: '#7dd3fc',
    soft: '#e0f2fe',
    hover: '#0369a1',
    darkBg: '#0b1622',
    badge: ['Modern SaaS', 'تقني حديث'],
    desc: ['Clear ocean cyan for modern cloud teams', 'أزرق محيطي صافٍ للفرق التقنية'],
  },
  royal: {
    primary: '#7e22ce',
    accent: '#d8b4fe',
    soft: '#f3e8ff',
    hover: '#6b21a8',
    darkBg: '#13091f',
    badge: ['Royal Luxury', 'ملكي فاخر'],
    desc: ['Vibrant royal purple with noble highlights', 'أرجواني ملكي فاخر للمشاريع الرائدة'],
  },
  crimson: {
    primary: '#be123c',
    accent: '#fda4af',
    soft: '#ffe4e6',
    hover: '#9f1239',
    darkBg: '#1c0a10',
    badge: ['Executive', 'تنفيذي قيادي'],
    desc: ['Bold crimson red for high-impact leadership', 'قرمزي جريء للعلامات التجارية القيادية'],
  },
  cyber: {
    primary: '#0d9488',
    accent: '#5eead4',
    soft: '#ccfbf1',
    hover: '#0f766e',
    darkBg: '#041716',
    badge: ['Tech Futuristic', 'تقني مستقبلي'],
    desc: ['High-tech cyber teal with luminous accents', 'تيل سيبراني تقني بلمسات متوهجة'],
  },
  minimalist: {
    primary: '#18181b',
    accent: '#a1a1aa',
    soft: '#f4f4f5',
    hover: '#09090b',
    darkBg: '#09090b',
    badge: ['Monochrome', 'أحادي نقي'],
    desc: ['Pure black & white aesthetic for design purists', 'تصميم أحادي نقي لمحبي البساطة المطلقة'],
  },
};

export function workspaceTheme(id: WorkspacePreferences['theme']): NonNullable<PhoenixBrand['theme']> {
  const p = themePaletteDetails[id] ?? themePaletteDetails.violet;
  return {
    paletteId: `workspace-${id}`,
    light: {
      primary: p.primary,
      buttonBackground: p.primary,
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#172033',
      mutedText: '#475569',
      border: '#cbd5e1',
      soft: p.soft,
      success: '#047857',
      headerBackground: '#ffffff',
      footerBackground: '#ffffff',
    },
    dark: {
      primary: p.accent,
      buttonBackground: p.primary,
      background: p.darkBg,
      surface: '#1e293b',
      text: '#f1f5f9',
      mutedText: '#cbd5e1',
      border: '#475569',
      soft: '#273449',
      success: '#6ee7b7',
      headerBackground: '#1e293b',
      footerBackground: '#1e293b',
    },
    typography: { heading: 'Inter', body: 'Inter', arabic: 'Cairo' },
    buttons: { shape: 'rounded', variant: 'solid' },
    appearance: { radius: 12, shadow: 'soft', density: 'comfortable' },
  };
}
