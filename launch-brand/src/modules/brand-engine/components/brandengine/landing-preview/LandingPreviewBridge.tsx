import { useLiveBrandConfiguration } from "../gos-live/liveBrand";
import { GosLiveFrame } from "../gos-live/GosLiveFrame";

/**
 * The sole read-only boundary between the template and the Brand Engine.
 * gos-app: shows gos-app's real website page live with this brand applied,
 * instead of the copied landing page used on Joe Academy.
 */
export function LandingPreviewBridge({ title, viewport }: { title?: string; viewport?: { width: number; height: number } }) {
  const configuration = useLiveBrandConfiguration();
  const previewTitle = title ?? (configuration.brand.language === "ar" ? "معاينة الموقع" : "Website preview");
  return <GosLiveFrame path="/" title={previewTitle} configuration={configuration} viewport={viewport} fullPage />;
}
