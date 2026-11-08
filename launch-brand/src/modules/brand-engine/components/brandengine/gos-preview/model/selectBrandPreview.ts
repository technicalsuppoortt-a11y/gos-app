import type { BrandState } from "@/modules/brand-engine/store/brandSlice";
import type { DiscoveryDraft } from "@/modules/brand-engine/data/discoveryProfile";
import { dashboardBrand } from "@/modules/brand-engine/data/dashboardBrand";
import { dashboardSettings } from "@/modules/brand-engine/data/dashboardSettings";
import type { BrandPreviewModel } from "./types";

const text = (value: unknown) => (typeof value === "string" ? value : "");
export function selectBrandPreview(state: BrandState, logoUrl = ""): BrandPreviewModel {
  const discovery = state.pageParameters["business_discovery"]?.["discoverDraft"] as Partial<DiscoveryDraft> | undefined;
  const preferredLanguage = discovery?.profile?.language === "both"
    ? discovery.profile.defaultLanguage
    : discovery?.profile?.language;
  const language = preferredLanguage === "ar" || preferredLanguage === "en" ? preferredLanguage : state.language;
  const brand = dashboardBrand(state);
  const profile = state.pageParameters["dashboard"]?.["workspaceProfile"] as
    Record<string, unknown> | undefined;
  return {
    owner: state.userProfile?.uid ?? "signed-out",
    name: brand.name,
    tagline: brand.tagline,
    primary: brand.theme[state.theme].primary,
    design: brand.theme,
    keepDashboardColors: brand.theme.paletteId === "dashboard-default",
    onPrimary: brand.onPrimary,
    bodyFont: brand.theme.typography.body,
    headingFont: brand.theme.typography.heading,
    arabicFont: brand.theme.typography.arabic,
    logoUrl,
    accountName:
      text(profile?.["fullName"]) ||
      state.userProfile?.displayName ||
      (language === "ar" ? "حسابك" : "Your account"),
    accountEmail: text(profile?.["email"]) || state.userProfile?.email || "",
    accountPhoto: text(state.pageParameters["dashboard"]?.["workspaceProfilePhoto"]),
    business: state.business,
    description: state.brandDescription || state.businessDescription,
    audience: state.targetAudience,
    theme: state.theme,
    language,
    groups: dashboardSettings(state, language === "ar").map((group) => ({
      id: group.id,
      title: language === "ar" ? group.ar : group.en,
      rows: group.rows.map(({ label, value, image }) => ({ label, value, image })),
    })),
  };
}
