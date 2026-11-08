import { useLiveBrandConfiguration } from "../gos-live/liveBrand";
import { GosLiveFrame } from "../gos-live/GosLiveFrame";

/**
 * The sole read-only boundary between the template and the Brand Engine.
 * gos-app: shows gos-app's real website page live with this brand applied,
 * instead of the copied landing page used on Joe Academy.
 */
export function LandingPreviewBridge(_props: { onLanguageChange?: ((language: "ar" | "en") => void) | undefined } = {}) {
  const configuration = useLiveBrandConfiguration();
  return <GosLiveFrame path="/" title="Website & Funnel" configuration={configuration} fullPage />;
}
