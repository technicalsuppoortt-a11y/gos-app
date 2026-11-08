import { useEffect, useState } from "react";
import type { BrandIdentity } from "@/modules/brand-engine/data/types";
import { createBrandLogoSvg, createBrandLogoCardSvg, logoDataUrl, prepareBrandLogoSvg, isRasterBrandLogo, resolveBrandLogoImage, brandLogoImageUrl } from "@/modules/brand-engine/services/brandLogo";

export function BrandLogoImage({
  identity,
  primary,
  monochrome,
  className,
  layout = "horizontal",
}: {
  identity: BrandIdentity;
  primary: string;
  monochrome?: "light" | "dark" | undefined;
  className?: string;
  layout?: "horizontal" | "card";
}) {
  const signature = JSON.stringify({ identity, primary, monochrome, layout });
  const [ready, setReady] = useState<{ signature: string; url: string } | null>(null);
  useEffect(() => {
    let active = true;
    if (isRasterBrandLogo(identity)) {
      resolveBrandLogoImage(identity).then(url => {
        if (active) setReady({ signature, url });
      }).catch(() => { /* The saved-image status reports load errors. */ });
      return () => { active = false; };
    }
    prepareBrandLogoSvg(identity, primary, { monochrome })
      .then((svg) => {
        if (active) setReady({ signature, url: logoDataUrl(layout === "card" ? createBrandLogoCardSvg(identity, primary) : svg) });
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
          : brandLogoImageUrl(identity) || logoDataUrl(layout === "card" ? createBrandLogoCardSvg(identity, primary) : createBrandLogoSvg(identity, primary, { monochrome }))
      }
      alt={`${identity.name} logo`}
    />
  );
}
