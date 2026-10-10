import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  useAppState,
  BookingCalendar,
  Booking,
  Meeting,
  NotificationWorkflows,
  NotificationTemplate,
  CalendarTemplateSettings,
  ViewMode,
  RedirectMode,
  EmailMode,
} from "../../context/StateContext";
import { useAuth } from "../../context/AuthContext";
import { db, firestore, mediaStorage } from "../../config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { PartnerTemplate, SystemTemplate } from "../../types/template";
import DatePicker from "../../components/DatePicker";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Plus,
  Video,
  CheckCircle,
  XCircle,
  Settings,
  Link2,
  Trash2,
  PlusCircle,
  X,
  PhoneCall,
  Users,
  ExternalLink,
  Copy,
  Check,
  Filter,
  Search,
  Eye,
  Edit,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Zap,
  Star,
  Shield,
  Crown,
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  MoreVertical,
  Globe,
  Lock,
  Unlock,
  Mail,
  MessageSquare,
  Phone,
  Clock as ClockIcon,
  CalendarDays,
  Code2,
  RefreshCw,
  Image as ImageIcon,
  Circle,
  HelpCircle,
  Link,
  Unlink,
  MapPin,
  Coffee,
  Briefcase,
  DollarSign,
  Euro,
  PoundSterling,
  Info,
  Eye as EyeIcon,
  FileText,
  Save,
  Copy as DuplicateIcon,
  ToggleLeft,
  ToggleRight,
  User,
  AtSign,
  Users as UsersIcon,
  Smartphone,
  Check as CheckIcon,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Star as StarIcon,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

// ---------- Animation Variants ----------
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 12 } },
} as const;

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 120, damping: 14 },
  },
} as const;

// ---------- Custom Select Component ----------
interface SelectOption {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
}

interface SelectGroup {
  label: string;
  options: SelectOption[];
}

interface CustomSelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options?: SelectOption[];
  groups?: SelectGroup[];
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options = [],
  groups,
  placeholder,
  icon,
  className = "",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const isRtl = document.documentElement.dir === "rtl";

  const updateCoords = () => {
    if (triggerRef.current) {
      const allOptions = groups ? groups.flatMap((g) => g.options) : options;
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = Math.min(
        240,
        allOptions.length * 40 + (groups ? groups.length * 30 : 0) + 20,
      );
      const showUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
      setCoords({
        top: showUpward ? rect.top - dropdownHeight - 4 : rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  const handleToggle = () => {
    if (disabled) return;
    updateCoords();
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
    }
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const portalDropdown = document.getElementById("portal-dropdown-menu");
        if (portalDropdown && portalDropdown.contains(event.target as Node)) {
          return;
        }
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allOptions = groups ? groups.flatMap((g) => g.options) : options;
  const selectedOption = allOptions.find((option) => option.value === value);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className="w-full bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-700 focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ textAlign: isRtl ? "right" : "left" }}
      >
        {icon && <span className="text-slate-400">{icon}</span>}
        <span className="flex-1 truncate">{selectedOption?.label || placeholder || "اختر"}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[99998] bg-transparent cursor-default"
              onClick={() => setIsOpen(false)}
            />
            <div
              id="portal-dropdown-menu"
              className="fixed z-[99999] mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-y-auto py-1"
              style={{
                top: coords.top,
                left: coords.left,
                width: coords.width,
                maxHeight: "240px",
              }}
            >
              <ul className="py-1.5 custom-scroll">
                {groups
                  ? groups.map((group, groupIndex) => (
                      <React.Fragment key={groupIndex}>
                        {group.options.length > 0 && (
                          <li
                            className="px-3 py-1.5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none bg-slate-50 dark:bg-slate-900/50"
                            style={{ textAlign: isRtl ? "right" : "left" }}
                          >
                            {group.label}
                          </li>
                        )}
                        {group.options.map((option) => (
                          <li
                            key={String(option.value)}
                            onClick={() => {
                              onChange(option.value);
                              setIsOpen(false);
                            }}
                            className={`px-4 py-2.5 text-sm cursor-pointer transition flex items-center gap-2 ${
                              option.value === value
                                ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 font-semibold"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            }`}
                            style={{ textAlign: isRtl ? "right" : "left" }}
                          >
                            {option.icon && <span className="text-slate-400">{option.icon}</span>}
                            <span className="flex-1 truncate">{option.label}</span>
                            {option.value === value && (
                              <Check className="h-4 w-4 text-purple-500 flex-shrink-0" />
                            )}
                          </li>
                        ))}
                      </React.Fragment>
                    ))
                  : options.map((option) => (
                      <li
                        key={String(option.value)}
                        onClick={() => {
                          onChange(option.value);
                          setIsOpen(false);
                        }}
                        className={`px-4 py-2.5 text-sm cursor-pointer transition flex items-center gap-2 ${
                          option.value === value
                            ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 font-semibold"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                        style={{ textAlign: isRtl ? "right" : "left" }}
                      >
                        {option.icon && <span className="text-slate-400">{option.icon}</span>}
                        <span className="flex-1 truncate">{option.label}</span>
                        {option.value === value && (
                          <Check className="h-4 w-4 text-purple-500 flex-shrink-0" />
                        )}
                      </li>
                    ))}
              </ul>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
};

interface TimePickerInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  className?: string;
}

function TimePickerInput({
  value,
  onChange,
  disabled = false,
  className = "",
}: TimePickerInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeRef.current) {
      activeRef.current.scrollIntoView({ block: "center" });
    }
  }, [isOpen]);

  const displayLabel = formatTo12Hour(value) || value;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-700 dark:text-slate-200 text-center font-bold hover:border-purple-300 dark:hover:border-purple-700 disabled:opacity-50 transition cursor-pointer"
      >
        {displayLabel}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-32 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto p-1 py-1.5">
          {timeOptions15.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                ref={isSelected ? activeRef : undefined}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-center px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  isSelected
                    ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Toggle Switch ----------
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  subLabel?: string;
  className?: string;
  labelClassName?: string;
  onClick?: () => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  subLabel,
  className = "",
  labelClassName = "",
  onClick,
}) => {
  return (
    <div
      className={`flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 ${className}`}
    >
      <div className={`flex-1 pr-4 ${labelClassName}`}>
        {label && (
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</div>
        )}
        {subLabel && <div className="text-xs text-slate-400">{subLabel}</div>}
      </div>
      <button
        type="button"
        onClick={() => {
          onChange(!checked);
          if (onClick) onClick();
        }}
        dir="ltr"
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 focus:outline-none flex-shrink-0 ${
          checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? "translate-x-6" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
};

interface SmallToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

const SmallToggleSwitch: React.FC<SmallToggleSwitchProps> = ({ checked, onChange, disabled }) => {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange()}
      dir="ltr"
      disabled={disabled}
      className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors duration-205 focus:outline-none ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
};

// ---------- Color Palette ----------
const COLOR_PALETTE = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Green", value: "#22c55e" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Slate", value: "#64748b" },
  { name: "Zinc", value: "#71717a" },
  { name: "Lime", value: "#84cc16" },
  { name: "Yellow", value: "#eab308" },
  { name: "Coral", value: "#ff7f50" },
  { name: "Navy", value: "#000080" },
  { name: "Maroon", value: "#800000" },
  { name: "Crimson", value: "#dc143c" },
  { name: "Lavender", value: "#e6e6fa" },
  { name: "Plum", value: "#dda0dd" },
  { name: "Forest Green", value: "#228b22" },
];

const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let min of ["00", "15", "30", "45"]) {
      const hh = String(hour).padStart(2, "0");
      const value = `${hh}:${min}`;
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      const label = `${displayHour}:${min} ${ampm}`;
      options.push({ value, label });
    }
  }
  return options;
};
const timeOptions = generateTimeOptions();

const formatTo12Hour = (time24: string) => {
  if (!time24) return "";
  const [hourStr, minStr] = time24.split(":");
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minStr} ${ampm}`;
};

const timeOptions15: { value: string; label: string }[] = [];
for (let hour = 0; hour < 24; hour++) {
  for (let min of ["00", "15", "30", "45"]) {
    const hh = String(hour).padStart(2, "0");
    const val = `${hh}:${min}`;
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const label = `${displayHour}:${min} ${ampm}`;
    timeOptions15.push({ value: val, label });
  }
}

// ---------- Notification Customization Modal ----------
interface NotificationCustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: NotificationTemplate) => void;
  template: NotificationTemplate | null;
  isRtl: boolean;
  translateText: (ar: string, en: string) => string;
  emailTemplateGroups?: SelectGroup[];
}

const NotificationCustomizeModal: React.FC<NotificationCustomizeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  template,
  isRtl,
  translateText,
  emailTemplateGroups = [],
}) => {
  const [localTemplate, setLocalTemplate] = useState<NotificationTemplate | null>(null);
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewBody, setPreviewBody] = useState("");

  const sampleData: Record<string, string> = {
    "{INVITEE_FIRST_NAME}": isRtl ? "أحمد" : "Ahmed",
    "{BOOKING_PAGE_TITLE}": isRtl ? "استشارة مجانية" : "Free Consultation",
    "{DATE}": isRtl ? "8 أغسطس 2026" : "Aug 8, 2026",
    "{TIME}": isRtl ? "04:30 مساءً" : "04:30 PM",
    "{ZOOM_LINK}": "https://zoom.us/j/123456789",
    "{MANAGE_BOOKING_LINK}": "https://example.com/manage",
    "{AFFILIATE_NAME}": isRtl ? "محمد جو" : "Mohamed Joe",
    "{REBOOK_LINK}": "https://example.com/rebook",
    "{BOOKING_LINK}": "https://example.com/book",
  };

  useEffect(() => {
    if (isOpen && template) {
      setLocalTemplate({ ...template });
    }
  }, [isOpen, template]);

  useEffect(() => {
    if (!localTemplate) return;
    let s = localTemplate.subject || "";
    let b = localTemplate.body || "";
    for (const [key, val] of Object.entries(sampleData)) {
      s = s.replace(new RegExp(key, "g"), val);
      b = b.replace(new RegExp(key, "g"), val);
    }
    setPreviewSubject(s);
    setPreviewBody(b);
  }, [localTemplate?.subject, localTemplate?.body]);

  const insertVariable = (field: "subject" | "body", variable: string) => {
    if (!localTemplate) return;
    const val = localTemplate[field] || "";
    setLocalTemplate({ ...localTemplate, [field]: val + " " + variable });
  };

  const handleSave = () => {
    if (localTemplate) onSave(localTemplate);
    onClose();
  };

  if (!isOpen || !localTemplate) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            {translateText("تخصيص الإشعار", "Customize Notification")} - {localTemplate.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scroll">
          {localTemplate.trigger !== "immediate" && (
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                  {translateText("الوقت", "Timing Value")}
                </label>
                <input
                  type="number"
                  value={localTemplate.timingValue || 0}
                  onChange={(e) =>
                    setLocalTemplate({
                      ...localTemplate,
                      timingValue: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                  {translateText("الوحدة", "Unit")}
                </label>
                <CustomSelect
                  value={localTemplate.timingUnit || "minutes"}
                  onChange={(val) => setLocalTemplate({ ...localTemplate, timingUnit: val as any })}
                  options={[
                    { value: "minutes", label: translateText("دقائق", "Minutes") },
                    { value: "hours", label: translateText("ساعات", "Hours") },
                    { value: "days", label: translateText("أيام", "Days") },
                  ]}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {localTemplate.type === "email" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                  {translateText("تنسيق البريد الإلكتروني", "Email Format")}
                </label>
                <CustomSelect
                  value={localTemplate.emailFormat || "default"}
                  onChange={(val) =>
                    setLocalTemplate({
                      ...localTemplate,
                      emailFormat: val as any,
                      emailTemplateId:
                        val === "default" ? undefined : localTemplate.emailTemplateId,
                    })
                  }
                  options={[
                    {
                      value: "default",
                      label: translateText("الافتراضي للنظام", "System Default"),
                    },
                    {
                      value: "template",
                      label: translateText("قالب بريد مخصص", "Custom Email Template"),
                    },
                  ]}
                  className="w-full"
                />
              </div>

              {localTemplate.emailFormat === "template" && (
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                    {translateText("قالب البريد الإلكتروني", "Email Template")}
                  </label>
                  <CustomSelect
                    value={localTemplate.emailTemplateId || ""}
                    onChange={(val) =>
                      setLocalTemplate({ ...localTemplate, emailTemplateId: val.toString() })
                    }
                    groups={emailTemplateGroups}
                    placeholder={translateText("اختر قالب", "Select a template")}
                    className="w-full"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2 mt-4">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {translateText("عنوان الرسالة", "Subject")}
                  </label>
                  <CustomSelect
                    value=""
                    onChange={(val) => {
                      if (val) insertVariable("subject", val.toString());
                    }}
                    options={[
                      { value: "", label: "+ Variables" },
                      ...Object.keys(sampleData).map((k) => ({ value: k, label: k })),
                    ]}
                    className="w-40"
                  />
                </div>
                <input
                  type="text"
                  value={localTemplate.subject || ""}
                  onChange={(e) => setLocalTemplate({ ...localTemplate, subject: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                />
                {previewSubject && (
                  <div className="mt-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      Preview:
                    </span>{" "}
                    {previewSubject}
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {translateText("نص الرسالة", "Body")}
              </label>
              <CustomSelect
                value=""
                onChange={(val) => {
                  if (val) insertVariable("body", val.toString());
                }}
                options={[
                  { value: "", label: "+ Variables" },
                  ...Object.keys(sampleData).map((k) => ({ value: k, label: k })),
                ]}
                className="w-40"
              />
            </div>
            <textarea
              rows={6}
              value={localTemplate.body || ""}
              onChange={(e) => setLocalTemplate({ ...localTemplate, body: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
            />
            {previewBody && (
              <div className="mt-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3 rounded whitespace-pre-wrap">
                <span className="font-semibold block mb-1">Preview:</span>
                {previewBody}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            {translateText("إلغاء", "Cancel")}
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-500/20 transition"
          >
            {translateText("تطبيق", "Apply")}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

// ---------- Main Component ----------
interface BookingSectionProps {
  searchQuery?: string;
}

export default function BookingSection({
  searchQuery: propSearchQuery = "",
}: BookingSectionProps = {}) {
  const { state, updateState, fmtMoney } = useAppState();
  const handleDuplicateWeekday = (item: WeekdayAvailability) => {
    setWeekdayAvailability([
      ...weekdayAvailability,
      {
        id: Date.now() + Math.random(),
        day: item.day,
        start: item.start,
        end: item.end,
      },
    ]);
  };

  const handleDuplicateSpecificDate = (item: any) => {
    setSpecificDateAvailability([
      ...specificDateAvailability,
      {
        id: Date.now() + Math.random(),
        date: item.date,
        start: item.start,
        end: item.end,
      },
    ]);
  };
  const getCurrentPreset = () => {
    const enabledDays = calendarAvailability.filter((d) => d.enabled).map((d) => d.day);
    if (enabledDays.length === 7) return "Every day";
    if (
      enabledDays.length === 5 &&
      ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].every((d) => enabledDays.includes(d))
    ) {
      return "Mon - Fri";
    }
    if (enabledDays.length === 2 && ["Saturday", "Sunday"].every((d) => enabledDays.includes(d))) {
      return "Sat - Sun";
    }
    if (enabledDays.length === 1) {
      return enabledDays[0];
    }
    return "";
  };

  const applyDayPreset = (preset: string) => {
    setCalendarAvailability((prev) => {
      return prev.map((dayItem) => {
        let enabled = false;
        if (preset === "Every day") {
          enabled = true;
        } else if (preset === "Mon - Fri") {
          enabled = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(dayItem.day);
        } else if (preset === "Sat - Sun") {
          enabled = ["Saturday", "Sunday"].includes(dayItem.day);
        } else {
          enabled = dayItem.day === preset;
        }
        return { ...dayItem, enabled };
      });
    });
  };

  const { user, isAdmin, users, hasPermission } = useAuth();

  const [partnerTemplates, setPartnerTemplates] = useState<PartnerTemplate[]>([]);
  const [systemTemplates, setSystemTemplates] = useState<SystemTemplate[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const fetchTemplates = async () => {
      try {
        const qPartner = query(
          collection(db, "partnerLandingPages"),
          where("partnerId", "==", user.uid),
        );
        const [partnerSnap, systemSnap] = await Promise.all([
          getDocs(qPartner),
          getDocs(collection(db, "systemTemplates")),
        ]);

        const pData = partnerSnap.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        })) as PartnerTemplate[];
        const sData = systemSnap.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        })) as SystemTemplate[];

        setPartnerTemplates(pData);
        setSystemTemplates(sData);
      } catch (error) {
        console.error("Error fetching templates:", error);
      }
    };
    fetchTemplates();
  }, [user]);

  const openAddBookingModal = () => {
    toast.info(
      translateText(
        "يرجى استخدام رابط الحجز العام لإنشاء حجز جديد",
        "Please use the public booking link to create a new booking.",
      ),
    );
  };

  const getCreatorName = (userId?: string) => {
    if (!userId) return translateText("غير معروف", "Unknown");
    const foundUser = users?.find((u) => u.uid === userId);
    return foundUser ? foundUser.name : translateText("غير معروف", "Unknown");
  };
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"calendars" | "bookings">("calendars");
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [expandedBookingId, setExpandedBookingId] = useState<number | null>(null);
  const [isPublicPreviewModalOpen, setIsPublicPreviewModalOpen] = useState(false);
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedCalendar, setSelectedCalendar] = useState<BookingCalendar | null>(null);
  const [editingCalendarId, setEditingCalendarId] = useState<number | null>(null);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const searchQuery = propSearchQuery || localSearchQuery;
  const setSearchQuery = setLocalSearchQuery;
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [calendarFilter, setCalendarFilter] = useState<number | "all">("all");
  const [copiedLinkId, setCopiedLinkId] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [previewWhatsapp, setPreviewWhatsapp] = useState("");
  const [previewChallenge, setPreviewChallenge] = useState("");
  const [previewSource, setPreviewSource] = useState("");
  const [optionsTexts, setOptionsTexts] = useState<Record<number, string>>({});
  const [temporaryStatus, setTemporaryStatus] = useState<
    "Confirmed" | "Pending" | "Cancelled" | "Completed"
  >("Confirmed");
  const [openAccordionSection, setOpenAccordionSection] = useState<string | null>("page");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerReference = useRef<HTMLDivElement>(null);
  const [availAdvancedOpen, setAvailAdvancedOpen] = useState(false);

  // Refs for scrolling
  const durationRef = useRef<HTMLDivElement>(null);
  const priceRef = useRef<HTMLDivElement>(null);
  const multipleOptionsRef = useRef<HTMLDivElement>(null);

  // ----- UI states -----
  const [calendarImage, setCalendarImage] = useState<string>("");
  const [calendarImageRound, setCalendarImageRound] = useState<boolean>(false);
  const [calendarMediaType, setCalendarMediaType] = useState<"image" | "video">("image");
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [calendarTitleOverride, setCalendarTitleOverride] = useState<string>("");

  // Location
  interface LocationOption {
    id: number;
    type: "none" | "zoom" | "meet" | "teams" | "phone" | "in-person" | "ask-invitee" | "custom";
    label: string;
    address?: string;
    customLabel?: string;
    linked?: boolean;
  }
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([
    { id: Date.now(), type: "none", label: "None", linked: false },
  ]);

  // Group
  const [calendarGroupCapacity, setCalendarGroupCapacity] = useState<number>(1);

  // Duration – list of options with default - ONLY 30 min
  const [durationOptions, setDurationOptions] = useState<
    { id: number; value: number; isDefault: boolean }[]
  >([{ id: 1, value: 30, isDefault: true }]);
  const [customDurationInput, setCustomDurationInput] = useState<number>(30);
  const [showCustomDurationInput, setShowCustomDurationInput] = useState(false);

  // Pricing
  const [calendarCurrency, setCalendarCurrency] = useState<string>(
    state?.settings?.currency || "USD",
  );
  const [calendarPriceType, setCalendarPriceType] = useState<"fixed" | "hourly" | "per_attendee">(
    "fixed",
  );

  // Multiple bookings
  const [calendarAllowMultipleBookings, setCalendarAllowMultipleBookings] = useState(false);
  const [calendarAllowRecurring, setCalendarAllowRecurring] = useState(false);

  // Availability
  const [breaks, setBreaks] = useState<{ id: number; date?: string; start: string; end: string }[]>(
    [],
  );
  const [specificDateAvailability, setSpecificDateAvailability] = useState<
    { id: number; date: string; start: string; end: string }[]
  >([]);
  interface WeekdayAvailability {
    id: number;
    day: string;
    start: string;
    end: string;
  }
  const [weekdayAvailability, setWeekdayAvailability] = useState<WeekdayAvailability[]>([
    {
      id: 1,
      day: "Mon - Fri",
      start: "09:00",
      end: "17:00",
    },
  ]);
  const [bufferTime, setBufferTime] = useState(15);
  const [maxAdvanceBooking, setMaxAdvanceBooking] = useState(60);
  const [timezoneDisplay, setTimezoneDisplay] = useState<"auto" | "locked">("auto");
  const [showTimezone, setShowTimezone] = useState(true);
  const [fixedDateRange, setFixedDateRange] = useState<{ start: string; end: string } | null>(null);
  const [showFixedDateModal, setShowFixedDateModal] = useState(false);
  const [tempFixedDateRange, setTempFixedDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [lookBusy, setLookBusy] = useState<{ enabled: boolean; min: number; max: number }>({
    enabled: false,
    min: 20,
    max: 40,
  });
  const [showLookBusyModal, setShowLookBusyModal] = useState(false);
  const [grayOutBusy, setGrayOutBusy] = useState(false);

  // Booking limits
  interface BookingLimit {
    id: number;
    limit: number;
    scope: "all" | "email";
    period: "day" | "week" | "month" | "total";
  }
  const [bookingLimits, setBookingLimits] = useState<BookingLimit[]>([]);
  const [showBookingLimitInput, setShowBookingLimitInput] = useState(false);
  const [newLimitScope, setNewLimitScope] = useState<"all" | "email">("all");
  const [newLimitPeriod, setNewLimitPeriod] = useState<"day" | "week" | "month" | "total">("day");
  const [newLimitValue, setNewLimitValue] = useState(10);

  // Booking Form
  interface Question {
    id: number;
    label: string;
    type: "short" | "long" | "radio" | "select" | "text-block";
    required: boolean;
    options?: string[];
    active: boolean;
    text?: string;
  }
  const [calendarQuestions, setCalendarQuestions] = useState<Question[]>([
    { id: 1, label: "الاسم الكامل", type: "short", required: true, active: true },
    { id: 2, label: "رقم الهاتف", type: "short", required: true, active: true },
    { id: 3, label: "البريد الإلكتروني", type: "short", required: true, active: true },
    { id: 4, label: "الضيوف", type: "short", required: false, active: true },
  ]);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<
    "short" | "long" | "radio" | "select" | "text-block"
  >("short");
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);
  const [newQuestionOptions, setNewQuestionOptions] = useState<string[]>([]);
  const [newOptionInput, setNewOptionInput] = useState("");
  const [editingTextBlockId, setEditingTextBlockId] = useState<number | null>(null);

  const [textBlockModalOpen, setTextBlockModalOpen] = useState(false);
  const [textBlockLabel, setTextBlockLabel] = useState("");
  const [textBlockText, setTextBlockText] = useState("");
  interface TextBlock {
    id: number;
    label: string;
    text: string;
    active: boolean;
  }
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [editingQuestionItems, setEditingQuestionItems] = useState<{ [key: number]: string[] }>({});

  // Default field modals
  const [defaultFieldModal, setDefaultFieldModal] = useState<{
    open: boolean;
    fieldId: number | null;
  }>({ open: false, fieldId: null });
  const [nameFieldType, setNameFieldType] = useState<"name" | "firstlast">("name");
  const [nameFieldLabel, setNameFieldLabel] = useState("");
  const [firstNameLabel, setFirstNameLabel] = useState("");
  const [lastNameLabel, setLastNameLabel] = useState("");
  const [emailFieldLabel, setEmailFieldLabel] = useState("");
  const [emailRequired, setEmailRequired] = useState(true);
  const [guestsLabel, setGuestsLabel] = useState("");
  const [guestsShowCounter, setGuestsShowCounter] = useState(false);
  const [guestDetails, setGuestDetails] = useState<
    { id: number; label: string; active: boolean; required: boolean }[]
  >([
    { id: 1, label: "الاسم", active: true, required: true },
    { id: 2, label: "البريد الإلكتروني", active: true, required: true },
  ]);
  const [phoneFieldLabel, setPhoneFieldLabel] = useState("");

  // After Booking
  const [confirmationBody, setConfirmationBody] = useState(
    "سيتم إرسال دعوة التقويم مع جميع التفاصيل عبر البريد الإلكتروني",
  );
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);

  // Core state
  const [calendarName, setCalendarName] = useState("");
  const [calendarSlug, setCalendarSlug] = useState("");
  const [calendarColor, setCalendarColor] = useState("#3b82f6");
  const [calendarLanguage, setCalendarLanguage] = useState<"ar" | "en">("ar");
  const [calendarDescription, setCalendarDescription] = useState("");
  const [calendarDisplayBranding, setCalendarDisplayBranding] = useState(false);
  const [calendarPasswordProtect, setCalendarPasswordProtect] = useState(false);
  const [calendarPassword, setCalendarPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [calendarDuration, setCalendarDuration] = useState(30);
  const [calendarIsFree, setCalendarIsFree] = useState(true);
  const [calendarPrice, setCalendarPrice] = useState(0);
  const [calendarRequireApproval, setCalendarRequireApproval] = useState(false);
  const [calendarAllowMultiple, setCalendarAllowMultiple] = useState(false);
  const [calendarGroupEnabled, setCalendarGroupEnabled] = useState(false);
  const [calendarGroupMax, setCalendarGroupMax] = useState(1);
  const [calendarDisplaySpotsLeft, setCalendarDisplaySpotsLeft] = useState(true);
  const [calendarStartIncrement, setCalendarStartIncrement] = useState<number | string>(
    "use-duration",
  );
  const [calendarMinimumNotice, setCalendarMinimumNotice] = useState(30);
  const [calendarAvailability, setCalendarAvailability] = useState([
    { day: "Sunday", enabled: true, start: "10:00", end: "18:00" },
    { day: "Monday", enabled: true, start: "10:00", end: "18:00" },
    { day: "Tuesday", enabled: true, start: "10:00", end: "18:00" },
    { day: "Wednesday", enabled: true, start: "10:00", end: "18:00" },
    { day: "Thursday", enabled: true, start: "10:00", end: "16:00" },
    { day: "Friday", enabled: false, start: "10:00", end: "18:00" },
    { day: "Saturday", enabled: false, start: "10:00", end: "18:00" },
  ]);
  const [calendarNotifications, setCalendarNotifications] = useState({
    confirmationEmail: true,
    reminders: 1,
    followUp: false,
  });

  const defaultNotificationWorkflows: NotificationWorkflows = {
    immediateConfirmationEmail: {
      enabled: true,
      type: "email",
      trigger: "immediate",
      subject: "✅ تم تأكيد حجز جلستك",
      body: "أهلاً {INVITEE_FIRST_NAME}،\nتم تأكيد موعدك مع {AFFILIATE_NAME}\n📅 التاريخ: {DATE}\n⏰ الوقت: {TIME}\n🔗 رابط الزووم: {ZOOM_LINK}\nيمكنك تعديل أو إلغاء الموعد من هنا: {MANAGE_BOOKING_LINK}",
      name: "Immediate Booking Confirmation (Email)",
    },
    immediateConfirmationWhatsapp: {
      enabled: true,
      type: "email",
      trigger: "after_booking",
      timingValue: 1,
      timingUnit: "minutes",
      subject: "✅ تأكيد إضافي لحجز جلستك",
      body: "أهلاً {INVITEE_FIRST_NAME}.\nتم تأكيد حجز جلستك.\nميعادك: {DATE} @ {TIME}\nلو احتجت أي حاجة تواصل معنا.",
      name: "1 Minute After Booking Follow-up (Email)",
    },
    reminder24hEmail: {
      enabled: true,
      type: "email",
      trigger: "before_event",
      timingValue: 24,
      timingUnit: "hours",
      subject: "تذكير: موعدك غداً",
      body: "أهلاً {INVITEE_FIRST_NAME}،\nنذكرك بموعدك غداً.\n📅 التاريخ: {DATE}\n⏰ الوقت: {TIME}",
      name: "24 Hours Before (Email)",
    },
    reminder3hWhatsapp: {
      enabled: true,
      type: "email",
      trigger: "before_event",
      timingValue: 3,
      timingUnit: "hours",
      subject: "تذكير: موعدنا بعد 3 ساعات",
      body: "أهلاً {INVITEE_FIRST_NAME}، موعدنا بعد 3 ساعات.\nالتاريخ: {DATE} @ {TIME}",
      name: "3 Hours Before (Email)",
    },
    reminder30mSmsWhatsapp: {
      enabled: true,
      type: "email",
      trigger: "before_event",
      timingValue: 30,
      timingUnit: "minutes",
      subject: "تذكير: موعدنا بعد 30 دقيقة",
      body: "أهلاً {INVITEE_FIRST_NAME}، موعدنا بعد 30 دقيقة.\nرابط الزووم: {ZOOM_LINK}",
      name: "30 Minutes Before (Email)",
    },
    postEventAttendedEmail: {
      enabled: true,
      type: "email",
      trigger: "after_event",
      subject: "شكراً لحضورك",
      body: "شكراً لحضورك. لو عندك أي استفسار رد على الرسالة.",
      name: "Immediately After Event - Attended (Email)",
    },
    postEventNoShowEmail: {
      enabled: true,
      type: "email",
      trigger: "after_event",
      subject: "لم تحضر الموعد",
      body: "واضح إنك مقدرتش تحضر. اضغط هنا واحجز موعد جديد: {REBOOK_LINK}",
      name: "Client Did Not Attend - No-Show (Email)",
    },
    abandonment2hEmail: {
      enabled: true,
      type: "email",
      trigger: "abandoned",
      timingValue: 2,
      timingUnit: "hours",
      subject: "لسه عندك فرصة",
      body: "لسه عندك فرصة.",
      name: "2 Hours After Visit (Email)",
    },
    abandonment2dEmail: {
      enabled: true,
      type: "email",
      trigger: "abandoned",
      timingValue: 2,
      timingUnit: "days",
      subject: "لسه مهتم؟",
      body: "لسه مهتم؟ احجز من هنا: {BOOKING_LINK}",
      name: "2 Days After Visit (Email)",
    },
  };
  const [notificationWorkflows, setNotificationWorkflows] = useState<NotificationWorkflows>(
    defaultNotificationWorkflows,
  );

  const [customizingWorkflow, setCustomizingWorkflow] = useState<{
    key: keyof NotificationWorkflows | null;
    template: NotificationTemplate | null;
  }>({ key: null, template: null });

  const [calendarAfterBooking, setCalendarAfterBooking] = useState({
    redirectEnabled: false,
    redirectUrl: "https://www.mohamedjoe.com/pages/thank-you-for-appointment",
    allowCancelReschedule: true,
    scheduleAnother: false,
    prefill: true,
    webhookEnabled: false,
    webhookUrl: "https://n8n.srv1259274.hstgr.cloud/webhook/5f4f7bb6-01ff-4445-8d62-a49726b54664",
    confirmationBody: "سيتم إرسال دعوة التقويم مع جميع التفاصيل عبر البريد الإلكتروني",
  });

  const [calendarTemplateSettings, setCalendarTemplateSettings] =
    useState<CalendarTemplateSettings>({
      previewMode: "default",
      postBookingMode: "custom_url",
      emailNotificationMode: "default",
    });

  // ---- Define translateText before using it ----
  const isRtl = state.settings.language === "ar";
  const translateText = (arabicText: string, englishText: string) =>
    isRtl ? arabicText : englishText;

  const getTemplateTitle = (t: PartnerTemplate | SystemTemplate) => {
    return isRtl ? t.title_ar || t.title_en || t.title : t.title_en || t.title_ar || t.title;
  };

  const buildTemplateGroups = (category: string) => {
    const sysOpts = systemTemplates
      .filter((t) => t.category === category)
      .map((t) => ({ value: t.id, label: getTemplateTitle(t) as string }));
    const partOpts = partnerTemplates
      .filter((t) => t.category === category)
      .map((t) => ({ value: t.id, label: getTemplateTitle(t) as string }));

    const groups = [];
    if (sysOpts.length > 0) {
      groups.push({
        label: translateText("قوالب النظام (الإدارة)", "System Templates (Admin)"),
        options: sysOpts,
      });
    }
    if (partOpts.length > 0) {
      groups.push({
        label: translateText("قوالبي المخصصة", "My Custom Templates"),
        options: partOpts,
      });
    }
    return groups;
  };

  const presetOptions = [
    { value: "Every day", label: translateText("كل يوم", "Every day") },
    { value: "Mon - Fri", label: translateText("من الإثنين إلى الجمعة", "Mon - Fri") },
    { value: "Sat - Sun", label: translateText("السبت والأحد", "Sat - Sun") },
    { value: "Monday", label: translateText("الإثنين", "Monday") },
    { value: "Tuesday", label: translateText("الثلاثاء", "Tuesday") },
    { value: "Wednesday", label: translateText("الأربعاء", "Wednesday") },
    { value: "Thursday", label: translateText("الخميس", "Thursday") },
    { value: "Friday", label: translateText("الجمعة", "Friday") },
    { value: "Saturday", label: translateText("السبت", "Saturday") },
    { value: "Sunday", label: translateText("الأحد", "Sunday") },
  ];
  const BASE_BOOKING_URL = "https://partner-os-e1f2e.web.app/preview";

  // ---- Options (now defined after translateText) ----
  const languageOptions = [
    { value: "ar", label: "العربية" },
    { value: "en", label: "English" },
  ];

  const incrementOptions = [
    { value: "use-duration", label: translateText("استخدام مدة الاجتماع", "Use meeting duration") },
    { value: 5, label: "5 min" },
    { value: 10, label: "10 min" },
    { value: 15, label: "15 min" },
    { value: 20, label: "20 min" },
    { value: 30, label: "30 min" },
    { value: 45, label: "45 min" },
    { value: 60, label: "1 hour" },
    { value: 120, label: "2 hours" },
    { value: "custom", label: translateText("مخصص", "Custom") },
  ];

  const bufferOptions = [
    { value: 0, label: "0 min" },
    { value: 5, label: "5 min" },
    { value: 10, label: "10 min" },
    { value: 15, label: "15 min" },
    { value: 30, label: "30 min" },
    { value: 45, label: "45 min" },
    { value: 60, label: "1 hour" },
    { value: 90, label: "1 h 30 min" },
    { value: 120, label: "2 hours" },
    { value: 150, label: "2 hrs 30 min" },
    { value: 180, label: "3 hours" },
    { value: "custom", label: translateText("مخصص", "Custom") },
  ];

  const noticeOptions = [
    { value: 0, label: "0 hour" },
    { value: 30, label: "30 min" },
    { value: 60, label: "1 hour" },
    { value: 120, label: "2 hours" },
    { value: 240, label: "4 hours" },
    { value: 360, label: "6 hours" },
    { value: 720, label: "12 hours" },
    { value: 1440, label: "24 hours" },
    { value: 2880, label: "48 hours" },
    { value: 4320, label: "72 hours" },
    { value: 10080, label: "1 week" },
    { value: 20160, label: "2 weeks" },
    { value: "custom", label: translateText("مخصص", "Custom") },
  ];

  const maxAdvanceOptions = [
    { value: 1, label: "1 day" },
    { value: 2, label: "2 days" },
    { value: 3, label: "3 days" },
    { value: 7, label: "1 week" },
    { value: 14, label: "2 weeks" },
    { value: 30, label: "1 month" },
    { value: 60, label: "2 months" },
    { value: 90, label: "3 months" },
    { value: "indefinitely", label: translateText("غير محدد", "Indefinitely") },
    { value: "custom", label: translateText("مخصص", "Custom") },
  ];

  const reminderOptions = [
    { value: 0, label: "0" },
    { value: 1, label: "1" },
    { value: 2, label: "2" },
    { value: 3, label: "3" },
  ];

  const questionTypeOptions = [
    { value: "short", label: translateText("إجابة قصيرة", "Short answer") },
    { value: "long", label: translateText("إجابة طويلة", "Long answer") },
    { value: "radio", label: translateText("اختيار من متعدد", "Multiple choice") },
  ];

  const currencyOptions = [
    { value: "USD", label: "$ USD" },
    { value: "AED", label: "د.إ AED" },
    { value: "SAR", label: "ر.س SAR" },
    { value: "EGP", label: "ج.م EGP" },
    { value: "KWD", label: "د.ك KWD" },
    { value: "QAR", label: "ر.ق QAR" },
    { value: "EUR", label: "€ EUR" },
    { value: "GBP", label: "£ GBP" },
  ];

  const timezoneOptions = [
    { value: "auto", label: translateText("اكتشاف تلقائي", "Automatically detect") },
    { value: "locked", label: translateText("تثبيت التوقيت", "Lock timezone") },
  ];

  const periodOptions = [
    { value: "day", label: translateText("يوم", "Day") },
    { value: "week", label: translateText("أسبوع", "Week") },
    { value: "month", label: translateText("شهر", "Month") },
    { value: "total", label: translateText("إجمالي", "Total") },
  ];

  const scopeOptions = [
    { value: "all", label: translateText("للجميع", "For all") },
    { value: "email", label: translateText("للبريد الإلكتروني", "For email") },
  ];

  const locationTypeOptions = [
    { value: "none", label: translateText("بدون", "None") },
    { value: "zoom", label: "Zoom" },
    { value: "meet", label: "Google Meet" },
    { value: "teams", label: "Microsoft Teams" },
    { value: "phone", label: translateText("مكالمة هاتفية", "Phone call") },
    { value: "in-person", label: translateText("حضوري", "In-Person") },
    { value: "ask-invitee", label: translateText("اسأل المدعو", "Ask Invitee") },
    { value: "custom", label: translateText("مخصص", "Custom") },
  ];

  const requiredOptions = [
    { value: "required", label: translateText("إجباري", "Required") },
    { value: "optional", label: translateText("اختياري", "Optional") },
  ];

  const nameTypeOptions = [
    { value: "name", label: translateText("الاسم", "Name") },
    { value: "firstlast", label: translateText("الاسم الأول / الثاني", "First Name / Last Name") },
  ];

  // Duration preset options (defined after translateText)
  const durationPresetOptions = [
    { value: 15, label: "15 min" },
    { value: 30, label: "30 min" },
    { value: 45, label: "45 min" },
    { value: 60, label: "1 hour" },
    { value: 90, label: "1 h 30 min" },
    { value: 120, label: "2 hours" },
    { value: "custom", label: translateText("مخصص", "Custom") },
  ];

  // ---- Effects ----
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        colorPickerReference.current &&
        !colorPickerReference.current.contains(event.target as Node)
      ) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ---- Scroll functions ----
  const scrollToDuration = () => {
    setOpenAccordionSection("duration");
    setTimeout(() => {
      if (durationRef.current) {
        durationRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const scrollToPrice = () => {
    setOpenAccordionSection("duration");
    setTimeout(() => {
      if (priceRef.current) {
        priceRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const scrollToMultipleOptions = () => {
    setOpenAccordionSection("duration");
    setTimeout(() => {
      if (multipleOptionsRef.current) {
        multipleOptionsRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  // ---- Data ----
  const calendars = state.calendars || [];
  const bookings = state.bookings || [];

  const filteredBookings = bookings.filter((booking) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      (booking.name || "").toLowerCase().includes(query) ||
      (booking.contact || "").toLowerCase().includes(query) ||
      (booking.source || "").toLowerCase().includes(query) ||
      Object.values(booking.answers || {}).some((val) => String(val).toLowerCase().includes(query));
    const matchesStatus =
      statusFilter === "all" || (booking.status || "").toLowerCase() === statusFilter.toLowerCase();
    const matchesCalendar = calendarFilter === "all" || booking.calendarId === calendarFilter;
    return matchesSearch && matchesStatus && matchesCalendar;
  });

  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter((booking) => booking.status === "Confirmed").length;
  const pendingBookings = bookings.filter((booking) => booking.status === "Pending").length;
  const cancelledBookings = bookings.filter((booking) => booking.status === "Cancelled").length;
  const todayBookings = bookings.filter(
    (booking) => booking.date === new Date().toISOString().slice(0, 10),
  ).length;

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setCalendarFilter("all");
    toast.success(translateText("تم إعادة تعيين الفلاتر", "Filters reset"));
  };

  // ---- Calendar CRUD ----
  const openCalendarModal = (calendarId?: number) => {
    setEditingCalendarId(calendarId || null);
    const existingCalendar = calendarId
      ? calendars.find((calendar) => calendar.id === calendarId)
      : null;

    if (existingCalendar) {
      setCalendarName(existingCalendar.name || "");
      setCalendarSlug(existingCalendar.slug || "");
      setCalendarColor(existingCalendar.color || "#3b82f6");
      setCalendarLanguage((existingCalendar.language as "ar" | "en") || "ar");
      setCalendarDescription(existingCalendar.description || "");
      setCalendarDisplayBranding(existingCalendar.displayBranding || false);
      setCalendarPasswordProtect(existingCalendar.passwordProtect || false);
      setCalendarPassword(existingCalendar.password || "");
      setCalendarDuration(existingCalendar.duration || 30);
      setCalendarIsFree(existingCalendar.free !== false);
      setCalendarPrice(existingCalendar.price || 0);
      setCalendarRequireApproval(existingCalendar.requireApproval || false);
      setCalendarAllowMultiple(existingCalendar.allowMultipleBookings || false);
      setCalendarGroupEnabled(existingCalendar.groupEnabled || false);
      setCalendarGroupMax(existingCalendar.groupMax || 1);
      setCalendarDisplaySpotsLeft(existingCalendar.displaySpotsLeft !== false);
      setCalendarStartIncrement(existingCalendar.startIncrement || "use-duration");
      setCalendarMinimumNotice(existingCalendar.minNotice || 30);
      const loadedQuestions: Question[] = (existingCalendar.questions || [
        { id: 1, label: "الاسم الكامل", type: "short", required: true, active: true },
        { id: 2, label: "رقم الهاتف", type: "short", required: true, active: true },
        { id: 3, label: "البريد الإلكتروني", type: "short", required: true, active: true },
        { id: 4, label: "الضيوف", type: "short", required: false, active: true },
      ]) as Question[];
      const loadedTextBlocks = existingCalendar.textBlocks || [];
      const mergedQuestions = [...loadedQuestions];
      loadedTextBlocks.forEach((tb: any) => {
        if (!mergedQuestions.some((q) => q.type === "text-block" && q.id === tb.id)) {
          mergedQuestions.push({
            id: tb.id,
            label: tb.label,
            text: tb.text,
            type: "text-block",
            required: false,
            active: tb.active !== false,
          });
        }
      });
      setCalendarQuestions(mergedQuestions);
      setCalendarAvailability(
        existingCalendar.availability || [
          { day: "Sunday", enabled: true, start: "10:00", end: "18:00" },
          { day: "Monday", enabled: true, start: "10:00", end: "18:00" },
          { day: "Tuesday", enabled: true, start: "10:00", end: "18:00" },
          { day: "Wednesday", enabled: true, start: "10:00", end: "18:00" },
          { day: "Thursday", enabled: true, start: "10:00", end: "16:00" },
          { day: "Friday", enabled: false, start: "10:00", end: "18:00" },
          { day: "Saturday", enabled: false, start: "10:00", end: "18:00" },
        ],
      );
      setCalendarNotifications(
        existingCalendar.notifications || {
          confirmationEmail: true,
          reminders: 1,
          followUp: false,
        },
      );
      setCalendarAfterBooking({
        redirectEnabled: existingCalendar.afterBooking?.redirectEnabled ?? false,
        redirectUrl:
          existingCalendar.afterBooking?.redirectUrl ??
          "https://www.mohamedjoe.com/pages/thank-you-for-appointment",
        allowCancelReschedule: existingCalendar.afterBooking?.allowCancelReschedule ?? true,
        scheduleAnother: existingCalendar.afterBooking?.scheduleAnother ?? false,
        prefill: existingCalendar.afterBooking?.prefill ?? true,
        webhookEnabled: existingCalendar.afterBooking?.webhookEnabled ?? false,
        webhookUrl: existingCalendar.afterBooking?.webhookUrl ?? "",
        confirmationBody:
          existingCalendar.afterBooking?.confirmationBody ??
          "سيتم إرسال دعوة التقويم مع جميع التفاصيل عبر البريد الإلكتروني",
      });
      setCalendarTemplateSettings({
        previewMode: existingCalendar.templateSettings?.previewMode ?? "default",
        previewTemplateId: existingCalendar.templateSettings?.previewTemplateId,
        postBookingMode:
          existingCalendar.templateSettings?.postBookingMode ??
          (existingCalendar.afterBooking as any)?.postBookingMode ??
          "standard",
        redirectUrl: existingCalendar.templateSettings?.redirectUrl,
        thankYouTemplateId: existingCalendar.templateSettings?.thankYouTemplateId,
        emailNotificationMode:
          existingCalendar.templateSettings?.emailNotificationMode ?? "default",
        emailTemplateId: existingCalendar.templateSettings?.emailTemplateId,
      });
      setCalendarImage(existingCalendar.image || "");
      setCalendarImageRound(existingCalendar.imageRound || false);
      setCalendarMediaType(existingCalendar.mediaType || "image");
      setCalendarTitleOverride(existingCalendar.titleOverride || "");
      setLocationOptions(
        existingCalendar.locationOptions || [
          { id: Date.now(), type: "zoom", label: "Zoom", linked: false },
        ],
      );
      setCalendarGroupCapacity(existingCalendar.groupCapacity || 1);
      // Load duration options - default to only 30 min if none exist
      setDurationOptions(
        existingCalendar.durationOptions || [{ id: 1, value: 30, isDefault: true }],
      );
      const defaultDur = (existingCalendar.durationOptions || []).find((d) => d.isDefault);
      if (defaultDur) {
        setCalendarDuration(defaultDur.value);
      } else {
        setCalendarDuration(30);
      }
      setCustomDurationInput(existingCalendar.customDuration || 30);
      setCalendarCurrency(existingCalendar.currency || "USD");
      setCalendarPriceType(existingCalendar.priceType || "fixed");
      setSpecificDateAvailability(existingCalendar.specificDateAvailability || []);
      setWeekdayAvailability(existingCalendar.additionalWeekdayAvailability || []);
      setCalendarAllowMultipleBookings(existingCalendar.allowMultipleBookings || false);
      setCalendarAllowRecurring(existingCalendar.allowRecurring || false);
      setBreaks(existingCalendar.breaks || []);
      setBufferTime(existingCalendar.bufferTime || 15);
      setMaxAdvanceBooking(existingCalendar.maxAdvanceBooking || 60);
      setTimezoneDisplay((existingCalendar.timezoneDisplay as "auto" | "locked") || "auto");
      setShowTimezone(
        existingCalendar.showTimezone !== undefined ? existingCalendar.showTimezone : true,
      );
      setFixedDateRange(existingCalendar.fixedDateRange || null);
      setLookBusy(existingCalendar.lookBusy || { enabled: false, min: 20, max: 40 });
      setGrayOutBusy(existingCalendar.grayOutBusy || false);
      setBookingLimits(existingCalendar.bookingLimits || []);

      if (existingCalendar.notificationWorkflows) {
        setNotificationWorkflows(existingCalendar.notificationWorkflows);
      } else {
        setNotificationWorkflows(defaultNotificationWorkflows);
      }

      setTextBlocks([]);
      setConfirmationBody(
        existingCalendar.afterBooking?.confirmationBody ||
          "سيتم إرسال دعوة التقويم مع جميع التفاصيل عبر البريد الإلكتروني",
      );

      const initialOptionsTexts: Record<number, string> = {};
      loadedQuestions.forEach((q) => {
        if (q.type === "radio" || q.type === "select") {
          initialOptionsTexts[q.id] = (q.options || []).join(", ");
        }
      });
      setOptionsTexts(initialOptionsTexts);
      const items: { [key: number]: string[] } = {};
      loadedQuestions.forEach((q) => {
        if (q.type === "radio" || q.type === "select") {
          items[q.id] = q.options || [];
        }
      });
      setEditingQuestionItems(items);
    } else {
      resetCalendarForm();
    }
    setOpenAccordionSection("page");
    setAvailAdvancedOpen(false);
    setShowAdvanced(false);
    setIsCalendarModalOpen(true);
  };

  const resetCalendarForm = () => {
    setCalendarName("");
    setCalendarSlug("");
    setCalendarColor("#3b82f6");
    setCalendarLanguage("ar");
    setCalendarDescription("");
    setOptionsTexts({});
    setCalendarDisplayBranding(false);
    setCalendarPasswordProtect(false);
    setCalendarPassword("");
    setCalendarDuration(30);
    setCalendarIsFree(true);
    setCalendarPrice(0);
    setCalendarRequireApproval(false);
    setCalendarAllowMultiple(false);
    setCalendarGroupEnabled(false);
    setCalendarGroupMax(1);
    setCalendarDisplaySpotsLeft(true);
    setCalendarStartIncrement(60);
    setCalendarMinimumNotice(30);
    setCalendarQuestions([
      { id: 1, label: "الاسم الكامل", type: "short", required: true, active: true },
      { id: 2, label: "رقم الهاتف", type: "short", required: true, active: true },
      { id: 3, label: "البريد الإلكتروني", type: "short", required: true, active: true },
      { id: 4, label: "الضيوف", type: "short", required: false, active: true },
    ]);
    setCalendarAvailability([
      { day: "Sunday", enabled: true, start: "10:00", end: "18:00" },
      { day: "Monday", enabled: true, start: "10:00", end: "18:00" },
      { day: "Tuesday", enabled: true, start: "10:00", end: "18:00" },
      { day: "Wednesday", enabled: true, start: "10:00", end: "18:00" },
      { day: "Thursday", enabled: true, start: "10:00", end: "16:00" },
      { day: "Friday", enabled: false, start: "10:00", end: "18:00" },
      { day: "Saturday", enabled: false, start: "10:00", end: "18:00" },
    ]);
    setCalendarNotifications({ confirmationEmail: true, reminders: 1, followUp: false });
    setCalendarAfterBooking({
      redirectEnabled: false,
      redirectUrl: "https://www.mohamedjoe.com/pages/thank-you-for-appointment",
      allowCancelReschedule: true,
      scheduleAnother: false,
      prefill: true,
      webhookEnabled: false,
      webhookUrl: "https://n8n.srv1259274.hstgr.cloud/webhook/5f4f7bb6-01ff-4445-8d62-a49726b54664",
      confirmationBody: "سيتم إرسال دعوة التقويم مع جميع التفاصيل عبر البريد الإلكتروني",
    });
    setCalendarTemplateSettings({
      previewMode: "default",
      postBookingMode: "custom_url",
      emailNotificationMode: "default",
    });
    setCalendarImage("");
    setCalendarImageRound(false);
    setCalendarMediaType("image");
    setIsUploadingMedia(false);
    setCalendarTitleOverride("");
    setLocationOptions([{ id: Date.now(), type: "none", label: "None", linked: false }]);
    setCalendarGroupCapacity(1);
    // ONLY 30 min by default
    setDurationOptions([{ id: 1, value: 30, isDefault: true }]);
    setCalendarDuration(30);
    setCustomDurationInput(30);
    setCalendarCurrency(state?.settings?.currency || "USD");
    setCalendarPriceType("fixed");
    setSpecificDateAvailability([]);
    setWeekdayAvailability([
      {
        id: Date.now() + Math.random(),
        day: "Mon - Fri",
        start: "09:00",
        end: "17:00",
      },
    ]);
    setCalendarAllowMultipleBookings(false);
    setCalendarAllowRecurring(false);
    setBreaks([]);
    setBufferTime(15);
    setMaxAdvanceBooking(60);
    setTimezoneDisplay("auto");
    setShowTimezone(true);
    setFixedDateRange(null);
    setLookBusy({ enabled: false, min: 20, max: 40 });
    setGrayOutBusy(false);
    setBookingLimits([]);
    setTextBlocks([]);
    setConfirmationBody("سيتم إرسال دعوة التقويم مع جميع التفاصيل عبر البريد الإلكتروني");
    setEditingQuestionItems({});
  };

  const sanitizeFirestoreData = (data: any): any => {
    if (data === undefined) return null;
    if (data === null) return null;
    if (Array.isArray(data)) {
      return data.map(sanitizeFirestoreData);
    }
    if (typeof data === "object") {
      const clean: any = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const val = data[key];
          if (val !== undefined) {
            clean[key] = sanitizeFirestoreData(val);
          }
        }
      }
      return clean;
    }
    return data;
  };

  const saveCalendar = async () => {
    if (isAdmin) {
      toast.error(translateText("الآدمن لا يمكنه حفظ التقويمات", "Admin cannot save calendars"));
      return;
    }
    if (!calendarName.trim()) {
      toast.error(translateText("اكتب اسم التقويم", "Enter calendar name"));
      return;
    }
    let slug = calendarSlug.trim();
    slug = slug
      ? slug
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 50)
      : calendarName
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 50);

    if (!slug || slug === "-") {
      const randSuffix = Math.floor(100 + Math.random() * 900);
      slug = `booking${randSuffix}`;
    }

    const calendarId = editingCalendarId || Date.now();
    const existingCalendar = calendars.find((c) => c.id === editingCalendarId);
    const calendarData = {
      id: calendarId,
      userId: user?.uid || "",
      name: calendarName.trim(),
      slug: slug,
      color: calendarColor,
      language: calendarLanguage,
      description: calendarDescription.trim(),
      displayBranding: true,
      passwordProtect: calendarPasswordProtect,
      password: calendarPassword,
      duration: Number(calendarDuration),

      requireApproval: calendarRequireApproval,
      allowMultipleBookings: calendarAllowMultipleBookings,
      allowRecurring: calendarAllowRecurring,
      groupEnabled: false,
      groupMax: Number(calendarGroupCapacity) > 1 ? Number(calendarGroupCapacity) : 1,
      groupCapacity: Number(calendarGroupCapacity),
      displaySpotsLeft: calendarDisplaySpotsLeft,
      availability: calendarAvailability.map((item) => ({ ...item, enabled: false })),
      free: true,
      price: 0,
      startIncrement:
        calendarStartIncrement === "use-duration" ? "use-duration" : Number(calendarStartIncrement),
      minNotice: Number(calendarMinimumNotice),
      notifications: calendarNotifications,
      notificationWorkflows: notificationWorkflows,
      afterBooking: {
        ...calendarAfterBooking,
        confirmationBody: confirmationBody,
        redirectUrl: calendarTemplateSettings.redirectUrl || calendarAfterBooking.redirectUrl,
        postBookingMode: calendarTemplateSettings.postBookingMode,
      },
      templateSettings: calendarTemplateSettings,
      questions: calendarQuestions.filter((question) => question.label.trim() !== ""),
      active: true,
      url: `${BASE_BOOKING_URL}/${slug}`,
      image: calendarImage,
      imageRound: calendarImageRound,
      mediaType: calendarMediaType,
      titleOverride: calendarTitleOverride,
      locationOptions: locationOptions,
      durationOptions: durationOptions,
      customDuration: customDurationInput,
      currency: calendarCurrency,
      priceType: calendarPriceType,
      specificDateAvailability: specificDateAvailability,
      additionalWeekdayAvailability: weekdayAvailability,
      hostTimezone:
        existingCalendar?.hostTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      breaks: breaks,
      bufferTime: bufferTime,
      maxAdvanceBooking: maxAdvanceBooking,
      timezoneDisplay: timezoneDisplay,
      showTimezone: showTimezone,
      fixedDateRange: fixedDateRange,
      lookBusy: lookBusy,
      grayOutBusy: grayOutBusy,
      bookingLimits: bookingLimits,
      textBlocks: calendarQuestions
        .filter((q) => q.type === "text-block")
        .map((q) => ({
          id: q.id,
          label: q.label,
          text: q.text || "",
          active: q.active,
        })),
    };

    setIsSaving(true);
    try {
      const docKey = `calendar-${calendarId}-${user?.uid || ""}`;
      await firestore.setDoc(
        firestore.doc(db, "calendars", docKey),
        sanitizeFirestoreData(calendarData),
      );
      if (editingCalendarId) {
        toast.success(translateText("تم حفظ التقويم", "Calendar saved"));
      } else {
        toast.success(translateText("تم إنشاء التقويم", "Calendar created"));
      }
      setIsCalendarModalOpen(false);
    } catch (err) {
      console.error("Error saving calendar:", err);
      toast.error(translateText("حدث خطأ أثناء حفظ التقويم", "Error saving calendar"));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCalendar = async () => {
    if (isAdmin) {
      toast.error(translateText("الآدمن لا يمكنه حذف التقويمات", "Admin cannot delete calendars"));
      return;
    }
    if (!selectedCalendar) return;
    setIsDeleting(true);
    try {
      const calendarDocKey = `calendar-${selectedCalendar.id}-${user?.uid || ""}`;
      const relatedBookings = bookings.filter((b) => b.calendarId === selectedCalendar.id);
      const deletePromises = [firestore.deleteDoc(firestore.doc(db, "calendars", calendarDocKey))];
      for (const b of relatedBookings) {
        const bKey = `booking-${b.id}-${user?.uid || ""}`;
        deletePromises.push(firestore.deleteDoc(firestore.doc(db, "bookings", bKey)));
      }
      await Promise.all(deletePromises);
      toast.success(translateText("تم حذف التقويم بنجاح", "Calendar deleted successfully"));
      setIsDeleteConfirmationOpen(false);
      setSelectedCalendar(null);
    } catch (err) {
      console.error("Error deleting calendar:", err);
      toast.error(translateText("حدث خطأ أثناء حذف التقويم", "Error deleting calendar"));
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleCalendarActive = async (calendarId: number) => {
    if (isAdmin) {
      toast.error(
        translateText("الآدمن لا يمكنه تعديل حالة التقويم", "Admin cannot toggle calendar status"),
      );
      return;
    }
    const calendar = calendars.find((c) => c.id === calendarId);
    if (!calendar) return;
    try {
      const docKey = `calendar-${calendarId}-${user?.uid || ""}`;
      await firestore.setDoc(
        firestore.doc(db, "calendars", docKey),
        { active: !calendar.active },
        { merge: true },
      );
      toast.success(translateText("تم تحديث حالة التقويم", "Calendar status updated"));
    } catch (err) {
      console.error("Error toggling calendar active status:", err);
      toast.error(translateText("حدث خطأ أثناء تحديث التقويم", "Error updating calendar status"));
    }
  };

  const copyLinkToClipboard = (url: string, calendarId: number) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkId(calendarId);
    toast.success(translateText("تم نسخ الرابط", "Link copied"));
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  // ---- Booking functions ----
  const openStatusChangeModal = (booking: Booking) => {
    if (isAdmin) {
      toast.error(
        translateText("الآدمن لا يمكنه تغيير حالة الحجز", "Admin cannot change booking status"),
      );
      return;
    }
    setSelectedBooking(booking);
    setTemporaryStatus(booking.status as any);
    setIsStatusModalOpen(true);
  };

  const updateBookingStatus = async () => {
    if (isAdmin) {
      toast.error(
        translateText("الآدمن لا يمكنه تعديل حالة الحجز", "Admin cannot update booking status"),
      );
      return;
    }
    if (!selectedBooking) return;
    setIsSaving(true);
    try {
      const docKey = `booking-${selectedBooking.id}-${user?.uid || ""}`;
      await firestore.setDoc(
        firestore.doc(db, "bookings", docKey),
        { status: temporaryStatus },
        { merge: true },
      );
      toast.success(translateText("تم تحديث حالة الحجز", "Booking status updated"));
      setIsStatusModalOpen(false);
      setSelectedBooking(null);
    } catch (err) {
      console.error("Error updating booking status:", err);
      toast.error(translateText("حدث خطأ أثناء تحديث الحجز", "Error updating booking status"));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteBooking = async () => {
    if (isAdmin) {
      toast.error(translateText("الآدمن لا يمكنه حذف الحجز", "Admin cannot delete bookings"));
      return;
    }
    if (!selectedBooking) return;
    setIsDeleting(true);
    try {
      const docKey = `booking-${selectedBooking.id}-${user?.uid || ""}`;
      await firestore.deleteDoc(firestore.doc(db, "bookings", docKey));
      toast.success(translateText("تم حذف الحجز", "Booking deleted"));
      setIsDeleteConfirmationOpen(false);
      setSelectedBooking(null);
    } catch (err) {
      console.error("Error deleting booking:", err);
      toast.error(translateText("حدث خطأ أثناء حذف الحجز", "Error deleting booking"));
    } finally {
      setIsDeleting(false);
    }
  };

  const openBookingDetail = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsDetailModalOpen(true);
  };

  const openPublicPreview = (calendar: BookingCalendar) => {
    window.open(`/mohamed-joe-brand/preview/${calendar.slug || calendar.id}`, "_blank");
  };

  const openEmbedModal = (calendar: BookingCalendar) => {
    setSelectedCalendar(calendar);
    setIsEmbedModalOpen(true);
  };

  const toggleAccordion = (sectionId: string) => {
    setOpenAccordionSection(openAccordionSection === sectionId ? null : sectionId);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig: Record<
      string,
      { label: string; className: string; icon: React.ReactNode }
    > = {
      Confirmed: {
        label: translateText("مؤكدة", "Confirmed"),
        className:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
        icon: <CheckCircle className="w-3.5 h-3.5" />,
      },
      Pending: {
        label: translateText("معلقة", "Pending"),
        className:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
        icon: <Clock className="w-3.5 h-3.5" />,
      },
      Cancelled: {
        label: translateText("ملغاة", "Cancelled"),
        className:
          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
        icon: <XCircle className="w-3.5 h-3.5" />,
      },
      Completed: {
        label: translateText("مكتملة", "Completed"),
        className:
          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
        icon: <CheckCircle className="w-3.5 h-3.5" />,
      },
    };
    const configuration = statusConfig[status] || statusConfig.Pending;
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${configuration.className}`}
      >
        {configuration.icon}
        {configuration.label}
      </span>
    );
  };

  const getCalendarNameById = (calendarId: number) => {
    const calendar = calendars.find((calendar) => calendar.id === calendarId);
    return calendar ? calendar.name : translateText("محذوف", "Deleted");
  };

  const getCalendarColorById = (calendarId: number) => {
    const calendar = calendars.find((calendar) => calendar.id === calendarId);
    return calendar ? calendar.color || "#3b82f6" : "#3b82f6";
  };

  // ---- Helper functions ----
  const duplicateQuestion = (question: Question) => {
    const newId = Date.now() + Math.random();
    const newQ = { ...question, id: newId, label: question.label + " (copy)" };
    setCalendarQuestions([...calendarQuestions, newQ]);
  };

  const toggleQuestionActive = (id: number) => {
    setCalendarQuestions(
      calendarQuestions.map((q) => (q.id === id ? { ...q, active: !q.active } : q)),
    );
  };

  const deleteQuestion = (id: number) => {
    if (id <= 4) {
      toast.error(translateText("لا يمكن حذف الحقول الأساسية", "Cannot delete default fields"));
      return;
    }
    setCalendarQuestions(calendarQuestions.filter((q) => q.id !== id));
  };

  const duplicateTextBlock = (block: Question) => {
    const newId = Date.now() + Math.random();
    const newQ = { ...block, id: newId, label: block.label ? block.label + " (copy)" : "" };
    setCalendarQuestions([...calendarQuestions, newQ]);
  };

  const toggleTextBlockActive = (id: number) => {
    setCalendarQuestions(
      calendarQuestions.map((q) => (q.id === id ? { ...q, active: !q.active } : q)),
    );
  };

  const deleteTextBlock = (id: number) => {
    setCalendarQuestions(calendarQuestions.filter((q) => q.id !== id));
  };

  // ---- Sorting ----
  const moveQuestionUp = (index: number) => {
    if (index === 0) return;
    const updated = [...calendarQuestions];
    [updated[index], updated[index - 1]] = [updated[index - 1], updated[index]];
    setCalendarQuestions(updated);
  };

  const moveQuestionDown = (index: number) => {
    if (index === calendarQuestions.length - 1) return;
    const updated = [...calendarQuestions];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setCalendarQuestions(updated);
  };

  const openDefaultFieldModal = (fieldId: number) => {
    const field = calendarQuestions.find((q) => q.id === fieldId);
    if (!field) return;
    setDefaultFieldModal({ open: true, fieldId });
    if (fieldId === 1) {
      setNameFieldType("name");
      setNameFieldLabel(field.label);
      setFirstNameLabel("الاسم الأول");
      setLastNameLabel("الاسم الثاني");
    } else if (fieldId === 2) {
      setPhoneFieldLabel(field.label);
    } else if (fieldId === 3) {
      setEmailFieldLabel(field.label);
      setEmailRequired(field.required);
    } else if (fieldId === 4) {
      setGuestsLabel(field.label);
      setGuestsShowCounter(false);
      setGuestDetails([
        { id: 1, label: "الاسم", active: true, required: true },
        { id: 2, label: "البريد الإلكتروني", active: true, required: true },
      ]);
    }
  };

  const saveDefaultField = () => {
    const fieldId = defaultFieldModal.fieldId;
    if (!fieldId) return;
    const updated = calendarQuestions.map((q) => {
      if (q.id === fieldId) {
        let newLabel = q.label;
        if (fieldId === 1) {
          newLabel = nameFieldLabel || "الاسم الكامل";
        } else if (fieldId === 2) newLabel = phoneFieldLabel || "رقم الهاتف";
        else if (fieldId === 3) {
          newLabel = emailFieldLabel || "البريد الإلكتروني";
          q.required = emailRequired;
        } else if (fieldId === 4) newLabel = guestsLabel || "الضيوف";
        return { ...q, label: newLabel };
      }
      return q;
    });
    setCalendarQuestions(updated);
    setDefaultFieldModal({ open: false, fieldId: null });
    toast.success(translateText("تم التحديث", "Updated"));
  };

  // ---- Duration functions ----
  const addDurationOption = () => {
    const maxVal =
      durationOptions.length > 0 ? Math.max(...durationOptions.map((d) => d.value)) + 15 : 30;
    const maxId = durationOptions.reduce((max, d) => Math.max(max, d.id), 0);
    const newDur = { id: maxId + 1, value: maxVal, isDefault: false };
    setDurationOptions([...durationOptions, newDur]);
    toast.success(translateText("تمت الإضافة", "Added"));
  };

  const deleteDurationOption = (id: number) => {
    if (durationOptions.length <= 1) {
      toast.error(
        translateText("يجب أن يكون لديك مدة واحدة على الأقل", "Must have at least one duration"),
      );
      return;
    }
    const removed = durationOptions.find((d) => d.id === id);
    setDurationOptions(durationOptions.filter((d) => d.id !== id));
    if (removed?.isDefault) {
      const remaining = durationOptions.filter((d) => d.id !== id);
      if (remaining.length > 0) {
        const newDefault = { ...remaining[0], isDefault: true };
        setDurationOptions([newDefault, ...remaining.slice(1)]);
        setCalendarDuration(newDefault.value);
      }
    }
    toast.success(translateText("تم الحذف", "Deleted"));
  };

  const setDefaultDuration = (id: number) => {
    setDurationOptions(durationOptions.map((d) => ({ ...d, isDefault: d.id === id })));
    const def = durationOptions.find((d) => d.id === id);
    if (def) {
      setCalendarDuration(def.value);
    }
    toast.success(translateText("تم التحديث", "Updated"));
  };

  const updateDurationValue = (id: number, value: number) => {
    if (value <= 0) return;
    setDurationOptions(durationOptions.map((d) => (d.id === id ? { ...d, value: value } : d)));
    const def = durationOptions.find((d) => d.id === id);
    if (def?.isDefault) {
      setCalendarDuration(value);
    }
  };

  // ---- Booking Limits ----
  const addBookingLimit = () => {
    if (newLimitValue <= 0) return;
    const maxId = bookingLimits.reduce((max, l) => Math.max(max, l.id), 0);
    setBookingLimits([
      ...bookingLimits,
      { id: maxId + 1, limit: newLimitValue, scope: newLimitScope, period: newLimitPeriod },
    ]);
    setShowBookingLimitInput(false);
    toast.success(translateText("تمت الإضافة", "Added"));
  };

  const deleteBookingLimit = (id: number) => {
    setBookingLimits(bookingLimits.filter((l) => l.id !== id));
    toast.success(translateText("تم الحذف", "Deleted"));
  };

  // ---- Fixed Date Range ----
  const openFixedDateModal = () => {
    setTempFixedDateRange(fixedDateRange || { start: "", end: "" });
    setShowFixedDateModal(true);
  };

  const applyFixedDateRange = () => {
    if (tempFixedDateRange.start && tempFixedDateRange.end) {
      setFixedDateRange(tempFixedDateRange);
    } else {
      setFixedDateRange(null);
    }
    setShowFixedDateModal(false);
    toast.success(translateText("تم التحديث", "Updated"));
  };

  // ---- Availability slot generator ----
  const getAvailableSlotsForCalendar = (calendar: BookingCalendar) => {
    const slots: { date: string; times: string[] }[] = [];
    const availability = calendar.availability || [];
    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const now = new Date();

    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(now.getDate() + i);
      const dayName = daysOfWeek[d.getDay()];

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const dateDay = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${dateDay}`;

      // Check specific date overrides first
      let intervals: { start: string; end: string }[] = [];
      const specificDateEntries = specificDateAvailability.filter(
        (entry) => entry.date === dateStr,
      );

      if (specificDateEntries && specificDateEntries.length > 0) {
        intervals = specificDateEntries.map((e) => ({ start: e.start, end: e.end }));
      } else {
        const avail = availability.find((a) => a.day === dayName);
        if (avail && avail.enabled) {
          intervals.push({ start: avail.start || "10:00", end: avail.end || "18:00" });
        }
        const additionalEntries = weekdayAvailability.filter((entry) => {
          const day = entry.day;
          if (day === "Every day") return true;
          if (day === "Mon - Fri") {
            return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(dayName);
          }
          if (day === "Sat - Sun") {
            return ["Saturday", "Sunday"].includes(dayName);
          }
          return day === dayName;
        });
        if (additionalEntries && additionalEntries.length > 0) {
          intervals.push(...additionalEntries.map((e) => ({ start: e.start, end: e.end })));
        }
      }

      if (intervals.length > 0) {
        const times: string[] = [];
        const duration = Number(calendarDuration) || 30;
        const increment =
          calendarStartIncrement === "use-duration"
            ? duration
            : Number(calendarStartIncrement) || duration || 30;

        intervals.forEach(({ start, end }) => {
          const [startH, startM] = start.split(":").map(Number);
          const [endH, endM] = end.split(":").map(Number);

          const startMinutes = startH * 60 + startM;
          const endMinutes = endH * 60 + endM;

          for (let m = startMinutes; m + duration <= endMinutes; m += increment) {
            const h = Math.floor(m / 60);
            const mins = m % 60;
            const timeStr = `${String(h).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;

            const slotDate = new Date(year, d.getMonth(), d.getDate(), h, mins, 0);
            if (slotDate > now) {
              if (!times.includes(timeStr)) {
                times.push(timeStr);
              }
            }
          }
        });

        if (times.length > 0) {
          times.sort();
          slots.push({ date: dateStr, times });
        }
      }

      if (slots.length >= 3) break;
    }
    return slots;
  };

  // ---- Status filter ----
  const statusFilterOptions = [
    { value: "all", label: translateText("كل الحالات", "All Status") },
    { value: "confirmed", label: translateText("مؤكدة", "Confirmed") },
    { value: "pending", label: translateText("معلقة", "Pending") },
    { value: "cancelled", label: translateText("ملغاة", "Cancelled") },
    { value: "completed", label: translateText("مكتملة", "Completed") },
  ];

  const calendarFilterOptions = [
    { value: "all", label: translateText("كل التقويمات", "All Calendars") },
    ...calendars.map((calendar) => ({ value: calendar.id, label: calendar.name })),
  ];

  const dayLabels = {
    Sunday: "الأحد",
    Monday: "الاثنين",
    Tuesday: "الثلاثاء",
    Wednesday: "الأربعاء",
    Thursday: "الخميس",
    Friday: "الجمعة",
    Saturday: "السبت",
  };
  const dayOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // ========== MAIN RENDER ==========
  const renderWorkflowToggle = (key: keyof NotificationWorkflows) => {
    const workflow = notificationWorkflows[key];
    if (!workflow) return null;

    const getWorkflowTitle = (k: keyof NotificationWorkflows) => {
      switch (k) {
        case "immediateConfirmationEmail":
          return translateText(
            "تأكيد الحجز الفوري (بريد إلكتروني)",
            "Immediate Booking Confirmation (Email)",
          );
        case "immediateConfirmationWhatsapp":
          return translateText(
            "متابعة بعد دقيقة من الحجز (بريد إلكتروني)",
            "1 Minute After Booking Follow-up (Email)",
          );
        case "reminder24hEmail":
          return translateText("قبل الموعد بـ 24 ساعة (بريد إلكتروني)", "24 Hours Before (Email)");
        case "reminder3hWhatsapp":
          return translateText("قبل الموعد بـ 3 ساعات (بريد إلكتروني)", "3 Hours Before (Email)");
        case "reminder30mSmsWhatsapp":
          return translateText(
            "قبل الموعد بـ 30 دقيقة (بريد إلكتروني)",
            "30 Minutes Before (Email)",
          );
        case "postEventAttendedEmail":
          return translateText(
            "بعد الموعد مباشرة - تم الحضور (بريد إلكتروني)",
            "Immediately After Event - Attended (Email)",
          );
        case "postEventNoShowEmail":
          return translateText(
            "لم يحضر العميل (بريد إلكتروني)",
            "Client Did Not Attend - No-Show (Email)",
          );
        case "abandonment2hEmail":
          return translateText(
            "بعد ساعتين من الزيارة (بريد إلكتروني)",
            "2 Hours After Visit (Email)",
          );
        case "abandonment2dEmail":
          return translateText(
            "بعد يومين من الزيارة (بريد إلكتروني)",
            "2 Days After Visit (Email)",
          );
        default:
          return workflow.name;
      }
    };

    const renderTimingSubtitle = (w: typeof workflow) => {
      if (w.trigger === "immediate" || w.trigger === "after_event") return null;
      let unitStr = w.timingUnit || "";
      if (unitStr === "minutes") unitStr = translateText("دقيقة", "minutes");
      if (unitStr === "hours") unitStr = translateText("ساعة", "hours");
      if (unitStr === "days") unitStr = translateText("يوم", "days");

      if (isRtl) {
        if (w.trigger === "before_event") return `قبل الموعد بـ ${w.timingValue} ${unitStr}`;
        if (w.trigger === "abandoned") return `بعد الزيارة بـ ${w.timingValue} ${unitStr}`;
        if (w.trigger === "after_booking") return `بعد الحجز بـ ${w.timingValue} ${unitStr}`;
      } else {
        if (w.trigger === "before_event") return `${w.timingValue} ${unitStr} before`;
        if (w.trigger === "abandoned") return `${w.timingValue} ${unitStr} after visit`;
        if (w.trigger === "after_booking") return `${w.timingValue} ${unitStr} after booking`;
      }
      return null;
    };

    const timingSubtitle = renderTimingSubtitle(workflow);

    return (
      <div
        key={key}
        className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
      >
        <div className="flex-1 pr-4">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {getWorkflowTitle(key)}
          </div>
          {timingSubtitle && (
            <div dir={isRtl ? "rtl" : "ltr"} className="text-xs text-slate-400 mt-0.5">
              {timingSubtitle}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCustomizingWorkflow({ key, template: workflow })}
            className="px-3 py-1.5 text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors whitespace-nowrap"
          >
            {translateText("تخصيص", "Customize")}
          </button>
          <ToggleSwitch
            checked={workflow.enabled}
            onChange={(value) => {
              setNotificationWorkflows({
                ...notificationWorkflows,
                [key]: { ...workflow, enabled: value },
              });
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-12"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent flex items-center gap-3">
            <Calendar className="w-7 h-7 text-purple-500" />
            <span>
              {translateText(
                isAdmin ? "الحجوزات والمكالمات (عرض الإدارة)" : "الحجوزات والمكالمات",
                isAdmin ? "Booking & Calls (Admin View)" : "Booking & Calls",
              )}
            </span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {translateText(
              isAdmin
                ? "عرض لجميع التقويمات والحجوزات الواردة في النظام"
                : "التقويمات، الحجوزات الواردة، وسجل المكالمات",
              isAdmin
                ? "View of all calendars and incoming bookings in the system"
                : "Calendars, incoming bookings & call log",
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === "calendars" && !isAdmin && (
            <button
              onClick={() => openCalendarModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-500/20 transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>{translateText("تقويم جديد", "New Calendar")}</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        variants={itemVariants}
        className="flex gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/80 w-fit"
      >
        <button
          onClick={() => setActiveTab("calendars")}
          className={`px-5 py-2.5 text-sm font-bold rounded-lg transition flex items-center gap-2 ${
            activeTab === "calendars"
              ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <Settings className="w-4 h-4" />
          {translateText("التقويمات", "Calendars")}
          <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
            {calendars.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("bookings")}
          className={`px-5 py-2.5 text-sm font-bold rounded-lg transition flex items-center gap-2 ${
            activeTab === "bookings"
              ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          {translateText("الحجوزات الواردة", "Incoming Bookings")}
          <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
            {bookings.length}
          </span>
        </button>
      </motion.div>

      {/* ---------- CALENDARS TAB ---------- */}
      {activeTab === "calendars" ? (
        <>
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            {[
              {
                label: translateText("تقويمات نشطة", "Active Calendars"),
                value: calendars.filter((calendar) => calendar.active).length,
                icon: Calendar,
                color: "text-emerald-500",
                backgroundColor: "bg-emerald-50 dark:bg-emerald-900/20",
              },
              {
                label: translateText("إجمالي الحجوزات", "Total Bookings"),
                value: totalBookings,
                icon: PhoneCall,
                color: "text-purple-500",
                backgroundColor: "bg-purple-50 dark:bg-purple-900/20",
              },
              {
                label: translateText("حجوزات اليوم", "Today's Bookings"),
                value: todayBookings,
                icon: Clock,
                color: "text-blue-500",
                backgroundColor: "bg-blue-50 dark:bg-blue-900/20",
              },
              {
                label: translateText("تأكيدات معلّقة", "Pending Confirmations"),
                value: pendingBookings,
                icon: AlertTriangle,
                color: "text-amber-500",
                backgroundColor: "bg-amber-50 dark:bg-amber-900/20",
              },
            ].map((statistic, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className={`bg-white dark:bg-slate-900/80 border ${statistic.backgroundColor} border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 group`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${statistic.backgroundColor} group-hover:scale-110 transition-transform duration-300`}
                  >
                    <statistic.icon className={`w-4.5 h-4.5 ${statistic.color}`} />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-800 dark:text-white">
                      {statistic.value}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {statistic.label}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {isAdmin ? (
            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm p-2 hover:shadow-md transition-shadow duration-350"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/80 dark:to-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                      <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {translateText("التقويم", "Calendar")}
                      </th>
                      <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {translateText("بواسطة الشريك", "Created By Partner")}
                      </th>
                      <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {translateText("الرابط العام", "Public Link")}
                      </th>
                      <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {translateText("التفاصيل", "Details")}
                      </th>
                      <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {translateText("عدد الحجوزات", "Bookings Count")}
                      </th>
                      <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {translateText("الحالة", "Status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {calendars.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-16 text-slate-400">
                          {translateText("لا توجد تقويمات بعد", "No calendars yet")}
                        </td>
                      </tr>
                    ) : (
                      calendars.map((calendar) => {
                        const bookingCount = bookings.filter(
                          (b) => b.calendarId === calendar.id,
                        ).length;
                        const link = `${BASE_BOOKING_URL}/${calendar.slug}`;
                        const cardColor = calendar.color || "#3b82f6";
                        return (
                          <tr
                            key={calendar.id}
                            className="border-b border-slate-100 dark:border-slate-800/80 last:border-0 hover:border-b-purple-500/40 dark:hover:border-b-purple-500/35 transition-all duration-300 group"
                          >
                            <td className="px-4 py-4 text-center">
                              <span
                                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border transition-all duration-200 group-hover:scale-105"
                                style={{
                                  backgroundColor: `${cardColor}15`,
                                  color: cardColor,
                                  borderColor: `${cardColor}30`,
                                }}
                              >
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: cardColor }}
                                />
                                {calendar.name}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center text-sm font-semibold text-slate-700 dark:text-slate-350 transition-colors duration-300 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                              👤 {getCreatorName((calendar as any).userId)}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <div className="inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl px-3 py-1.5 border border-slate-200 dark:border-slate-800 max-w-[220px] mx-auto">
                                <span className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate flex-1">
                                  {link}
                                </span>
                                <button
                                  onClick={() => copyLinkToClipboard(link, calendar.id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"
                                  title={translateText("نسخ الرابط", "Copy link")}
                                >
                                  {copiedLinkId === calendar.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center text-xs text-slate-600 dark:text-slate-400 transition-colors duration-300 group-hover:text-slate-900 dark:group-hover:text-slate-200">
                              ⏱ {calendar.duration || 30} min ·{" "}
                              {calendar.free !== false
                                ? translateText("مجاني", "Free")
                                : `${fmtMoney(calendar.price || 0)}`}
                            </td>
                            <td className="px-4 py-4 text-center text-sm font-bold text-slate-750 dark:text-slate-300 transition-colors duration-300 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                              {bookingCount}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span
                                className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  calendar.active
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-250 dark:border-emerald-900/50"
                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-250 dark:border-red-900/50"
                                }`}
                              >
                                {calendar.active
                                  ? translateText("مفعّل", "Active")
                                  : translateText("متوقف", "Disabled")}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {calendars.length === 0 ? (
                <div className="col-span-full text-center py-16">
                  <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-full w-fit mx-auto mb-4">
                    <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {translateText(
                      "لا توجد تقويمات. قم بإنشاء أول تقويم",
                      "No calendars. Create your first calendar",
                    )}
                  </p>
                  {!isAdmin && (
                    <button
                      onClick={() => openCalendarModal()}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 transition"
                    >
                      <Plus className="w-4 h-4" /> {translateText("تقويم جديد", "New Calendar")}
                    </button>
                  )}
                </div>
              ) : (
                calendars.map((calendar, index) => {
                  const bookingCount = bookings.filter(
                    (booking) => booking.calendarId === calendar.id,
                  ).length;
                  const link = `${BASE_BOOKING_URL}/${calendar.slug}`;
                  const cardColor = calendar.color || "#3b82f6";

                  return (
                    <motion.div
                      key={calendar.id}
                      variants={cardVariants}
                      whileHover={{
                        y: -4,
                        boxShadow: `0 20px 25px -5px ${cardColor}25, 0 10px 10px -6px ${cardColor}25`,
                        transition: { duration: 0.2 },
                      }}
                      className="relative bg-white dark:bg-slate-900/80 border-2 rounded-2xl p-6 transition-all duration-300 group overflow-hidden"
                      style={{
                        borderColor: `${cardColor}40`,
                        boxShadow: `0 10px 20px -5px ${cardColor}15, 0 4px 6px -6px ${cardColor}15`,
                        borderTop: `4px solid ${cardColor}`,
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                            style={{ backgroundColor: `${calendar.color || "#3b82f6"}20` }}
                          >
                            <span style={{ color: calendar.color || "#3b82f6" }}>📅</span>
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-800 dark:text-white">
                              {calendar.name}
                            </h4>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              ⏱ {calendar.duration || 30} دقيقة ·{" "}
                              {calendar.free !== false
                                ? translateText("مجاني", "Free")
                                : `💳 ${fmtMoney(calendar.price || 0)}`}
                              {calendar.requireApproval &&
                                " · 🔒 " + translateText("موافقة", "Approval")}
                              {calendar.groupEnabled && ` · 👥 حتى ${calendar.groupMax || 1}`}
                            </span>
                          </div>
                        </div>
                        <SmallToggleSwitch
                          checked={calendar.active}
                          onChange={() => toggleCalendarActive(calendar.id)}
                          disabled={isAdmin}
                        />
                      </div>

                      <div className="mt-3">
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 min-h-[32px]">
                          {calendar.description || translateText("لا يوجد وصف", "No description")}
                        </p>
                        {isAdmin && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                            <span className="font-semibold">
                              {translateText("بواسطة الشريك:", "Created by Partner:")}
                            </span>
                            <span>{getCreatorName((calendar as any).userId)}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl px-3 py-1.5 border border-slate-200 dark:border-slate-800">
                        <span className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate flex-1">
                          {link}
                        </span>
                        <button
                          onClick={() => copyLinkToClipboard(link, calendar.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"
                          title={translateText("نسخ الرابط", "Copy link")}
                        >
                          {copiedLinkId === calendar.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-400">
                            <span
                              className="font-bold px-1.5 py-0.5 rounded mr-1"
                              style={{
                                backgroundColor: `${cardColor}15`,
                                color: cardColor,
                              }}
                            >
                              {bookingCount}
                            </span>{" "}
                            {translateText("حجز", "bookings")}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${calendar.active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}
                          >
                            {calendar.active
                              ? translateText("مفعّل", "Active")
                              : translateText("متوقف", "Disabled")}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openPublicPreview(calendar)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition"
                            title={translateText("معاينة", "Preview")}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          {!isAdmin && (
                            <>
                              <button
                                onClick={() => openEmbedModal(calendar)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                                title={translateText("كود التضمين", "Embed")}
                              >
                                <Code2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openCalendarModal(calendar.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition"
                                title={translateText("تعديل", "Edit")}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedCalendar(calendar);
                                  setIsDeleteConfirmationOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                title={translateText("حذف", "Delete")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}
        </>
      ) : (
        /* ---------- BOOKINGS TAB ---------- */
        <>
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            {[
              {
                label: translateText("إجمالي الحجوزات", "Total"),
                value: totalBookings,
                icon: Calendar,
                color: "text-purple-500",
                backgroundColor: "bg-purple-50 dark:bg-purple-900/20",
              },
              {
                label: translateText("مؤكدة", "Confirmed"),
                value: confirmedBookings,
                icon: CheckCircle,
                color: "text-emerald-500",
                backgroundColor: "bg-emerald-50 dark:bg-emerald-900/20",
              },
              {
                label: translateText("معلقة", "Pending"),
                value: pendingBookings,
                icon: Clock,
                color: "text-amber-500",
                backgroundColor: "bg-amber-50 dark:bg-amber-900/20",
              },
              {
                label: translateText("ملغاة", "Cancelled"),
                value: cancelledBookings,
                icon: XCircle,
                color: "text-red-500",
                backgroundColor: "bg-red-50 dark:bg-red-900/20",
              },
            ].map((statistic, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className={`bg-white dark:bg-slate-900/80 border ${statistic.backgroundColor} border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 group`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${statistic.backgroundColor} group-hover:scale-110 transition-transform duration-300`}
                  >
                    <statistic.icon className={`w-4.5 h-4.5 ${statistic.color}`} />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-800 dark:text-white">
                      {statistic.value}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {statistic.label}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="flex flex-wrap gap-3 items-center bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm"
          >
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={translateText(
                  "🔍 ابحث بالاسم أو التواصل...",
                  "🔍 Search by name or contact...",
                )}
                className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              />
            </div>

            <CustomSelect
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as string)}
              options={statusFilterOptions.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              icon={<Filter className="w-4 h-4 text-slate-400" />}
              className="min-w-[130px]"
            />

            <CustomSelect
              value={calendarFilter === "all" ? "all" : calendarFilter}
              onChange={(value) => setCalendarFilter(value === "all" ? "all" : Number(value))}
              options={calendarFilterOptions.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              icon={<Calendar className="w-4 h-4 text-slate-400" />}
              className="min-w-[150px]"
            />

            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 transition"
              title={translateText("إعادة تعيين الفلاتر", "Reset filters")}
            >
              <RefreshCw className="w-4 h-4" />
              <span>{translateText("إعادة تعيين", "Reset")}</span>
            </button>

            {(searchQuery || statusFilter !== "all" || calendarFilter !== "all") && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-400">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                {translateText("فلاتر نشطة", "Active filters")}
              </div>
            )}
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/80 dark:to-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {translateText("التقويم", "Calendar")}
                    </th>
                    {isAdmin && (
                      <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {translateText("بواسطة الشريك", "Created By Partner")}
                      </th>
                    )}
                    <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {translateText("الاسم", "Name")}
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {translateText("التواصل", "Contact")}
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {translateText("الموعد", "Date & Time")}
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {translateText("الحالة", "Status")}
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {translateText("الإجراءات", "Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 7 : 6} className="text-center py-16">
                          <div className="flex flex-col items-center gap-3">
                            <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-full">
                              <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                            </div>
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                              {translateText("لا توجد حجوزات مطابقة", "No bookings match")}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((booking, index) => {
                        const isExpanded = expandedBookingId === booking.id;
                        return (
                          <React.Fragment key={booking.id}>
                            <motion.tr
                              initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: isRtl ? -20 : 20 }}
                              transition={{ duration: 0.25, delay: index * 0.03 }}
                              className={`border-b border-slate-100 dark:border-slate-800/60 transition-all duration-200 group ${
                                isExpanded
                                  ? "bg-purple-50/20 dark:bg-purple-900/5"
                                  : "hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-transparent dark:hover:from-purple-900/10 dark:hover:to-transparent"
                              }`}
                            >
                              <td
                                className="px-4 py-3.5 text-center"
                                style={{
                                  borderLeft: isRtl
                                    ? undefined
                                    : `10px solid ${getCalendarColorById(booking.calendarId)}`,
                                  borderRight: isRtl
                                    ? `10px solid ${getCalendarColorById(booking.calendarId)}`
                                    : undefined,
                                }}
                              >
                                <span
                                  className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border"
                                  style={{
                                    backgroundColor: `${getCalendarColorById(booking.calendarId)}15`,
                                    color: getCalendarColorById(booking.calendarId),
                                    borderColor: `${getCalendarColorById(booking.calendarId)}30`,
                                  }}
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{
                                      backgroundColor: getCalendarColorById(booking.calendarId),
                                    }}
                                  />
                                  {getCalendarNameById(booking.calendarId)}
                                </span>
                              </td>
                              {isAdmin && (
                                <td className="px-4 py-3.5 text-center text-sm font-semibold text-slate-700 dark:text-slate-350">
                                  👤 {getCreatorName((booking as any).userId)}
                                </td>
                              )}
                              <td className="px-4 py-3.5 text-center font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                {booking.name}
                              </td>
                              <td className="px-4 py-3.5 text-center text-sm font-mono text-slate-600 dark:text-slate-400">
                                {booking.contact || "—"}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {booking.date}
                                  </span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                    {booking.time}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <StatusBadge status={booking.status} />
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <div className="flex justify-center gap-1">
                                  <button
                                    onClick={() =>
                                      setExpandedBookingId(isExpanded ? null : booking.id)
                                    }
                                    className={`p-1.5 rounded-lg transition-all duration-200 ${
                                      isExpanded
                                        ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30"
                                        : "text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    }`}
                                    title={translateText("عرض التفاصيل", "View details")}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </button>
                                  {!isAdmin && (
                                    <>
                                      {hasPermission("edit:booking") && (
                                        <button
                                          onClick={() => openStatusChangeModal(booking)}
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200"
                                          title={translateText("تغيير الحالة", "Change status")}
                                        >
                                          <Edit className="w-4 h-4" />
                                        </button>
                                      )}
                                      {hasPermission("delete:booking") && (
                                        <button
                                          onClick={() => {
                                            setSelectedBooking(booking);
                                            setIsDeleteConfirmationOpen(true);
                                          }}
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                                          title={translateText("حذف", "Delete")}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </motion.tr>

                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <tr className="bg-slate-50/10 dark:bg-slate-900/5">
                                  <td
                                    colSpan={isAdmin ? 7 : 6}
                                    className="p-0 border-b border-slate-100 dark:border-slate-800/60"
                                  >
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.25, ease: "easeInOut" }}
                                      className="overflow-hidden"
                                    >
                                      <div className="px-6 py-5 flex flex-col lg:flex-row gap-6 justify-between items-stretch bg-slate-50/50 dark:bg-slate-900/20">
                                        <div className="flex-1 space-y-4">
                                          {/* Title Header */}
                                          <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                              {booking.name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="text-right">
                                              <div className="text-sm font-bold text-slate-800 dark:text-white">
                                                {booking.name}
                                              </div>
                                              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                                {booking.contact ||
                                                  translateText("لا يوجد تواصل", "No contact")}
                                              </div>
                                            </div>
                                          </div>

                                          {/* Info Grid */}
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                {translateText("التقويم", "Calendar")}
                                              </div>
                                              <div className="text-xs font-semibold text-slate-700 dark:text-slate-350 mt-0.5">
                                                {getCalendarNameById(booking.calendarId)}
                                              </div>
                                            </div>
                                            <div className="bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                {translateText("الحالة", "Status")}
                                              </div>
                                              <div className="mt-0.5">
                                                <StatusBadge status={booking.status} />
                                              </div>
                                            </div>
                                            <div className="bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                {translateText("التاريخ", "Date")}
                                              </div>
                                              <div className="text-xs font-semibold text-slate-700 dark:text-slate-350 mt-0.5">
                                                {booking.date}
                                              </div>
                                            </div>
                                            <div className="bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                {translateText("الوقت", "Time")}
                                              </div>
                                              <div className="text-xs font-semibold text-slate-700 dark:text-slate-350 mt-0.5">
                                                {booking.time}
                                              </div>
                                            </div>
                                          </div>

                                          {(() => {
                                            const calObj = calendars.find(
                                              (c) => c.id === booking.calendarId,
                                            );
                                            const bookingSlugUrl = `${BASE_BOOKING_URL}/${calObj?.slug || ""}`;
                                            return (
                                              <div className="mt-3 bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {translateText(
                                                      "رابط الحجز (Slug URL)",
                                                      "Booking Slug URL",
                                                    )}
                                                  </div>
                                                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-350 mt-0.5 truncate font-mono">
                                                    {bookingSlugUrl}
                                                  </div>
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    navigator.clipboard.writeText(bookingSlugUrl);
                                                    toast.success(
                                                      translateText(
                                                        "تم نسخ رابط الحجز",
                                                        "Booking link copied",
                                                      ),
                                                    );
                                                  }}
                                                  className="p-1.5 rounded-lg text-slate-400 hover:text-purple-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
                                                  title={translateText("نسخ الرابط", "Copy Link")}
                                                >
                                                  <Copy className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            );
                                          })()}

                                          {/* Custom Answers */}
                                          {booking.answers &&
                                            Object.keys(booking.answers).length > 0 && (
                                              <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1.5 text-right">
                                                  {translateText(
                                                    "إجابات الأسئلة",
                                                    "Question Answers",
                                                  )}
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 pt-0.5">
                                                  {Object.entries(booking.answers).map(
                                                    ([key, value]) => (
                                                      <div
                                                        key={key}
                                                        className="flex justify-between text-xs py-0.5 border-b border-slate-50 dark:border-slate-900/50 last:border-0"
                                                      >
                                                        <span className="text-slate-500 dark:text-slate-400">
                                                          {key}
                                                        </span>
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                          {String(value)}
                                                        </span>
                                                      </div>
                                                    ),
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                        </div>

                                        {/* Actions block inside the expanded panel */}
                                        <div className="flex flex-row lg:flex-col gap-2 justify-end lg:justify-start items-end lg:border-r lg:border-slate-100 lg:dark:border-slate-800/60 lg:pr-4">
                                          {!isAdmin && hasPermission("edit:booking") && (
                                            <button
                                              onClick={() => openStatusChangeModal(booking)}
                                              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition whitespace-nowrap flex items-center justify-center gap-1.5 w-full lg:w-36"
                                            >
                                              <Edit className="w-3.5 h-3.5" />
                                              {translateText("تغيير الحالة", "Change Status")}
                                            </button>
                                          )}
                                          {!isAdmin && hasPermission("delete:booking") && (
                                            <button
                                              onClick={() => {
                                                setSelectedBooking(booking);
                                                setIsDeleteConfirmationOpen(true);
                                              }}
                                              className="px-4 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center justify-center gap-1.5 w-full lg:w-36"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                              {translateText("حذف الحجز", "Delete Booking")}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </motion.div>
                                  </td>
                                </tr>
                              )}
                            </AnimatePresence>
                          </React.Fragment>
                        );
                      })
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {filteredBookings.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {translateText(
                    `عرض ${filteredBookings.length} حجز`,
                    `Showing ${filteredBookings.length} bookings`,
                  )}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {translateText("تم التحديث", "Updated")}{" "}
                  {new Date().toLocaleTimeString(isRtl ? "ar-EG" : "en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* ---------- CALENDAR MODAL ---------- */}
      <AnimatePresence>
        <NotificationCustomizeModal
          isOpen={customizingWorkflow.key !== null}
          onClose={() => setCustomizingWorkflow({ key: null, template: null })}
          onSave={(template) => {
            if (customizingWorkflow.key) {
              setNotificationWorkflows({
                ...notificationWorkflows,
                [customizingWorkflow.key]: template,
              });
            }
          }}
          template={customizingWorkflow.template}
          isRtl={isRtl}
          translateText={translateText}
          emailTemplateGroups={buildTemplateGroups("email")}
        />

        {isCalendarModalOpen && (
          <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCalendarModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-950 w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 relative z-20 flex flex-col"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  {editingCalendarId
                    ? translateText("تعديل التقويم", "Edit Calendar")
                    : translateText("تقويم جديد", "New Calendar")}
                </h3>
                <button
                  onClick={() => setIsCalendarModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 overflow-visible">
                {/* Event Logistics Strip */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/60 dark:to-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {calendarDuration} min
                      </span>
                      <button
                        onClick={scrollToDuration}
                        className="text-slate-400 hover:text-purple-500 transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2" ref={priceRef}>
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {calendarIsFree
                          ? translateText("مجاني", "Free")
                          : calendarPriceType === "hourly"
                            ? `${calendarPrice} ${calendarCurrency} / ${translateText("ساعة", "hour")}`
                            : calendarPriceType === "per_attendee"
                              ? `${calendarPrice} ${calendarCurrency} / ${translateText("ضيف", "Guest")}`
                              : `${calendarPrice} ${calendarCurrency}`}
                      </span>
                      {/* <button
                        onClick={scrollToPrice}
                        className="text-slate-400 hover:text-purple-500 transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button> */}
                    </div>
                  </div>
                </div>

                {/* 1. Booking Page Accordion */}
                <div
                  className={`border border-slate-200 dark:border-slate-800 rounded-xl ${openAccordionSection === "page" ? "overflow-visible" : "overflow-hidden"}`}
                >
                  <button
                    onClick={() => toggleAccordion("page")}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span>📝</span>
                      <span className="font-bold text-sm text-slate-800 dark:text-white">
                        {translateText("صفحة الحجز", "Booking Page")}
                      </span>
                    </div>
                    {openAccordionSection === "page" ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {openAccordionSection === "page" && (
                    <div className="px-4 pb-4 space-y-4">
                      {/* Image section */}
                      <div className="flex items-center gap-4 py-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {translateText("الصورة", "Image")}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 transition">
                              {translateText("تغيير", "Change")}
                              <input
                                type="file"
                                accept="image/*,video/*"
                                className="hidden"
                                disabled={isUploadingMedia}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setIsUploadingMedia(true);
                                    try {
                                      const fileRef = ref(
                                        mediaStorage,
                                        `calendars/${Date.now()}_${file.name}`,
                                      );
                                      await uploadBytes(fileRef, file);
                                      const downloadURL = await getDownloadURL(fileRef);
                                      setCalendarImage(downloadURL);
                                      setCalendarMediaType(
                                        file.type.startsWith("video/") ? "video" : "image",
                                      );
                                      toast.success(
                                        translateText(
                                          "تم رفع الملف بنجاح",
                                          "File uploaded successfully",
                                        ),
                                      );
                                    } catch (error) {
                                      console.error("Upload failed", error);
                                      toast.error(
                                        translateText("فشل رفع الملف", "File upload failed"),
                                      );
                                    } finally {
                                      setIsUploadingMedia(false);
                                    }
                                  }
                                }}
                              />
                            </label>
                            <span className="text-xs text-slate-400 truncate max-w-[120px]">
                              {isUploadingMedia
                                ? translateText("جاري الرفع...", "Uploading...")
                                : calendarImage
                                  ? "✓"
                                  : translateText("لا توجد صورة", "No image")}
                            </span>
                            {calendarImage && !isUploadingMedia && (
                              <>
                                <div className="relative w-12 h-12">
                                  {calendarMediaType === "video" ? (
                                    <video
                                      src={calendarImage}
                                      className={`w-full h-full object-cover border border-slate-200 dark:border-slate-800 ${
                                        calendarImageRound ? "rounded-full" : "rounded-lg"
                                      }`}
                                      muted
                                      playsInline
                                    />
                                  ) : (
                                    <img
                                      src={calendarImage}
                                      alt="Preview"
                                      className={`w-full h-full object-cover border border-slate-200 dark:border-slate-800 ${
                                        calendarImageRound ? "rounded-full" : "rounded-lg"
                                      }`}
                                    />
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCalendarImage("");
                                    setCalendarMediaType("image");
                                  }}
                                  className="p-1 text-red-400 hover:text-red-600 transition"
                                  title={translateText("إزالة الصورة", "Remove image")}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {translateText("إجعلها دائرية", "Make it round")}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCalendarImageRound(!calendarImageRound)}
                            dir="ltr"
                            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 focus:outline-none flex-shrink-0 ${
                              calendarImageRound
                                ? "bg-emerald-500"
                                : "bg-slate-300 dark:bg-slate-600"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                                calendarImageRound ? "translate-x-6" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Color picker */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                            {translateText("اللون", "Color")}
                          </label>
                          <div className="relative" ref={colorPickerReference}>
                            <button
                              type="button"
                              onClick={() => setShowColorPicker(!showColorPicker)}
                              className="w-full bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-700 focus:ring-2 focus:ring-purple-500/50"
                            >
                              <span
                                className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 flex-shrink-0"
                                style={{ backgroundColor: calendarColor }}
                              />
                              <span className="flex-1 text-left font-mono text-xs truncate">
                                {calendarColor}
                              </span>
                              <ChevronDown
                                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                                  showColorPicker ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                            {showColorPicker && (
                              <div className="absolute z-[9999] mt-2 p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-64">
                                <div className="grid grid-cols-4 gap-1.5">
                                  {COLOR_PALETTE.map((color) => (
                                    <button
                                      key={color.value}
                                      type="button"
                                      onClick={() => {
                                        setCalendarColor(color.value);
                                        setShowColorPicker(false);
                                      }}
                                      className={`w-8 h-8 rounded-lg transition-all duration-200 hover:scale-110 ${
                                        calendarColor === color.value
                                          ? "ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-slate-950"
                                          : ""
                                      }`}
                                      style={{ backgroundColor: color.value }}
                                      title={color.name}
                                    />
                                  ))}
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                                    {translateText("مخصص", "Custom")}
                                  </label>
                                  <input
                                    type="text"
                                    value={calendarColor}
                                    onChange={(e) => setCalendarColor(e.target.value)}
                                    placeholder="#3b82f6"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                            {translateText("اللغة", "Language")}
                          </label>
                          <CustomSelect
                            value={calendarLanguage}
                            onChange={(value) => setCalendarLanguage(value as "ar" | "en")}
                            options={languageOptions}
                            className="w-full"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                          {translateText("العنوان", "Title")}
                        </label>
                        <input
                          type="text"
                          value={calendarName}
                          onChange={(event) => {
                            const val = event.target.value;
                            setCalendarName(val);
                            if (!val.trim()) {
                              setCalendarSlug("");
                            } else if (editingCalendarId === null) {
                              let englishOnly = val
                                .toLowerCase()
                                .replace(/[^a-z0-9\s-]/g, "")
                                .trim();
                              if (!englishOnly) {
                                const randSuffix = Math.floor(100 + Math.random() * 900);
                                englishOnly = `booking${randSuffix}`;
                              }
                              const generatedSlug = englishOnly
                                .replace(/\s+/g, "-")
                                .replace(/-+/g, "-")
                                .replace(/^-+|-+$/g, "");
                              setCalendarSlug(generatedSlug);
                            }
                          }}
                          placeholder={translateText("مثال: استشارة تعريفية", "e.g., Intro Call")}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                        />
                      </div>
                      {editingCalendarId !== null && (
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                            {translateText("الرابط (Slug)", "Slug")}
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {BASE_BOOKING_URL}/
                            </span>
                            <input
                              type="text"
                              value={calendarSlug}
                              onChange={(event) => setCalendarSlug(event.target.value)}
                              placeholder="intro-call"
                              className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                            />
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                          {translateText("الوصف", "Description")}
                        </label>
                        <textarea
                          value={calendarDescription}
                          onChange={(event) => setCalendarDescription(event.target.value)}
                          rows={2}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition resize-none"
                          placeholder={translateText("وصف التقويم", "Calendar description")}
                        />
                      </div>

                      {/* Advanced Configuration */}
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => setShowAdvanced(!showAdvanced)}
                          className="text-sm font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 flex items-center gap-1 transition"
                        >
                          {showAdvanced ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              {translateText(
                                "إخفاء الإعدادات المتقدمة",
                                "Hide advanced configuration",
                              )}
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              {translateText(
                                "إظهار الإعدادات المتقدمة",
                                "Show advanced configuration",
                              )}
                            </>
                          )}
                        </button>
                        <AnimatePresence>
                          {showAdvanced && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="pt-4 space-y-4">
                                <ToggleSwitch
                                  checked={calendarPasswordProtect}
                                  onChange={setCalendarPasswordProtect}
                                  label={translateText(
                                    "حماية صفحة الحجز بكلمة مرور",
                                    "Password protect your booking page",
                                  )}
                                />
                                {calendarPasswordProtect && (
                                  <div className="mt-2">
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                      {translateText("كلمة السر", "Password")}
                                    </label>
                                    <div className="relative flex items-center w-full">
                                      <Lock
                                        className={`absolute ${isRtl ? "right-3.5" : "left-3.5"} w-4 h-4 text-slate-400`}
                                      />
                                      <input
                                        type={showPassword ? "text" : "password"}
                                        value={calendarPassword}
                                        onChange={(event) =>
                                          setCalendarPassword(event.target.value)
                                        }
                                        placeholder="**********"
                                        className={`w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl ${isRtl ? "pr-10 pl-10" : "pl-10 pr-10"} py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-mono`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className={`absolute ${isRtl ? "left-3.5" : "right-3.5"} text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors`}
                                      >
                                        {showPassword ? (
                                          <EyeOff className="w-4 h-4" />
                                        ) : (
                                          <Eye className="w-4 h-4" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Location Accordion */}
                <div
                  className={`border border-slate-200 dark:border-slate-800 rounded-xl ${openAccordionSection === "location" ? "overflow-visible" : "overflow-hidden"}`}
                >
                  <button
                    onClick={() => toggleAccordion("location")}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-600" />
                      <span className="font-bold text-sm text-slate-800 dark:text-white">
                        {translateText("الموقع", "Location")}
                      </span>
                    </div>
                    {openAccordionSection === "location" ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {openAccordionSection === "location" && (
                    <div className="px-4 pb-4 space-y-4">
                      {locationOptions.map((loc, idx) => (
                        <div
                          key={loc.id}
                          className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200 dark:border-slate-800 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <CustomSelect
                              value={loc.type}
                              onChange={(val) => {
                                const newLoc = { ...loc, type: val as any };
                                if (val === "in-person") newLoc.address = "";
                                if (val === "custom") newLoc.customLabel = "";
                                const updated = [...locationOptions];
                                updated[idx] = newLoc;
                                setLocationOptions(updated);
                              }}
                              options={locationTypeOptions}
                              className="flex-1"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setLocationOptions(locationOptions.filter((_, i) => i !== idx));
                              }}
                              className="p-1.5 text-red-400 hover:text-red-600 transition"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {(loc.type === "zoom" || loc.type === "meet" || loc.type === "teams") && (
                            <div className="flex items-center gap-2 text-xs">
                              {loc.linked ? (
                                <>
                                  <Link className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    {translateText("متصل", "Linked")}
                                  </span>
                                </>
                              ) : (
                                <>
                                  {/* <Unlink className="w-3.5 h-3.5 text-red-400" /> */}
                                  {/* <button className="text-red-500 hover:underline text-xs font-semibold">
                                    {translateText(
                                      "Click here to link your",
                                      "Click here to link your",
                                    )}{" "}
                                    {loc.type === "zoom"
                                      ? "Zoom"
                                      : loc.type === "meet"
                                        ? "Google Meet"
                                        : "Microsoft Teams"}{" "}
                                    {translateText("الحساب", "Account")}
                                  </button> */}
                                </>
                              )}
                            </div>
                          )}
                          {loc.type === "in-person" && (
                            <input
                              type="text"
                              value={loc.address || ""}
                              onChange={(e) => {
                                const updated = [...locationOptions];
                                updated[idx].address = e.target.value;
                                setLocationOptions(updated);
                              }}
                              placeholder={translateText("42 شارع رئيسي", "42 Anywhere St")}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          )}
                          {loc.type === "custom" && (
                            <input
                              type="text"
                              value={loc.customLabel || ""}
                              onChange={(e) => {
                                const updated = [...locationOptions];
                                updated[idx].customLabel = e.target.value;
                                setLocationOptions(updated);
                              }}
                              placeholder={translateText(
                                "Type meeting location...",
                                "Type meeting location...",
                              )}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setLocationOptions([
                            ...locationOptions,
                            {
                              id: Date.now() + Math.random(),
                              type: "zoom",
                              label: "Zoom",
                              linked: false,
                            },
                          ]);
                        }}
                        className="w-full py-2.5 text-sm font-bold text-purple-600 dark:text-purple-400 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition"
                      >
                        + {translateText("إضافة خيار موقع", "Add a location option")}
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Duration & Price Accordion - FIXED with single arrow */}
                <div
                  className={`border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden`}
                >
                  <button
                    onClick={() => toggleAccordion("duration")}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-600" />
                      <span className="font-bold text-sm text-slate-800 dark:text-white">
                        {translateText("المدة والسعر", "Duration & Price")}
                      </span>
                    </div>
                    {/* Single arrow - always shows ChevronDown or ChevronUp based on state */}
                    {openAccordionSection === "duration" ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {openAccordionSection === "duration" && (
                    <div className="px-4 pb-4 space-y-4" ref={durationRef}>
                      {/* Duration section */}
                      <div>
                        <div className="flex items-start">
                          <div className="ml-3 w-full min-w-0">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center">
                                  <label className="text-gray-900 dark:text-white text-base font-medium cursor-pointer truncate">
                                    {translateText("المدة", "Duration")}
                                  </label>
                                </div>
                                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                  {translateText(
                                    "حدد خياراً واحداً أو خيارات مدة متعددة.",
                                    "Set one or multiple durations options.",
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex px-3 sm:px-3.5 transition-all duration-100 ease-in-out opacity-100 translate-y-0 pb-5">
                          <div className="w-full px-1 py-0.5 sm:-mx-1">
                            <div className="w-full">
                              <div className="space-y-3">
                                {durationOptions.map((dur) => (
                                  <div key={dur.id} className="flex items-center space-x-2">
                                    <div className="max-w-2xs flex min-w-0 flex-grow items-center space-x-2">
                                      <div className="relative w-full">
                                        <CustomSelect
                                          value={dur.value}
                                          onChange={(val) => {
                                            if (val === "custom") {
                                              const customVal = prompt(
                                                translateText(
                                                  "أدخل مدة مخصصة (بالدقائق):",
                                                  "Enter custom duration (minutes):",
                                                ),
                                              );
                                              if (customVal) {
                                                const numVal = parseInt(customVal);
                                                if (!isNaN(numVal) && numVal > 0) {
                                                  updateDurationValue(dur.id, numVal);
                                                }
                                              }
                                            } else {
                                              updateDurationValue(dur.id, Number(val));
                                            }
                                          }}
                                          options={durationPresetOptions}
                                          className="w-full"
                                        />
                                      </div>
                                    </div>
                                    <div className="mt-1 flex space-x-2">
                                      {/* Only show star if more than 1 option */}
                                      {durationOptions.length > 1 && (
                                        <div className="flex-shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => setDefaultDuration(dur.id)}
                                            className={`w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-full hover:bg-gray-200/50 focus:outline-none ${
                                              dur.isDefault
                                                ? "text-amber-500"
                                                : "text-gray-500 hover:text-gray-600"
                                            }`}
                                            title={translateText(
                                              "Set as default",
                                              "Set as default",
                                            )}
                                          >
                                            {dur.isDefault ? (
                                              <StarIcon className="h-4 w-4 fill-amber-500" />
                                            ) : (
                                              <StarIcon className="h-4 w-4" />
                                            )}
                                          </button>
                                        </div>
                                      )}
                                      {/* Only show delete if more than 1 option */}
                                      {durationOptions.length > 1 && (
                                        <div className="flex-shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => deleteDurationOption(dur.id)}
                                            className="w-8 h-8 text-gray-500 hover:text-gray-600 flex items-center justify-center flex-shrink-0 rounded-full hover:bg-gray-200/50 focus:outline-none"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <p className="mt-2 text-sm">
                                <span
                                  onClick={addDurationOption}
                                  className="inline-flex cursor-pointer items-center space-x-1 font-medium text-gray-600 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300"
                                >
                                  <Plus className="h-5 w-5" />
                                  <span>
                                    {translateText("إضافة خيار مدة", "Add a duration option")}
                                  </span>
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Group / Class Accordion */}
                <div
                  className={`border border-slate-200 dark:border-slate-800 rounded-xl ${openAccordionSection === "group" ? "overflow-visible" : "overflow-hidden"}`}
                >
                  <button
                    onClick={() => toggleAccordion("group")}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-600" />
                      <span className="font-bold text-sm text-slate-800 dark:text-white">
                        {translateText("مجموعة / صف", "Group / Class")}
                      </span>
                    </div>
                    {openAccordionSection === "group" ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {openAccordionSection === "group" && (
                    <div className="px-4 pb-4 space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1 flex items-center gap-1">
                          {translateText(
                            "كم عدد الأشخاص الذين يمكنهم الحجز في نفس الوقت",
                            "How many people can book the same time",
                          )}
                          <span
                            className="cursor-help text-slate-400"
                            title={translateText(
                              "أقصى عدد للأشخاص الذين يمكنهم حجز نفس الموعد",
                              "Maximum number of people who can book the same time slot",
                            )}
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                          </span>
                        </label>
                        <input
                          type="number"
                          value={calendarGroupCapacity}
                          onChange={(e) => setCalendarGroupCapacity(Number(e.target.value))}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                          min="1"
                        />
                      </div>
                      <ToggleSwitch
                        checked={calendarDisplaySpotsLeft}
                        onChange={setCalendarDisplaySpotsLeft}
                        label={translateText("إظهار عدد الأماكن المتبقية", "Show remaining spots")}
                      />
                    </div>
                  )}
                </div>

                {/* 5. Availability Accordion */}
                <div
                  className={`border border-slate-200 dark:border-slate-800 rounded-xl ${openAccordionSection === "availability" ? "overflow-visible" : "overflow-hidden"}`}
                >
                  <button
                    onClick={() => toggleAccordion("availability")}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition overflow-visible"
                  >
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-slate-600" />
                      <span className="font-bold text-sm text-slate-800 dark:text-white">
                        {translateText("المواعيد المتاحة", "Availability")}
                      </span>
                    </div>
                    {openAccordionSection === "availability" ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {openAccordionSection === "availability" && (
                    <div className="px-4 pb-4 space-y-4">
                      {/* Weekday Hours */}
                      <div className="space-y-2.5">
                        {weekdayAvailability.map((item, idx) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/30 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800"
                          >
                            <CustomSelect
                              value={item.day}
                              onChange={(val) => {
                                const updated = [...weekdayAvailability];
                                updated[idx].day = val as string;
                                setWeekdayAvailability(updated);
                              }}
                              options={presetOptions}
                              className="w-50"
                            />
                            <div className="flex items-center gap-2">
                              <TimePickerInput
                                value={item.start}
                                onChange={(val) => {
                                  const updated = [...weekdayAvailability];
                                  updated[idx].start = val;
                                  setWeekdayAvailability(updated);
                                }}
                              />
                              <span className="text-slate-400 text-sm">—</span>
                              <TimePickerInput
                                value={item.end}
                                onChange={(val) => {
                                  const updated = [...weekdayAvailability];
                                  updated[idx].end = val;
                                  setWeekdayAvailability(updated);
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-1.5 ml-auto">
                              <button
                                type="button"
                                onClick={() => handleDuplicateWeekday(item)}
                                className="text-slate-400 hover:text-slate-650 p-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition"
                                title={translateText("نسخ مكرر", "Duplicate")}
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setWeekdayAvailability(
                                    weekdayAvailability.filter((_, i) => i !== idx),
                                  );
                                }}
                                className="text-red-450 hover:text-red-650 p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                                title={translateText("حذف", "Delete")}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Specific Date Hours */}
                      {specificDateAvailability.length > 0 && (
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 mb-2 uppercase tracking-wide">
                            {translateText("أوقات عمل لتاريخ محدد", "Specific Date Hours")}
                          </h4>
                          {specificDateAvailability.map((item, idx) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/30 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800"
                            >
                              <DatePicker
                                value={item.date}
                                mode="both"
                                onChange={(val) => {
                                  const updated = [...specificDateAvailability];
                                  updated[idx].date = val;
                                  setSpecificDateAvailability(updated);
                                }}
                                placeholder={translateText("اختر التاريخ", "Select Date")}
                                className="w-80"
                              />
                              <div className="flex items-center gap-2">
                                <TimePickerInput
                                  value={item.start}
                                  onChange={(val) => {
                                    const updated = [...specificDateAvailability];
                                    updated[idx].start = val;
                                    setSpecificDateAvailability(updated);
                                  }}
                                />
                                <span className="text-slate-400 text-sm">—</span>
                                <TimePickerInput
                                  value={item.end}
                                  onChange={(val) => {
                                    const updated = [...specificDateAvailability];
                                    updated[idx].end = val;
                                    setSpecificDateAvailability(updated);
                                  }}
                                />
                              </div>
                              <div className="flex items-center gap-1.5 ml-auto">
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateSpecificDate(item)}
                                  className="text-slate-400 hover:text-slate-650 p-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition"
                                  title={translateText("نسخ مكرر", "Duplicate")}
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSpecificDateAvailability(
                                      specificDateAvailability.filter((_, i) => i !== idx),
                                    );
                                  }}
                                  className="text-red-450 hover:text-red-650 p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                                  title={translateText("حذف", "Delete")}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Buttons Row */}
                      <div className="flex flex-wrap items-center gap-3 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setWeekdayAvailability([
                              ...weekdayAvailability,
                              {
                                id: Date.now() + Math.random(),
                                day: "Mon - Fri",
                                start: "09:00",
                                end: "17:00",
                              },
                            ]);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                        >
                          <PlusCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          {translateText("إضافة ساعات لأيام الأسبوع", "Add weekday")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            const dateStr = tomorrow.toISOString().split("T")[0];
                            setSpecificDateAvailability([
                              ...specificDateAvailability,
                              {
                                id: Date.now() + Math.random(),
                                date: dateStr,
                                start: "09:00",
                                end: "17:00",
                              },
                            ]);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                        >
                          <PlusCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          {translateText("إضافة تاريخ محدد", "Add specific date")}
                        </button>
                      </div>

                      {/* Breaks */}
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                          {translateText("فترات الراحة", "Break Intervals")}
                        </h4>
                        {breaks.map((br, idx) => (
                          <div
                            key={br.id}
                            className="flex flex-wrap items-center gap-2 mb-2 bg-slate-50/50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-200 dark:border-slate-800"
                          >
                            <DatePicker
                              value={br.date || ""}
                              onChange={(val) => {
                                const updated = [...breaks];
                                updated[idx].date = val;
                                setBreaks(updated);
                              }}
                              placeholder={translateText(
                                "All Days / Choose Date",
                                "All Days / Choose Date",
                              )}
                              className="w-48"
                            />
                            <div className="flex items-center gap-2">
                              <CustomSelect
                                value={br.start}
                                onChange={(val) => {
                                  const updated = [...breaks];
                                  updated[idx].start = val as string;
                                  setBreaks(updated);
                                }}
                                options={timeOptions}
                                className="w-32"
                              />
                              <span className="text-slate-400">—</span>
                              <CustomSelect
                                value={br.end}
                                onChange={(val) => {
                                  const updated = [...breaks];
                                  updated[idx].end = val as string;
                                  setBreaks(updated);
                                }}
                                options={timeOptions}
                                className="w-32"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setBreaks(breaks.filter((_, i) => i !== idx))}
                              className="text-red-450 hover:text-red-650 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setBreaks([
                              ...breaks,
                              {
                                id: Date.now() + Math.random(),
                                date: "",
                                start: "12:00",
                                end: "13:00",
                              },
                            ]);
                          }}
                          className="text-sm font-semibold text-purple-600 dark:text-purple-400 hover:underline mt-1 block"
                        >
                          + {translateText("إضافة فترة راحة", "Add break")}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                            {translateText("زيادة وقت البدء", "Start time increments")}
                          </label>
                          <CustomSelect
                            value={calendarStartIncrement}
                            onChange={(value) => setCalendarStartIncrement(Number(value))}
                            options={incrementOptions}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                            {translateText("وقت فاصل", "Buffer")}
                          </label>
                          <CustomSelect
                            value={bufferTime}
                            onChange={(val) => setBufferTime(Number(val))}
                            options={bufferOptions}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                            {translateText("الحد الأدنى للإشعار بالحجز", "Min. booking notice")}
                          </label>
                          <CustomSelect
                            value={calendarMinimumNotice}
                            onChange={(value) => setCalendarMinimumNotice(Number(value))}
                            options={noticeOptions}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                            {translateText("الحد الأقصى للحجز المسبق", "Max. advance booking")}
                          </label>
                          <CustomSelect
                            value={maxAdvanceBooking}
                            onChange={(val) => setMaxAdvanceBooking(Number(val))}
                            options={maxAdvanceOptions}
                            className="w-full"
                          />
                        </div>
                      </div>

                      {/* Advanced Configuration */}
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setAvailAdvancedOpen(!availAdvancedOpen)}
                          className="text-sm font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1"
                        >
                          {availAdvancedOpen ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          {translateText("الإعدادات المتقدمة", "Advanced Configuration")}
                        </button>
                        {availAdvancedOpen && (
                          <div className="mt-3 space-y-4">
                            <div>
                              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                {translateText("عرض المنطقة الزمنية", "Time zone display")}
                              </label>
                              <CustomSelect
                                value={timezoneDisplay}
                                onChange={(val) => setTimezoneDisplay(val as "auto" | "locked")}
                                options={timezoneOptions}
                                className="w-full"
                              />
                              <ToggleSwitch
                                checked={showTimezone}
                                onChange={setShowTimezone}
                                label={translateText("إظهار المنطقة الزمنية", "Show time zone")}
                              />
                            </div>

                            <div>
                              <ToggleSwitch
                                checked={!!fixedDateRange}
                                onChange={(val) => {
                                  if (!val) {
                                    setFixedDateRange(null);
                                  } else {
                                    setFixedDateRange({
                                      start: new Date().toISOString().split("T")[0],
                                      end: new Date().toISOString().split("T")[0],
                                    });
                                  }
                                }}
                                label={translateText(
                                  "تقييد بنطاق تاريخ محدد",
                                  "Limit by a fixed date range",
                                )}
                              />
                              {fixedDateRange && (
                                <div className="grid grid-cols-2 gap-4 mt-2 pl-3">
                                  <DatePicker
                                    label={translateText("تاريخ البدء", "Start Date")}
                                    value={fixedDateRange.start || ""}
                                    onChange={(val) =>
                                      setFixedDateRange({ ...fixedDateRange, start: val })
                                    }
                                  />
                                  <DatePicker
                                    label={translateText("تاريخ الانتهاء", "End Date")}
                                    value={fixedDateRange.end || ""}
                                    onChange={(val) =>
                                      setFixedDateRange({ ...fixedDateRange, end: val })
                                    }
                                  />
                                </div>
                              )}
                            </div>

                            {/* Look busy */}
                            <div>
                              <ToggleSwitch
                                checked={lookBusy.enabled}
                                onChange={(val) => setLookBusy({ ...lookBusy, enabled: val })}
                                label={translateText("تبدو مشغولاً", "Look busy")}
                              />
                              {lookBusy.enabled && (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-slate-500">
                                    {lookBusy.min}% - {lookBusy.max}%{" "}
                                    {translateText(
                                      "of your availability will be shown as busy",
                                      "of your availability will be shown as busy",
                                    )}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setShowLookBusyModal(true)}
                                    className="text-purple-600 hover:underline text-xs"
                                  >
                                    {translateText("تعديل", "Edit")}
                                  </button>
                                </div>
                              )}
                            </div>

                            <ToggleSwitch
                              checked={grayOutBusy}
                              onChange={setGrayOutBusy}
                              label={translateText("تظليل الفترات المزدحمة", "Gray out busy slots")}
                            />

                            {/* Booking Limits */}
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                  {translateText("حدود الحجز", "Booking limits")}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setShowBookingLimitInput(!showBookingLimitInput)}
                                  className="text-sm font-semibold text-purple-600 hover:underline"
                                >
                                  {showBookingLimitInput
                                    ? translateText("إلغاء", "Cancel")
                                    : `+ ${translateText("إضافة حد للحجز", "Add booking limit")}`}
                                </button>
                              </div>
                              {showBookingLimitInput && (
                                <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-end gap-2">
                                  <div className="flex-1 min-w-[80px]">
                                    <label className="text-xs text-slate-500 block">
                                      {translateText("الحد", "Limit")}
                                    </label>
                                    <input
                                      type="number"
                                      value={newLimitValue}
                                      onChange={(e) => setNewLimitValue(Number(e.target.value))}
                                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm"
                                      min="1"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-[100px]">
                                    <label className="text-xs text-slate-500 block">
                                      {translateText("المجال", "Scope")}
                                    </label>
                                    <CustomSelect
                                      value={newLimitScope}
                                      onChange={(val) => setNewLimitScope(val as "all" | "email")}
                                      options={scopeOptions}
                                      className="w-full"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-[100px]">
                                    <label className="text-xs text-slate-500 block">
                                      {translateText("الفترة", "Period")}
                                    </label>
                                    <CustomSelect
                                      value={newLimitPeriod}
                                      onChange={(val) =>
                                        setNewLimitPeriod(val as "day" | "week" | "month" | "total")
                                      }
                                      options={periodOptions}
                                      className="w-full"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={addBookingLimit}
                                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold"
                                  >
                                    {translateText("إضافة", "Add")}
                                  </button>
                                </div>
                              )}
                              {bookingLimits.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {bookingLimits.map((limit) => (
                                    <div
                                      key={limit.id}
                                      className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-200 dark:border-slate-800"
                                    >
                                      <span className="flex-1 text-sm">
                                        {limit.limit} /{" "}
                                        {translateText(
                                          limit.scope === "all" ? "للجميع" : "للبريد",
                                          limit.scope === "all" ? "For all" : "For email",
                                        )}{" "}
                                        /{" "}
                                        {translateText(
                                          limit.period === "day"
                                            ? "يوم"
                                            : limit.period === "week"
                                              ? "أسبوع"
                                              : limit.period === "month"
                                                ? "شهر"
                                                : "إجمالي",
                                          limit.period,
                                        )}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewLimitValue(limit.limit);
                                          setNewLimitScope(limit.scope);
                                          setNewLimitPeriod(limit.period);
                                          deleteBookingLimit(limit.id);
                                          setShowBookingLimitInput(true);
                                        }}
                                        className="text-xs text-blue-600 hover:underline"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteBookingLimit(limit.id)}
                                        className="text-xs text-red-400 hover:text-red-600"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Booking Form Accordion */}
                <div
                  className={`border border-slate-200 dark:border-slate-800 rounded-xl ${openAccordionSection === "form" ? "overflow-visible" : "overflow-hidden"}`}
                >
                  <button
                    onClick={() => toggleAccordion("form")}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-600" />
                      <span className="font-bold text-sm text-slate-800 dark:text-white">
                        {translateText("نموذج الحجز", "Booking Form")}
                      </span>
                    </div>
                    {openAccordionSection === "form" ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {openAccordionSection === "form" && (
                    <div className="px-4 pb-4 space-y-4">
                      {calendarQuestions.map((question, index) => {
                        const isDefault = question.id <= 4;
                        const isTextBlock = question.type === "text-block";

                        if (isTextBlock) {
                          return (
                            <div
                              key={question.id}
                              className="group flex w-full items-center truncate rounded-md border border-dashed border-gray-200 bg-white p-1 py-1.5 pl-2 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:bg-slate-800/50"
                            >
                              <div className="flex w-full items-center truncate pr-1">
                                <div className="flex flex-col items-center mr-2">
                                  <button
                                    type="button"
                                    onClick={() => moveQuestionUp(index)}
                                    className="text-gray-400 hover:text-gray-600"
                                    disabled={index === 0}
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveQuestionDown(index)}
                                    className="text-gray-400 hover:text-gray-600"
                                    disabled={index === calendarQuestions.length - 1}
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </button>
                                </div>
                                <span className="flex w-full cursor-pointer justify-between truncate items-center">
                                  <span className="max-w-[200px] truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {question.label ||
                                      translateText("نص غير معنون", "Untitled Text Block")}
                                  </span>
                                </span>
                                <div className="ml-2 flex items-center">
                                  <button
                                    type="button"
                                    onClick={() => toggleTextBlockActive(question.id)}
                                    className={`cursor-pointer ml-0 w-10 h-5 relative inline-flex items-center justify-center flex-shrink-0 group focus:outline-none`}
                                  >
                                    <span
                                      className={`${
                                        question.active
                                          ? "bg-emerald-500"
                                          : "bg-gray-200 dark:bg-slate-600"
                                      } h-4 w-9 absolute mx-auto rounded-full transition-colors ease-in-out duration-200`}
                                    />
                                    <span
                                      className={`${
                                        question.active ? "translate-x-5" : "translate-x-0"
                                      } h-5 w-5 absolute left-0 inline-block border border-gray-200 rounded-full bg-white shadow transform transition-transform ease-in-out duration-200`}
                                    />
                                  </button>
                                </div>
                              </div>
                              <div className="ml-2 flex items-center space-x-1">
                                <div className="flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTextBlockLabel(question.label || "");
                                      setTextBlockText(question.text || "");
                                      setEditingTextBlockId(question.id);
                                      setTextBlockModalOpen(true);
                                    }}
                                    className="w-8 h-8 text-gray-500 hover:text-gray-600 flex items-center justify-center flex-shrink-0 rounded-full hover:bg-gray-200/50 focus:outline-none"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => duplicateTextBlock(question)}
                                    className="w-8 h-8 text-gray-500 hover:text-gray-600 flex items-center justify-center flex-shrink-0 rounded-full hover:bg-gray-200/50 focus:outline-none"
                                  >
                                    <DuplicateIcon className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => deleteTextBlock(question.id)}
                                    className="w-8 h-8 text-gray-500 hover:text-gray-600 flex items-center justify-center flex-shrink-0 rounded-full hover:bg-gray-200/50 focus:outline-none"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={question.id}
                            className="group flex w-full items-center truncate rounded-md border border-dashed border-gray-200 bg-white p-1 py-1.5 pl-2 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:bg-slate-800/50"
                          >
                            <div className="flex w-full items-center truncate pr-1">
                              <div className="flex flex-col items-center mr-2">
                                <button
                                  type="button"
                                  onClick={() => moveQuestionUp(index)}
                                  className="text-gray-400 hover:text-gray-600"
                                  disabled={index === 0}
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveQuestionDown(index)}
                                  className="text-gray-400 hover:text-gray-600"
                                  disabled={index === calendarQuestions.length - 1}
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </button>
                              </div>
                              {isDefault ? (
                                <button
                                  type="button"
                                  onClick={() => openDefaultFieldModal(question.id)}
                                  className="flex w-full cursor-pointer justify-between truncate items-center"
                                >
                                  <span className="max-w-[200px] truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {question.label}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-normal ml-2">
                                    (
                                    {question.required
                                      ? translateText("إجباري", "REQUIRED")
                                      : translateText("اختياري", "OPTIONAL")}
                                    )
                                  </span>
                                </button>
                              ) : (
                                <span className="flex w-full cursor-pointer justify-between truncate items-center">
                                  <span className="max-w-[200px] truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {question.label}
                                  </span>
                                </span>
                              )}
                              <div className="ml-2 flex items-center">
                                <button
                                  type="button"
                                  onClick={() => toggleQuestionActive(question.id)}
                                  className={`cursor-pointer ml-0 w-10 h-5 relative inline-flex items-center justify-center flex-shrink-0 group focus:outline-none`}
                                >
                                  <span
                                    className={`${
                                      question.active
                                        ? "bg-emerald-500"
                                        : "bg-gray-200 dark:bg-slate-600"
                                    } h-4 w-9 absolute mx-auto rounded-full transition-colors ease-in-out duration-200`}
                                  />
                                  <span
                                    className={`${
                                      question.active ? "translate-x-5" : "translate-x-0"
                                    } h-5 w-5 absolute left-0 inline-block border border-gray-200 rounded-full bg-white shadow transform transition-transform ease-in-out duration-200`}
                                  />
                                </button>
                              </div>
                            </div>
                            <div className="ml-2 flex items-center space-x-1">
                              {!isDefault && (
                                <>
                                  <div className="flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingQuestionId(question.id);
                                        setNewQuestionText(question.label);
                                        setNewQuestionType(question.type);
                                        setNewQuestionRequired(question.required);
                                        setNewQuestionOptions(question.options || []);
                                        setQuestionModalOpen(true);
                                      }}
                                      className="w-8 h-8 text-gray-555 hover:text-gray-655 flex items-center justify-center flex-shrink-0 rounded-full hover:bg-gray-200/50 focus:outline-none"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => duplicateQuestion(question)}
                                      className="w-8 h-8 text-gray-555 hover:text-gray-655 flex items-center justify-center flex-shrink-0 rounded-full hover:bg-gray-200/50 focus:outline-none"
                                    >
                                      <DuplicateIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => deleteQuestion(question.id)}
                                      className="w-8 h-8 text-gray-555 hover:text-gray-655 flex items-center justify-center flex-shrink-0 rounded-full hover:bg-gray-200/50 focus:outline-none"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </>
                              )}
                              {isDefault && (
                                <div className="flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => openDefaultFieldModal(question.id)}
                                    className="w-8 h-8 text-gray-555 hover:text-gray-655 flex items-center justify-center flex-shrink-0 rounded-full hover:bg-gray-200/50 focus:outline-none"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Add Question button */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQuestionId(null);
                          setNewQuestionText("");
                          setNewQuestionType("short");
                          setNewQuestionRequired(false);
                          setNewQuestionOptions([]);
                          setQuestionModalOpen(true);
                        }}
                        className="w-full py-2.5 text-sm font-bold text-purple-600 dark:text-purple-400 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition"
                      >
                        + {translateText("إضافة سؤال", "Add question")}
                      </button>

                      {/* Add block of text button */}
                      <button
                        type="button"
                        onClick={() => {
                          setTextBlockLabel("");
                          setTextBlockText("");
                          setTextBlockModalOpen(true);
                        }}
                        className="w-full py-2.5 text-sm font-bold text-blue-600 dark:text-blue-400 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                      >
                        + {translateText("إضافة نص", "Add block of text")}
                      </button>
                    </div>
                  )}
                </div>

                {/* 7. Notifications Accordion */}
                <div
                  className={`border border-slate-200 dark:border-slate-800 rounded-xl ${openAccordionSection === "notifications" ? "overflow-visible" : "overflow-hidden"}`}
                >
                  <button
                    onClick={() => toggleAccordion("notifications")}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span>🔔</span>
                      <span className="font-bold text-sm text-slate-800 dark:text-white">
                        {translateText("الإشعارات", "Notifications")}
                      </span>
                    </div>
                    {openAccordionSection === "notifications" ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {openAccordionSection === "notifications" && (
                    <div className="px-4 pb-4 space-y-6">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                          {translateText("تأكيد الحجز الفوري", "Immediate Booking Confirmation")}
                        </h4>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl px-3 py-1 border border-slate-100 dark:border-slate-800/60">
                          {renderWorkflowToggle("immediateConfirmationEmail")}
                          {renderWorkflowToggle("immediateConfirmationWhatsapp")}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                          {translateText("تذكيرات ما قبل الموعد", "Pre-Event Reminders")}
                        </h4>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl px-3 py-1 border border-slate-100 dark:border-slate-800/60">
                          {renderWorkflowToggle("reminder24hEmail")}
                          {renderWorkflowToggle("reminder3hWhatsapp")}
                          {renderWorkflowToggle("reminder30mSmsWhatsapp")}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                          {translateText("متابعة ما بعد الموعد", "Post-Event Workflows")}
                        </h4>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl px-3 py-1 border border-slate-100 dark:border-slate-800/60">
                          {renderWorkflowToggle("postEventAttendedEmail")}
                          {renderWorkflowToggle("postEventNoShowEmail")}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                          {translateText("تاركي الحجز", "Abandonment Workflows")}
                        </h4>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl px-3 py-1 border border-slate-100 dark:border-slate-800/60">
                          {renderWorkflowToggle("abandonment2hEmail")}
                          {renderWorkflowToggle("abandonment2dEmail")}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 8. Experience & Templates Accordion */}
                <div
                  className={`border border-slate-200 dark:border-slate-800 rounded-xl ${openAccordionSection === "templates" ? "overflow-visible" : "overflow-hidden"}`}
                >
                  <button
                    onClick={() => toggleAccordion("templates")}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-slate-500" />
                      <span className="font-bold text-sm text-slate-800 dark:text-white">
                        {translateText("التجربة والقوالب", "Experience & Templates")}
                      </span>
                    </div>
                    {openAccordionSection === "templates" ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {openAccordionSection === "templates" && (
                    <div className="px-4 pb-4 space-y-4">
                      {/* Preview Settings */}
                      <div>
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-2">
                          {translateText("عرض التقويم", "Calendar Display View")}
                        </label>
                        <CustomSelect
                          value={calendarTemplateSettings.previewMode}
                          onChange={(val) =>
                            setCalendarTemplateSettings({
                              ...calendarTemplateSettings,
                              previewMode: val as ViewMode,
                            })
                          }
                          options={[
                            {
                              value: "default",
                              label: translateText("العرض القياسي", "Standard View"),
                            },
                            {
                              value: "template",
                              label: translateText("قالب صفحة هبوط", "Landing Page Template"),
                            },
                          ]}
                          className="w-full mb-2"
                        />
                        {calendarTemplateSettings.previewMode === "template" && (
                          <div className="flex gap-2">
                            <CustomSelect
                              value={calendarTemplateSettings.previewTemplateId || ""}
                              onChange={(val) =>
                                setCalendarTemplateSettings({
                                  ...calendarTemplateSettings,
                                  previewTemplateId: val.toString(),
                                })
                              }
                              groups={buildTemplateGroups("booking")}
                              placeholder={translateText("اختر قالب", "Select a template")}
                              className="flex-1"
                            />
                            {calendarTemplateSettings.previewTemplateId && (
                              <a
                                href={`/mohamed-joe-brand/preview/${editingCalendarId || "preview"}?templateId=${calendarTemplateSettings.previewTemplateId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg whitespace-nowrap text-xs text-blue-600 dark:text-blue-400 transition-colors"
                              >
                                <EyeIcon className="w-4 h-4 mr-1" /> Preview
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 9. After Booking Accordion */}
                <div
                  className={`border border-slate-200 dark:border-slate-800 rounded-xl ${openAccordionSection === "after" ? "overflow-visible" : "overflow-hidden"}`}
                >
                  <button
                    onClick={() => toggleAccordion("after")}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span>↪</span>
                      <span className="font-bold text-sm text-slate-800 dark:text-white">
                        {translateText("بعد الحجز", "After Booking")}
                      </span>
                    </div>
                    {openAccordionSection === "after" ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {openAccordionSection === "after" && (
                    <div className="px-4 pb-4 space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-2">
                          {translateText("إجراء بعد الحجز", "After Booking Action")}
                        </label>
                        <CustomSelect
                          value={calendarTemplateSettings.postBookingMode || "standard"}
                          onChange={(val) =>
                            setCalendarTemplateSettings({
                              ...calendarTemplateSettings,
                              postBookingMode: val as RedirectMode,
                            })
                          }
                          options={[
                            {
                              value: "standard",
                              label: translateText(
                                "عرض صفحة التأكيد القياسية",
                                "Display Standard Confirmation Page",
                              ),
                            },

                            {
                              value: "template",
                              label: translateText(
                                "عرض صفحة التأكيد المخصصة",
                                "Display Custom Confirmation Page",
                              ),
                            },
                            {
                              value: "custom_url",
                              label: translateText(
                                "توجيه إلى رابط خارجي",
                                "Redirect to External URL",
                              ),
                            },
                          ]}
                          className="w-full mb-2"
                        />
                        {calendarTemplateSettings.postBookingMode === "custom_url" && (
                          <div className="mt-2">
                            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                              {translateText("رابط إعادة التوجيه", "Redirect URL")}
                            </label>
                            <input
                              type="text"
                              value={
                                calendarTemplateSettings.redirectUrl ??
                                calendarAfterBooking.redirectUrl ??
                                ""
                              }
                              onChange={(event) =>
                                setCalendarAfterBooking({
                                  ...calendarAfterBooking,
                                  redirectUrl: event.target.value,
                                })
                              }
                              placeholder="https://yoursite.com/thank-you"
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                            />
                          </div>
                        )}
                        {calendarTemplateSettings.postBookingMode === "template" && (
                          <div className="flex gap-2 mt-2">
                            <CustomSelect
                              value={calendarTemplateSettings.thankYouTemplateId || ""}
                              onChange={(val) =>
                                setCalendarTemplateSettings({
                                  ...calendarTemplateSettings,
                                  thankYouTemplateId: val.toString(),
                                })
                              }
                              groups={buildTemplateGroups("thanks")}
                              placeholder={translateText("اختر قالب", "Select a template")}
                              className="flex-1"
                            />
                            {calendarTemplateSettings.thankYouTemplateId && (
                              <a
                                href={`/mohamed-joe-brand/preview/${editingCalendarId || "preview"}?templateId=${calendarTemplateSettings.thankYouTemplateId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg whitespace-nowrap text-xs text-blue-600 dark:text-blue-400 transition-colors"
                              >
                                <EyeIcon className="w-4 h-4 mr-1" /> Preview
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      <ToggleSwitch
                        checked={calendarAfterBooking.allowCancelReschedule}
                        onChange={(value) =>
                          setCalendarAfterBooking({
                            ...calendarAfterBooking,
                            allowCancelReschedule: value,
                          })
                        }
                        label={translateText(
                          "السماح بالإلغاء/إعادة الجدولة ذاتياً",
                          "Allow self-cancel/reschedule",
                        )}
                      />
                      <ToggleSwitch
                        checked={calendarAfterBooking.scheduleAnother}
                        onChange={(value) =>
                          setCalendarAfterBooking({
                            ...calendarAfterBooking,
                            scheduleAnother: value,
                          })
                        }
                        label={translateText(
                          "إظهار زر 'حجز موعد آخر'",
                          "Show 'Book another' button",
                        )}
                      />
                      <ToggleSwitch
                        checked={calendarAfterBooking.prefill}
                        onChange={(value) =>
                          setCalendarAfterBooking({ ...calendarAfterBooking, prefill: value })
                        }
                        label={translateText(
                          "ملء بيانات الزائر تلقائياً",
                          "Auto-fill visitor data",
                        )}
                      />
                      <ToggleSwitch
                        checked={calendarAfterBooking.webhookEnabled}
                        onChange={(value) =>
                          setCalendarAfterBooking({
                            ...calendarAfterBooking,
                            webhookEnabled: value,
                          })
                        }
                        label={translateText("ويب هوك", "Webhook")}
                        subLabel={translateText(
                          "إرسال بيانات الحجز إلى أنظمة خارجية",
                          "Send booking data to external systems",
                        )}
                      />
                      {calendarAfterBooking.webhookEnabled && (
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                            {translateText("رابط ويب هوك", "Webhook URL")}
                          </label>
                          <input
                            type="text"
                            value={calendarAfterBooking.webhookUrl}
                            onChange={(event) =>
                              setCalendarAfterBooking({
                                ...calendarAfterBooking,
                                webhookUrl: event.target.value,
                              })
                            }
                            placeholder="https://hook.example.com/..."
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-mono"
                          />
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                              {translateText("صفحة التأكيد", "Confirmation page")}
                            </span>
                            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <button
                            type="button"
                            onClick={() => setConfirmationModalOpen(true)}
                            className="text-sm font-semibold text-purple-600 hover:underline"
                          >
                            {translateText("تخصيص", "Customize")}
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {confirmationBody}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="sticky bottom-0 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-end gap-3">
                {editingCalendarId && (
                  <button
                    type="button"
                    onClick={() => {
                      const calendar = calendars.find(
                        (calendar) => calendar.id === editingCalendarId,
                      );
                      if (calendar) {
                        setSelectedCalendar(calendar);
                        setIsCalendarModalOpen(false);
                        setIsDeleteConfirmationOpen(true);
                      }
                    }}
                    className="px-4 py-2.5 text-sm font-semibold text-red-600 hover:text-red-700 transition"
                  >
                    {translateText("حذف", "Delete")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsCalendarModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition"
                >
                  {translateText("إلغاء", "Cancel")}
                </button>
                <button
                  onClick={saveCalendar}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 transition"
                >
                  {translateText("حفظ", "Save")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------- DEFAULT FIELD EDIT MODALS ---------- */}
      <AnimatePresence>
        {defaultFieldModal.open && defaultFieldModal.fieldId && (
          <div className="fixed inset-0 z-[1700] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDefaultFieldModal({ open: false, fieldId: null })}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-950 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative z-20"
            >
              {/* Name field modal */}
              {defaultFieldModal.fieldId === 1 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
                    {translateText("تعديل حقل الاسم", "Edit Name Field")}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        {translateText("نوع الإجابة", "Answer Type")}
                      </label>
                      <CustomSelect
                        value={nameFieldType}
                        onChange={(val) => {
                          setNameFieldType(val as "name" | "firstlast");
                          if (val === "name") {
                            setNameFieldLabel("الاسم الكامل");
                          } else {
                            setNameFieldLabel("الاسم");
                            setFirstNameLabel("الاسم الأول");
                            setLastNameLabel("الاسم الثاني");
                          }
                        }}
                        options={nameTypeOptions}
                        className="w-full"
                      />
                    </div>
                    {nameFieldType === "name" ? (
                      <div>
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                          {translateText("العنوان", "Label")}
                        </label>
                        <input
                          type="text"
                          value={nameFieldLabel}
                          onChange={(e) => setNameFieldLabel(e.target.value)}
                          placeholder={translateText("الاسم كامل", "Full Name")}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                            {translateText("عنوان الاسم الأول", "First Name Label")}
                          </label>
                          <input
                            type="text"
                            value={firstNameLabel}
                            onChange={(e) => setFirstNameLabel(e.target.value)}
                            placeholder={translateText("الاسم الأول", "First Name")}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                            {translateText("عنوان اسم العائلة", "Last Name Label")}
                          </label>
                          <input
                            type="text"
                            value={lastNameLabel}
                            onChange={(e) => setLastNameLabel(e.target.value)}
                            placeholder={translateText("الاسم الثاني", "Last Name")}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        {translateText("المتطلبات", "Requirement")}
                      </label>
                      <CustomSelect
                        value={"required"}
                        onChange={() => {}}
                        options={[
                          { value: "required", label: translateText("إجباري", "Required") },
                        ]}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setDefaultFieldModal({ open: false, fieldId: null })}
                      className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-sm font-bold transition"
                    >
                      {translateText("إلغاء", "Cancel")}
                    </button>
                    <button
                      onClick={saveDefaultField}
                      className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 transition"
                    >
                      {translateText("حفظ", "Save")}
                    </button>
                  </div>
                </div>
              )}

              {/* Phone field modal */}
              {defaultFieldModal.fieldId === 2 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
                    {translateText("تعديل حقل الهاتف", "Edit Phone Field")}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        {translateText("العنوان", "Label")}
                      </label>
                      <input
                        type="text"
                        value={phoneFieldLabel}
                        onChange={(e) => setPhoneFieldLabel(e.target.value)}
                        placeholder={translateText("رقم الهاتف", "Phone Number")}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        {translateText("المتطلبات", "Requirement")}
                      </label>
                      <CustomSelect
                        value={"required"}
                        onChange={() => {}}
                        options={[
                          { value: "required", label: translateText("إجباري", "Required") },
                        ]}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setDefaultFieldModal({ open: false, fieldId: null })}
                      className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-sm font-bold transition"
                    >
                      {translateText("إلغاء", "Cancel")}
                    </button>
                    <button
                      onClick={saveDefaultField}
                      className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 transition"
                    >
                      {translateText("حفظ", "Save")}
                    </button>
                  </div>
                </div>
              )}

              {/* Email field modal */}
              {defaultFieldModal.fieldId === 3 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
                    {translateText("تعديل حقل البريد", "Edit Email Field")}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        {translateText("العنوان", "Label")}
                      </label>
                      <input
                        type="text"
                        value={emailFieldLabel}
                        onChange={(e) => setEmailFieldLabel(e.target.value)}
                        placeholder={translateText("البريد الإلكتروني", "Email Address")}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        {translateText("المتطلبات", "Requirement")}
                      </label>
                      <CustomSelect
                        value={emailRequired ? "required" : "optional"}
                        onChange={(val) => setEmailRequired(val === "required")}
                        options={requiredOptions}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        {translateText("نوع الإجابة", "Answer Type")}
                      </label>
                      <CustomSelect
                        value={"email"}
                        onChange={() => {}}
                        options={[
                          { value: "email", label: translateText("البريد الإلكتروني", "Email") },
                        ]}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setDefaultFieldModal({ open: false, fieldId: null })}
                      className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-sm font-bold transition"
                    >
                      {translateText("إلغاء", "Cancel")}
                    </button>
                    <button
                      onClick={saveDefaultField}
                      className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 transition"
                    >
                      {translateText("حفظ", "Save")}
                    </button>
                  </div>
                </div>
              )}

              {/* Guests field modal */}
              {defaultFieldModal.fieldId === 4 && (
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                    <UsersIcon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="mt-4 w-full text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <h3
                          className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                          id="modal-headline"
                        >
                          {translateText("تعديل سؤال الضيوف", "Edit guests question")}
                        </h3>
                      </div>
                    </div>
                    <div className="mt-4 w-full">
                      <div className="flex w-full flex-col" id="guestsQuestion">
                        <div className="flex items-center">
                          <label
                            className="flex text-sm leading-5 font-semibold text-gray-700 dark:text-gray-300"
                            htmlFor="field-guestsQuestion-input"
                          >
                            {translateText("العنوان (إضافة ضيف)", "Label (Add a guest)")}
                          </label>
                        </div>
                        <div className="relative mt-1 rounded-md shadow-sm">
                          <input
                            id="field-guestsQuestion-input"
                            name="guestsQuestion"
                            step="any"
                            placeholder={translateText("إضافة ضيف", "Add a guest")}
                            aria-invalid="false"
                            className="px-3 appearance-none block w-full border rounded-md placeholder-gray-500 focus:outline-none px-3 py-2 sm:text-sm sm:leading-5 border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                            value={guestsLabel}
                            onChange={(e) => setGuestsLabel(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex w-full items-center space-x-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={guestsShowCounter}
                        onClick={() => setGuestsShowCounter(!guestsShowCounter)}
                        className="cursor-pointer ml-0 w-10 h-5 relative inline-flex items-center justify-center flex-shrink-0 group focus:outline-none"
                      >
                        <span
                          className={`${guestsShowCounter ? "bg-emerald-500" : "bg-gray-200 dark:bg-slate-600"} h-4 w-9 absolute mx-auto rounded-full transition-colors ease-in-out duration-200`}
                        />
                        <span
                          className={`${guestsShowCounter ? "translate-x-5" : "translate-x-0"} h-5 w-5 absolute left-0 inline-block border border-gray-200 rounded-full bg-white shadow transform transition-transform ease-in-out duration-200`}
                        />
                      </button>
                      <div className="flex items-center">
                        <label className="flex text-sm leading-5 font-semibold text-gray-700 dark:text-gray-300">
                          {translateText("إظهار العداد", "Show counter")}
                        </label>
                      </div>
                    </div>
                    <div className="mt-6">
                      <div className="flex w-full flex-col" id="guestsDetailsLabel">
                        <div className="flex items-center">
                          <label
                            className="flex text-sm leading-5 font-semibold text-gray-700 dark:text-gray-300"
                            htmlFor="field-guestsDetailsLabel-input"
                          >
                            {translateText("العنوان (تفاصيل الضيوف)", "Label (Guests details)")}
                          </label>
                        </div>
                        <div className="relative mt-1 rounded-md shadow-sm">
                          <input
                            id="field-guestsDetailsLabel-input"
                            name="guestsDetailsLabel"
                            step="any"
                            placeholder={translateText("الضيوف", "Guests")}
                            aria-invalid="false"
                            className="px-3 appearance-none block w-full border rounded-md placeholder-gray-500 focus:outline-none px-3 py-2 sm:text-sm sm:leading-5 border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                            value={guestDetails.map((g) => g.label).join(", ")}
                            onChange={(e) => {
                              const labels = e.target.value.split(",").map((s) => s.trim());
                              const updated = guestDetails.map((g, idx) => ({
                                ...g,
                                label: labels[idx] || g.label,
                              }));
                              setGuestDetails(updated);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    {guestDetails.map((g, idx) => (
                      <div key={g.id} className="mt-4 flex w-full items-center space-x-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={g.active}
                          onClick={() => {
                            const updated = [...guestDetails];
                            updated[idx].active = !updated[idx].active;
                            setGuestDetails(updated);
                          }}
                          className="cursor-pointer ml-0 w-10 h-5 relative inline-flex items-center justify-center flex-shrink-0 group focus:outline-none"
                        >
                          <span
                            className={`${g.active ? "bg-emerald-500" : "bg-gray-200 dark:bg-slate-600"} h-4 w-9 absolute mx-auto rounded-full transition-colors ease-in-out duration-200`}
                          />
                          <span
                            className={`${g.active ? "translate-x-5" : "translate-x-0"} h-5 w-5 absolute left-0 inline-block border border-gray-200 rounded-full bg-white shadow transform transition-transform ease-in-out duration-200`}
                          />
                        </button>
                        <div className="no-shrink w-1/2">
                          <div className="flex w-full flex-col" id={`guestLabel-${g.id}`}>
                            <div className="relative rounded-md shadow-sm">
                              <input
                                id={`field-guestLabel-${g.id}-input`}
                                name={`guestLabel-${g.id}`}
                                step="any"
                                placeholder={g.label}
                                aria-invalid="false"
                                className="px-3 appearance-none block w-full border rounded-md placeholder-gray-500 focus:outline-none px-3 py-2 sm:text-sm sm:leading-5 border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                                value={g.label}
                                onChange={(e) => {
                                  const updated = [...guestDetails];
                                  updated[idx].label = e.target.value;
                                  setGuestDetails(updated);
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="w-auto flex-grow">
                          <CustomSelect
                            value={g.required ? "required" : "optional"}
                            onChange={(val) => {
                              const updated = [...guestDetails];
                              updated[idx].required = val === "required";
                              setGuestDetails(updated);
                            }}
                            options={requiredOptions}
                            className="w-full"
                          />
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => setDefaultFieldModal({ open: false, fieldId: null })}
                        className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-sm font-bold transition"
                      >
                        {translateText("إلغاء", "Cancel")}
                      </button>
                      <button
                        onClick={saveDefaultField}
                        className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 transition"
                      >
                        {translateText("حفظ", "Save")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------- QUESTION MODAL - FIXED for multi-choice ---------- */}
      <AnimatePresence>
        {questionModalOpen && (
          <div className="fixed inset-0 z-[1700] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuestionModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-950 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative z-20"
            >
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                  <FileText className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="mt-4 w-full text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <h3
                        className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                        id="modal-headline"
                      >
                        {editingQuestionId
                          ? translateText("تعديل السؤال", "Edit question")
                          : translateText("سؤال جديد", "New question")}
                      </h3>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="relative rounded-md shadow-sm">
                      <input
                        type="text"
                        name="newQuestion"
                        className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm sm:leading-5 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                        placeholder={translateText("اكتب سؤالك", "Type your question")}
                        required
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex items-end space-x-2">
                    <div className="w-1/2">
                      <div className="flex items-center">
                        <label
                          className="flex text-sm leading-5 font-semibold text-gray-700 dark:text-gray-300"
                          htmlFor="answerType"
                        >
                          {translateText("نوع الإجابة", "Answer type")}
                        </label>
                      </div>
                      <div className="mt-1 relative w-full">
                        <CustomSelect
                          value={newQuestionType}
                          onChange={(val) => {
                            setNewQuestionType(val as any);
                            if (val === "radio") setNewQuestionOptions([]);
                          }}
                          options={questionTypeOptions}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div className="w-1/2">
                      <div className="flex items-center">
                        <label className="flex text-sm leading-5 font-semibold text-gray-700 dark:text-gray-300">
                          {translateText("المتطلبات", "Requirement")}
                        </label>
                      </div>
                      <CustomSelect
                        value={newQuestionRequired ? "required" : "optional"}
                        onChange={(val) => setNewQuestionRequired(val === "required")}
                        options={requiredOptions}
                        className="w-full"
                      />
                    </div>
                  </div>
                  {newQuestionType === "radio" && (
                    <div className="mt-6 text-center sm:text-left">
                      <div className="flex items-center">
                        <label className="flex text-sm leading-5 font-semibold text-gray-700 dark:text-gray-300">
                          {translateText("الإجابات", "Answers")}
                        </label>
                      </div>
                      <div className="mt-1 text-sm leading-5 text-gray-400">
                        {translateText(
                          "يمكن للمدعو اختيار أحد الخيارات التالية",
                          "Invitee can select one of the following",
                        )}
                      </div>
                      {/* FIX: Added input field for adding answers */}
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={newOptionInput}
                          onChange={(e) => setNewOptionInput(e.target.value)}
                          placeholder={translateText("اكتب الإجابة...", "Type answer...")}
                          className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newOptionInput.trim()) {
                              setNewQuestionOptions([...newQuestionOptions, newOptionInput.trim()]);
                              setNewOptionInput("");
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newOptionInput.trim()) {
                              setNewQuestionOptions([...newQuestionOptions, newOptionInput.trim()]);
                              setNewOptionInput("");
                            }
                          }}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition"
                        >
                          {translateText("إضافة", "Add")}
                        </button>
                      </div>
                      <div className="relative mt-2">
                        <div className="h-auto overflow-y-auto overscroll-contain pb-1">
                          {newQuestionOptions.map((opt, idx) => (
                            <div
                              key={idx}
                              className="mt-4 flex w-full items-center justify-between text-gray-600 dark:text-gray-300"
                            >
                              <div className="flex w-full items-center">
                                <input
                                  type="text"
                                  className="py-2s block w-full appearance-none rounded-md border border-gray-300 px-3 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm sm:leading-5 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                                  placeholder={translateText(
                                    `Answer #${idx + 1}`,
                                    `Answer #${idx + 1}`,
                                  )}
                                  value={opt}
                                  onChange={(e) => {
                                    const updated = [...newQuestionOptions];
                                    updated[idx] = e.target.value;
                                    setNewQuestionOptions(updated);
                                  }}
                                />
                              </div>
                              <div className="ml-2 flex space-x-2">
                                <div className="flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...newQuestionOptions];
                                      updated.splice(idx + 1, 0, opt + " (copy)");
                                      setNewQuestionOptions(updated);
                                    }}
                                    className="w-8 h-8 text-gray-500 hover:text-gray-600 flex items-center justify-center flex-shrink-0 rounded-full hover:bg-gray-200/50 focus:outline-none"
                                  >
                                    <DuplicateIcon className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...newQuestionOptions];
                                      updated.splice(idx, 1);
                                      setNewQuestionOptions(updated);
                                    }}
                                    className="w-8 h-8 text-gray-500 hover:text-gray-600 flex items-center justify-center flex-shrink-0 rounded-full hover:bg-gray-200/50 focus:outline-none"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-center py-4 text-sm sm:justify-start sm:py-3 sm:text-base">
                        <span className="inline-flex rounded-md shadow-sm"></span>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setQuestionModalOpen(false)}
                      className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-sm font-bold transition"
                    >
                      {translateText("إلغاء", "Cancel")}
                    </button>
                    <button
                      onClick={() => {
                        if (!newQuestionText.trim()) return;
                        const newQ = {
                          id: editingQuestionId || Date.now() + Math.random(),
                          label: newQuestionText.trim(),
                          type: newQuestionType,
                          required: newQuestionRequired,
                          options:
                            newQuestionType === "radio" ? [...newQuestionOptions] : undefined,
                          active: true,
                        };
                        if (editingQuestionId) {
                          setCalendarQuestions(
                            calendarQuestions.map((q) => (q.id === editingQuestionId ? newQ : q)),
                          );
                          setEditingQuestionId(null);
                          toast.success(translateText("تم التحديث", "Updated"));
                        } else {
                          setCalendarQuestions([...calendarQuestions, newQ]);
                          toast.success(translateText("تمت الإضافة", "Added"));
                        }
                        setQuestionModalOpen(false);
                      }}
                      className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 transition"
                    >
                      {editingQuestionId
                        ? translateText("تحديث", "Update")
                        : translateText("إضافة", "Add")}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------- TEXT BLOCK MODAL ---------- */}
      <AnimatePresence>
        {textBlockModalOpen && (
          <div className="fixed inset-0 z-[1700] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setTextBlockModalOpen(false);
                setEditingTextBlockId(null);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-950 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative z-20"
            >
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
                {editingTextBlockId
                  ? translateText("تعديل كتلة النص", "Edit Block of Text")
                  : translateText("كتلة نصية جديدة", "New Block of Text")}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    {translateText("العنوان (اختياري)", "Label (optional)")}
                  </label>
                  <input
                    type="text"
                    value={textBlockLabel}
                    onChange={(e) => setTextBlockLabel(e.target.value)}
                    placeholder={translateText("مثال: ملاحظة هامة", "e.g. Important Note")}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    {translateText("النص", "Text")}
                  </label>
                  <textarea
                    rows={4}
                    value={textBlockText}
                    onChange={(e) => setTextBlockText(e.target.value)}
                    placeholder={translateText(
                      "Write your message here...",
                      "Write your message here...",
                    )}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setTextBlockModalOpen(false);
                    setEditingTextBlockId(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-sm font-bold transition"
                >
                  {translateText("إلغاء", "Cancel")}
                </button>
                <button
                  onClick={() => {
                    if (!textBlockText.trim()) return;
                    if (editingTextBlockId) {
                      setCalendarQuestions(
                        calendarQuestions.map((q) =>
                          q.id === editingTextBlockId
                            ? {
                                ...q,
                                label: textBlockLabel.trim(),
                                text: textBlockText.trim(),
                              }
                            : q,
                        ),
                      );
                      setEditingTextBlockId(null);
                      toast.success(translateText("تم التحديث", "Updated"));
                    } else {
                      setCalendarQuestions([
                        ...calendarQuestions,
                        {
                          id: Date.now() + Math.random(),
                          label: textBlockLabel.trim(),
                          text: textBlockText.trim(),
                          type: "text-block",
                          required: false,
                          active: true,
                        },
                      ]);
                      toast.success(translateText("تمت الإضافة", "Added"));
                    }
                    setTextBlockModalOpen(false);
                  }}
                  className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 transition"
                >
                  {editingTextBlockId
                    ? translateText("تحديث", "Update")
                    : translateText("إضافة", "Add")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------- CONFIRMATION PAGE MODAL ---------- */}
      <AnimatePresence>
        {confirmationModalOpen && (
          <div className="fixed inset-0 z-[1700] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmationModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-950 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative z-20"
            >
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
                {translateText("صفحة التأكيد", "Confirmation Page")}
              </h3>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1 flex items-center gap-2">
                  {translateText("نص الرسالة", "Body Text")}
                  <span className="text-purple-600 text-xs cursor-pointer">
                    + {translateText("المتغيرات", "Variables")}
                  </span>
                </label>
                <textarea
                  rows={5}
                  value={confirmationBody}
                  onChange={(e) => setConfirmationBody(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setConfirmationBody(
                      "سيتم إرسال دعوة التقويم مع جميع التفاصيل عبر البريد الإلكتروني",
                    )
                  }
                  className="text-xs text-purple-600 hover:underline mt-1"
                >
                  {translateText("استعادة الافتراضي", "Restore Default")}
                </button>
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {translateText("معاينة", "Preview")}
                </h4>
                <div className="bg-slate-100 dark:bg-slate-900/60 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                  {confirmationBody}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setConfirmationModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-sm font-bold transition"
                >
                  {translateText("إلغاء", "Cancel")}
                </button>
                <button
                  onClick={() => {
                    setCalendarAfterBooking({
                      ...calendarAfterBooking,
                      confirmationBody: confirmationBody,
                    });
                    setConfirmationModalOpen(false);
                    toast.success(translateText("تم التحديث", "Updated"));
                  }}
                  className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 transition"
                >
                  {translateText("تطبيق", "Apply")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------- LOOK BUSY MODAL ---------- */}
      <AnimatePresence>
        {showLookBusyModal && (
          <div className="fixed inset-0 z-[1700] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLookBusyModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative z-20"
            >
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
                {translateText("تبدو مشغولاً", "Look Busy")}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    {translateText("الحد الأدنى %", "Min %")}
                  </label>
                  <input
                    type="number"
                    value={lookBusy.min}
                    onChange={(e) => setLookBusy({ ...lookBusy, min: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    {translateText("الحد الأقصى %", "Max %")}
                  </label>
                  <input
                    type="number"
                    value={lookBusy.max}
                    onChange={(e) => setLookBusy({ ...lookBusy, max: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowLookBusyModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-sm font-bold transition"
                >
                  {translateText("إلغاء", "Cancel")}
                </button>
                <button
                  onClick={() => {
                    setShowLookBusyModal(false);
                    toast.success(translateText("تم التحديث", "Updated"));
                  }}
                  className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 transition"
                >
                  {translateText("تطبيق", "Apply")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------- STATUS MODAL ---------- */}
      <AnimatePresence>
        {isStatusModalOpen && selectedBooking && (
          <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStatusModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative z-20"
            >
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
                {translateText("تغيير حالة الحجز", "Change Booking Status")}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                {translateText(
                  `تغيير حالة حجز ${selectedBooking.name}`,
                  `Change status for ${selectedBooking.name}`,
                )}
              </p>
              <CustomSelect
                value={temporaryStatus}
                onChange={(value) => setTemporaryStatus(value as any)}
                options={[
                  { value: "Confirmed", label: translateText("مؤكدة", "Confirmed") },
                  { value: "Pending", label: translateText("معلقة", "Pending") },
                  { value: "Cancelled", label: translateText("ملغاة", "Cancelled") },
                  { value: "Completed", label: translateText("مكتملة", "Completed") },
                ]}
                className="mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setIsStatusModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-sm font-bold transition"
                >
                  {translateText("إلغاء", "Cancel")}
                </button>
                <button
                  onClick={updateBookingStatus}
                  className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 transition"
                >
                  {translateText("تحديث", "Update")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------- DELETE CONFIRMATION MODAL ---------- */}
      <AnimatePresence>
        {isDeleteConfirmationOpen && (selectedBooking || selectedCalendar) && (
          <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsDeleteConfirmationOpen(false);
                setSelectedBooking(null);
                setSelectedCalendar(null);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-center relative z-20"
            >
              <div className="mx-auto w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {translateText("تأكيد الحذف", "Confirm Delete")}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {selectedBooking
                  ? translateText(
                      `هل أنت متأكد من حذف حجز "${selectedBooking.name}" نهائياً؟`,
                      `Are you sure you want to delete "${selectedBooking.name}" permanently?`,
                    )
                  : translateText(
                      `هل أنت متأكد من حذف "${selectedCalendar?.name}" نهائياً؟ سيتم حذف جميع الحجوزات المرتبطة به.`,
                      `Are you sure you want to delete "${selectedCalendar?.name}" permanently? All related bookings will be removed.`,
                    )}
              </p>
              <div className="flex gap-3 mt-6 justify-center">
                <button
                  onClick={() => {
                    setIsDeleteConfirmationOpen(false);
                    setSelectedBooking(null);
                    setSelectedCalendar(null);
                  }}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition"
                >
                  {translateText("إلغاء", "Cancel")}
                </button>
                <button
                  onClick={selectedBooking ? deleteBooking : deleteCalendar}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md shadow-red-500/20 transition"
                >
                  {translateText("حذف", "Delete")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------- DETAIL MODAL ---------- */}
      <AnimatePresence>
        {isDetailModalOpen && selectedBooking && (
          <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-950 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative z-20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  {translateText("تفاصيل الحجز", "Booking Details")}
                </h3>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                    {selectedBooking.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-800 dark:text-white">
                      {selectedBooking.name}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {selectedBooking.contact || translateText("لا يوجد تواصل", "No contact")}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {translateText("التقويم", "Calendar")}
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                      {getCalendarNameById(selectedBooking.calendarId)}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {translateText("الحالة", "Status")}
                    </div>
                    <div className="mt-1">
                      <StatusBadge status={selectedBooking.status} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {translateText("التاريخ", "Date")}
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                      {selectedBooking.date}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {translateText("الوقت", "Time")}
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                      {selectedBooking.time}
                    </div>
                  </div>
                </div>
                {selectedBooking.source && selectedBooking.source !== "Manual" && (
                  <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {translateText("المصدر", "Source")}
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                      {selectedBooking.source}
                    </div>
                  </div>
                )}
                {selectedBooking.fromAd !== undefined && (
                  <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {translateText("مصدر الوصول من إعلان؟", "Source from Ads?")}
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                      {selectedBooking.fromAd
                        ? translateText("نعم", "Yes")
                        : translateText("لا", "No")}
                    </div>
                  </div>
                )}
                {selectedBooking.answers && Object.keys(selectedBooking.answers).length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                      {translateText("الإجابات", "Answers")}
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3 space-y-2">
                      {Object.entries(selectedBooking.answers).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex justify-between text-sm border-b border-slate-200 dark:border-slate-800/60 pb-1.5 last:border-0 last:pb-0"
                        >
                          <span className="text-slate-500 dark:text-slate-400">{key}</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  {!isAdmin && (
                    <button
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        openStatusChangeModal(selectedBooking);
                      }}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 transition"
                    >
                      {translateText("تغيير الحالة", "Change Status")}
                    </button>
                  )}
                  <button
                    onClick={() => setIsDetailModalOpen(false)}
                    className={`flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition ${
                      isAdmin ? "w-full" : ""
                    }`}
                  >
                    {translateText("إغلاق", "Close")}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------- PUBLIC PREVIEW MODAL ---------- */}
      <AnimatePresence>
        {isPublicPreviewModalOpen && selectedCalendar && (
          <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPublicPreviewModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-950 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative z-20"
            >
              {/* Preview content */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  {translateText("معاينة صفحة الحجز", "Booking Page Preview")}
                </h3>
                <button
                  onClick={() => setIsPublicPreviewModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400 mb-4">
                👁{" "}
                {translateText(
                  "معاينة — كده بالظبط هتظهر الصفحة للزائر",
                  "Preview — exactly how the page will appear to visitors",
                )}
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedCalendar.color }}
                />
                <div>
                  <div className="font-bold text-lg text-slate-800 dark:text-white">
                    {selectedCalendar.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedCalendar.duration} {translateText("دقيقة", "minutes")} ·{" "}
                    {BASE_BOOKING_URL}/{selectedCalendar.slug}
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                {selectedCalendar.description || translateText("لا يوجد وصف", "No description")}
              </p>
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                {translateText("اختار الميعاد المناسب", "Choose a suitable time")}
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 mb-4">
                {getAvailableSlotsForCalendar(selectedCalendar).length === 0 ? (
                  <div className="text-center py-4 w-full text-xs text-slate-500">
                    {translateText("لا توجد مواعيد متاحة حالياً", "Currently no available times")}
                  </div>
                ) : (
                  getAvailableSlotsForCalendar(selectedCalendar).map(({ date, times }) => (
                    <div key={date} className="min-w-[100px]">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center mb-1">
                        {date}
                      </div>
                      {times.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedSlot(date + "|" + time)}
                          className={`w-full text-xs font-bold px-3 py-2 rounded-lg border transition mb-1 ${
                            selectedSlot === date + "|" + time
                              ? "bg-amber-50 dark:bg-amber-900/20 border-amber-500 text-amber-700 dark:text-amber-400"
                              : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300 hover:text-slate-800"
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-4 mb-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-350">
                  {translateText("بيانات الحجز", "Booking details")}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    {translateText("الاسم الكامل *", "Full Name *")}
                  </label>
                  <input
                    type="text"
                    value={previewName}
                    onChange={(e) => setPreviewName(e.target.value)}
                    placeholder={translateText("أدخل اسمك بالكامل", "Enter your full name")}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    {translateText("رقم الواتساب *", "WhatsApp Number *")}
                  </label>
                  <input
                    type="text"
                    value={previewWhatsapp}
                    onChange={(e) => setPreviewWhatsapp(e.target.value)}
                    placeholder={translateText(
                      "أدخل رقم الواتساب الخاص بك",
                      "Enter your WhatsApp number",
                    )}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    {translateText(
                      "إيه أكبر تحدي بتواجهه دلوقتي؟",
                      "What is the biggest challenge you face now?",
                    )}
                  </label>
                  <textarea
                    rows={3}
                    value={previewChallenge}
                    onChange={(e) => setPreviewChallenge(e.target.value)}
                    placeholder={translateText(
                      "اكتب التحدي هنا...",
                      "Write your challenge here...",
                    )}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    {translateText(
                      "مصدر الوصول (اختياري — من الإعلان مثلاً)",
                      "Source of arrival (Optional - e.g. from Ads)",
                    )}
                  </label>
                  <input
                    type="text"
                    value={previewSource}
                    onChange={(e) => setPreviewSource(e.target.value)}
                    placeholder={translateText(
                      "مثال: إعلان فيسبوك، انستجرام، صديق...",
                      "Example: Facebook Ad, Instagram, friend...",
                    )}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setIsPublicPreviewModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-sm font-bold transition"
                >
                  {translateText("إغلاق", "Close")}
                </button>
                <button
                  onClick={async () => {
                    if (!selectedSlot) {
                      toast.error(
                        translateText("يرجى اختيار ميعاد أولاً", "Please select a slot first"),
                      );
                      return;
                    }
                    if (!previewName.trim()) {
                      toast.error(
                        translateText("يرجى إدخال الاسم الكامل", "Please enter your full name"),
                      );
                      return;
                    }
                    if (!previewWhatsapp.trim()) {
                      toast.error(
                        translateText(
                          "يرجى إدخال رقم الواتساب",
                          "Please enter your WhatsApp number",
                        ),
                      );
                      return;
                    }
                    setIsSaving(true);
                    try {
                      const [date, time] = selectedSlot.split("|");
                      const newId = Date.now();
                      const answers: Record<string, string> = {};
                      if (previewChallenge.trim()) {
                        answers[translateText("أكبر تحدي بتواجهه", "Biggest challenge")] =
                          previewChallenge.trim();
                      }
                      const newBooking = {
                        id: newId,
                        calendarId: selectedCalendar.id,
                        name: previewName.trim(),
                        contact: previewWhatsapp.trim(),
                        date,
                        time,
                        status: selectedCalendar.requireApproval ? "Pending" : "Confirmed",
                        source: previewSource.trim() || "Preview",
                        answers,
                        createdAt: newId,
                        userId: user?.uid || "",
                      };
                      const docKey = `booking-${newId}-${user?.uid || ""}`;
                      await firestore.setDoc(firestore.doc(db, "bookings", docKey), newBooking);
                      toast.success(
                        translateText("تم تأكيد الحجز بنجاح", "Booking confirmed successfully"),
                      );
                      setIsPublicPreviewModalOpen(false);
                    } catch (err) {
                      console.error("Error creating booking:", err);
                      toast.error(
                        translateText("حدث خطأ أثناء تأكيد الحجز", "Error confirming booking"),
                      );
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 transition"
                >
                  {translateText("تأكيد الحجز", "Confirm Booking")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------- EMBED MODAL ---------- */}
      <AnimatePresence>
        {isEmbedModalOpen && selectedCalendar && (
          <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEmbedModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-950 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative z-20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  {translateText(
                    `كود التضمين — ${selectedCalendar.name}`,
                    `Embed Code — ${selectedCalendar.name}`,
                  )}
                </h3>
                <button
                  onClick={() => setIsEmbedModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    {translateText("الرابط المباشر", "Direct Link")}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={`${BASE_BOOKING_URL}/${selectedCalendar.slug}`}
                      readOnly
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none"
                    />
                    <button
                      onClick={() =>
                        copyLinkToClipboard(
                          `${BASE_BOOKING_URL}/${selectedCalendar.slug}`,
                          selectedCalendar.id,
                        )
                      }
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold transition"
                    >
                      {translateText("نسخ", "Copy")}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    {translateText(
                      "كود Embed — حطه في صفحة الهبوط",
                      "Embed Code — Place on landing page",
                    )}
                  </label>
                  <textarea
                    readOnly
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none resize-none"
                    value={`<iframe src="${BASE_BOOKING_URL}/${selectedCalendar.slug}?embed=1" width="100%" height="700" frameborder="0" style="border-radius:12px;"></iframe>`}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `<iframe src="${BASE_BOOKING_URL}/${selectedCalendar.slug}?embed=1" width="100%" height="700" frameborder="0" style="border-radius:12px;"></iframe>`,
                      );
                      toast.success(translateText("تم نسخ الكود", "Code copied"));
                    }}
                    className="mt-2 w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold transition"
                  >
                    {translateText("نسخ كود التضمين", "Copy Embed Code")}
                  </button>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    {translateText(
                      "معرف التقويم (للاستخدام في API/Webhook)",
                      "Calendar ID (for API/Webhook)",
                    )}
                  </label>
                  <input
                    type="text"
                    value={selectedCalendar.id}
                    readOnly
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------- LOADING OVERLAY ---------- */}
      <AnimatePresence>
        {(isSaving || isDeleting) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800">
              <RefreshCw className="h-8 w-8 text-purple-600 animate-spin" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-350">
                {isSaving
                  ? translateText("جاري الحفظ...", "Saving...")
                  : translateText("جاري الحذف...", "Deleting...")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
