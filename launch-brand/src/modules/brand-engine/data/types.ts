export type AppMode = "wizard" | "builder" | "dashboard";
export type Language = "en" | "ar";
export type Theme = "light" | "dark";
export type Device = "desktop" | "tablet" | "mobile";
export type DashboardSetupMode = "recommended" | "custom";
export type DashboardBundle = "ecommerce" | "agency" | "creator";
export type DashboardWidgetId =
  "profile" | "growth" | "summary" | "revenue" | "audience" | "performance" | "actions";
export type DashboardSection = "top" | "middle" | "bottom";

export interface Phase {
  id: number;
  title: string;
  titleAr: string;
  steps: number[];
}
export interface JourneyStep {
  id: number;
  phase: number;
  title: string;
  titleAr: string;
  short: string;
  shortAr: string;
  architecture?: boolean;
}
export interface BusinessType {
  id: string;
  label: string;
  labelAr: string;
  icon: string;
  image?: string;
  description: string;
  descriptionAr: string;
  recommendedModules?: string[];
  chatMessage?: string;
  chatMessageAr?: string;
}
export interface Template {
  id: string;
  name: string;
  category: string;
  tagline: string;
  accent: string;
  description: string;
  features: string[];
  preview: "coach" | "commerce" | "saas" | "agency" | "creator" | "academy" | "industry";
  sidebarStyle?: "dark" | "light" | "dual" | "compact" | "icons";
  nav?: string[];
  dashboardTitle?: string;
  metrics?: [string, string, string][];
  panels?: [string, string][];
}
export interface Module {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  icon: string;
  active: boolean;
}
export interface CalendarPost {
  id: number;
  day: number;
  channel: string;
  title: string;
  status: "ready" | "draft" | "scheduled";
}
export interface AiMessage {
  id: number;
  role: "assistant" | "user";
  content: string;
}
export interface PlatformBuilderMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
}
export type PlatformNodeKind = "page" | "workflow" | "data" | "ai";
export interface PlatformBlueprintNode {
  id: string;
  title: string;
  description: string;
  kind: PlatformNodeKind;
  children?: PlatformBlueprintNode[];
}
export interface PlatformBlueprint {
  name: string;
  summary: string;
  nodes: PlatformBlueprintNode[];
  updatedAt: string;
}
export type BrandMark = "prism" | "flow" | "serif" | "nodes" | "bilingual" | "burst";
export type BrandRasterLogoImage = {
  assetId: string;
  ownerUid: string;
  contentType: "image/png" | "image/jpeg" | "image/webp";
  model: string;
  width: number;
  height: number;
  // Present only while reviewing a new image; persisted identities use assetId.
  dataUrl?: string;
};
export type BrandVectorLogo = {
  image?: BrandRasterLogoImage;
  // Empty paths with a wordmark represent a name-only logo; never add a fallback symbol.
  paths: Array<{ d: string; fill: boolean; strokeWidth: number }>;
  concept?: string;
  wordmark?: {
    font: string;
    weight: number;
    letterSpacing: number;
    casing: "original" | "uppercase" | "lowercase";
    separator: boolean;
    descriptor: string;
  };
};
export interface BrandIdentity {
  id: string;
  name: string;
  tagline: string;
  palette: string;
  typography: string;
  mark: BrandMark;
  vibe: string;
  arabicName?: string;
  logo?: BrandVectorLogo;
}

export type BuilderBlockType =
  | "header"
  | "hero"
  | "features"
  | "testimonial"
  | "pricing"
  | "cta"
  | "footer"
  | "heading"
  | "text"
  | "image"
  | "video"
  | "button"
  | "badge"
  | "cards"
  | "grid"
  | "html";
export type BuilderAlign = "left" | "center" | "right";
export interface BuilderBlock {
  /** Explicit section override; omitted sections inherit the page's identity. */
  brandStyleLinked?: boolean;
  id: string;
  type: BuilderBlockType;
  label: string;
  eyebrow?: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaLink?: string;
  visible: boolean;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  align: BuilderAlign;
  textTone: "default" | "muted" | "accent";
  background: "light" | "dark" | "accent" | "gradient";
  padding: number;
  margin: number;
  columns: number;
  contentWidth: number;
  radius: number;
  buttonStyle: "primary" | "secondary" | "outline";
  buttonShape?: "rounded" | "pill" | "square";
  mediaUrl?: string;
  variant?:
    | "default"
    | "saas-dashboard"
    | "feature-grid"
    | "pricing-table"
    | "product-hero"
    | "product-grid"
    | "offer-banner"
    | "review-grid"
    | "agency-hero"
    | "portfolio-gallery"
    | "service-accordion"
    | "contact-form"
    | "creator-hero"
    | "video-feature"
    | "podcast-links"
    | "newsletter";
}
export interface BuilderTemplate {
  id: string;
  name: string;
  category: "SaaS" | "E-commerce" | "Agency" | "Creator" | "Portfolio" | "Startup";
  description: string;
  theme: "Light" | "Dark";
  tags: string[];
  accent: string;
  blocks: BuilderBlock[];
}
