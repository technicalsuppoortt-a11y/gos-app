import { SaveNotificationBell } from "./SaveNotifications";
import { Languages, Menu, Moon, Sun } from 'lucide-react';
import { Button } from "@/modules/brand-engine/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/modules/brand-engine/store/hooks";
import { actions } from "@/modules/brand-engine/store/brandSlice";
import { translations } from "@/modules/brand-engine/locales/translations";
import type { AppMode } from "@/modules/brand-engine/data/types";
import { ProgressStepper } from "./ProgressStepper";
import "./CompactWorkspaceHeader.css";
import { useStore } from '../../../../store/useStore';

export function AppHeader({ onOpenNavigation }: { onOpenNavigation?: (() => void) | undefined } = {}) {
  const setLanguage = useStore(state => state.setLanguage);
  const setTheme = useStore(state => state.setTheme);
  const dispatch = useAppDispatch();
  const { mode, language, theme } = useAppSelector((s) => s.brand);
  const t = translations[language];
  const modes: { id: AppMode; label: string }[] = [
    { id: "wizard", label: t.wizard },
    { id: "dashboard", label: t.dashboard },
  ];
  
  return (
    <div className="app-header compact-workspace-header backdrop-blur-md bg-white/5 border border-white/10">
      <div className="mode-switch" role="tablist" aria-label={t.demoMode}>
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            className={mode === m.id ? "active" : ""}
            onClick={() => dispatch(actions.setMode(m.id))}
          >
            {m.label}
          </button>
        ))}
      </div>
      {mode === "wizard" && <ProgressStepper />}
      <div className="header-actions">
        {/* Hide these controls from the view while preserving their existing logic. */}
        {false && <>
        <Button
          className={`header-control ${language === "ar" ? "is-active" : ""}`}
          variant="ghost"
          size="icon"
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          aria-label={t.switchLanguage}
        >
          <Languages />
          <span className="header-action-label" aria-hidden="true">{language === "ar" ? "AR" : "EN"}</span>
          <span className="sr-only">{t.switchLanguage}</span>
        </Button>
        <Button
          className={`header-control ${theme === "dark" ? "is-active" : ""}`}
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={t.toggleTheme}
          aria-pressed={theme === "dark"}
        >
          {theme === "light" ? <Moon /> : <Sun />}
        </Button>
        <SaveNotificationBell />
        </>}
        {onOpenNavigation && <Button className="mobile-menu" variant="ghost" size="icon" aria-label={t.menu} onClick={onOpenNavigation} aria-haspopup="dialog">
          <Menu />
        </Button>}
      </div>
    </div>
  );
}
