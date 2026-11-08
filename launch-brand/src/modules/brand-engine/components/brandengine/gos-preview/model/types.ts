import type { BrandTheme } from '@/modules/brand-engine/data/brandTheme';
export type PreviewTheme = "light" | "dark";
export type PreviewLanguage = "en" | "ar";
export type PreviewValue =
  string | boolean | number | null | PreviewValue[] | { [key: string]: PreviewValue };
export type PreviewChoiceGroup = {
  id: string;
  title: string;
  rows: { label: string; value: string; image: boolean }[];
};
/** A read-only projection. Never contains the store, credentials or callbacks. */
export type BrandPreviewModel = {
  owner: string;
  name: string;
  tagline: string;
  primary: string;
  onPrimary: string;
  bodyFont: string;
  headingFont: string;
  arabicFont: string;
  logoUrl: string;
  logoHasWordmark?: boolean;
  accountName: string;
  accountEmail: string;
  accountPhoto: string;
  business: string;
  description: string;
  audience: string;
  theme: PreviewTheme;
  language: PreviewLanguage;
  groups: PreviewChoiceGroup[];
  design?: BrandTheme;
  keepDashboardColors?: boolean;
};
export type PreviewSnapshot = {
  path: string;
  title: string;
  shell: string;
  profileShell?: string;
  mobileShell?: string;
  html: string;
  states: Record<string, PreviewValue>;
};
export type PreviewChromeSnapshot = Omit<PreviewSnapshot, "html">;
