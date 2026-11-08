import type { BrandIdentity } from "./types";

export type ReadySaasCategory = "proven" | "new";
export type ReadySaas = {
  id: string;
  name: string;
  nameAr: string;
  category: ReadySaasCategory;
  description: string;
  descriptionAr: string;
  headline: string;
  headlineAr: string;
  core: string[];
  integrations: string[];
  metrics?: { revenue: number; owners: number; source: "demo" };
};
export const readySaasCatalog: ReadySaas[] = [
  {
    id: "clientflow",
    name: "ClientFlow OS",
    nameAr: "منصة ClientFlow",
    category: "proven",
    description: "A complete workspace for client relationships, bookings and recurring services.",
    descriptionAr: "مساحة متكاملة لإدارة العملاء والحجوزات والخدمات المتكررة.",
    headline: "Your clients. Your calendar. One workspace.",
    headlineAr: "عملاؤك ومواعيدك في مساحة واحدة.",
    core: ["crm", "calendar", "analytics"],
    integrations: ["payments", "whatsapp", "assistant"],
    metrics: { revenue: 45000, owners: 120, source: "demo" },
  },
  {
    id: "academylaunch",
    name: "AcademyLaunch",
    nameAr: "منصة AcademyLaunch",
    category: "proven",
    description: "Launch a branded learning business with courses, a community and reporting.",
    descriptionAr: "أطلق نشاطاً تعليمياً بهويتك مع الدورات والمجتمع والتقارير.",
    headline: "Turn your expertise into a learning destination.",
    headlineAr: "حوّل خبرتك إلى وجهة للتعلّم.",
    core: ["courses", "community", "analytics"],
    integrations: ["payments", "mail", "assistant"],
    metrics: { revenue: 78000, owners: 210, source: "demo" },
  },
  {
    id: "studiodesk",
    name: "StudioDesk",
    nameAr: "منصة StudioDesk",
    category: "new",
    description: "A fresh starting point for studios to manage leads, appointments and campaigns.",
    descriptionAr: "بداية جاهزة للاستوديوهات لإدارة العملاء المحتملين والمواعيد والحملات.",
    headline: "Give your creative business room to grow.",
    headlineAr: "امنح نشاطك الإبداعي مساحة للنمو.",
    core: ["crm", "calendar", "landing"],
    integrations: ["mail", "payments", "whatsapp"],
  },
  {
    id: "communitynest",
    name: "CommunityNest",
    nameAr: "منصة CommunityNest",
    category: "new",
    description: "A membership workspace for conversations, learning and community growth.",
    descriptionAr: "مساحة عضويات للمحادثات والتعلّم ونمو المجتمع.",
    headline: "Bring your people together under your brand.",
    headlineAr: "اجمع مجتمعك تحت علامتك التجارية.",
    core: ["community", "courses", "analytics"],
    integrations: ["payments", "assistant", "mail"],
  },
];

export type ReadySaasBrand = {
  name: string;
  business: string;
  tagline: string;
  palette: string;
  typography: string;
  logo: BrandIdentity;
};
export type ReadySaasSelection = { id: string; brand: ReadySaasBrand };
export function readySaasBrand(state: {
  brandName: string;
  business: string;
  tagline: string;
  brandPalette: string;
  fontPersonality: string;
  selectedBrandIdentity: BrandIdentity;
}): ReadySaasBrand {
  const name = state.brandName.trim() || state.selectedBrandIdentity.name;
  return {
    name,
    business: state.business,
    tagline: state.tagline,
    palette: state.brandPalette,
    typography: state.fontPersonality,
    logo: {
      ...state.selectedBrandIdentity,
      name,
      palette: state.brandPalette,
      typography: state.fontPersonality,
    },
  };
}
export function activeReadySaas(state: {
  selectedTemplate: string;
  readySaasSelection?: ReadySaasSelection | null;
}) {
  const selection = state.readySaasSelection;
  if (!selection || state.selectedTemplate !== `ready:${selection.id}`) return null;
  const item = readySaasCatalog.find((entry) => entry.id === selection.id);
  return item ? { item, brand: selection.brand } : null;
}
