import { Suspense, useCallback, useEffect, useState } from "react";
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
import "./MobileWorkspace.css";
import "./WorkspaceScale.css";
import "./WorkspaceReadability.css";
import "./WorkspaceTheme.css";

import { WizardPage, BuilderPage, DashboardPage } from "../../pages/workspacePages";

export function AppShell({ headerTarget }: { headerTarget?: HTMLElement | null }) {
  useWorkspaceNavigation();
  const { mode, language, activeStep } = useAppSelector((s) => s.brand);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [websiteLanguage, setWebsiteLanguage] = useState<"ar" | "en" | null>(null);
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

  return (
    <div
      style={{ overflow: "clip" }}
      className={`app-shell ${innerWorkspace && ![3, 4, 5, 15].includes(activeStep) ? "workspace-scaled" : ""} flex flex-row w-full h-full overflow-hidden ${mode === "wizard" && activeStep === 13 ? "discover-mode" : ""} ${innerWorkspace ? "has-sidebar" : ""} ${sidebarCollapsed ? "sidebar-collapsed" : "sidebar-expanded"} ${mode === "wizard" ? "with-stepper" : ""}`}
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
              style={mode !== "wizard" ? { padding: 0, margin: 0 } : {}}
              key={mode}
            >
              {mode === "wizard" ? (
                <WizardPage />
              ) : mode === "builder" ? (
                <BuilderPage onLanguageChange={setWebsiteLanguage} />
              ) : (
                <DashboardPage onExitPreview={exitDashboard} onBackToWorkspace={backToWorkspace} />
              )}
            </main>
          </Suspense>
        </div>
      </div>
      {mode === "builder" && (
        <button
          className="landing-preview-exit"
          dir={(websiteLanguage || language) === "ar" ? "rtl" : "ltr"}
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
