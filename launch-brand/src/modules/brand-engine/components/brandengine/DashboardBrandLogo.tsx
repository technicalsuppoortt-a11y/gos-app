import { useEffect, useState } from "react";
import type { BrandIdentity } from "@/modules/brand-engine/data/types";
import { BrandIdentityMark } from "./BrandIdentityMark";

// Fit the visible artwork, rather than the export canvas. Keep the saved file intact.
export function DashboardBrandLogo({
  identity,
  url,
  generated,
  primary,
}: {
  identity: BrandIdentity;
  url: string | undefined;
  generated: boolean;
  primary?: string | undefined;
}) {
  const [viewport, setViewport] = useState<{
    url: string;
    viewBox: string;
    width: number;
    height: number;
  } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    if (!url || generated) return;
    let active = true;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = url;
    image
      .decode()
      .then(() => {
        if (!active) return;
        const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.ceil(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.ceil(image.naturalHeight * scale));
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        let left = canvas.width,
          top = canvas.height,
          right = 0,
          bottom = 0;
        for (let y = 0; y < canvas.height; y++)
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            if ((data[i + 3] ?? 0) < 16) continue;
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
          }
        if (left > right || top > bottom) return;
        const padding = 4;
        left = Math.max(0, left - padding);
        top = Math.max(0, top - padding);
        right = Math.min(canvas.width, right + padding + 1);
        bottom = Math.min(canvas.height, bottom + padding + 1);
        setViewport({
          url,
          viewBox: `${left / scale} ${top / scale} ${(right - left) / scale} ${(bottom - top) / scale}`,
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      })
      .catch(() => {
        // Storage CORS may prevent trimming. Preserve the original uploaded image.
        if (active) setViewport(null);
      });
    return () => {
      active = false;
    };
  }, [url, generated]);
  if (generated || !url || failed) return <BrandIdentityMark identity={identity} primary={primary} />;
  if (viewport?.url === url)
    return (
      <svg
        viewBox={viewport.viewBox}
        role="img"
        aria-label={`${identity.name} logo`}
        preserveAspectRatio="xMidYMid meet"
      >
        <image href={url} width={viewport.width} height={viewport.height} />
      </svg>
    );
  return <img src={url} alt={`${identity.name} logo`} onError={() => setFailed(true)} />;
}
