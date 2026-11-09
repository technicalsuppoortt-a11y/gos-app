import { LandingPreviewBridge } from "@/modules/brand-engine/components/brandengine/landing-preview/LandingPreviewBridge";

/** The Builder tab is a read-only first look at the customer's website. */
export function BuilderPage() {
  return (
    <div className="landing-preview-workspace landing-preview-fullscreen" style={{ height: "100dvh", minHeight: 360 }}>
      <LandingPreviewBridge />
    </div>
  );
}
