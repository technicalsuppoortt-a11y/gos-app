import { useEffect, useState } from "react";
import { useAppSelector } from "@/modules/brand-engine/store/hooks";
import { useDashboardBrand } from "../useDashboardBrand";
import { createBrandLogoSvg, prepareBrandLogoSvg, logoDataUrl } from "@/modules/brand-engine/services/brandLogo";
import { selectBrandPreview } from "../gos-preview/model/selectBrandPreview";
import { dashboardLogo } from "../gos-preview/model/dashboardLogo";

/**
 * The brand being designed, in the shape gos-app's own dashboard reads
 * (backend/phoenixBrand.ts PhoenixConfiguration). Sent to the live gos pages
 * shown inside Launch Brand; nothing is saved on the gos side.
 */
export type LiveBrandConfiguration = {
  uid: string;
  brand: {
    name: string; tagline: string; description: string; business: string;
    language: "ar" | "en"; mode: "light" | "dark"; theme: unknown;
  };
  logo: string;
  logoHasWordmark: boolean;
  pages: Record<string, never>;
};

/** Same logo resolution GosPreviewBridge used for the old snapshot preview. */
export function useLiveBrandConfiguration(language?: "ar" | "en"): LiveBrandConfiguration {
  const state = useAppSelector((s) => s.brand);
  const brand = useDashboardBrand();
  const asset = state.pageParameters["branding"]?.["uploadedLogo"] as { assetId?: string; url?: string } | undefined;
  const signature = JSON.stringify({ identity: brand.identity, primary: brand.primary });
  const [prepared, setPrepared] = useState<{ signature: string; url: string } | null>(null);
  useEffect(() => {
    let active = true;
    if (!brand.logoUrl && !asset?.assetId && !asset?.url) {
      prepareBrandLogoSvg(brand.identity, brand.primary)
        .then((svg) => { if (active) setPrepared({ signature, url: logoDataUrl(svg) }); })
        .catch(() => {});
    }
    return () => { active = false; };
  }, [signature, brand.logoUrl, asset?.assetId, asset?.url]);
  const currentVector = prepared?.signature === signature
    ? prepared.url
    : logoDataUrl(createBrandLogoSvg(brand.identity, brand.primary));
  const logo = dashboardLogo(brand.logoUrl, asset, currentVector);
  const model = selectBrandPreview(state, logo);
  return {
    uid: model.owner,
    brand: {
      name: model.name,
      tagline: model.tagline,
      description: model.description || "",
      business: model.business || "",
      language: language ?? model.language,
      mode: model.theme === "dark" ? "dark" : "light",
      theme: model.design,
    },
    logo: model.logoUrl,
    logoHasWordmark: brand.generatedLogo || (!brand.logoUrl && !asset?.url),
    pages: {},
  };
}
