import { Check } from "lucide-react";
import { getWizardStepId, phases, wizardOrder } from "@/modules/brand-engine/data/mockData";
import type { AppMode } from "@/modules/brand-engine/data/types";
import { preloadWorkspacePage } from "@/modules/brand-engine/pages/workspacePages";
import { actions } from "@/modules/brand-engine/store/brandSlice";
import { useAppDispatch, useAppSelector } from "@/modules/brand-engine/store/hooks";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/modules/brand-engine/components/ui/tooltip";

const phaseDestinations: Record<number, { mode: AppMode; step: number }> = {
  1: { mode: "wizard", step: 13 },
  2: { mode: "wizard", step: 14 },
  3: { mode: "dashboard", step: 5 },
  4: { mode: "wizard", step: 18 },
};

export function ProgressStepper() {
  const dispatch = useAppDispatch();
  const { activeStep, mode, language, completedSteps } = useAppSelector((s) => s.brand);
  const completed = new Set(completedSteps.map((step) => (step === 4 || step === 5 ? step : getWizardStepId(step))));

  const navigateToPhase = (phaseId: number, fallbackStep?: number) => {
    const target = phaseDestinations[phaseId] ?? { mode: "wizard" as const, step: fallbackStep ?? 13 };
    dispatch(actions.setStep(target.step));
    dispatch(actions.setMode(target.mode));
  };

  return (
    <TooltipProvider delayDuration={450}>
      <nav className="compact-phase-stepper" aria-label="Brand building phases">
        <ol className="compact-phase-track">
          {phases.map((phase) => {
            const destination = phaseDestinations[phase.id] ?? { mode: "wizard" as const, step: phase.steps[0] ?? 13 };
            const isActive =
              phase.id === 3
                ? mode === "dashboard" || mode === "builder" || (mode === "wizard" && phase.steps.includes(activeStep))
                : mode === "wizard" && phase.steps.includes(activeStep);
            const phaseSteps = phase.steps.filter((step) => wizardOrder.includes(step) || completed.has(step));
            const isComplete = phaseSteps.length > 0 && phaseSteps.every((step) => completed.has(step));
            const title = language === "ar" ? phase.titleAr : phase.title;
            const status = isActive
              ? language === "ar"
                ? "المرحلة الحالية"
                : "Current stage"
              : isComplete
                ? language === "ar"
                  ? "مكتملة"
                  : "Completed"
                : language === "ar"
                  ? "اضغط للانتقال"
                  : "Click to open";
            return (
              <li
                key={phase.id}
                className={`compact-phase ${isActive ? "is-active" : isComplete ? "is-complete" : "is-upcoming"}`}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="compact-phase-tab"
                      aria-current={isActive ? "step" : undefined}
                      aria-label={`${phase.id}: ${title} — ${status}`}
                      onMouseEnter={() => preloadWorkspacePage(destination.mode, destination.step)}
                      onFocus={() => preloadWorkspacePage(destination.mode, destination.step)}
                      onClick={() => navigateToPhase(phase.id, phase.steps[0])}
                    >
                      <span className="compact-phase-badge" aria-hidden="true">
                        {isComplete && !isActive ? (
                          <Check className="compact-phase-check" />
                        ) : (
                          <span className="compact-phase-number">{String(phase.id).padStart(2, "0")}</span>
                        )}
                      </span>
                      <strong className="compact-phase-title">{title}</strong>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="compact-phase-tooltip" side="bottom" sideOffset={8}>
                    {title} · {status}
                  </TooltipContent>
                </Tooltip>
              </li>
            );
          })}
        </ol>
      </nav>
    </TooltipProvider>
  );
}
