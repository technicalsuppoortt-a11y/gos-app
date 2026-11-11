import { GosPreviewBridge } from "./gos-preview/GosPreviewBridge";

/** Every dashboard surface is a presentation-only GOS preview. */
export function BrandedDashboard({
  width,
  height,
  fullPage,
  viewport,
  onExitPreview,
  onBackToWorkspace,
}: {
  preview?: boolean;
  readOnly?: boolean;
  fullPage?: boolean | undefined;
  width?: number | undefined;
  height?: number | undefined;
  viewport?: { width: number; height: number } | undefined;
  onExitPreview?: (() => void) | undefined;
  onBackToWorkspace?: (() => void) | undefined;
} = {}) {
  return <GosPreviewBridge width={width} height={height} fullPage={fullPage} viewport={viewport} onExitPreview={onExitPreview} onBackToWorkspace={onBackToWorkspace} />;
}
