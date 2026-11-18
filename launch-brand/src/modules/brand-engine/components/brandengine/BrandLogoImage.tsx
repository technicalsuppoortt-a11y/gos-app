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
  onLoad,
  onError,
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
  onLoad?: () => void;
  onError?: () => void;
}) {
  const signature = JSON.stringify({ identity, primary, monochrome, layout, palette, draw });
  const [ready, setReady] = useState<{ signature: string; url: string } | null>(null);
  useEffect(() => {
    let active = true;
    if (isRasterBrandLogo(identity)) {
      resolveBrandLogoImage(identity).then(url => {
        if (!url) throw new Error("Logo image unavailable");
        if (active) setReady({ signature, url });
      }).catch(() => { if (active) onError?.(); });
      return () => { active = false; };
    }
    prepareBrandLogoSvg(identity, primary, { monochrome, palette })
      .then((svg) => {
        if (active) setReady({ signature, url: logoDataUrl(layout === "card" ? createBrandLogoCardSvg(identity, primary) : draw ? withLogoDrawAnimation(svg) : svg) });
      })
      .catch(() => {
        // Optional web-font preparation must not hide otherwise valid artwork.
        // The SVG can still use its declared font stack and the same draw reveal.
        if (!active) return;
        try {
          const svg = layout === "card" ? createBrandLogoCardSvg(identity, primary)
            : createBrandLogoSvg(identity, primary, { monochrome, palette });
          setReady({ signature, url: logoDataUrl(draw && layout !== "card" ? withLogoDrawAnimation(svg) : svg) });
        } catch { onError?.(); }
      });
    return () => {
      active = false;
    };
  }, [signature]);
  const drawingPending = draw && ready?.signature !== signature;
  return (
    <img
      className={className}
      src={
        ready?.signature === signature
          ? ready.url
          : drawingPending ? undefined : brandLogoImageUrl(identity) || logoDataUrl(layout === "card" ? createBrandLogoCardSvg(identity, primary) : createBrandLogoSvg(identity, primary, { monochrome, palette }))
      }
      style={drawingPending ? { visibility: "hidden" } : undefined}
      aria-busy={drawingPending}
      onLoad={() => { if (!drawingPending) onLoad?.(); }}
      onError={() => { if (!drawingPending) onError?.(); }}
      alt={`${identity.name} logo`}
    />
  );
}
