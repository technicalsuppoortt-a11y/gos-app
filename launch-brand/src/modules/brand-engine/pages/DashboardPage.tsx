import { BrandedDashboard } from "@/modules/brand-engine/components/brandengine/BrandedDashboard";

export function DashboardPage({ onExitPreview, onBackToWorkspace }: {
  onExitPreview?: (() => void) | undefined;
  onBackToWorkspace?: (() => void) | undefined;
}) {
  return <BrandedDashboard fullPage onExitPreview={onExitPreview} onBackToWorkspace={onBackToWorkspace} />;
}
