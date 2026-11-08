import {
  BarChart3,
//   Blocks,
  Bot,
  ChevronLeft,
  ChevronRight,
  Flag,
  LayoutTemplate,
  Palette,
  Sparkles,
} from 'lucide-react';
import { motion } from "framer-motion";
const logo = "/joe-academy-logo.svg";
import { Button } from "@/modules/brand-engine/components/ui/button";
import { actions } from "@/modules/brand-engine/store/brandSlice";
import { useAppDispatch, useAppSelector } from "@/modules/brand-engine/store/hooks";
import type { AppMode } from "@/modules/brand-engine/data/types";
import { translations } from "@/modules/brand-engine/locales/translations";
import { WorkspaceAccount } from "./WorkspaceAccount";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { preloadWorkspacePage } from '../../pages/workspacePages';

const items: Array<{ key: keyof typeof translations.en; icon: typeof Sparkles; mode: AppMode; step: number; matches?: number[] }> = [
//   { key: "sidebarVision", icon: Compass, mode: "wizard", step: 2, matches: [1, 2] },
  { key: "sidebarDiscovery", icon: Bot, mode: "wizard", step: 13 },
  { key: "sidebarBranding", icon: Palette, mode: "wizard", step: 14 },
  { key: "sidebarDashboard", icon: BarChart3, mode: "dashboard", step: 5 },
  { key: "sidebarTemplate", icon: LayoutTemplate, mode: "builder", step: 4, matches: [3, 4, 15] },
//   { key: "sidebarModule", icon: Blocks, mode: "wizard", step: 6 },
//   { key: "sidebarAICenter", icon: Bot, mode: "wizard", step: 8 },
//   { key: "sidebarAIContent", icon: CalendarDays, mode: "wizard", step: 16 },
//   { key: "sidebarMarketing", icon: Megaphone, mode: "wizard", step: 17 },
  { key: "sidebarDeployment", icon: Flag, mode: "wizard", step: 18 },
];

export function WorkspaceSidebar({ collapsed, onCollapsedChange, mobile = false, onNavigate }: {
  collapsed: boolean;
  onCollapsedChange: (value: boolean) => void;
  mobile?: boolean;
  onNavigate?: (() => void) | undefined;
}) {
  const dispatch = useAppDispatch();
  const { activeStep, mode, language, theme } = useAppSelector((state) => state.brand);
  const t = translations[language];
  const isRtl = language === "ar";
  const isDark = theme === "dark";

  const activate = (targetMode: AppMode, step?: number) => {
    if (targetMode === "builder") dispatch(actions.completeStep(4));
    dispatch(actions.setMode(targetMode));
    if (step !== undefined) dispatch(actions.setStep(step));
    onNavigate?.();
  };

  return (
    <TooltipProvider delayDuration={150}>
    <motion.aside className={`workspace-sidebar ${mobile ? "mobile-drawer-sidebar" : "desktop-workspace-sidebar"} ${collapsed ? "is-collapsed" : ""} ${isDark ? "force-dark" : "force-light"}`} aria-label={isRtl ? "تنقل مساحة العمل" : "Workspace navigation"} animate={{ width: mobile ? "100%" : collapsed ? 64 : 256 }} transition={{ duration: .28, ease: [0.22, 1, 0.36, 1] }}>
      <div className="sidebar-brand">
        <img src={logo} alt="Joe Academy" className="w-8 h-8 object-contain" />
        <div className="sidebar-brand-copy"><strong>Joe Academy</strong><small>Build. Launch. Grow.</small></div>
      </div>
      <nav aria-label="Project steps">
        {items.map((item) => {
          const Icon = item.icon;
          const active = mode === item.mode && (item.matches?.includes(activeStep) || activeStep === item.step);
          const displayLabel = t[item.key];
          return (
            <Tooltip key={item.key}>
            <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={active ? "active" : ""}
              aria-label={displayLabel}
              aria-current={active ? "page" : undefined}
              onMouseEnter={() => preloadWorkspacePage(item.mode, item.step)}
              onFocus={() => preloadWorkspacePage(item.mode, item.step)}
              onClick={() => activate(item.mode, item.step)}
            >
              <span className="sidebar-item-icon" aria-hidden="true"><Icon /></span>
              <span className="sidebar-item-label">{displayLabel}</span>
            </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side={isRtl ? "left" : "right"} sideOffset={12} className="workspace-nav-tooltip" dir={isRtl ? "rtl" : "ltr"}>{displayLabel}</TooltipContent>}
            </Tooltip>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <WorkspaceAccount />
        {!mobile && <Tooltip><TooltipTrigger asChild><Button variant="ghost" className="sidebar-collapse" aria-label={collapsed ? t.sidebarExpand : t.sidebarCollapse} aria-expanded={!collapsed} onClick={() => onCollapsedChange(!collapsed)}>
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

