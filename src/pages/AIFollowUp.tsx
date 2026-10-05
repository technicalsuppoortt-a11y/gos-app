import React from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { showToast } from "../utils/toast";
import {
  Activity,
  Archive,
  Calendar,
  Pencil,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  BookMarked,
  HandCoins,
  ScanText,
  HelpCircle,
  Package,
  Shield,
  MessageSquare,
  MessageSquareMore,
  Repeat,
  UserCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  Globe2,
  Inbox,
  Mail,
  Plus,
  Search,
  Send,
  Settings,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Users,
  X,
  Zap,
  Star,
  Link2,
  FileText,
  BookOpen,
  Webhook,
  MoreHorizontal,
  Trash2,
  PencilLine,
  Save,
  Timer,
  BellRing,
} from "lucide-react";
import {
  FOLLOW_UP_LIFECYCLE,
  addLeadActivity,
  setLeadConsent,
  setLeadFollowUpState,
  type CanonicalLead,
  type FollowUpLifecycleState,
  type MessagingChannel,
} from "../store/slices/crmSlice";
import type { RootState, AppDispatch } from "../store";
import "./ai-followup.css";

type Props = { notify?: (message: string) => void };
type Tab =
  | "Overview"
  | "Conversations"
  | "AI Assistants"
  | "Knowledge"
  | "Automations"
  | "Templates"
  | "Analytics"
  | "Settings";
type Channel = {
  id: string;
  name: string;
  icon: React.ElementType;
  className: string;
  conversations: string;
};
type DemoConversation = {
  leadId: string;
  displayName: string;
  channel: MessagingChannel | "website";
  excerpt: string;
  time: string;
  state: FollowUpLifecycleState;
};
type KnowledgeSource = {
  id: string;
  name: string;
  type: "url" | "file" | "text" | "products" | "faq" | "instructions";
  detail: string;
  content?: string;
};
type SequenceStep = { id: string; delay: string; unit: string; action: string };
type Workflow = {
  id: string;
  name: string;
  description: string;
  trigger: string;
  active: boolean;
  from: string;
  to: string;
  actionType: string;
  sequenceSteps: SequenceStep[];
};
type TemplateItem = {
  id: string;
  title: string;
  description: string;
  iconKey: string;
  custom?: boolean;
  category?: string;
  prompt?: string;
  variables?: string;
};
type FollowUpSettings = {
  responseDelay: string;
  tone: string;
  maxAttempts: number;
  autoEscalation: boolean;
};
const readLocal = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeLocal = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Keep the current session usable when storage is unavailable. */
  }
};
const WORKFLOWS_KEY = "gos.ai-followup.workflows.v1";
const KNOWLEDGE_KEY = "gos.ai-followup.knowledge.v1";
const TEMPLATES_KEY = "gos.ai-followup.templates.v1";
const SETTINGS_KEY = "gos.ai-followup.settings.v1";
const ASSISTANT_KEY = "gos.ai-followup.assistant.v1";
type MenuOption = { value: string; label: React.ReactNode };
const MenuSelect = ({
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
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((state) => !state)}
      >
        {iconOnly ? <SlidersHorizontal size={15} /> : <span>{current}</span>}
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
            }}
          >
            {options.map((option) => (
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
                <span>{option.label}</span>
                {option.value === value && <CheckCircle2 size={14} />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};
const InstagramBrand = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect
      x="3.5"
      y="3.5"
      width="17"
      height="17"
      rx="5"
      fill="none"
      stroke="white"
      strokeWidth="1.8"
    />
    <circle
      cx="12"
      cy="12"
      r="4"
      fill="none"
      stroke="white"
      strokeWidth="1.8"
    />
    <circle cx="17.4" cy="6.8" r="1.1" fill="white" />
  </svg>
);
const FacebookBrand = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="white"
      d="M13.9 21v-8.1h2.72l.4-3.16H13.9V7.72c0-.91.25-1.53 1.57-1.53h1.67V3.36c-.29-.04-1.28-.12-2.43-.12-2.4 0-4.04 1.47-4.04 4.17v2.32H7.95v3.16h2.72V21h3.23Z"
    />
  </svg>
);
const WhatsAppBrand = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="none"
      stroke="white"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 11.7a8 8 0 0 1-11.8 7L4 20l1.3-4A8 8 0 1 1 20 11.7Z"
    />
    <path
      fill="white"
      d="M16.6 14.1c-.23-.12-1.36-.67-1.57-.75-.21-.08-.36-.12-.52.12-.15.23-.6.75-.74.9-.13.15-.27.17-.5.06-.23-.12-.97-.36-1.85-1.13-.68-.61-1.14-1.36-1.28-1.59-.13-.23-.01-.36.1-.48.1-.1.23-.27.35-.41.12-.13.15-.23.23-.38.08-.15.04-.29-.02-.41-.06-.12-.52-1.26-.72-1.72-.19-.45-.38-.39-.52-.4h-.44c-.15 0-.4.06-.62.29-.21.23-.81.79-.81 1.93s.84 2.24.95 2.4c.12.15 1.65 2.51 3.99 3.51.56.24.99.39 1.33.5.56.18 1.06.15 1.46.09.45-.07 1.37-.56 1.56-1.1.2-.54.2-1 .14-1.1-.06-.09-.21-.15-.44-.27Z"
    />
  </svg>
);
const MessengerBrand = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="white"
      d="M12 3.2c-5.12 0-9.2 3.77-9.2 8.68 0 2.6 1.2 4.91 3.14 6.49.16.13.25.31.26.51l.06 1.67c.02.52.56.87 1.04.66l1.87-.83c.16-.07.33-.08.5-.04.74.21 1.52.32 2.33.32 5.12 0 9.2-3.77 9.2-8.68S17.12 3.2 12 3.2Zm4.52 6.54-2.7 4.29a1.3 1.3 0 0 1-1.98.35l-1.94-1.42a.65.65 0 0 0-.78 0l-2.88 2.18c-.38.29-.89-.17-.63-.57l2.7-4.29a1.3 1.3 0 0 1 1.98-.35l1.94 1.42c.24.18.55.18.78 0l2.88-2.18c.38-.29.89.17.63.57Z"
    />
  </svg>
);
const WebsiteChatBrand = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle
      cx="12"
      cy="12"
      r="9"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
    />
    <path
      d="M3.5 12h17M12 3c2.2 2.4 3.3 5.4 3.3 9s-1.1 6.6-3.3 9c-2.2-2.4-3.3-5.4-3.3-9S9.8 5.4 12 3Z"
      fill="none"
      stroke="white"
      strokeWidth="1.35"
    />
  </svg>
);
const AssistantRobot = () => (
  <svg
    className="af-robot-render"
    viewBox="0 0 64 64"
    role="img"
    aria-label="GOS assistant robot"
  >
    <defs>
      <linearGradient id="af-robot-shell" x1="10%" y1="8%" x2="90%" y2="100%">
        <stop stopColor="#fff" />
        <stop offset=".55" stopColor="#e8edf4" />
        <stop offset="1" stopColor="#bbc6d5" />
      </linearGradient>
      <linearGradient id="af-robot-face" x1="10%" y1="0" x2="90%" y2="100%">
        <stop stopColor="#30425d" />
        <stop offset="1" stopColor="#111d31" />
      </linearGradient>
      <linearGradient id="af-robot-glint" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#fff" stopOpacity=".9" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M32 7v5" stroke="#93a3b8" strokeWidth="3" strokeLinecap="round" />
    <circle cx="32" cy="6" r="3" fill="#8b72ef" />
    <rect
      x="8"
      y="18"
      width="48"
      height="37"
      rx="15"
      fill="#bdc8d7"
      opacity=".45"
    />
    <rect
      x="10"
      y="15"
      width="44"
      height="39"
      rx="14"
      fill="url(#af-robot-shell)"
      stroke="#d5dde8"
    />
    <rect
      x="15"
      y="22"
      width="34"
      height="24"
      rx="9"
      fill="url(#af-robot-face)"
    />
    <path
      d="M18 25c6-4 18-4 25 0"
      stroke="url(#af-robot-glint)"
      strokeWidth="2"
      fill="none"
      opacity=".6"
    />
    <ellipse cx="24" cy="33" rx="3.2" ry="4" fill="#74d8ff" />
    <ellipse cx="40" cy="33" rx="3.2" ry="4" fill="#74d8ff" />
    <circle cx="25" cy="32" r="1" fill="white" />
    <circle cx="41" cy="32" r="1" fill="white" />
    <path
      d="M26 40c3 2 9 2 12 0"
      stroke="#92a8c3"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <rect x="5" y="27" width="5" height="13" rx="2.5" fill="#d9e0e9" />
    <rect x="54" y="27" width="5" height="13" rx="2.5" fill="#d9e0e9" />
  </svg>
);
const tabs: Tab[] = [
  "Overview",
  "Conversations",
  "AI Assistants",
  "Knowledge",
  "Automations",
  "Templates",
  "Analytics",
  "Settings",
];
const tabIcons: Record<Tab, React.ElementType | null> = {
  Overview: null,
  Conversations: MessageSquareMore,
  "AI Assistants": UserCheck,
  Knowledge: Archive,
  Automations: Repeat,
  Templates: BookMarked,
  Analytics: BarChart3,
  Settings: Settings,
};
const channels: Channel[] = [
  {
    id: "instagram",
    name: "Instagram",
    icon: InstagramBrand,
    className: "af-instagram",
    conversations: "1,234 conversations",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: FacebookBrand,
    className: "af-facebook",
    conversations: "856 conversations",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: WhatsAppBrand,
    className: "af-whatsapp",
    conversations: "642 conversations",
  },
  {
    id: "messenger",
    name: "Messenger",
    icon: MessengerBrand,
    className: "af-messenger",
    conversations: "421 conversations",
  },
  {
    id: "website",
    name: "Website Chat",
    icon: WebsiteChatBrand,
    className: "af-web",
    conversations: "318 conversations",
  },
];
const defaultWorkflows: Workflow[] = [
  {
    id: "new-lead",
    name: "New Lead Follow-Up",
    description: "Auto-reply and nurture new leads",
    trigger: "12,430 triggered",
    active: true,
    from: "NEW",
    to: "CONTACTED",
    actionType: "Webhook",
    sequenceSteps: [
      { id: "new-lead-1", delay: "1", unit: "hour", action: "Email" },
    ],
  },
  {
    id: "appointment",
    name: "Appointment Reminder",
    description: "Send reminders before appointments",
    trigger: "892 triggered",
    active: true,
    from: "BOOKED",
    to: "PRE_MEETING_REMINDER",
    actionType: "Calendar reminder",
    sequenceSteps: [
      { id: "appointment-1", delay: "24", unit: "hours", action: "WhatsApp" },
    ],
  },
  {
    id: "no-show",
    name: "No-Show Follow-Up",
    description: "Follow up if appointment is missed",
    trigger: "214 triggered",
    active: true,
    from: "NO_SHOW",
    to: "NURTURE_REACTIVATION",
    actionType: "Wait",
    sequenceSteps: [
      { id: "no-show-1", delay: "1", unit: "hour", action: "Email" },
    ],
  },
  {
    id: "reactivation",
    name: "Re-Engagement Campaign",
    description: "Message inactive leads",
    trigger: "1,032 triggered",
    active: false,
    from: "NURTURE_REACTIVATION",
    to: "CONTACTED",
    actionType: "Email",
    sequenceSteps: [
      { id: "reactivation-1", delay: "1", unit: "day", action: "Email" },
    ],
  },
];
const defaultTemplates: TemplateItem[] = [
  {
    id: "faq",
    title: "Answer FAQ",
    description: "Instant answers to common questions",
    iconKey: "help",
  },
  {
    id: "book",
    title: "Book Appointment",
    description: "Schedule calls or meetings",
    iconKey: "calendar",
  },
  {
    id: "product",
    title: "Product Information",
    description: "Explain your products & services",
    iconKey: "package",
  },
  {
    id: "objections",
    title: "Handle Objections",
    description: "Respond to common objections",
    iconKey: "shield",
  },
  {
    id: "follow-up",
    title: "Follow Up Message",
    description: "Nurture leads automatically",
    iconKey: "mail",
  },
  {
    id: "custom-template-action",
    title: "Custom Template",
    description: "Create your own template",
    iconKey: "plus",
  },
];
const defaultKnowledge: KnowledgeSource[] = [
  {
    id: "website",
    name: "Website content",
    type: "url",
    detail: "Synced today · Ready for answers",
  },
  {
    id: "products",
    name: "Products & services",
    type: "products",
    detail: "Catalog · 18 entries",
  },
  { id: "faqs", name: "FAQs", type: "faq", detail: "Reviewed · 24 answers" },
  {
    id: "pdfs",
    name: "PDF documents",
    type: "file",
    detail: "2 documents · Ready for answers",
  },
  {
    id: "instructions",
    name: "Custom instructions",
    type: "instructions",
    detail: "Assistant guidance · Active",
  },
];
const demoConversations: DemoConversation[] = [
  {
    leadId: "ld-101",
    displayName: "Sarah Ahmed",
    channel: "instagram",
    excerpt: "Hi! I'm interested in your personal...",
    time: "2 min ago",
    state: "NEW",
  },
  {
    leadId: "ld-102",
    displayName: "Omar Khaled",
    channel: "whatsapp",
    excerpt: "Do you have online coaching?",
    time: "5 min ago",
    state: "CONVERSING",
  },
  {
    leadId: "ld-103",
    displayName: "Lina Mansour",
    channel: "messenger",
    excerpt: "Can I book a free session?",
    time: "12 min ago",
    state: "BOOKING_OFFERED",
  },
  {
    leadId: "ld-104",
    displayName: "Ahmed Ali",
    channel: "facebook",
    excerpt: "What's the price for the program?",
    time: "20 min ago",
    state: "HUMAN_HANDOFF",
  },
  {
    leadId: "ld-105",
    displayName: "Nour Hassan",
    channel: "instagram",
    excerpt: "I want to join next month",
    time: "35 min ago",
    state: "CONVERSING",
  },
  {
    leadId: "ld-106",
    displayName: "Karim Mohamed",
    channel: "whatsapp",
    excerpt: "Is there a nutrition plan included?",
    time: "1 hour ago",
    state: "NEW",
  },
  {
    leadId: "ld-107",
    displayName: "Diana Samir",
    channel: "website",
    excerpt: "Great! I'll book now",
    time: "2 hours ago",
    state: "BOOKED",
  },
  {
    leadId: "ld-108",
    displayName: "Youssef Ibrahim",
    channel: "messenger",
    excerpt: "Do you have a gym in Dubai?",
    time: "3 hours ago",
    state: "HUMAN_HANDOFF",
  },
];
const stateTone = (state: FollowUpLifecycleState) =>
  ({
    NEW: "blue",
    CONTACTED: "blue",
    CONVERSING: "violet",
    QUALIFYING: "violet",
    QUALIFIED: "mint",
    BOOKING_OFFERED: "orange",
    BOOKED: "mint",
    PRE_MEETING_REMINDER: "blue",
    POST_MEETING: "mint",
    NO_SHOW: "orange",
    CUSTOMER: "slate",
    NURTURE_REACTIVATION: "pink",
    HUMAN_HANDOFF: "orange",
    STOPPED_INELIGIBLE: "slate",
  })[state];
const stateLabel = (state: FollowUpLifecycleState) =>
  FOLLOW_UP_LIFECYCLE.find((item) => item.state === state)?.label ?? state;
const knowledgeIconFor = (type: KnowledgeSource["type"]): React.ElementType =>
  ({
    url: Link2,
    file: FileText,
    text: ScanText,
    products: Package,
    faq: HelpCircle,
    instructions: BookOpen,
  })[type];
const templateIconFor = (key: string): React.ElementType =>
  ({
    help: HelpCircle,
    calendar: Calendar,
    package: Package,
    shield: Shield,
    mail: Mail,
    plus: Plus,
    zap: Zap,
    book: BookOpen,
  })[key] ?? Sparkles;
const workflowIconFor = (action: string): React.ElementType =>
  action.toLowerCase().includes("calendar")
    ? Calendar
    : action.toLowerCase().includes("wait") ||
        action.toLowerCase().includes("delay")
      ? Clock
      : action.toLowerCase().includes("webhook") ||
          action.toLowerCase().includes("crm")
        ? Webhook
        : action.toLowerCase().includes("whatsapp") ||
            action.toLowerCase().includes("instagram")
          ? Send
          : Mail;

const ChannelMark = ({ channel }: { channel: string }) => {
  const Brand =
    channel === "instagram"
      ? InstagramBrand
      : channel === "facebook"
        ? FacebookBrand
        : channel === "whatsapp"
          ? WhatsAppBrand
          : channel === "messenger"
            ? MessengerBrand
            : channel === "website"
              ? WebsiteChatBrand
              : Mail;
  return (
    <span
      className={`af-channel-mark ${channel === "whatsapp" ? "af-whatsapp" : channel === "facebook" ? "af-facebook" : channel === "messenger" ? "af-messenger" : channel === "website" ? "af-web" : channel === "email" ? "af-email" : "af-instagram"}`}
    >
      <Brand size={17} />
    </span>
  );
};
const Avatar = ({
  lead,
  small = false,
  channel,
  altName,
}: {
  lead: CanonicalLead;
  small?: boolean;
  channel?: string;
  altName?: string;
}) => (
  <span className="af-avatar-wrap">
    <img
      src={`https://i.pravatar.cc/150?u=${lead.id}`}
      alt={altName ?? lead.name}
      className={`af-avatar ${small ? "af-avatar-small" : ""}`}
      style={{ objectFit: "cover" }}
    />
    {channel && (
      <span className="af-avatar-badge">
        <ChannelMark channel={channel} />
      </span>
    )}
  </span>
);
const StateBadge = ({ state }: { state: FollowUpLifecycleState }) => {
  const group =
    state === "NEW"
      ? "new"
      : ["CONTACTED", "CONVERSING", "QUALIFYING", "QUALIFIED"].includes(state)
        ? "interested"
        : ["BOOKING_OFFERED", "BOOKED", "PRE_MEETING_REMINDER"].includes(state)
          ? "booking"
          : state === "HUMAN_HANDOFF"
            ? "question"
            : stateTone(state);
  const label =
    group === "new"
      ? "New Lead"
      : group === "interested"
        ? "Interested"
        : group === "booking"
          ? "Booking"
          : group === "question"
            ? "Question"
            : stateLabel(state);
  return <span className={`af-state af-state-${group}`}>{label}</span>;
};
const Modal = ({
  title,
  children,
  close,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
}) => (
  <div
    className="af-modal-backdrop"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) close();
    }}
  >
    <div
      className="af-modal"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="af-modal-head">
        <div>
          <h3>{title}</h3>
          <p>Demo workspace · changes stay in local app state</p>
        </div>
        <button className="af-icon-button" onClick={close} aria-label="Close">
          <X size={18} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export const AIFollowUp: React.FC<Props> = ({ notify: notifyParent }) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const leads = useSelector((state: RootState) => state.crm.leads);
  const [tab, setTab] = React.useState<Tab>("Overview");
  const [dateRange, setDateRange] = React.useState("Last 7 days");
  const [conversationChannel, setConversationChannel] = React.useState("All");
  const [channelsOn, setChannelsOn] = React.useState<Record<string, boolean>>({
    instagram: true,
    facebook: true,
    whatsapp: true,
    messenger: true,
    website: true,
  });
  const [workflows, setWorkflows] = React.useState<Workflow[]>(() =>
    readLocal(WORKFLOWS_KEY, defaultWorkflows),
  );
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [modal, setModal] = React.useState("");

  const [assistantEnabled, setAssistantEnabled] = React.useState(true);
  const [engineEnabled, setEngineEnabled] = React.useState(true);
  const [assistantProfile, setAssistantProfile] = React.useState(() =>
    readLocal(ASSISTANT_KEY, {
      name: "GOS Assistant",
      role: "Friendly fitness coach",
      language: "Auto-detect Arabic / English",
      goal: "Appointments",
    }),
  );
  const [newAssistantName, setNewAssistantName] = React.useState(
    assistantProfile.name,
  );
  const [assistantRole, setAssistantRole] = React.useState(
    assistantProfile.role,
  );
  const [assistantStep, setAssistantStep] = React.useState(1);
  const [newWorkflowName, setNewWorkflowName] = React.useState("");
  const [editingWorkflowId, setEditingWorkflowId] = React.useState<
    string | null
  >(null);
  const [assistantGoal, setAssistantGoal] = React.useState(
    assistantProfile.goal,
  );
  const [assistantLanguage, setAssistantLanguage] = React.useState(
    assistantProfile.language,
  );
  const [workflowFrom, setWorkflowFrom] = React.useState("NEW");
  const [workflowTo, setWorkflowTo] = React.useState("CONTACTED");
  const [workflowAction, setWorkflowAction] = React.useState("Email");
  const [workflowActive, setWorkflowActive] = React.useState(false);
  const [workflowWizardStep, setWorkflowWizardStep] = React.useState(1);
  const [sequenceSteps, setSequenceSteps] = React.useState<SequenceStep[]>([
    { id: "draft-1", delay: "1", unit: "hour", action: "Email" },
    { id: "draft-2", delay: "1", unit: "day", action: "WhatsApp" },
  ]);
  const [knowledgeType, setKnowledgeType] = React.useState<
    "url" | "file" | "text"
  >("url");
  const [knowledgeName, setKnowledgeName] = React.useState("");
  const [knowledgeValue, setKnowledgeValue] = React.useState("");
  const [knowledgeFileName, setKnowledgeFileName] = React.useState("");
  const [knowledgeItems, setKnowledgeItems] = React.useState<KnowledgeSource[]>(
    () => readLocal(KNOWLEDGE_KEY, defaultKnowledge),
  );
  const [templates, setTemplates] = React.useState<TemplateItem[]>(() => [
    ...defaultTemplates.filter((item) => item.id !== "custom-template-action"),
    ...readLocal<TemplateItem[]>(TEMPLATES_KEY, []),
    ...defaultTemplates.filter((item) => item.id === "custom-template-action"),
  ]);
  const [templateTitle, setTemplateTitle] = React.useState("");
  const [templateCategory, setTemplateCategory] = React.useState("Follow-up");
  const [templatePrompt, setTemplatePrompt] = React.useState("");
  const [templateVariables, setTemplateVariables] =
    React.useState("{customer_name}");
  const [editingTemplateId, setEditingTemplateId] = React.useState<
    string | null
  >(null);
  const [followUpSettings, setFollowUpSettings] =
    React.useState<FollowUpSettings>(() =>
      readLocal(SETTINGS_KEY, {
        responseDelay: "5 minutes",
        tone: "Friendly and professional",
        maxAttempts: 3,
        autoEscalation: true,
      }),
    );
  const [channelPolicy, setChannelPolicy] = React.useState(
    "Require explicit opt-in",
  );
  const [selectedChannel, setSelectedChannel] = React.useState("whatsapp");
  const [messageText, setMessageText] = React.useState("");
  const [leadFilter, setLeadFilter] = React.useState("All states");
  const timeoutRef = React.useRef<number | undefined>(undefined);
  const selectedLead = leads.find((lead) => lead.id === selectedId) ?? null;
  const tell = (message: string) => {
    notifyParent?.(message);
    showToast.success(message);
  };
  React.useEffect(
    () => () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    },
    [],
  );
  const leadById = (id: string) => leads.find((lead) => lead.id === id);
  const rows = demoConversations
    .map((item) => ({ ...item, lead: leadById(item.leadId) }))
    .filter((item): item is DemoConversation & { lead: CanonicalLead } =>
      Boolean(item.lead),
    );
  const visibleRows = rows.filter((item) => {
    const selectedChannelKey =
      conversationChannel === "Website Chat"
        ? "website"
        : conversationChannel.toLowerCase();
    const channelMatch =
      conversationChannel === "All" || item.channel === selectedChannelKey;
    const stateMatch =
      leadFilter === "All states" ||
      (leadFilter === "Needs attention"
        ? item.lead.followUpState === "HUMAN_HANDOFF" ||
          item.lead.followUpState === "NO_SHOW" ||
          item.lead.followUpState === "STOPPED_INELIGIBLE"
        : item.lead.followUpState !== "STOPPED_INELIGIBLE");
    return channelMatch && stateMatch;
  });
  const needsAttention = leads.filter((lead) =>
    ["HUMAN_HANDOFF", "NO_SHOW", "STOPPED_INELIGIBLE"].includes(
      lead.followUpState,
    ),
  ).length;
  const consentFor = (lead: CanonicalLead, channel: string) =>
    channel === "whatsapp"
      ? lead.hasWhatsAppConsent
      : channel === "email"
        ? lead.hasEmailConsent
        : ["instagram", "facebook", "messenger"].includes(channel)
          ? lead.hasMessagingConsent
          : false;
  const choosePermittedChannel = (lead: CanonicalLead, requested: string) =>
    consentFor(lead, requested)
      ? requested
      : lead.hasEmailConsent
        ? "email"
        : lead.hasWhatsAppConsent
          ? "whatsapp"
          : lead.hasMessagingConsent
            ? "instagram"
            : null;
  const recordDemoMessage = (lead: CanonicalLead, requested: string) => {
    if (messageText.trim().toUpperCase() === "STOP") {
      dispatch(
        setLeadConsent({
          id: lead.id,
          consent: {
            hasWhatsAppConsent: false,
            hasMessagingConsent: false,
            hasEmailConsent: false,
          },
        }),
      );
      dispatch(
        setLeadFollowUpState({
          id: lead.id,
          followUpState: "STOPPED_INELIGIBLE",
          detail: "Lead sent STOP; all promotional follow-up is disabled.",
        }),
      );
      tell(`Opt-out recorded for ${lead.name}. Follow-up is stopped.`);
      return false;
    }
    const channel = choosePermittedChannel(lead, requested);
    if (!channel) {
      dispatch(
        setLeadFollowUpState({
          id: lead.id,
          followUpState: "STOPPED_INELIGIBLE",
          detail: `No explicit consent for ${requested}; no message was sent.`,
        }),
      );
      tell(
        `No message sent to ${lead.name}: explicit channel consent is missing.`,
      );
      return false;
    }
    dispatch(
      setLeadFollowUpState({
        id: lead.id,
        followUpState: "CONTACTED",
        detail: `Demo follow-up recorded via ${channel}; consent verified.`,
      }),
    );
    dispatch(
      addLeadActivity({
        leadId: lead.id,
        activity: {
          type: "message",
          title: "Demo follow-up recorded",
          detail: `Consent verified for ${channel}. No external message was sent.`,
        },
      }),
    );
    tell(
      channel === requested
        ? `Consent verified. Demo follow-up recorded via ${channel}.`
        : `Consent verified. Demo follow-up redirected to ${channel}.`,
    );
    return true;
  };
  const runWorkflow = (flow: (typeof workflows)[number]) => {
    if (!flow.active) {
      tell("Activate this workflow before running its demo.");
      return;
    }
    const lead = leads.find((item) => item.followUpState === flow.from);
    if (!lead) {
      tell(
        `No canonical lead is currently in ${stateLabel(flow.from as FollowUpLifecycleState)}.`,
      );
      return;
    }
    if (flow.to === "CONTACTED") {
      setSelectedId(lead.id);
      setMessageText(
        "Following up on your recent interest. Would you like help with next steps?",
      );
      tell(
        `Review consent for ${lead.name} in the lead drawer before recording a demo send.`,
      );
      return;
    }
    dispatch(
      setLeadFollowUpState({
        id: lead.id,
        followUpState: flow.to as FollowUpLifecycleState,
        detail: `Demo workflow “${flow.name}” ran. No external message was sent.`,
      }),
    );
    dispatch(
      addLeadActivity({
        leadId: lead.id,
        activity: {
          type: "system",
          title: `Workflow executed: ${flow.name}`,
          detail: `${stateLabel(flow.from as FollowUpLifecycleState)} → ${stateLabel(flow.to as FollowUpLifecycleState)} · demo only`,
        },
      }),
    );
    tell(
      `${flow.name} updated ${lead.name}'s follow-up lifecycle in demo state.`,
    );
  };
  const addWorkflow = () => {
    if (!newWorkflowName.trim()) return;
    if (modal === "edit-workflow") {
      const next = workflows.map((item) =>
        item.id === editingWorkflowId
          ? {
              ...item,
              name: newWorkflowName.trim(),
              from: workflowFrom,
              to: workflowTo,
              actionType: workflowAction,
              active: workflowActive,
              sequenceSteps,
            }
          : item,
      );
      setWorkflows(next);
      writeLocal(WORKFLOWS_KEY, next);
      setNewWorkflowName("");
      setEditingWorkflowId(null);
      setModal("");
      tell("Automation sequence updated.");
      return;
    }
    const isSequence = modal === "new-sequence";
    const next: Workflow[] = [
      ...workflows,
      {
        id: `custom-${Date.now()}`,
        name: newWorkflowName.trim(),
        description: isSequence
          ? `${sequenceSteps.length}-step follow-up sequence · ${sequenceSteps.map((step) => `${step.action} after ${step.delay} ${step.unit}`).join(" · ")}`
          : `${workflowAction} action · ${stateLabel(workflowFrom as FollowUpLifecycleState)} trigger`,
        trigger: "0 triggered",
        active: workflowActive,
        from: workflowFrom,
        to: workflowTo,
        actionType: isSequence
          ? (sequenceSteps[0]?.action ?? workflowAction)
          : workflowAction,
        sequenceSteps: isSequence
          ? sequenceSteps
          : [
              {
                id: `step-${Date.now()}`,
                delay: "0",
                unit: "immediately",
                action: workflowAction,
              },
            ],
      },
    ];
    setWorkflows(next);
    writeLocal(WORKFLOWS_KEY, next);
    setNewWorkflowName("");
    setModal("");
    tell("Automation sequence created as a draft.");
  };
  const saveKnowledgeSource = () => {
    const label =
      knowledgeName.trim() ||
      (knowledgeType === "file"
        ? knowledgeFileName
        : knowledgeType === "url"
          ? knowledgeValue.trim()
          : "Text snippet");
    if (
      !label ||
      (knowledgeType === "file" && !knowledgeFileName) ||
      (knowledgeType !== "file" && !knowledgeValue.trim())
    ) {
      tell("Add a source name and source content before saving.");
      return;
    }
    const detail =
      knowledgeType === "url"
        ? `URL · ${knowledgeValue.trim()}`
        : knowledgeType === "file"
          ? `Uploaded file · ${knowledgeFileName}`
          : `Text snippet · ${knowledgeValue.trim().slice(0, 90)}${knowledgeValue.trim().length > 90 ? "…" : ""}`;
    const next = [
      ...knowledgeItems,
      {
        id: `source-${Date.now()}`,
        name: label,
        type: knowledgeType,
        detail,
        content:
          knowledgeType === "file" ? knowledgeFileName : knowledgeValue.trim(),
      } satisfies KnowledgeSource,
    ];
    setKnowledgeItems(next);
    writeLocal(KNOWLEDGE_KEY, next);
    setKnowledgeName("");
    setKnowledgeValue("");
    setKnowledgeFileName("");
    setModal("");
    tell(`${label} added to Knowledge Base.`);
  };
  const saveTemplate = () => {
    if (!templateTitle.trim() || !templatePrompt.trim()) {
      tell("Add a template title and prompt instructions before saving.");
      return;
    }
    const item: TemplateItem = {
      id: editingTemplateId ?? `template-${Date.now()}`,
      title: templateTitle.trim(),
      description: templatePrompt.trim().replace(/\s+/g, " ").slice(0, 68),
      iconKey: "book",
      custom: true,
      category: templateCategory,
      prompt: templatePrompt.trim(),
      variables: templateVariables.trim(),
    };
    const next = editingTemplateId
      ? templates.map((template) =>
          template.id === editingTemplateId ? item : template,
        )
      : [
          ...templates.filter(
            (template) => template.id !== "custom-template-action",
          ),
          item,
          ...defaultTemplates.filter(
            (template) => template.id === "custom-template-action",
          ),
        ];
    setTemplates(next);
    writeLocal(
      TEMPLATES_KEY,
      next.filter((template) => template.custom),
    );
    setEditingTemplateId(null);
    setTemplateTitle("");
    setTemplatePrompt("");
    setTemplateVariables("{customer_name}");
    setModal("");
    tell(`Template “${item.title}” saved.`);
  };
  const deleteTemplate = (id: string) => {
    const next = templates.filter((template) => template.id !== id);
    setTemplates(next);
    writeLocal(
      TEMPLATES_KEY,
      next.filter((template) => template.custom),
    );
    tell("Custom template deleted.");
  };
  const saveSettings = () => {
    writeLocal(SETTINGS_KEY, followUpSettings);
    tell("Follow-up settings saved on this device.");
  };
  const saveAssistant = () => {
    if (!newAssistantName.trim() || !assistantRole.trim()) {
      tell("Enter an assistant name and role to continue.");
      return;
    }
    const next = {
      name: newAssistantName.trim(),
      role: assistantRole.trim(),
      language: assistantLanguage,
      goal: assistantGoal,
    };
    setAssistantProfile(next);
    writeLocal(ASSISTANT_KEY, next);
    setAssistantEnabled(true);
    setAssistantStep(1);
    setModal("");
    tell(`${next.name} is active and saved on this device.`);
  };
  const openTemplateEditor = (item?: TemplateItem) => {
    setEditingTemplateId(item?.custom ? item.id : null);
    setTemplateTitle(
      item?.id === "custom-template-action" ? "" : (item?.title ?? ""),
    );
    setTemplateCategory(item?.category ?? "Follow-up");
    setTemplatePrompt(item?.prompt ?? item?.description ?? "");
    setTemplateVariables(item?.variables ?? "{customer_name}");
    setModal("template");
  };
  const openWorkflowEditor = (
    flow?: Workflow,
    nextModal:
      | "new-workflow"
      | "new-sequence"
      | "edit-workflow" = "new-workflow",
  ) => {
    setEditingWorkflowId(flow?.id ?? null);
    setNewWorkflowName(flow?.name ?? "");
    setWorkflowFrom(flow?.from ?? "NEW");
    setWorkflowTo(flow?.to ?? "CONTACTED");
    setWorkflowAction(flow?.actionType ?? "Email");
    setWorkflowActive(flow?.active ?? false);
    setWorkflowWizardStep(1);
    setSequenceSteps(
      flow?.sequenceSteps?.length
        ? flow.sequenceSteps
        : nextModal === "new-sequence"
          ? [
              {
                id: `step-${Date.now()}`,
                delay: "1",
                unit: "hour",
                action: "Email",
              },
              {
                id: `step-${Date.now()}-2`,
                delay: "1",
                unit: "day",
                action: "WhatsApp",
              },
            ]
          : [
              {
                id: `step-${Date.now()}`,
                delay: "1",
                unit: "hour",
                action: "Email",
              },
            ],
    );
    setModal(nextModal);
  };

  const renderChannelCards = () => (
    <div className="af-channel-grid">
      {channels.map((channel) => {
        const Icon = channel.icon;
        const active = channelsOn[channel.id];
        return (
          <article className="af-channel-card" key={channel.id}>
            <span className={`af-channel-badge af-brand-${channel.id}`}>
              <Icon size={channel.id === "facebook" ? 30 : 23} />
            </span>
            <div className="af-channel-main">
              <div className="af-channel-title">
                <b>{channel.name}</b>
                <button
                  className={`af-switch ${active ? "on" : ""}`}
                  aria-label={`${active ? "Disconnect" : "Connect"} ${channel.name}`}
                  onClick={() => {
                    setChannelsOn((s) => ({
                      ...s,
                      [channel.id]: !s[channel.id],
                    }));
                    tell(
                      `${channel.name} ${active ? "paused" : "connected"} in demo settings.`,
                    );
                  }}
                >
                  <i />
                </button>
              </div>
              <span
                className={`af-connected ${active ? "" : "af-disconnected"}`}
              >
                {active ? (
                  <>
                    <b aria-hidden="true">✓</b>Connected
                  </>
                ) : (
                  <>
                    <i />
                    Paused
                  </>
                )}
              </span>
              <small>{channel.conversations}</small>
              <button
                className="af-link"
                onClick={() => {
                  setSelectedChannel(channel.id);
                  setModal("channel");
                }}
              >
                Settings <ArrowRight size={12} />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
  const renderKpis = () => (
    <div className="af-kpis">
      {[
        {
          label: "Total Conversations",
          value: "3,471",
          delta: "+42%",
          icon: MessageSquare,
          tone: "violet",
        },
        {
          label: "New Leads",
          value: "892",
          delta: "+35%",
          icon: Users,
          tone: "pink",
        },
        {
          label: "Appointments Booked",
          value: "173",
          delta: "+28%",
          icon: CalendarDays,
          tone: "mint",
        },
        {
          label: "Sales Generated",
          value: "€12,430",
          delta: "+52%",
          icon: CreditCard,
          tone: "purple",
        },
        {
          label: "Response Time",
          value: "8s",
          delta: "-60%",
          icon: Zap,
          tone: "orange",
        },
      ].map((kpi) => (
        <div className="af-kpi" key={kpi.label}>
          <span className={`af-kpi-icon af-tone-${kpi.tone}`}>
            <kpi.icon size={18} />
          </span>
          <div>
            <span>{kpi.label}</span>
            <b>{kpi.value}</b>
            <small>
              <ArrowUpRight size={12} />
              {kpi.delta}
              <i> vs. last 7 days</i>
            </small>
          </div>
        </div>
      ))}
    </div>
  );
  const renderConversationFeed = () => (
    <section className="af-panel af-feed-panel flex flex-col flex-1 min-h-0 h-full">
      <div className="af-panel-heading flex-none">
        <div>
          <h2>Recent Conversations</h2>
        </div>
        <button
          className="af-text-action"
          onClick={() => setTab("Conversations")}
        >
          View all <ArrowRight size={13} />
        </button>
      </div>
      {leadFilter === "Needs attention" && (
        <div className="af-filter-notice">
          <Activity size={12} />
          {needsAttention} CRM records need human attention
          <button onClick={() => setLeadFilter("All states")}>Clear</button>
        </div>
      )}
      <div
        className="af-channel-filters flex-none"
        role="group"
        aria-label="Filter conversations by channel"
      >
        {[
          { value: "All", label: "All (12)" },
          { value: "Instagram", label: "Instagram", channel: "instagram" },
          { value: "Facebook", label: "Facebook", channel: "facebook" },
          { value: "WhatsApp", label: "WhatsApp", channel: "whatsapp" },
          { value: "Messenger", label: "Messenger", channel: "messenger" },
          { value: "Website Chat", label: "Website Chat", channel: "website" },
        ].map((item) => (
          <button
            type="button"
            className={
              item.value === "All"
                ? `af-channel-filter-all ${conversationChannel === item.value ? "active" : ""}`
                : `af-channel-filter-button ${conversationChannel === item.value ? "active" : ""}`
            }
            key={item.value}
            title={item.label}
            aria-label={`Show ${item.label} conversations`}
            aria-pressed={conversationChannel === item.value}
            onClick={() => setConversationChannel(item.value)}
          >
            {item.value === "All" ? (
              <>
                <Inbox size={14} />
                <span>{item.label}</span>
              </>
            ) : (
              <ChannelMark channel={item.channel!} />
            )}
          </button>
        ))}
      </div>
      <div className="af-feed-list flex-1 min-h-0 overflow-y-auto">
        {visibleRows.slice(0, 8).map((item) => (
          <button
            className="af-conversation-row"
            key={item.lead.id}
            onClick={() => setSelectedId(item.lead.id)}
          >
            <Avatar
              lead={item.lead}
              channel={item.channel}
              altName={item.displayName}
            />
            <div className="af-conversation-copy">
              <b className="af-conversation-name">{item.displayName}</b>
              <p>{item.excerpt}</p>
            </div>
            <div className="af-conversation-side">
              <time>{item.time}</time>
              <StateBadge state={item.state} />
            </div>
          </button>
        ))}
        {visibleRows.length === 0 && (
          <div className="af-empty">
            <Search size={18} />
            <b>No conversations found</b>
            <span>Try another channel or state filter.</span>
          </div>
        )}
      </div>
    </section>
  );
  const renderAssistant = () => (
    <section className="af-panel af-assistant-panel flex flex-col flex-1 min-h-0 h-full">
      <div className="af-panel-heading af-assistant-heading flex-none">
        <div>
          <h2>
            <span className="af-section-heading-icon">
              <Bot size={15} />
            </span>
            AI Assistant Setup
          </h2>
        </div>
        <div className="af-assistant-status">
          <span className={assistantEnabled ? "active" : "paused"}>
            {assistantEnabled ? "Active" : "Paused"}
          </span>
          <button
            className={`af-switch ${assistantEnabled ? "on af-green-switch" : ""}`}
            aria-label={
              assistantEnabled
                ? "Pause GOS Assistant"
                : "Activate GOS Assistant"
            }
            onClick={() => {
              setAssistantEnabled(!assistantEnabled);
              tell(
                `GOS Assistant ${assistantEnabled ? "paused" : "activated"}.`,
              );
            }}
          >
            <i />
          </button>
        </div>
      </div>
      <div className="af-assistant-knowledge-row flex-1 min-h-0 overflow-y-auto">
        <div className="af-assistant-card">
          <div className="af-assistant-profile">
            <div className="af-bot-avatar">
              <AssistantRobot />
              <i />
            </div>
            <div>
              <b>{assistantProfile.name}</b>
              <span>
                {assistantEnabled
                  ? `${assistantProfile.role} · ready to help conversations, answer questions, book appointments, and follow up with leads.`
                  : "Assistant is paused"}
              </span>
            </div>
          </div>
          <div className="af-assistant-actions">
            <button
              className="af-button-primary"
              onClick={() => setModal("test")}
            >
              <Sparkles size={13} /> Test AI Assistant
            </button>
            <button
              className="af-button-secondary"
              onClick={() => {
                setNewAssistantName(assistantProfile.name);
                setAssistantRole(assistantProfile.role);
                setAssistantLanguage(assistantProfile.language);
                setAssistantGoal(assistantProfile.goal);
                setAssistantStep(2);
                setModal("edit-assistant");
              }}
            >
              <Pencil size={13} /> Edit Assistant
            </button>
          </div>
          <div className="af-assistant-config">
            <div>
              <span className="af-attribute-icon bg-purple-50 text-purple-600">
                <Users size={15} />
              </span>
              <span className="af-attribute-copy">
                <b>Personality</b>
                <small>{assistantProfile.role}</small>
              </span>
            </div>
            <div>
              <span className="af-attribute-icon bg-sky-50 text-sky-600">
                <Globe2 size={15} />
              </span>
              <span className="af-attribute-copy">
                <b>Language</b>
                <small>{assistantLanguage}</small>
              </span>
            </div>
            <div>
              <span className="af-attribute-icon bg-fuchsia-50 text-fuchsia-600">
                <Target size={15} />
              </span>
              <span className="af-attribute-copy">
                <b>Goal</b>
                <small>
                  {assistantGoal === "Appointments"
                    ? "Book appointments & convert leads"
                    : assistantGoal}
                </small>
              </span>
            </div>
          </div>
        </div>
        <div className="af-knowledge-compact border border-slate-100">
          <div className="af-knowledge-head">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <b>Knowledge Base</b>
              <small>{knowledgeItems.length} sources</small>
            </div>
          </div>
          <div className="af-knowledge-compact-list">
            {knowledgeItems.slice(0, 5).map((item) => {
              const SourceIcon = knowledgeIconFor(item.type);
              return (
                <div className="af-knowledge-item" key={item.id}>
                  <span className="af-knowledge-check">
                    <SourceIcon size={10} strokeWidth={2.5} />
                  </span>
                  <b>{item.name}</b>
                </div>
              );
            })}
          </div>
          <button
            className="af-knowledge-manage"
            onClick={() => setTab("Knowledge")}
          >
            Manage Knowledge <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </section>
  );
  // @ts-ignore
  const renderWorkflows = () => (
    <section className="af-panel af-workflows-panel">
      <div className="af-panel-heading">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Automation Workflows
          </h3>
        </div>
        <button
          className="af-text-action"
          onClick={() => setTab("Automations")}
        >
          View all <ArrowRight size={13} />
        </button>
      </div>
      <div className="af-workflow-list">
        {workflows.map((flow) => {
          const FlowIcon = workflowIconFor(flow.actionType);
          return (
            <div className="af-workflow-row" key={flow.id}>
              <span className="af-workflow-icon">
                <FlowIcon size={15} />
              </span>
              <div>
                <b>{flow.name}</b>
                <small>{flow.description}</small>
              </div>
              <span
                className={`af-trigger-count ${flow.active ? "" : "inactive"}`}
              >
                {flow.trigger}
              </span>
              <button
                className={`af-switch ${flow.active ? "on" : ""}`}
                aria-label={`${flow.active ? "Pause" : "Activate"} ${flow.name}`}
                onClick={() => {
                  const next = workflows.map((item) =>
                    item.id === flow.id
                      ? { ...item, active: !item.active }
                      : item,
                  );
                  setWorkflows(next);
                  writeLocal(WORKFLOWS_KEY, next);
                }}
              >
                <i />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
  const renderAnalytics = () => (
    <section className="af-panel af-performance-panel flex flex-col flex-1 min-h-0 h-full">
      <div className="af-panel-heading flex-none">
        <h2>AI Performance</h2>
        <button
          className="af-select-button"
          onClick={() =>
            setDateRange(
              dateRange === "Last 7 days" ? "Last 30 days" : "Last 7 days",
            )
          }
        >
          {dateRange}
          <ChevronDown size={13} />
        </button>
      </div>
      <div className="af-performance-rows flex-1 min-h-0 overflow-y-auto">
        {[
          {
            label: "Conversations Handled",
            value: "3,471",
            change: "42%",
            icon: ScanText,
          },
          {
            label: "Leads Generated",
            value: "892",
            change: "35%",
            icon: HandCoins,
          },
          {
            label: "Appointments Booked",
            value: "173",
            change: "28%",
            icon: Calendar,
          },
          {
            label: "Sales Generated",
            value: "€12,430",
            change: "52%",
            icon: Calendar,
          },
          {
            label: "Customer Satisfaction",
            value: "4.8/5",
            change: "12%",
            icon: Star,
          },
        ].map((metric) => (
          <div className="af-performance-metric" key={metric.label}>
            <metric.icon
              className="af-performance-icon"
              size={15}
              strokeWidth={1.8}
            />
            <span>{metric.label}</span>
            <b>{metric.value}</b>
            <small className="af-trend-pill">↑ {metric.change}</small>
          </div>
        ))}
      </div>
      <div className="af-perf-chart flex-1 min-h-0 w-full relative">
        <div className="af-perf-chart-y">
          {["600", "400", "200", "0"].map((label, index) => (
            <span key={label} style={{ top: `${(index / 3) * 100}%` }}>
              {label}
            </span>
          ))}
        </div>
        <div className="af-perf-chart-plot">
          <svg
            viewBox="0 0 600 120"
            preserveAspectRatio="none"
            role="img"
            aria-label="AI conversations handled over time"
          >
            <defs>
              <linearGradient id="af-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#7c6cf0" stopOpacity=".22" />
                <stop offset="1" stopColor="#7c6cf0" stopOpacity=".02" />
              </linearGradient>
            </defs>
            {[0, 40, 80, 120].map((y) => (
              <line
                key={`h${y}`}
                x1="0"
                x2="600"
                y1={y}
                y2={y}
                stroke="#eef0f5"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {[0, 100, 200, 300, 400, 500, 600].map((x) => (
              <line
                key={`v${x}`}
                x1={x}
                x2={x}
                y1="0"
                y2="120"
                stroke="#eef0f5"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path
              d="M0 76 L100 64 L200 76 L300 52 L400 41 L500 62 L600 32 L600 120 L0 120Z"
              fill="url(#af-fill)"
            />
            <path
              d="M0 76 L100 64 L200 76 L300 52 L400 41 L500 62 L600 32"
              fill="none"
              stroke="#6d5ce8"
              strokeWidth="2"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <span
            className="af-perf-chart-dot"
            style={{
              left: `${(400 / 600) * 100}%`,
              top: `${(41 / 120) * 100}%`,
            }}
          />
          <div
            className="af-perf-chart-tooltip"
            style={{
              left: `${(400 / 600) * 100}%`,
              top: `${(41 / 120) * 100}%`,
            }}
          >
            <b>423 conversations</b>
            <span>Oct 24</span>
          </div>
        </div>
        <div className="af-perf-chart-x">
          {[
            "Oct 20",
            "Oct 21",
            "Oct 22",
            "Oct 23",
            "Oct 24",
            "Oct 25",
            "Oct 26",
          ].map((label, index) => (
            <span key={label} style={{ left: `${(index / 6) * 100}%` }}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
  // @ts-ignore
  const renderTemplates = () => (
    <section className="af-panel af-templates-panel">
      <div className="af-panel-heading">
        <h2>AI Templates</h2>
        <button className="af-text-action" onClick={() => setTab("Templates")}>
          View All <ArrowRight size={13} />
        </button>
      </div>
      <div className="af-template-grid">
        {templates.map((item) => {
          const Icon = templateIconFor(item.iconKey);
          return (
            <button
              key={item.id}
              className="af-template-card"
              onClick={() =>
                item.id === "custom-template-action"
                  ? openTemplateEditor()
                  : openTemplateEditor(item)
              }
            >
              <span className="af-template-icon">
                <Icon size={14} strokeWidth={2} />
              </span>
              <b>{item.title}</b>
              <small>{item.description}</small>
            </button>
          );
        })}
      </div>
    </section>
  );

  const renderOverview = () => (
    <div className="af-overview-grid flex-1 min-h-0 h-full">
      <div className="af-column af-column-feed flex-1 min-h-0 flex flex-col h-full">{renderConversationFeed()}</div>
      <div className="af-column af-column-assistant flex-1 min-h-0 flex flex-col h-full">
        {renderAssistant()}
      </div>
      <div className="af-column af-column-insights flex-1 min-h-0 flex flex-col h-full">
        {renderAnalytics()}
      </div>
    </div>
  );
  const renderConversationTab = () => (
    <section className="af-panel af-full-panel">
      <div className="af-panel-heading">
        <div>
          <h2>Conversations</h2>
          <p>Messages are shown from mock logs linked to canonical leads.</p>
        </div>
        <div className="af-inline-controls">
          <MenuSelect
            className="af-inline-select"
            value={leadFilter}
            onChange={setLeadFilter}
            options={[
              { value: "All states", label: "All states" },
              {
                value: "Needs attention",
                label: `Needs attention · ${needsAttention}`,
              },
              { value: "Automated", label: "Automated" },
            ]}
          />
          <button
            className="af-button-secondary"
            onClick={() => openWorkflowEditor(undefined, "new-sequence")}
          >
            <Plus size={14} /> New sequence
          </button>
        </div>
      </div>
      {renderConversationFeed()}
    </section>
  );
  const renderKnowledgeTab = () => (
    <section className="af-panel af-full-panel">
      <div className="af-panel-heading">
        <div>
          <h2>
            Knowledge Base{" "}
            <span className="af-count-badge">
              {knowledgeItems.length} sources
            </span>
          </h2>
          <p>
            Sources available to the assistant; add a URL, file, or text
            snippet.
          </p>
        </div>
        <button
          className="af-button-primary"
          onClick={() => {
            setKnowledgeType("url");
            setKnowledgeName("");
            setKnowledgeValue("");
            setKnowledgeFileName("");
            setModal("knowledge-source");
          }}
        >
          <Plus size={14} /> Add source
        </button>
      </div>
      <div className="af-knowledge-grid">
        {knowledgeItems.map((item) => {
          const Icon = knowledgeIconFor(item.type);
          return (
            <div key={item.id}>
              <span className="af-template-icon af-tone-violet">
                <Icon size={16} />
              </span>
              <span>
                <b>{item.name}</b>
                <small>{item.detail}</small>
              </span>
              <button
                className="af-icon-button"
                title="Remove source"
                onClick={() => {
                  const next = knowledgeItems.filter(
                    (source) => source.id !== item.id,
                  );
                  setKnowledgeItems(next);
                  writeLocal(KNOWLEDGE_KEY, next);
                  tell(`${item.name} removed from Knowledge Base.`);
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
  const renderTemplatesTab = () => (
    <section className="af-panel af-full-panel">
      <div className="af-panel-heading">
        <div>
          <h2>Response Templates</h2>
          <p>
            Create and maintain prompts for consistent, consent-aware responses.
          </p>
        </div>
        <button
          className="af-button-primary"
          onClick={() => openTemplateEditor()}
        >
          <Plus size={14} /> Custom template
        </button>
      </div>
      <div className="af-template-grid af-template-grid-large">
        {templates.map((item) => {
          const Icon = templateIconFor(item.iconKey);
          return (
            <article
              key={item.id}
              className="af-template-card af-template-card-live"
            >
              <button
                type="button"
                className="af-template-card-open"
                onClick={() =>
                  item.id === "custom-template-action"
                    ? openTemplateEditor()
                    : openTemplateEditor(item)
                }
              >
                <span className="af-template-icon af-tone-violet">
                  <Icon size={16} strokeWidth={2.4} />
                </span>
                <b>{item.title}</b>
                <small>{item.description}</small>
                <span className="af-link">
                  {item.custom
                    ? "Edit template"
                    : item.id === "custom-template-action"
                      ? "Create your own"
                      : "Configure"}{" "}
                  <ArrowRight size={12} />
                </span>
              </button>
              {item.custom && (
                <div className="af-template-actions">
                  <button
                    className="af-icon-button"
                    title="Edit template"
                    onClick={() => openTemplateEditor(item)}
                  >
                    <PencilLine size={14} />
                  </button>
                  <button
                    className="af-icon-button"
                    title="Delete template"
                    onClick={() => deleteTemplate(item.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
  const renderAutomationTab = () => (
    <section className="af-panel af-full-panel">
      <div className="af-panel-heading">
        <div>
          <h2>Automation Workflows</h2>
          <p>
            Create trigger-based rules or multi-step follow-up sequences. All
            messaging remains consent checked.
          </p>
        </div>
        <div className="af-inline-controls">
          <button
            className="af-button-secondary"
            onClick={() => openWorkflowEditor(undefined, "new-sequence")}
          >
            <Plus size={14} /> New sequence
          </button>
          <button
            className="af-button-primary"
            onClick={() => openWorkflowEditor()}
          >
            <Plus size={14} /> Create workflow
          </button>
        </div>
      </div>
      <div className="af-automation-table">
        {workflows.map((flow) => {
          const FlowIcon = workflowIconFor(flow.actionType);
          return (
            <div className="af-automation-card" key={flow.id}>
              <span className="af-workflow-icon">
                <FlowIcon size={17} />
              </span>
              <div className="af-automation-main">
                <b>{flow.name}</b>
                <small>{flow.description}</small>
                <span>
                  Trigger: {stateLabel(flow.from as FollowUpLifecycleState)}{" "}
                  <ArrowRight size={12} />{" "}
                  {stateLabel(flow.to as FollowUpLifecycleState)} ·{" "}
                  {flow.sequenceSteps.length} step
                  {flow.sequenceSteps.length === 1 ? "" : "s"}
                </span>
              </div>
              <span
                className={`af-trigger-count ${flow.active ? "" : "inactive"}`}
              >
                {flow.trigger}
              </span>
              <button
                className="af-button-secondary"
                onClick={() => runWorkflow(flow)}
              >
                <Send size={13} /> Run demo
              </button>
              <button
                className={`af-switch ${flow.active ? "on" : ""}`}
                aria-label={`${flow.active ? "Pause" : "Activate"} ${flow.name}`}
                onClick={() => {
                  const next = workflows.map((item) =>
                    item.id === flow.id
                      ? { ...item, active: !item.active }
                      : item,
                  );
                  setWorkflows(next);
                  writeLocal(WORKFLOWS_KEY, next);
                }}
              >
                <i />
              </button>
              <details className="af-action-menu">
                <summary aria-label={`${flow.name} actions`}>
                  <MoreHorizontal size={16} />
                </summary>
                <div>
                  <button
                    onClick={() => openWorkflowEditor(flow, "edit-workflow")}
                  >
                    <PencilLine size={13} /> Edit workflow
                  </button>
                  <button
                    onClick={() => {
                      const next = workflows.filter(
                        (item) => item.id !== flow.id,
                      );
                      setWorkflows(next);
                      writeLocal(WORKFLOWS_KEY, next);
                      tell(`${flow.name} deleted.`);
                    }}
                  >
                    <Trash2 size={13} /> Delete workflow
                  </button>
                </div>
              </details>
            </div>
          );
        })}
      </div>
      <div className="af-safety-note">
        <ShieldCheck size={16} />
        <span>
          <b>Consent guard enabled.</b> WhatsApp and social messages require
          explicit channel consent. Missing permission blocks sends.
        </span>
      </div>
    </section>
  );
  const renderSettingsTab = () => (
    <section className="af-panel af-full-panel">
      <div className="af-panel-heading">
        <div>
          <h2>Follow-Up Settings</h2>
          <p>
            Control the response pace, assistant tone, retry limits, and human
            escalation rules.
          </p>
        </div>
        <button
          className={`af-status-switch ${engineEnabled ? "on" : ""}`}
          onClick={() => {
            setEngineEnabled(!engineEnabled);
            tell(`Follow-up engine ${engineEnabled ? "paused" : "running"}.`);
          }}
        >
          <i />
          {engineEnabled ? "Engine active" : "Engine paused"}
        </button>
      </div>
      <div className="af-settings-grid">
        <article>
          <span>
            <Timer size={17} />
          </span>
          <div>
            <b>Response delay</b>
            <p>Wait before the assistant sends its first response.</p>
            <MenuSelect
              value={followUpSettings.responseDelay}
              onChange={(value) =>
                setFollowUpSettings((current) => ({
                  ...current,
                  responseDelay: value,
                }))
              }
              options={[
                "Immediately",
                "1 minute",
                "5 minutes",
                "15 minutes",
                "1 hour",
              ].map((value) => ({ value, label: value }))}
            />
          </div>
        </article>
        <article>
          <span>
            <Sparkles size={17} />
          </span>
          <div>
            <b>AI tone / personality</b>
            <p>Default voice used across follow-up messages.</p>
            <MenuSelect
              value={followUpSettings.tone}
              onChange={(value) =>
                setFollowUpSettings((current) => ({ ...current, tone: value }))
              }
              options={[
                "Friendly and professional",
                "Warm and encouraging",
                "Concise and direct",
                "Expert and consultative",
              ].map((value) => ({ value, label: value }))}
            />
          </div>
        </article>
        <article>
          <span>
            <Repeat size={17} />
          </span>
          <div>
            <b>Maximum follow-up attempts</b>
            <p>
              Stop the automated sequence after this many unanswered attempts.
            </p>
            <input
              type="number"
              min={1}
              max={12}
              value={followUpSettings.maxAttempts}
              onChange={(event) =>
                setFollowUpSettings((current) => ({
                  ...current,
                  maxAttempts: Math.max(
                    1,
                    Math.min(12, Number(event.target.value) || 1),
                  ),
                }))
              }
            />
          </div>
        </article>
        <article>
          <span>
            <BellRing size={17} />
          </span>
          <div>
            <b>Automatic escalation</b>
            <p>
              Pause AI and request a human when the lead needs personal support.
            </p>
          </div>
          <button
            className={`af-switch ${followUpSettings.autoEscalation ? "on" : ""}`}
            aria-label="Toggle automatic escalation"
            onClick={() =>
              setFollowUpSettings((current) => ({
                ...current,
                autoEscalation: !current.autoEscalation,
              }))
            }
          >
            <i />
          </button>
        </article>
        <article className="af-consent-setting">
          <span>
            <ShieldCheck size={17} />
          </span>
          <div>
            <b>Consent-first messaging</b>
            <p>
              Phone capture never grants WhatsApp or promotional messaging
              consent.
            </p>
          </div>
          <span className="af-safe-label">Always enforced</span>
        </article>
      </div>
      <div className="af-settings-save">
        <span>Changes apply to this browser's demo workspace.</span>
        <button className="af-button-primary" onClick={saveSettings}>
          <Save size={14} /> Save Settings
        </button>
      </div>
    </section>
  );
  const renderOtherTab = () => {
    if (tab === "AI Assistants")
      return (
        <section className="af-panel af-full-panel">
          <div className="af-panel-heading">
            <div>
              <h2>AI Assistants</h2>
              <p>
                Business-specific assistants, configured for your workspace.
              </p>
            </div>
            <button
              className="af-button-primary"
              onClick={() => {
                setAssistantStep(1);
                setNewAssistantName("");
                setAssistantRole("");
                setModal("create-assistant");
              }}
            >
              <Plus size={14} /> Create AI Assistant
            </button>
          </div>
          <div className="af-assistant-wide">
            <div className="af-bot-avatar">
              <Bot size={28} />
              <i />
            </div>
            <div>
              <b>{assistantProfile.name}</b>
              <p>
                {assistantProfile.role} · {assistantProfile.language}
              </p>
              <div className="af-assistant-tags">
                <span>{assistantProfile.goal}</span>
                <span>{assistantEnabled ? "Active" : "Paused"}</span>
                <span>Knowledge base · {knowledgeItems.length} sources</span>
              </div>
            </div>
            <button
              className="af-button-secondary"
              onClick={() => setModal("test")}
            >
              <Sparkles size={14} /> Test assistant
            </button>
            <button
              className="af-button-secondary"
              onClick={() => {
                setNewAssistantName(assistantProfile.name);
                setAssistantRole(assistantProfile.role);
                setAssistantLanguage(assistantProfile.language);
                setAssistantGoal(assistantProfile.goal);
                setAssistantStep(2);
                setModal("edit-assistant");
              }}
            >
              <Settings2 size={14} /> Edit
            </button>
          </div>
        </section>
      );
    if (tab === "Knowledge") return renderKnowledgeTab();
    if (tab === "Templates") return renderTemplatesTab();
    if (tab === "Automations") return renderAutomationTab();
    if (tab === "Settings") return renderSettingsTab();
    if (tab === "Analytics")
      return (
        <div className="af-analytics-page">
          {renderKpis()}
          {renderAnalytics()}
          <div className="af-panel af-performance-detail">
            <h2>Lifecycle outcomes</h2>
            <div className="af-outcome-list">
              {FOLLOW_UP_LIFECYCLE.map((item) => (
                <div key={item.state}>
                  <span>{item.label}</span>
                  <i>
                    <b
                      style={{
                        width: `${Math.min(100, leads.filter((lead) => lead.followUpState === item.state).length * 13 + 3)}%`,
                      }}
                    />
                  </i>
                  <strong>
                    {
                      leads.filter((lead) => lead.followUpState === item.state)
                        .length
                    }
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    return null;
  };

  return (
    <main className="af-page flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="af-page-title">
        <div>
          <h1>
            <Sparkles size={21} /> AI Follow-Up
          </h1>
          <p>
            Conversations, follow up with leads and turn them into customers
          </p>
        </div>
        <button
          className="af-button-primary"
          onClick={() => {
            setAssistantStep(1);
            setNewAssistantName("");
            setAssistantRole("");
            setModal("create-assistant");
          }}
        >
          <Plus size={15} /> Create AI Assistant
        </button>
      </div>
      <div className="af-channel-row">{renderChannelCards()}</div>
      <div className="af-tabs-row">
        <nav className="af-tabs" aria-label="AI Follow-Up sections">
          {tabs.map((item) => {
            const Icon = tabIcons[item];
            return (
              <button
                key={item}
                className={`relative ${tab === item ? "active" : ""}`}
                onClick={() => setTab(item)}
              >
                {tab === item && (
                  <motion.div
                    layoutId="activeAIFollowUpTab"
                    className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#735be6] rounded-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-[6px]">
                  {Icon && <Icon size={16} strokeWidth={1.75} />}
                  {item}
                </span>
              </button>
            );
          })}
        </nav>
        <div className="af-date-filter">
          <CalendarDays size={14} />
          <MenuSelect
            value={dateRange}
            onChange={setDateRange}
            options={["Today", "Last 7 days", "Last 30 days"].map((item) => ({
              value: item,
              label: item,
            }))}
          />
        </div>
      </div>
      {renderKpis()}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "Overview"
            ? renderOverview()
            : tab === "Conversations"
              ? renderConversationTab()
              : renderOtherTab()}
        </motion.div>
      </AnimatePresence>
      {selectedLead && (
        <div
          className="af-drawer-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedId(null);
          }}
        >
          <aside className="af-lead-drawer">
            <div className="af-drawer-head">
              <div>
                <span className="af-eyebrow">CANONICAL CRM RECORD</span>
                <h2>Follow-up details</h2>
              </div>
              <button
                className="af-icon-button"
                onClick={() => setSelectedId(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="af-lead-profile">
              <Avatar lead={selectedLead} />
              <div>
                <b>{selectedLead.name}</b>
                <span>
                  {selectedLead.company} · {selectedLead.email}
                </span>
                <small>Lead ID · {selectedLead.id}</small>
              </div>
            </div>
            <div className="af-drawer-status">
              <span>Lifecycle state</span>
              <MenuSelect
                className="af-drawer-select"
                value={selectedLead.followUpState}
                onChange={(value) =>
                  dispatch(
                    setLeadFollowUpState({
                      id: selectedLead.id,
                      followUpState: value as FollowUpLifecycleState,
                    }),
                  )
                }
                options={FOLLOW_UP_LIFECYCLE.map((item) => ({
                  value: item.state,
                  label: item.label,
                }))}
              />
            </div>
            <h3>Explicit channel consent</h3>
            <p className="af-drawer-note">
              Phone number capture is not messaging permission. Toggle only when
              consent has been recorded.
            </p>
            {(
              [
                {
                  key: "hasWhatsAppConsent",
                  label: "WhatsApp promotional messages",
                },
                {
                  key: "hasMessagingConsent",
                  label: "Instagram / Facebook / Messenger",
                },
                { key: "hasEmailConsent", label: "Email follow-up" },
              ] as const
            ).map((item) => (
              <label className="af-consent-row" key={item.key}>
                <span>
                  <b>{item.label}</b>
                  <small>
                    {selectedLead[item.key]
                      ? "Consent recorded"
                      : "No consent recorded"}
                  </small>
                </span>
                <button
                  className={`af-switch ${selectedLead[item.key] ? "on" : ""}`}
                  onClick={() =>
                    dispatch(
                      setLeadConsent({
                        id: selectedLead.id,
                        consent: { [item.key]: !selectedLead[item.key] },
                      }),
                    )
                  }
                  aria-label={`Toggle ${item.label}`}
                >
                  <i />
                </button>
              </label>
            ))}
            <div className="af-message-demo">
              <label>Demo message</label>
              <textarea
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder="Write a consent-checked follow-up..."
              />
              <MenuSelect
                className="af-channel-select"
                value={selectedChannel}
                onChange={setSelectedChannel}
                options={[
                  {
                    value: "whatsapp",
                    label: (
                      <>
                        <WhatsAppBrand size={16} /> WhatsApp
                      </>
                    ),
                  },
                  {
                    value: "instagram",
                    label: (
                      <>
                        <InstagramBrand size={16} /> Instagram
                      </>
                    ),
                  },
                  {
                    value: "messenger",
                    label: (
                      <>
                        <MessengerBrand size={16} /> Messenger
                      </>
                    ),
                  },
                  {
                    value: "email",
                    label: (
                      <>
                        <Mail size={15} /> Email
                      </>
                    ),
                  },
                ]}
              />
              <button
                className="af-button-primary"
                onClick={() => {
                  if (messageText.trim()) {
                    recordDemoMessage(selectedLead, selectedChannel);
                    setMessageText("");
                  } else tell("Write a message before recording a demo send.");
                }}
              >
                <Send size={14} /> Check consent &amp; record demo
              </button>
              <small>
                Demo only: no message is delivered to an external channel.
              </small>
            </div>
            <div className="af-lead-activity">
              <h3>Recent CRM activity</h3>
              {selectedLead.activities.slice(0, 5).map((activity) => (
                <div key={activity.id}>
                  <i />
                  <span>
                    <b>{activity.title}</b>
                    <small>
                      {activity.detail} · {activity.at}
                    </small>
                  </span>
                </div>
              ))}
            </div>
            <button
              className="af-button-secondary af-open-crm"
              onClick={() =>
                navigate(
                  `/dashboard/crm?leadId=${encodeURIComponent(selectedLead.id)}`,
                )
              }
            >
              Open canonical record <ArrowRight size={14} />
            </button>
          </aside>
        </div>
      )}
      {modal && (
        <Modal
          title={
            modal === "create-assistant"
              ? "Create AI Assistant"
              : modal === "edit-assistant"
                ? "Edit AI Assistant"
                : modal === "test"
                  ? "Test AI Assistant"
                  : modal === "new-sequence"
                    ? "Build Follow-Up Sequence"
                    : modal === "new-workflow"
                      ? "Create Workflow"
                      : modal === "edit-workflow"
                        ? "Edit Workflow"
                        : modal === "knowledge-source"
                          ? "Add Knowledge Source"
                          : modal === "template"
                            ? editingTemplateId
                              ? "Edit Prompt Template"
                              : "Create Prompt Template"
                            : modal === "channel"
                              ? `${channels.find((channel) => channel.id === selectedChannel)?.name ?? "Channel"} settings`
                              : "Assistant settings"
          }
          close={() => setModal("")}
        >
          {(modal === "create-assistant" || modal === "edit-assistant") && (
            <div className="af-modal-form">
              {modal === "create-assistant" && (
                <div className="af-wizard-progress">
                  <span className={assistantStep >= 1 ? "active" : ""}>
                    1 · Profile
                  </span>
                  <i />
                  <span className={assistantStep >= 2 ? "active" : ""}>
                    2 · Configure
                  </span>
                </div>
              )}
              {modal === "edit-assistant" || assistantStep === 1 ? (
                <>
                  <label>
                    Assistant name
                    <input
                      value={newAssistantName}
                      onChange={(event) =>
                        setNewAssistantName(event.target.value)
                      }
                      placeholder="e.g. GOS Fitness Coach"
                    />
                  </label>
                  <label>
                    Role / persona
                    <input
                      value={assistantRole}
                      onChange={(event) => setAssistantRole(event.target.value)}
                      placeholder="e.g. Friendly fitness coach"
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Language
                    <MenuSelect
                      value={assistantLanguage}
                      onChange={setAssistantLanguage}
                      options={[
                        "Auto-detect Arabic / English",
                        "English",
                        "Arabic",
                      ].map((item) => ({ value: item, label: item }))}
                    />
                  </label>
                  <label>
                    Primary goal
                    <MenuSelect
                      value={assistantGoal}
                      onChange={setAssistantGoal}
                      options={[
                        "Appointments",
                        "Lead qualification",
                        "Product support",
                        "Customer retention",
                      ].map((item) => ({ value: item, label: item }))}
                    />
                  </label>
                  <div className="af-safety-note">
                    <ShieldCheck size={16} />
                    <span>
                      The assistant uses your {knowledgeItems.length} configured
                      knowledge sources and respects each lead's messaging
                      consent.
                    </span>
                  </div>
                </>
              )}
              <div className="af-modal-actions">
                {modal === "create-assistant" && assistantStep === 2 && (
                  <button
                    className="af-button-secondary"
                    onClick={() => setAssistantStep(1)}
                  >
                    Back
                  </button>
                )}
                {modal === "create-assistant" && assistantStep === 1 ? (
                  <button
                    className="af-button-primary"
                    disabled={!newAssistantName.trim() || !assistantRole.trim()}
                    onClick={() => setAssistantStep(2)}
                  >
                    Continue <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    className="af-button-primary"
                    disabled={!newAssistantName.trim() || !assistantRole.trim()}
                    onClick={saveAssistant}
                  >
                    {modal === "edit-assistant"
                      ? "Save changes"
                      : "Create active assistant"}
                  </button>
                )}
              </div>
            </div>
          )}
          {modal === "test" && (
            <div className="af-modal-form">
              <div className="af-test-preview">
                <span className="af-bot-avatar">
                  <Bot size={23} />
                </span>
                <div>
                  <b>{assistantProfile.name} is ready</b>
                  <p>
                    Test a sample question against the configured demo knowledge
                    base.
                  </p>
                </div>
              </div>
              <label>
                Ask a test question
                <input placeholder="What services do you offer?" />
              </label>
              <button
                className="af-button-primary"
                onClick={() => {
                  setModal("");
                  tell(
                    `Demo response from ${assistantProfile.name}: I can help with the services listed in the connected knowledge base.`,
                  );
                }}
              >
                Run test
              </button>
            </div>
          )}
          {(modal === "new-sequence" ||
            modal === "new-workflow" ||
            modal === "edit-workflow") && (
            <div className="af-modal-form">
              {modal === "new-workflow" && (
                <div className="af-wizard-progress">
                  <span className={workflowWizardStep >= 1 ? "active" : ""}>
                    1 · Trigger
                  </span>
                  <i />
                  <span className={workflowWizardStep >= 2 ? "active" : ""}>
                    2 · Actions
                  </span>
                </div>
              )}
              {(modal !== "new-workflow" || workflowWizardStep === 1) && (
                <>
                  <label>
                    {modal === "new-sequence"
                      ? "Sequence name"
                      : "Workflow name"}
                    <input
                      value={newWorkflowName}
                      onChange={(event) =>
                        setNewWorkflowName(event.target.value)
                      }
                      placeholder="e.g. Qualified lead follow-up"
                    />
                  </label>
                  <label>
                    Trigger event
                    <MenuSelect
                      value={workflowFrom}
                      onChange={setWorkflowFrom}
                      options={FOLLOW_UP_LIFECYCLE.map((item) => ({
                        value: item.state,
                        label: item.label,
                      }))}
                    />
                  </label>
                  <label>
                    Lifecycle outcome
                    <MenuSelect
                      value={workflowTo}
                      onChange={setWorkflowTo}
                      options={FOLLOW_UP_LIFECYCLE.map((item) => ({
                        value: item.state,
                        label: item.label,
                      }))}
                    />
                  </label>
                </>
              )}
              {(modal === "edit-workflow" ||
                (modal === "new-workflow" && workflowWizardStep === 2)) && (
                <label>
                  Action type
                  <MenuSelect
                    value={workflowAction}
                    onChange={setWorkflowAction}
                    options={[
                      "Email",
                      "WhatsApp",
                      "Calendar reminder",
                      "Wait",
                      "CRM update",
                      "Webhook",
                    ].map((item) => ({ value: item, label: item }))}
                  />
                </label>
              )}
              {modal === "new-sequence" && (
                <div className="af-sequence-builder">
                  <div className="af-sequence-title">
                    <b>Follow-up timeline</b>
                    <button
                      type="button"
                      className="af-button-secondary"
                      onClick={() =>
                        setSequenceSteps((current) => [
                          ...current,
                          {
                            id: `step-${Date.now()}`,
                            delay: "1",
                            unit: "day",
                            action: "Email",
                          },
                        ])
                      }
                    >
                      <Plus size={13} /> Add step
                    </button>
                  </div>
                  {sequenceSteps.map((step, index) => (
                    <div className="af-sequence-step" key={step.id}>
                      <span className="af-sequence-number">{index + 1}</span>
                      <label>
                        Wait
                        <input
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
                      {sequenceSteps.length > 1 && (
                        <button
                          className="af-icon-button"
                          title="Remove step"
                          onClick={() =>
                            setSequenceSteps((current) =>
                              current.filter((item) => item.id !== step.id),
                            )
                          }
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {(modal !== "new-workflow" || workflowWizardStep === 2) && (
                <>
                  <label className="af-check-row">
                    <input
                      type="checkbox"
                      checked={workflowActive}
                      onChange={(event) =>
                        setWorkflowActive(event.target.checked)
                      }
                    />{" "}
                    Activate immediately
                  </label>
                  <div className="af-safety-note">
                    <ShieldCheck size={16} />
                    <span>
                      Messaging actions check channel-specific consent before
                      they run. No external sends occur in this local demo.
                    </span>
                  </div>
                </>
              )}
              {modal === "new-workflow" && workflowWizardStep === 1 ? (
                <div className="af-modal-actions">
                  <button
                    className="af-button-primary"
                    disabled={!newWorkflowName.trim()}
                    onClick={() => setWorkflowWizardStep(2)}
                  >
                    Configure action <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <div className="af-modal-actions">
                  {modal === "new-workflow" && (
                    <button
                      className="af-button-secondary"
                      onClick={() => setWorkflowWizardStep(1)}
                    >
                      Back
                    </button>
                  )}
                  <button
                    className="af-button-primary"
                    disabled={!newWorkflowName.trim()}
                    onClick={addWorkflow}
                  >
                    {modal === "edit-workflow"
                      ? "Save changes"
                      : modal === "new-sequence"
                        ? "Save sequence"
                        : "Create workflow"}
                  </button>
                </div>
              )}
            </div>
          )}
          {modal === "knowledge-source" && (
            <div className="af-modal-form">
              <label>
                Source type
                <MenuSelect
                  value={knowledgeType}
                  onChange={(value) => {
                    setKnowledgeType(value as "url" | "file" | "text");
                    setKnowledgeValue("");
                    setKnowledgeFileName("");
                  }}
                  options={[
                    {
                      value: "url",
                      label: (
                        <>
                          <Link2 size={14} /> Website URL
                        </>
                      ),
                    },
                    {
                      value: "file",
                      label: (
                        <>
                          <FileText size={14} /> File upload
                        </>
                      ),
                    },
                    {
                      value: "text",
                      label: (
                        <>
                          <ScanText size={14} /> Text snippet
                        </>
                      ),
                    },
                  ]}
                />
              </label>
              <label>
                Source name
                <input
                  value={knowledgeName}
                  onChange={(event) => setKnowledgeName(event.target.value)}
                  placeholder="e.g. Pricing and membership"
                />
              </label>
              {knowledgeType === "url" && (
                <label>
                  Website URL
                  <input
                    type="url"
                    value={knowledgeValue}
                    onChange={(event) => setKnowledgeValue(event.target.value)}
                    placeholder="https://example.com/services"
                  />
                </label>
              )}
              {knowledgeType === "text" && (
                <label>
                  Text snippet
                  <textarea
                    value={knowledgeValue}
                    onChange={(event) => setKnowledgeValue(event.target.value)}
                    placeholder="Paste verified business information for the assistant..."
                  />
                </label>
              )}
              {knowledgeType === "file" && (
                <label>
                  Choose document
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.md"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        setKnowledgeFileName(
                          `${file.name} · ${Math.ceil(file.size / 1024)} KB`,
                        );
                        if (!knowledgeName)
                          setKnowledgeName(file.name.replace(/\.[^.]+$/, ""));
                      }
                    }}
                  />
                </label>
              )}
              <div className="af-safety-note">
                <ShieldCheck size={16} />
                <span>
                  Only verified business content should be added. This demo
                  stores source details locally and does not upload files to a
                  provider.
                </span>
              </div>
              <button
                className="af-button-primary"
                onClick={saveKnowledgeSource}
              >
                <Plus size={14} /> Add to Knowledge Base
              </button>
            </div>
          )}
          {modal === "template" && (
            <div className="af-modal-form">
              <label>
                Template title
                <input
                  value={templateTitle}
                  onChange={(event) => setTemplateTitle(event.target.value)}
                  placeholder="e.g. Friendly appointment follow-up"
                />
              </label>
              <label>
                Category
                <MenuSelect
                  value={templateCategory}
                  onChange={setTemplateCategory}
                  options={[
                    "Follow-up",
                    "Lead qualification",
                    "Booking",
                    "Product support",
                    "Objection handling",
                  ].map((value) => ({ value, label: value }))}
                />
              </label>
              <label>
                Prompt instructions
                <textarea
                  value={templatePrompt}
                  onChange={(event) => setTemplatePrompt(event.target.value)}
                  placeholder="Describe the assistant's response goal, tone, and boundaries..."
                />
              </label>
              <label>
                Variable tags
                <input
                  value={templateVariables}
                  onChange={(event) => setTemplateVariables(event.target.value)}
                  placeholder="{customer_name}, {appointment_time}"
                />
              </label>
              <div className="af-modal-copy">
                Use variable tags such as <code>{"{customer_name}"}</code> in
                your prompt. Consent is checked when a message is sent.
              </div>
              <button className="af-button-primary" onClick={saveTemplate}>
                <Save size={14} />{" "}
                {editingTemplateId
                  ? "Save template changes"
                  : "Create prompt template"}
              </button>
            </div>
          )}
          {modal === "channel" && (
            <div className="af-modal-form">
              <p className="af-modal-copy">
                Connection status is simulated locally for this demo. No
                external provider credentials are used.
              </p>
              <label>
                Channel status
                <MenuSelect
                  value={channelsOn[selectedChannel] ? "Connected" : "Paused"}
                  onChange={(value) =>
                    setChannelsOn((state) => ({
                      ...state,
                      [selectedChannel]: value === "Connected",
                    }))
                  }
                  options={["Connected", "Paused"].map((item) => ({
                    value: item,
                    label: item,
                  }))}
                />
              </label>
              <label>
                Consent policy
                <MenuSelect
                  value={channelPolicy}
                  onChange={setChannelPolicy}
                  options={[
                    "Require explicit opt-in",
                    "Transactional only",
                    "Disabled",
                  ].map((item) => ({ value: item, label: item }))}
                />
              </label>
              <button
                className="af-button-primary"
                onClick={() => {
                  setModal("");
                  tell("Channel preferences saved.");
                }}
              >
                Save channel settings
              </button>
            </div>
          )}
        </Modal>
      )}{" "}
    </main>
  );
};

export default AIFollowUp;
