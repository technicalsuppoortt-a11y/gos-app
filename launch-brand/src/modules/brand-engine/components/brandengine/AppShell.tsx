import { Suspense, useCallback, useEffect, useState, type CSSProperties } from "react";
import JoeAcademyLoader from "../../../../components/ui/JoeAcademyLoader";
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { WorkspaceHeader } from "./WorkspaceHeader";
import { useAppDispatch, useAppSelector } from "@/modules/brand-engine/store/hooks";
import { actions } from "@/modules/brand-engine/store/brandSlice";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { DraftSync } from "./DraftSync";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/modules/brand-engine/components/ui/sheet";
import { useIsMobile } from "@/modules/brand-engine/hooks/use-mobile";
import { useWorkspaceNavigation } from "@/modules/brand-engine/hooks/useWorkspaceNavigation";
import type { AppMode } from "@/modules/brand-engine/data/types";
import "./MobileWorkspace.css";
import "./WorkspaceTheme.css";
import "./WorkspaceShell.css";

import { WizardPage, BuilderPage, DashboardPage } from "../../pages/workspacePages";

const hiddenViewStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  visibility: "hidden",
  pointerEvents: "none",
  zIndex: -1,
  overflow: "hidden",
};

const activePreviewStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  flex: 1,
  width: "100%",
  height: "100%",
  minHeight: 0,
};

export function AppShell({ headerTarget }: { headerTarget?: HTMLElement | null }) {
  useWorkspaceNavigation();
  const { mode, language, activeStep } = useAppSelector((s) => s.brand);
  // The sidebar is the single reference for project navigation. Preserve a
  // returning person's choice; show labels on the first visit.
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(() => {
    try { return localStorage.getItem("launch-brand:sidebar-collapsed") === "true"; } catch { return false; }
  });
  const setSidebarCollapsed = (value: boolean) => {
    setSidebarCollapsedState(value);
    try { localStorage.setItem("launch-brand:sidebar-collapsed", String(value)); } catch { /* storage unavailable */ }
  };
  const [navigationOpen, setNavigationOpen] = useState(false);
  const isMobile = useIsMobile();
  const dispatch = useAppDispatch();
  const exitDashboard = useCallback(
    () => {
      dispatch(actions.setStep(4));
      dispatch(actions.setMode("builder"));
    },
    [dispatch],
  );
  const backToWorkspace = useCallback(() => {
    dispatch(actions.setStep(14));
    dispatch(actions.setMode("wizard"));
  }, [dispatch]);
  const innerWorkspace = mode === "wizard" && activeStep !== 1;
  useEffect(() => {
    if (!isMobile || !innerWorkspace) setNavigationOpen(false);
  }, [isMobile, innerWorkspace]);

  // Mount the active view first, then warm-mount the other views in the background
  // so opening Dashboard or Website & Funnel is 0ms instant and never reloads frames.
  const [warmed, setWarmed] = useState<Record<AppMode, boolean>>(() => ({
    wizard: mode === "wizard",
    dashboard: mode === "dashboard",
    builder: mode === "builder",
  }));
  useEffect(() => {
    setWarmed(current => current[mode] ? current : { ...current, [mode]: true });
  }, [mode]);
  useEffect(() => {
    if (warmed.wizard && warmed.dashboard && warmed.builder) return;
    const timer = window.setTimeout(() => {
      setWarmed({ wizard: true, dashboard: true, builder: true });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [warmed.wizard, warmed.dashboard, warmed.builder]);

  return (
    <div
      dir={language === "ar" ? "rtl" : "ltr"}
      data-workspace-mode={mode}
      className={`app-shell compact-workspace-shell flex flex-row w-full h-full overflow-hidden ${mode === "wizard" && activeStep === 13 ? "discover-mode" : ""} ${innerWorkspace ? "has-sidebar" : ""} ${sidebarCollapsed ? "sidebar-collapsed" : "sidebar-expanded"} ${mode === "wizard" && !innerWorkspace ? "with-stepper" : ""}`}
    >
      {innerWorkspace && (
        <>
          <WorkspaceSidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
          <Sheet open={navigationOpen} onOpenChange={setNavigationOpen}>
            <SheetContent
              className="mobile-workspace-drawer"
              side={language === "ar" ? "right" : "left"}
              dir={language === "ar" ? "rtl" : "ltr"}
              aria-describedby={undefined}
            >
              <SheetHeader>
                <SheetTitle>{language === "ar" ? "خطوات مشروعك" : "Your project steps"}</SheetTitle>
              </SheetHeader>
              <WorkspaceSidebar
                mobile
                collapsed={false}
                onCollapsedChange={setSidebarCollapsed}
                onNavigate={() => setNavigationOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </>
      )}
      <div className="workspace-column flex flex-col flex-1 overflow-hidden relative">
        <DraftSync />
        {mode === 'wizard' && <WorkspaceHeader target={headerTarget} onOpenNavigation={innerWorkspace ? () => setNavigationOpen(true) : undefined} />}
        <div className="workspace-layout flex-1 overflow-y-auto overflow-x-hidden relative">
          <Suspense fallback={<JoeAcademyLoader />}>
            <main
              className="workspace-main flex flex-col flex-1"
              style={mode !== "wizard" ? { padding: 0, margin: 0, height: "100%" } : {}}
            >
              {warmed.wizard && (
                <div
                  style={mode === "wizard" ? { display: "contents" } : hiddenViewStyle}
                  aria-hidden={mode !== "wizard" || undefined}
                  inert={mode !== "wizard"}
                >
                  <WizardPage />
                </div>
              )}
              {warmed.builder && (
                <div
                  style={mode === "builder" ? activePreviewStyle : hiddenViewStyle}
                  aria-hidden={mode !== "builder" || undefined}
                  inert={mode !== "builder"}
                >
                  <BuilderPage />
                </div>
              )}
              {warmed.dashboard && (
                <div
                  style={mode === "dashboard" ? activePreviewStyle : hiddenViewStyle}
                  aria-hidden={mode !== "dashboard" || undefined}
                  inert={mode !== "dashboard"}
                >
                  <DashboardPage onExitPreview={exitDashboard} onBackToWorkspace={backToWorkspace} />
                </div>
              )}
            </main>
          </Suspense>
        </div>
      </div>
      {mode === "builder" && (
        <button
          className="landing-preview-exit"
          dir={language === "ar" ? "rtl" : "ltr"}
          type="button"
          onClick={() => {
            dispatch(actions.setStep(18));
            dispatch(actions.setMode("wizard"));
          }}
        >
          {language === "ar" ? <ArrowRight size={16} aria-hidden="true" /> : <ArrowLeft size={16} aria-hidden="true" />}
          {language === "ar" ? "الرجوع إلى مساحة العمل" : "Back to Workspace"}
        </button>
      )}
    </div>
  );
}
