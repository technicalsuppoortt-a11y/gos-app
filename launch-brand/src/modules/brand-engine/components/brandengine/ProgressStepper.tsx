import { Check } from 'lucide-react';
import { getWizardStepId, phases, wizardOrder } from "@/modules/brand-engine/data/mockData";
import { useAppSelector } from "@/modules/brand-engine/store/hooks";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/modules/brand-engine/components/ui/tooltip";

export function ProgressStepper() {
  const { activeStep, language, completedSteps } = useAppSelector((s) => s.brand);
  const completed = new Set(completedSteps.map((step) => step === 4 || step === 5 ? step : getWizardStepId(step)));

  return (
    <TooltipProvider delayDuration={150}>
      <nav className="compact-phase-stepper" aria-label="Brand building phases">
        <ol className="compact-phase-track">
          {phases.map((phase) => {
            const isActive = phase.steps.includes(activeStep);
            const phaseSteps = phase.steps.filter((step) => wizardOrder.includes(step) || completed.has(step));
            const isComplete = phaseSteps.length > 0 && phaseSteps.every((step) => completed.has(step));
            const title = language === "ar" ? phase.titleAr : phase.title;
            const status = isActive
              ? language === "ar" ? "المرحلة الحالية" : "Current stage"
              : isComplete
                ? language === "ar" ? "مكتملة" : "Completed"
                : language === "ar" ? "لم تكتمل بعد" : "Not completed yet";
            return (
              <li key={phase.id} className={`compact-phase ${isActive ? "is-active" : isComplete ? "is-complete" : "is-upcoming"}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="compact-phase-tab" tabIndex={0} aria-current={isActive ? "step" : undefined} aria-label={`${phase.id}: ${title} — ${status}`}>
                      <span className="compact-phase-number">{String(phase.id).padStart(2, "0")}</span>
                      <strong className="compact-phase-title">{title}</strong>
                      {isComplete && !isActive && <Check className="compact-phase-check" aria-hidden="true" />}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="compact-phase-tooltip" side="bottom">{title} — {status}</TooltipContent>
                </Tooltip>
              </li>
            );
          })}
        </ol>
      </nav>
    </TooltipProvider>
  );
}
