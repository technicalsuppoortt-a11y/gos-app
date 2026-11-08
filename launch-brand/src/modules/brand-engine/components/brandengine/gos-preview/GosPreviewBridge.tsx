import { useLiveBrandConfiguration } from "../gos-live/liveBrand";
import { GosLiveFrame } from "../gos-live/GosLiveFrame";

/**
 * The only adapter to Brand Engine. Reads identity; never changes the draft.
 * gos-app: shows gos-app's real user dashboard live (Demo Account data) with
 * this brand applied, instead of the frozen dashboard snapshots used on Joe Academy.
 */
export function GosPreviewBridge({
  width,
  height,
  fullPage,
  onExitPreview,
  onBackToWorkspace,
  language,
}: {
  width?: number | undefined;
  height?: number | undefined;
  fullPage?: boolean | undefined;
  onExitPreview?: (() => void) | undefined;
  onBackToWorkspace?: (() => void) | undefined;
  autoRotate?: boolean;
  language?: "ar" | "en";
}) {
  const configuration = useLiveBrandConfiguration(language);
  return (
    <GosLiveFrame
      path="/dashboard"
      title="Dashboard"
      configuration={configuration}
      width={width}
      height={height}
      fullPage={fullPage}
      onExitPreview={onExitPreview}
      onBackToWorkspace={onBackToWorkspace}
    />
  );
}
