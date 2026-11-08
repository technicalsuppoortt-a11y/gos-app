import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/brand-engine/components/ui/select";

export function StudioSelect({
  id,
  label,
  value,
  disabled,
  ar,
  options,
  onChange,
  triggerLabel,
  triggerClassName,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  ar: boolean;
  options: { value: string; label: string; font?: string; preview?: string; swatches?: string[]; badge?: string }[];
  onChange: (value: string) => void;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled} dir={ar ? "rtl" : "ltr"}>
      <SelectTrigger id={id} aria-label={label} className={`studio-select-trigger ${triggerClassName ?? ""}`}>
        {triggerLabel ? <span>{triggerLabel}</span> : <SelectValue />}
      </SelectTrigger>
      <SelectContent className={`studio-theme studio-select-menu ${options.some((option) => option.swatches?.length) ? "studio-palette-menu" : ""}`} sideOffset={6} align="start">
        {options.map((option) => (
          <SelectItem
            className="studio-select-option"
            key={option.value}
            value={option.value}
            style={option.font ? { fontFamily: option.font } : undefined}
          >
            {option.swatches?.length ? (
              <span className="studio-select-option-content">
                <span className="studio-select-swatches" aria-hidden="true">
                  {option.swatches.map((color, index) => (
                    <span key={`${color}-${index}`} style={{ backgroundColor: color }} />
                  ))}
                </span>
                <span>{option.label}</span>
                {option.badge && <small className="studio-palette-mode">{option.badge}</small>}
              </span>
            ) : option.preview ? (
              <span className="studio-select-font-preview">
                <span dir="ltr">{option.label}</span>
                <small lang={ar ? "ar" : "en"} dir={ar ? "rtl" : "ltr"}>{option.preview}</small>
              </span>
            ) : option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
