import {
  BarChart3,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  LayoutTemplate,
  Palette,
  Sparkles,
} from 'lucide-react';
import { motion, useReducedMotion } from "framer-motion";
import { joeAcademyLogoUrl as logo } from "@/components/ui/JoeAcademyLogo";
import { Button } from "@/modules/brand-engine/components/ui/button";
import { getWizardStepId } from "@/modules/brand-engine/data/mockData";
import { actions } from "@/modules/brand-engine/store/brandSlice";
import { useAppDispatch, useAppSelector } from "@/modules/brand-engine/store/hooks";
import type { AppMode } from "@/modules/brand-engine/data/types";
import { translations } from "@/modules/brand-engine/locales/translations";
import { WorkspaceAccount } from "./WorkspaceAccount";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { preloadWorkspacePage } from '../../pages/workspacePages';

const items: Array<{
  key: keyof typeof translations.en;
  icon: typeof Sparkles;
  mode: AppMode;
  step: number;
  matches?: number[];
}> = [
  { key: "sidebarDiscovery", icon: Bot, mode: "wizard", step: 13 },
  { key: "sidebarBranding", icon: Palette, mode: "wizard", step: 14 },
  { key: "sidebarDashboard", icon: BarChart3, mode: "dashboard", step: 5 },
  { key: "sidebarTemplate", icon: LayoutTemplate, mode: "builder", step: 4, matches: [3, 4, 15] },
  { key: "sidebarDeployment", icon: Flag, mode: "wizard", step: 18 },
];

export function WorkspaceSidebar({ collapsed, onCollapsedChange, mobile = false, onNavigate }: {
  collapsed: boolean;
  onCollapsedChange: (value: boolean) => void;
  mobile?: boolean;
  onNavigate?: (() => void) | undefined;
}) {
  const dispatch = useAppDispatch();
  const { activeStep, mode, language, theme, completedSteps } = useAppSelector((state) => state.brand);
  const t = translations[language];
  const isRtl = language === "ar";
  const isDark = theme === "dark";
  const reduceMotion = useReducedMotion();

  const normalizedCompleted = new Set(
    completedSteps.map((s) => (s === 4 || s === 5 ? s : getWizardStepId(s))),
  );
  const completedCount = items.filter((item) =>
    normalizedCompleted.has(item.step) || item.matches?.some((m) => normalizedCompleted.has(m)),
  ).length;
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => mode === item.mode && (item.matches?.includes(activeStep) || activeStep === item.step)),
  );
  const progressPercent = Math.min(100, Math.max(20, Math.round(((Math.max(completedCount, activeIndex + 1)) / items.length) * 100)));

  const activate = (targetMode: AppMode, step?: number) => {
    if (targetMode === "builder") dispatch(actions.completeStep(4));
    dispatch(actions.setMode(targetMode));
    if (step !== undefined) dispatch(actions.setStep(step));
    onNavigate?.();
  };

  return (
    <TooltipProvider delayDuration={150}>
    <motion.aside
      className={`workspace-sidebar ${mobile ? "mobile-drawer-sidebar" : "desktop-workspace-sidebar"} ${collapsed ? "is-collapsed" : ""} ${isDark ? "force-dark" : "force-light"}`}
      dir={isRtl ? "rtl" : "ltr"}
      aria-label={isRtl ? "تنقل مساحة العمل" : "Workspace navigation"}
      initial={false}
      animate={{ width: mobile ? "100%" : collapsed ? 68 : 272 }}
      transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="sidebar-brand">
        <span className="sidebar-brand-logo-wrap">
          <img src={logo} alt={isRtl ? "جو أكاديمي" : "Joe Academy"} className="w-6 h-6 object-contain" />
        </span>
        <div className="sidebar-brand-copy">
          <strong>{isRtl ? "جو أكاديمي" : "Joe Academy"}</strong>
          <small>Build · Launch · Scale</small>
        </div>
      </div>

      {(!collapsed || mobile) && (
        <div className="sidebar-journey-meter" aria-hidden="true">
          <div className="sidebar-journey-meta">
            <span>{isRtl ? "تقدّم الإعداد" : "Setup Progress"}</span>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="sidebar-journey-track">
            <i style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      <nav aria-label={isRtl ? "مراحل المشروع" : "Project steps"}>
        {items.map((item, index) => {
          const Icon = item.icon;
          const active = mode === item.mode && (item.matches?.includes(activeStep) || activeStep === item.step);
          const done = !active && (normalizedCompleted.has(item.step) || Boolean(item.matches?.some((m) => normalizedCompleted.has(m))));
          const displayLabel = t[item.key];
          const stepNumber = String(index + 1).padStart(2, "0");
          return (
            <Tooltip key={item.key}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className={`${active ? "active" : ""} ${done ? "is-done" : ""}`.trim()}
                  aria-label={displayLabel}
                  aria-current={active ? "page" : undefined}
                  onMouseEnter={() => preloadWorkspacePage(item.mode, item.step)}
                  onFocus={() => preloadWorkspacePage(item.mode, item.step)}
                  onClick={() => activate(item.mode, item.step)}
                >
                  <span className="sidebar-item-icon" aria-hidden="true"><Icon /></span>
                  <span className="sidebar-item-label">{displayLabel}</span>
                  <span className={`sidebar-step-pill ${active ? "is-live" : done ? "is-done" : ""}`} aria-hidden="true">
                    {done ? <Check size={11} strokeWidth={2.8} /> : stepNumber}
                  </span>
                </Button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side={isRtl ? "left" : "right"} sideOffset={12} className="workspace-nav-tooltip" dir={isRtl ? "rtl" : "ltr"}>{stepNumber} · {displayLabel}</TooltipContent>}
            </Tooltip>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <WorkspaceAccount />
        {!mobile && <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" className="sidebar-collapse" aria-label={collapsed ? t.sidebarExpand : t.sidebarCollapse} aria-expanded={!collapsed} onClick={() => onCollapsedChange(!collapsed)}>
          <span className="sidebar-item-icon">{collapsed ? (isRtl ? <ChevronLeft /> : <ChevronRight />) : (isRtl ? <ChevronRight /> : <ChevronLeft />)}</span>
          <span className="sidebar-item-label">{t.sidebarCollapse}</span>
        </Button></TooltipTrigger>
          {collapsed && <TooltipContent side={isRtl ? "left" : "right"} sideOffset={12} className="workspace-nav-tooltip" dir={isRtl ? "rtl" : "ltr"}>{t.sidebarExpand}</TooltipContent>}
        </Tooltip>}
      </div>
    </motion.aside>
    </TooltipProvider>
  );
}
