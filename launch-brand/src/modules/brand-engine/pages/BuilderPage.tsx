import { LandingPreviewBridge } from "@/modules/brand-engine/components/brandengine/landing-preview/LandingPreviewBridge";
import { LiveWebsiteViewport } from "@/modules/brand-engine/components/brandengine/LiveWebsiteViewport";

/** The Builder tab is a read-only first look at the customer's website. */
export function BuilderPage({ onLanguageChange }: { onLanguageChange?: (language: "ar" | "en") => void }) {
  return (
    <div className="landing-preview-workspace landing-preview-fullscreen" style={{ height: "100dvh", minHeight: 360 }}>
      <LiveWebsiteViewport title="Website & Funnel">
        <LandingPreviewBridge onLanguageChange={onLanguageChange} />
      </LiveWebsiteViewport>
    </div>
  );
}
