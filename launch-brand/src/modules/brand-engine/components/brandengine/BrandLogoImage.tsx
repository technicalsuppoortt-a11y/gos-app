import { useEffect, useState } from "react";
import type { BrandIdentity } from "@/modules/brand-engine/data/types";
import { createBrandLogoSvg, createBrandLogoCardSvg, logoDataUrl, prepareBrandLogoSvg, isRasterBrandLogo, resolveBrandLogoImage, brandLogoImageUrl, withLogoDrawAnimation } from "@/modules/brand-engine/services/brandLogo";

export function BrandLogoImage({
  identity,
  primary,
  monochrome,
  className,
  layout = "horizontal",
  palette,
  draw = false,
}: {
  identity: BrandIdentity;
  primary: string;
  monochrome?: "light" | "dark" | undefined;
  className?: string;
  layout?: "horizontal" | "card";
  /** Identity colors for the mark's shapes (primary, secondary, accent). */
  palette?: string[] | undefined;
  /** Draw the vector logo step by step in front of the customer. */
  draw?: boolean;
}) {
  const signature = JSON.stringify({ identity, primary, monochrome, layout, palette, draw });
  const [ready, setReady] = useState<{ signature: string; url: string } | null>(null);
  useEffect(() => {
    let active = true;
    if (isRasterBrandLogo(identity)) {
      resolveBrandLogoImage(identity).then(url => {
        if (active) setReady({ signature, url });
      }).catch(() => { /* The saved-image status reports load errors. */ });
      return () => { active = false; };
    }
    prepareBrandLogoSvg(identity, primary, { monochrome, palette })
      .then((svg) => {
        if (active) setReady({ signature, url: logoDataUrl(layout === "card" ? createBrandLogoCardSvg(identity, primary) : draw ? withLogoDrawAnimation(svg) : svg) });
      })
      .catch(() => {
        /* Keep the readable preview; export reports font failures. */
      });
    return () => {
      active = false;
    };
  }, [signature]);
  return (
    <img
      className={className}
      src={
        ready?.signature === signature
          ? ready.url
          : brandLogoImageUrl(identity) || logoDataUrl(layout === "card" ? createBrandLogoCardSvg(identity, primary) : createBrandLogoSvg(identity, primary, { monochrome, palette }))
      }
      alt={`${identity.name} logo`}
    />
  );
}
