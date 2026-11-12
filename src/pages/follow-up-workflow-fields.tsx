import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ChevronDown, Plus, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { useUILanguage, translateText, localizeNode } from '../i18n/display';
import { FOLLOW_UP_LIFECYCLE } from '../store/slices/crmSlice';
import type { SequenceStep } from './follow-up-workflow';
import './ai-followup.css';

type MenuOption = { value: string; label: React.ReactNode };
export const MenuSelect = ({
  value,
  options,
  onChange,
  className = "",
  ariaLabel,
  iconOnly = false,
}: {
  value: string;
  options: MenuOption[];
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
  iconOnly?: boolean;
}) => {
  useUILanguage();
  const [open, setOpen] = React.useState(false);
  const [placement, setPlacement] = React.useState<{
    top: number;
    left: number;
    width: number;
    upward: boolean;
  } | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const place = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const upward = window.innerHeight - rect.bottom < 220 && rect.top > 220;
      setPlacement({
        top: upward ? rect.top - 6 : rect.bottom + 6,
        left: rect.left,
        width: Math.max(rect.width, 190),
        upward,
      });
    };
    const outside = (event: PointerEvent) => {
      if (
        !buttonRef.current?.contains(event.target as Node) &&
        !popoverRef.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    place();
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keydown);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keydown);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);
  const current =
    options.find((option) => option.value === value)?.label ?? value;
  return (
    <div className={`af-select-wrap ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        className={`af-select-trigger ${iconOnly ? "af-select-icon-trigger" : ""}`}
        aria-label={translateText(ariaLabel)}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((state) => !state)}
      >
        {localizeNode(iconOnly ? <SlidersHorizontal size={15} /> : <span>{localizeNode(current)}</span>)}
        <ChevronDown size={14} />
      </button>
      {open &&
        placement &&
        createPortal(
          <div
            ref={popoverRef}
            className={`af-select-popover ${placement.upward ? "upward" : ""}`}
            role="listbox"
            style={{
              position: "fixed",
              top: placement.top,
              left: Math.min(
                placement.left,
                window.innerWidth - placement.width - 8,
              ),
              width: placement.width,
              transform: placement.upward ? "translateY(-100%)" : undefined,
              zIndex: 100010,
            }}
          >
            {localizeNode(options.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={option.value === value ? "selected" : ""}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{localizeNode(option.label)}</span>
                {localizeNode(option.value === value && <CheckCircle2 size={14} />)}
              </button>
            )))}
          </div>,
          document.body,
        )}
    </div>
  );
};

const lifecycleOptions = FOLLOW_UP_LIFECYCLE.map(({ state, label }) => ({ value: state, label }));
const actionOptions = ['Email', 'WhatsApp', 'Calendar reminder', 'Wait', 'CRM update', 'Webhook'].map(value => ({ value, label: value }));

export function WorkflowTriggerFields({ name, from, to, sequence, onName, onFrom, onTo }: {
  name: string; from: string; to: string; sequence?: boolean;
  onName: (value: string) => void; onFrom: (value: string) => void; onTo: (value: string) => void;
}) {
  useUILanguage();
  return <>
    <label>{translateText(sequence ? 'Sequence name' : 'Workflow name')}
      <input value={name} onChange={event => onName(event.target.value)} placeholder={translateText('e.g. Qualified lead follow-up')}/>
    </label>
    <label>{translateText('Trigger event')}<MenuSelect value={from} onChange={onFrom} options={lifecycleOptions}/></label>
    <label>{translateText('Lifecycle outcome')}<MenuSelect value={to} onChange={onTo} options={lifecycleOptions}/></label>
  </>;
}

export function WorkflowActionField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  useUILanguage();
  return <label>{translateText('Action type')}<MenuSelect value={value} onChange={onChange} options={actionOptions}/></label>;
}

export function WorkflowMessageField({ value, onChange, generate, generating, disabled }: {
  value: string; onChange: (value: string) => void;
  generate: () => void; generating: boolean; disabled: boolean;
}) {
  useUILanguage();
  return <>
    <label>{translateText('Follow-up message')}
      <textarea value={value} disabled={generating} onChange={event => onChange(event.target.value)} maxLength={20000} placeholder={translateText('Write the message this workflow should send')}/>
    </label>
    <button type="button" className="af-button-secondary" disabled={disabled || generating} onClick={generate}><Sparkles size={14}/>{generating ? 'Generating…' : 'Generate AI draft'}</button>
  </>;
}

export function WorkflowTimeline({ sequenceSteps, setSequenceSteps }: {
  sequenceSteps: SequenceStep[];
  setSequenceSteps: (update: (steps: SequenceStep[]) => SequenceStep[]) => void;
}) {
  useUILanguage();
  return (
    <div className="af-sequence-builder">
      <div className="af-sequence-title">
        <b>{translateText("Follow-up timeline")}</b>
        <button
          type="button"
          className="af-button-secondary"
          onClick={() =>
            setSequenceSteps((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                delay: "1",
                unit: "day",
                action: "Email",
              },
            ])
          }
        >
          <Plus size={13} />{translateText(" Add step")}</button>
      </div>
      {localizeNode(sequenceSteps.map((step, index) => (
        <div className="af-sequence-step" key={step.id}>
          <span className="af-sequence-number">{localizeNode(index + 1)}</span>
          <label>{translateText("Wait")}<input
              type="number"
              min="0"
              value={step.delay}
              onChange={(event) =>
                setSequenceSteps((current) =>
                  current.map((item) =>
                    item.id === step.id
                      ? { ...item, delay: event.target.value }
                      : item,
                  ),
                )
              }
            />
          </label>
          <MenuSelect
            ariaLabel="Delay unit"
            value={step.unit}
            onChange={(unit) =>
              setSequenceSteps((current) =>
                current.map((item) =>
                  item.id === step.id ? { ...item, unit } : item,
                ),
              )
            }
            options={["minute", "hour", "day", "week"].map(
              (unit) => ({ value: unit, label: unit }),
            )}
          />
          <MenuSelect
            ariaLabel="Sequence action"
            value={step.action}
            onChange={(action) =>
              setSequenceSteps((current) =>
                current.map((item) =>
                  item.id === step.id ? { ...item, action } : item,
                ),
              )
            }
            options={[
              "Email",
              "WhatsApp",
              "Instagram",
              "Wait",
              "CRM update",
            ].map((action) => ({ value: action, label: action }))}
          />
          {localizeNode(sequenceSteps.length > 1 && (
            <button
              type="button"
              className="af-icon-button"
              title={translateText("Remove step")}
              onClick={() =>
                setSequenceSteps((current) =>
                  current.filter((item) => item.id !== step.id),
                )
              }
            >
              <X size={14} />
            </button>
          ))}
        </div>
      )))}
    </div>
  );
}
