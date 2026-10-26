import { useCloudState, useEntities } from '../backend/workspace';
import { useBusinessMetrics } from '../backend/metrics';
import { callBackend, backendError } from '../backend/firebase';
import { cloudStorage } from '../backend/workspace';
import { useUILanguage, translateText, localizeNode } from '../i18n/display';
import React from "react";
import { gosApi } from '../backend/gosApi';
import { useGosAI } from '../backend/useGosAI';
import { useAgentConfiguration } from '../backend/useAgentConfiguration';
import { GosPlayground } from './GosPlayground';
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
type FollowUpConversation = {
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
  status?: string;
};
type SequenceStep = { id: string; delay: string; unit: string; action: string };
type Workflow = {
  messageText?: string;
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
    if (typeof cloudStorage === 'undefined') return fallback;
    const raw = cloudStorage.getItem(key);
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (value === null || typeof value !== typeof fallback || (Array.isArray(fallback) !== Array.isArray(value))) return fallback;
    if (Array.isArray(value)) {
      const strings = (item: Record<string, unknown>, keys: string[]) => keys.every(field => typeof item[field] === 'string');
      const valid = value.filter(item => {
        if (!item || typeof item !== 'object' || typeof item.id !== 'string') return false;
        if (key === WORKFLOWS_KEY) return strings(item, ['name', 'description', 'trigger', 'from', 'to', 'actionType']) && typeof item.active === 'boolean' && Array.isArray(item.sequenceSteps) && item.sequenceSteps.every((step: unknown) => !!step && typeof step === 'object' && strings(step as Record<string, unknown>, ['id', 'delay', 'unit', 'action']));
        if (key === TEMPLATES_KEY) return strings(item, ['title', 'description', 'iconKey']);
        return strings(item, ['name', 'type', 'detail']);
      });
      return (value.length && !valid.length ? fallback : valid) as T;
    }
    if (typeof fallback === 'object' && fallback !== null) {
      const merged = { ...fallback } as Record<string, unknown>;
      for (const [field, expected] of Object.entries(fallback)) {
        const saved = (value as Record<string, unknown>)[field];
        if (typeof saved === typeof expected) merged[field] = saved;
      }
      return merged as T;
    }
    return value as T;
  } catch {
    return fallback;
  }
};
const writeLocal = (key: string, value: unknown) => {
  try {
    if (typeof cloudStorage !== 'undefined') cloudStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Keep the current session usable when storage is unavailable. */
  }
};
const WORKFLOWS_KEY = "gos.ai-followup.workflows.v1";
const KNOWLEDGE_KEY = "gos.ai-followup.knowledge.v1";
const TEMPLATES_KEY = "gos.ai-followup.templates.v1";
const SETTINGS_KEY = "gos.ai-followup.settings.v1";
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
const InstagramBrand = ({ size = 18 }: { size?: number }) => { useUILanguage(); return ((
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
)); };
const FacebookBrand = ({ size = 18 }: { size?: number }) => { useUILanguage(); return ((
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="white"
      d="M13.9 21v-8.1h2.72l.4-3.16H13.9V7.72c0-.91.25-1.53 1.57-1.53h1.67V3.36c-.29-.04-1.28-.12-2.43-.12-2.4 0-4.04 1.47-4.04 4.17v2.32H7.95v3.16h2.72V21h3.23Z"
    />
  </svg>
)); };
const WhatsAppBrand = ({ size = 18 }: { size?: number }) => { useUILanguage(); return ((
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
)); };
const MessengerBrand = ({ size = 18 }: { size?: number }) => { useUILanguage(); return ((
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="white"
      d="M12 3.2c-5.12 0-9.2 3.77-9.2 8.68 0 2.6 1.2 4.91 3.14 6.49.16.13.25.31.26.51l.06 1.67c.02.52.56.87 1.04.66l1.87-.83c.16-.07.33-.08.5-.04.74.21 1.52.32 2.33.32 5.12 0 9.2-3.77 9.2-8.68S17.12 3.2 12 3.2Zm4.52 6.54-2.7 4.29a1.3 1.3 0 0 1-1.98.35l-1.94-1.42a.65.65 0 0 0-.78 0l-2.88 2.18c-.38.29-.89-.17-.63-.57l2.7-4.29a1.3 1.3 0 0 1 1.98-.35l1.94 1.42c.24.18.55.18.78 0l2.88-2.18c.38-.29.89.17.63.57Z"
    />
  </svg>
)); };
const WebsiteChatBrand = ({ size = 18 }: { size?: number }) => { useUILanguage(); return ((
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
)); };
const AssistantRobot = () => { useUILanguage(); return ((
  <svg
    className="af-robot-render"
    viewBox="0 0 64 64"
    role="img"
    aria-label={translateText("Upclick assistant robot")}
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
    <circle cx="32" cy="6" r="3" fill="#A78BFA" />
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
)); };
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
const channelDefinitions: Channel[] = [
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
export const defaultWorkflows: Workflow[] = [];
const defaultTemplates: TemplateItem[] = [];
const defaultKnowledge: KnowledgeSource[] = [];
const conversationRecords: FollowUpConversation[] = [];
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
  useUILanguage();
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
}) => { useUILanguage(); return ((
  <span className="af-avatar-wrap">
    <img
      src={`https://i.pravatar.cc/150?u=${lead.id}`}
      alt={translateText(altName ?? lead.name)}
      className={`af-avatar ${small ? "af-avatar-small" : ""}`}
      style={{ objectFit: "cover" }}
    />
    {localizeNode(channel && (
      <span className="af-avatar-badge">
        <ChannelMark channel={channel} />
      </span>
    ))}
  </span>
)); };
const StateBadge = ({ state }: { state: FollowUpLifecycleState }) => {
  useUILanguage();
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
  return <span className={`af-state af-state-${group}`}>{localizeNode(label)}</span>;
};
const Modal = ({
  title,
  subtitle,
  children,
  close,
  width,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  close: () => void;
  width?: string;
}) => { useUILanguage(); return ((
  <div
    className="af-modal-backdrop"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) close();
    }}
  >
    <div
      className="af-modal"
      style={width ? { width, maxWidth: '95vw' } : undefined}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="af-modal-head">
        <div>
          <h3>{localizeNode(title)}</h3>
          {subtitle && <p>{localizeNode(subtitle)}</p>}
        </div>
        <button className="af-icon-button" onClick={close} aria-label={translateText("Close")}>
          <X size={18} />
        </button>
      </div>
      {localizeNode(children)}
    </div>
  </div>
)); };

export const AIFollowUp: React.FC<Props> = ({ notify: notifyParent }) => {
  useUILanguage();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const metrics = useBusinessMetrics();
  const channels = channelDefinitions.map(channel => ({ ...channel, conversations: metrics.conversations.filter(thread => thread.channel === channel.id || channel.id === 'website' && thread.channel === 'webchat').length + ' conversations' }));
  const conversationRecords = useEntities<FollowUpConversation>('conversations');
  const leads = useSelector((state: RootState) => state.crm.leads);
  const [tab, setTab] = React.useState<Tab>("Overview");
  const [dateRange, setDateRange] = React.useState("Last 7 days");
  const [conversationChannel, setConversationChannel] = React.useState("All");
  const api = useGosAI();
  const channelsOn: Record<string, boolean> = { ...api.assistant.channels, website: api.assistant.channels.webchat };
  const changeChannel = async (channel: string, enabled: boolean) => {
    await api.updateAssistant({ channels: { ...api.assistant.channels, [channel === 'website' ? 'webchat' : channel]: enabled } });
  };
  const [workflows, setWorkflows] = useCloudState<Workflow[]>(WORKFLOWS_KEY, []);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [modal, setModal] = React.useState("");

  const assistantEnabled = api.assistant.live_enabled;
  const setAssistantEnabled = (live_enabled: boolean) => api.updateAssistant({ live_enabled });
  const [engineEnabled, setEngineEnabled] = useCloudState('gos.ai-followup.engine-enabled.v1', false);
  const agentConfig = useAgentConfiguration();
  const assistantProfile = agentConfig.profile;
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
  const [workflowMessage, setWorkflowMessage] = React.useState('');
  const [workflowActive, setWorkflowActive] = React.useState(false);
  const [workflowWizardStep, setWorkflowWizardStep] = React.useState(1);
  const [sequenceSteps, setSequenceSteps] = React.useState<SequenceStep[]>([
    { id: "draft-1", delay: "1", unit: "hour", action: "Email" },
    { id: "draft-2", delay: "1", unit: "day", action: "WhatsApp" },
  ]);
  const [knowledgeType, setKnowledgeType] = React.useState<
    "url" | "file" | "text" | "instructions"
  >("text");
  const [knowledgeName, setKnowledgeName] = React.useState("");
  const [knowledgeValue, setKnowledgeValue] = React.useState("");
  const [knowledgeFileName, setKnowledgeFileName] = React.useState("");
  const knowledgeItems: KnowledgeSource[] = api.sources.map(source => ({ ...source, detail: source.error || source.content?.slice(0, 90) || (source.chunk_count ? source.chunk_count + ' indexed chunks' : 'Knowledge source') }));
  const [knowledgeFile, setKnowledgeFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [templates, setTemplates] = useCloudState<TemplateItem[]>(TEMPLATES_KEY, []);
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
  const [generating, setGenerating] = React.useState(false);
  const generation = React.useRef(false);
  const generationContext = React.useRef(0);
  React.useEffect(() => {
    generationContext.current++;
    return () => { generationContext.current++; };
  }, [selectedId, selectedChannel, modal]);
  const generateDraft = async (target: 'lead' | 'workflow') => {
    if (generation.current) return;
    const leadId = target === 'lead' ? selectedId : undefined;
    if (target === 'lead' && !leadId) return;
    generation.current = true; setGenerating(true);
    const context = generationContext.current;
    try {
      const result = await callBackend<{ text: string }>('generateFollowUp', {
        ...(leadId ? { leadId } : {}),
        channel: target === 'lead' ? selectedChannel : (modal === 'new-sequence' ? sequenceSteps[0]?.action : workflowAction)?.toLowerCase(),
        instruction: target === 'lead' ? messageText : `Workflow: ${newWorkflowName}. From ${workflowFrom} to ${workflowTo}. ${workflowMessage}`,
      });
      if (context !== generationContext.current) return;
      if (target === 'lead') setMessageText(result.text); else setWorkflowMessage(result.text);
      showToast.success('AI draft generated. Review it before sending or activating.');
    } catch (error) { showToast.error(backendError(error)); }
    finally { generation.current = false; setGenerating(false); }
  };
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
  const rows = conversationRecords
    .map((item) => ({ ...item, lead: leadById(item.leadId) }))
    .filter((item): item is FollowUpConversation & { lead: CanonicalLead } =>
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
  const queueFollowUpMessage = async (lead: CanonicalLead, requested: string) => {
    const thread = conversationRecords.find(item => item.leadId === lead.id && item.channel === requested);
    if (!thread) { showToast.error('No conversation exists for this contact and channel.'); return false; }
    try { await callBackend('queueMessage', { conversationId: (thread as FollowUpConversation & { id: string }).id, text: messageText, requestId: crypto.randomUUID() }); showToast.info('Message queued for delivery'); return true; }
    catch (error) { showToast.error(backendError(error)); return false; }
  };
  const runWorkflow = async (flow: Workflow) => {
    try { await callBackend('startWorkflow', { workflowId: flow.id, requestId: crypto.randomUUID() }); showToast.success('Workflow run scheduled'); }
    catch (error) { showToast.error(backendError(error)); }
  };
  const addWorkflow = () => {
    if (!newWorkflowName.trim()) return;
    if (workflowActive && !workflowMessage.trim()) { showToast.error('Add the follow-up message before activating this workflow.'); return; }
    if (modal === "edit-workflow") {
      const next = workflows.map((item) =>
        item.id === editingWorkflowId
          ? {
              ...item,
              name: newWorkflowName.trim(),
              from: workflowFrom,
              to: workflowTo,
              actionType: workflowAction,
              messageText: workflowMessage.trim(),
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
        messageText: workflowMessage.trim(),
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
  const saveKnowledgeSource = async () => {
    if (uploading) return;
    const name = knowledgeName.trim() || knowledgeFile?.name || 'Text snippet';
    if (knowledgeType === 'file' ? !knowledgeFile : !knowledgeValue.trim()) { showToast.error('Add source content before saving.'); return; }
    if (knowledgeType === 'url') { showToast.error('Website indexing is not supported by this API. Paste the page content as text instead.'); return; }
    if (knowledgeFile && knowledgeType === 'file' && !/\.(txt|md|csv|pdf)$/i.test(knowledgeFile.name)) { showToast.error('Choose a TXT, MD, CSV or PDF file.'); return; }
    setUploading(true);
    try {
      let body: FormData | { name: string; type: string; content: string };
      if (knowledgeType === 'file' && knowledgeFile) {
        body = new FormData(); body.append('name', name); body.append('type', 'file'); body.append('file', knowledgeFile);
      } else body = { name, type: knowledgeType, content: knowledgeValue.trim() };
      const result = await gosApi.createSource(body);
      showToast.success(name + ' · ' + result.source.status);
      setKnowledgeName(''); setKnowledgeValue(''); setKnowledgeFileName(''); setKnowledgeFile(null); setModal(''); api.retry();
    } catch (e) { showToast.error((e as Error).message); }
    finally { setUploading(false); }
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
    tell("Follow-up settings saved to your workspace.");
  };
  const saveAssistant = async () => {
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
    if (!await agentConfig.save(next)) return;
    if (!await api.updateAssistant({ live_enabled: true })) return;

    setAssistantStep(1);
    setModal("");
    tell(`${next.name} is active and saved to your workspace.`);
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
    setWorkflowMessage(flow?.messageText ?? '');
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
      {localizeNode(channels.map((channel) => {
        const Icon = channel.icon;
        const active = channelsOn[channel.id];
        return (
          <article className="af-channel-card" key={channel.id}>
            <span className={`af-channel-badge af-brand-${channel.id}`}>
              <Icon size={channel.id === "facebook" ? 30 : 23} />
            </span>
            <div className="af-channel-main">
              <div className="af-channel-title">
                <b>{localizeNode(channel.name)}</b>
                <button
                  className={`af-switch ${active ? "on" : ""}`}
                  type="button" role="switch" aria-checked={active}
                  aria-label={translateText(`${active ? "Disconnect" : "Connect"} ${channel.name}`)}
                  disabled={api.loading || api.saving || Boolean(api.error)} onClick={() => void changeChannel(channel.id, !active)}
                >
                  <i />
                </button>
              </div>
              <span
                className={`af-connected ${active ? "" : "af-disconnected"}`}
              >
                {localizeNode(active ? (
                  <>
                    <b aria-hidden="true">✓</b>{translateText("Connected")}</>
                ) : (
                  <>
                    <i />{translateText("Paused")}</>
                ))}
              </span>
              <small>{localizeNode(channel.conversations)}</small>
              <button
                className="af-link"
                onClick={() => {
                  setSelectedChannel(channel.id);
                  setModal("channel");
                }}
              >{translateText("Settings ")}<ArrowRight size={12} />
              </button>
            </div>
          </article>
        );
      }))}
    </div>
  );
  const renderKpis = () => (
    <div className="af-kpis">
      {localizeNode([
        {
          label: "Total Conversations",
          value: String(metrics.conversations.length),
          delta: "—",
          icon: MessageSquare,
          tone: "violet",
        },
        {
          label: "New Leads",
          value: String(metrics.leads.length),
          delta: "—",
          icon: Users,
          tone: "pink",
        },
        {
          label: "Appointments Booked",
          value: String(metrics.bookings.length),
          delta: "—",
          icon: CalendarDays,
          tone: "mint",
        },
        {
          label: "Sales Generated",
          value: metrics.money(metrics.revenue),
          delta: "—",
          icon: CreditCard,
          tone: "purple",
        },
        {
          label: "Response Time",
          value: "—",
          delta: "—",
          icon: Zap,
          tone: "orange",
        },
      ].map((kpi) => (
        <div className="af-kpi" key={kpi.label}>
          <span className={`af-kpi-icon af-tone-${kpi.tone}`}>
            <kpi.icon size={18} />
          </span>
          <div>
            <span>{localizeNode(kpi.label)}</span>
            <b>{localizeNode(kpi.value)}</b>
            <small>
              <ArrowUpRight size={12} />
              {localizeNode(kpi.delta)}
              <i>{translateText(" vs. last 7 days")}</i>
            </small>
          </div>
        </div>
      )))}
    </div>
  );
  const renderConversationFeed = () => (
    <section className="af-panel af-feed-panel flex flex-col flex-1 min-h-0 h-full">
      <div className="af-panel-heading flex-none">
        <div>
          <h2>{translateText("Recent Conversations")}</h2>
        </div>
        <button
          className="af-text-action"
          onClick={() => setTab("Conversations")}
        >{translateText("View all ")}<ArrowRight size={13} />
        </button>
      </div>
      {localizeNode(leadFilter === "Needs attention" && (
        <div className="af-filter-notice">
          <Activity size={12} />
          {localizeNode(needsAttention)}{translateText(" CRM records need human attention")}<button onClick={() => setLeadFilter("All states")}>{translateText("Clear")}</button>
        </div>
      ))}
      <div
        className="af-channel-filters flex-none"
        role="group"
        aria-label={translateText("Filter conversations by channel")}
      >
        {localizeNode([
          { value: "All", label: `All (${rows.length})` },
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
            title={translateText(item.label)}
            aria-label={translateText(`Show ${item.label} conversations`)}
            aria-pressed={conversationChannel === item.value}
            onClick={() => setConversationChannel(item.value)}
          >
            {localizeNode(item.value === "All" ? (
              <>
                <Inbox size={14} />
                <span>{localizeNode(item.label)}</span>
              </>
            ) : (
              <ChannelMark channel={item.channel!} />
            ))}
          </button>
        )))}
      </div>
      <div className="af-feed-list flex-1 min-h-0 overflow-y-auto">
        {localizeNode(visibleRows.slice(0, 8).map((item) => (
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
              <b className="af-conversation-name">{localizeNode(item.displayName)}</b>
              <p>{localizeNode(item.excerpt)}</p>
            </div>
            <div className="af-conversation-side">
              <time>{localizeNode(item.time)}</time>
              <StateBadge state={item.state} />
            </div>
          </button>
        )))}
        {localizeNode(visibleRows.length === 0 && (
          <div className="af-empty">
            <Search size={18} />
            <b>{translateText("No conversations found")}</b>
            <span>{translateText("Try another channel or state filter.")}</span>
          </div>
        ))}
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
            </span>{translateText("AI Assistant Setup")}</h2>
        </div>
        <div className="af-assistant-status">
          <span className={assistantEnabled ? "active" : "paused"}>
            {localizeNode(assistantEnabled ? "Active" : "Paused")}
          </span>
          <button
            className={`af-switch ${assistantEnabled ? "on af-green-switch" : ""}`}
            type="button" role="switch" aria-checked={assistantEnabled} disabled={api.loading || api.saving || Boolean(api.error)}
            aria-label={
              translateText(assistantEnabled
                ? "Pause Upclick Assistant"
                : "Activate Upclick Assistant")
            }
            onClick={() => {
              void setAssistantEnabled(!assistantEnabled);
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
              <b>{localizeNode(assistantProfile.name)}</b>
              <span>
                {localizeNode(assistantEnabled
                  ? `${assistantProfile.role} · ready to help conversations, answer questions, book appointments, and follow up with leads.`
                  : "Assistant is paused")}
              </span>
            </div>
          </div>
          <div className="af-assistant-actions">
            <button
              className="af-button-primary"
              onClick={() => setModal("test")}
            >
              <Sparkles size={13} />{translateText(" Test AI Assistant")}</button>
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
              <Pencil size={13} />{translateText(" Edit Assistant")}</button>
          </div>
          <div className="af-assistant-config">
            <div>
              <span className="af-attribute-icon bg-purple-50 text-purple-600">
                <Users size={15} />
              </span>
              <span className="af-attribute-copy">
                <b>{translateText("Personality")}</b>
                <small>{localizeNode(assistantProfile.role)}</small>
              </span>
            </div>
            <div>
              <span className="af-attribute-icon bg-sky-50 text-sky-600">
                <Globe2 size={15} />
              </span>
              <span className="af-attribute-copy">
                <b>{translateText("Language")}</b>
                <small>{localizeNode(assistantLanguage)}</small>
              </span>
            </div>
            <div>
              <span className="af-attribute-icon bg-fuchsia-50 text-fuchsia-600">
                <Target size={15} />
              </span>
              <span className="af-attribute-copy">
                <b>{translateText("Goal")}</b>
                <small>
                  {localizeNode(assistantGoal === "Appointments"
                    ? "Book appointments & convert leads"
                    : assistantGoal)}
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
              <b>{translateText("Knowledge Base")}</b>
              <small>{localizeNode(knowledgeItems.length)}{translateText(" sources")}</small>
            </div>
          </div>
          <div className="af-knowledge-compact-list overflow-y-auto max-h-[120px]">
            {localizeNode(knowledgeItems.slice(0, 5).map((item) => {
              const SourceIcon = knowledgeIconFor(item.type);
              return (
                <div className="af-knowledge-item" key={item.id}>
                  <span className="af-knowledge-check">
                    <SourceIcon size={10} strokeWidth={2.5} />
                  </span>
                  <b>{localizeNode(item.name)}</b>{item.status && <small className={`af-source-status af-source-${item.status}`} role="status">{item.status}</small>}
                </div>
              );
            }))}
          </div>
          <button
            className="af-knowledge-manage"
            onClick={() => setTab("Knowledge")}
          >{translateText("Manage Knowledge ")}<ArrowRight size={13} />
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
          <h3 className="text-lg font-bold text-slate-900">{translateText("Automation Workflows")}</h3>
        </div>
        <button
          className="af-text-action"
          onClick={() => setTab("Automations")}
        >{translateText("View all ")}<ArrowRight size={13} />
        </button>
      </div>
      <div className="af-workflow-list overflow-y-auto max-h-[160px]">
        {localizeNode(workflows.map((flow) => {
          const FlowIcon = workflowIconFor(flow.actionType);
          return (
            <div className="af-workflow-row" key={flow.id}>
              <span className="af-workflow-icon">
                <FlowIcon size={15} />
              </span>
              <div>
                <b>{localizeNode(flow.name)}</b>
                <small>{localizeNode(flow.description)}</small>
              </div>
              <span
                className={`af-trigger-count ${flow.active ? "" : "inactive"}`}
              >
                {localizeNode(flow.trigger)}
              </span>
              <button
                className={`af-switch ${flow.active ? "on" : ""}`}
                type="button" role="switch" aria-checked={flow.active}
                aria-label={translateText(`${flow.active ? "Pause" : "Activate"} ${flow.name}`)}
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
        }))}
      </div>
    </section>
  );
  const renderAnalytics = () => (
    <section className="af-panel af-performance-panel flex flex-col flex-1 min-h-0 h-full">
      <div className="af-panel-heading flex-none">
        <h2>{translateText("AI Performance")}</h2>
        <button
          className="af-select-button"
          onClick={() =>
            setDateRange(
              dateRange === "Last 7 days" ? "Last 30 days" : "Last 7 days",
            )
          }
        >
          {localizeNode(dateRange)}
          <ChevronDown size={13} />
        </button>
      </div>
      <div className="af-performance-rows flex-1 min-h-0 overflow-y-auto">
        {localizeNode([
          {
            label: "Conversations Handled",
            value: String(metrics.conversations.length),
            change: "—",
            icon: ScanText,
          },
          {
            label: "Leads Generated",
            value: String(metrics.leads.length),
            change: "—",
            icon: HandCoins,
          },
          {
            label: "Appointments Booked",
            value: String(metrics.bookings.length),
            change: "—",
            icon: Calendar,
          },
          {
            label: "Sales Generated",
            value: metrics.money(metrics.revenue),
            change: "—",
            icon: Calendar,
          },
          {
            label: "Customer Satisfaction",
            value: "—",
            change: "—",
            icon: Star,
          },
        ].map((metric) => (
          <div className="af-performance-metric" key={metric.label}>
            <metric.icon
              className="af-performance-icon"
              size={15}
              strokeWidth={1.8}
            />
            <span>{localizeNode(metric.label)}</span>
            <b>{localizeNode(metric.value)}</b>
            <small className="af-trend-pill">↑ {localizeNode(metric.change)}</small>
          </div>
        )))}
      </div>
      <div className="af-perf-chart flex-1 min-h-0 w-full relative">
  <div className="af-perf-chart-plot"><svg viewBox="0 0 600 120" preserveAspectRatio="none" role="img" aria-label="Recorded operational events over time"><polyline fill="none" stroke="#A78BFA" strokeWidth="2" points={metrics.daily.map((day,index) => (index / Math.max(1,metrics.daily.length-1) * 600) + ',' + (118 - day.events / Math.max(1,...metrics.daily.map(item => item.events)) * 110)).join(' ')}/></svg></div>
  <div className="af-perf-chart-x">{metrics.daily.filter((_,index) => index % 5 === 0).map((day,index) => <span key={day.date} style={{left: (index / 6 * 100) + '%'}}>{day.label}</span>)}</div>
 </div>
    </section>
  );
  // @ts-ignore
  const renderTemplates = () => (
    <section className="af-panel af-templates-panel">
      <div className="af-panel-heading">
        <h2>{translateText("AI Templates")}</h2>
        <button className="af-text-action" onClick={() => setTab("Templates")}>{translateText("View All ")}<ArrowRight size={13} />
        </button>
      </div>
      <div className="af-template-grid">
        {localizeNode(templates.map((item) => {
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
              <b>{localizeNode(item.title)}</b>
              <small>{localizeNode(item.description)}</small>
            </button>
          );
        }))}
      </div>
    </section>
  );

  const renderOverview = () => (
    <div className="af-overview-grid flex-1 min-h-0 h-full">
      <div className="af-column af-column-feed flex-1 min-h-0 flex flex-col h-full">{localizeNode(renderConversationFeed())}</div>
      <div className="af-column af-column-assistant flex-1 min-h-0 flex flex-col h-full">
        {localizeNode(renderAssistant())}
      </div>
      <div className="af-column af-column-insights flex-1 min-h-0 flex flex-col h-full">
        {localizeNode(renderAnalytics())}
      </div>
    </div>
  );
  const renderConversationTab = () => (
    <section className="af-panel af-full-panel">
      <div className="af-panel-heading">
        <div>
          <h2>{translateText("Conversations")}</h2>
          <p>{translateText("Messages are shown from workspace conversations linked to CRM leads.")}</p>
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
            <Plus size={14} />{translateText(" New sequence")}</button>
        </div>
      </div>
      {localizeNode(renderConversationFeed())}
    </section>
  );
  const renderKnowledgeTab = () => (
    <section className="af-panel af-full-panel">
      <div className="af-panel-heading">
        <div>
          <h2>{translateText("Knowledge Base")}{localizeNode(" ")}
            <span className="af-count-badge">
              {localizeNode(knowledgeItems.length)}{translateText(" sources")}</span>
          </h2>
          <p>{translateText("Sources available to the assistant; add a file, text snippet, or instructions.")}</p>
        </div>
        <button
          className="af-button-primary"
          onClick={() => {
            setKnowledgeType("text");
            setKnowledgeFile(null);
            setKnowledgeName("");
            setKnowledgeValue("");
            setKnowledgeFileName("");
            setModal("knowledge-source");
          }}
        >
          <Plus size={14} />{translateText(" Add source")}</button>
      </div>
      <button className="af-button-secondary" disabled={api.loading} onClick={api.retry}>Refresh sources</button>
      {api.loading && <div className="af-knowledge-loading" role="status" aria-label="Loading knowledge sources"><i/><i/><i/></div>}
      {!api.loading && !api.error && !knowledgeItems.length && <p className="af-safety-note">Add your first source to train the assistant.</p>}
      <div className="af-knowledge-grid">
        {localizeNode(knowledgeItems.map((item) => {
          const Icon = knowledgeIconFor(item.type);
          return (
            <div key={item.id}>
              <span className="af-template-icon af-tone-violet">
                <Icon size={16} />
              </span>
              <span>
                <b>{localizeNode(item.name)}</b>{item.status && <small className={`af-source-status af-source-${item.status}`} role="status">{item.status}</small>}
                <small>{localizeNode(item.detail)}</small>
              </span>
              <button
                className="af-icon-button"
                title={translateText("Remove source")}
                disabled={api.loading || uploading}
                onClick={async () => {
                  setUploading(true);
                  try { await gosApi.deleteSource(item.id); api.retry(); showToast.success(item.name + ' removed.'); }
                  catch (e) { showToast.error((e as Error).message); }
                  finally { setUploading(false); }
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        }))}
      </div>
    </section>
  );
  const renderTemplatesTab = () => (
    <section className="af-panel af-full-panel">
      <div className="af-panel-heading">
        <div>
          <h2>{translateText("Response Templates")}</h2>
          <p>{translateText("Create and maintain prompts for consistent, consent-aware responses.")}</p>
        </div>
        <button
          className="af-button-primary"
          onClick={() => openTemplateEditor()}
        >
          <Plus size={14} />{translateText(" Custom template")}</button>
      </div>
      <div className="af-template-grid af-template-grid-large">
        {localizeNode(templates.map((item) => {
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
                <b>{localizeNode(item.title)}</b>
                <small>{localizeNode(item.description)}</small>
                <span className="af-link">
                  {localizeNode(item.custom
                    ? "Edit template"
                    : item.id === "custom-template-action"
                      ? "Create your own"
                      : "Configure")}{localizeNode(" ")}
                  <ArrowRight size={12} />
                </span>
              </button>
              {localizeNode(item.custom && (
                <div className="af-template-actions">
                  <button
                    className="af-icon-button"
                    title={translateText("Edit template")}
                    onClick={() => openTemplateEditor(item)}
                  >
                    <PencilLine size={14} />
                  </button>
                  <button
                    className="af-icon-button"
                    title={translateText("Delete template")}
                    onClick={() => deleteTemplate(item.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </article>
          );
        }))}
      </div>
    </section>
  );
  const renderAutomationTab = () => (
    <section className="af-panel af-full-panel">
      <div className="af-panel-heading">
        <div>
          <h2>{translateText("Automation Workflows")}</h2>
          <p>{translateText("Create trigger-based rules or multi-step follow-up sequences. All messaging remains consent checked.")}</p>
        </div>
        <div className="af-inline-controls">
          <button
            className="af-button-secondary"
            onClick={() => openWorkflowEditor(undefined, "new-sequence")}
          >
            <Plus size={14} />{translateText(" New sequence")}</button>
          <button
            className="af-button-primary"
            onClick={() => openWorkflowEditor()}
          >
            <Plus size={14} />{translateText(" Create workflow")}</button>
        </div>
      </div>
      <div className="af-automation-table">
        {localizeNode(workflows.map((flow) => {
          const FlowIcon = workflowIconFor(flow.actionType);
          return (
            <div className="af-automation-card" key={flow.id}>
              <span className="af-workflow-icon">
                <FlowIcon size={17} />
              </span>
              <div className="af-automation-main">
                <b>{localizeNode(flow.name)}</b>
                <small>{localizeNode(flow.description)}</small>
                <span>{translateText("Trigger: ")}{localizeNode(stateLabel(flow.from as FollowUpLifecycleState))}{localizeNode(" ")}
                  <ArrowRight size={12} />{localizeNode(" ")}
                  {localizeNode(stateLabel(flow.to as FollowUpLifecycleState))} ·{localizeNode(" ")}
                  {localizeNode(flow.sequenceSteps.length)}{translateText(" step")}{localizeNode(flow.sequenceSteps.length === 1 ? "" : "s")}
                </span>
              </div>
              <span
                className={`af-trigger-count ${flow.active ? "" : "inactive"}`}
              >
                {localizeNode(flow.trigger)}
              </span>
              <button
                className="af-button-secondary"
                onClick={() => runWorkflow(flow)}
              >
                <Send size={13} />{translateText(" Run workflow")}</button>
              <button
                className={`af-switch ${flow.active ? "on" : ""}`}
                type="button" role="switch" aria-checked={flow.active}
                aria-label={translateText(`${flow.active ? "Pause" : "Activate"} ${flow.name}`)}
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
                <summary aria-label={translateText(`${flow.name} actions`)}>
                  <MoreHorizontal size={16} />
                </summary>
                <div>
                  <button
                    onClick={() => openWorkflowEditor(flow, "edit-workflow")}
                  >
                    <PencilLine size={13} />{translateText(" Edit workflow")}</button>
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
                    <Trash2 size={13} />{translateText(" Delete workflow")}</button>
                </div>
              </details>
            </div>
          );
        }))}
      </div>
      <div className="af-safety-note">
        <ShieldCheck size={16} />
        <span>
          <b>{translateText("Consent guard enabled.")}</b>{translateText(" WhatsApp and social messages require explicit channel consent. Missing permission blocks sends.")}</span>
      </div>
    </section>
  );
  const renderSettingsTab = () => (
    <section className="af-panel af-full-panel">
      <div className="af-panel-heading">
        <div>
          <h2>{translateText("Follow-Up Settings")}</h2>
          <p>{translateText("Control the response pace, assistant tone, retry limits, and human escalation rules.")}</p>
        </div>
        <button
          className={`af-status-switch ${engineEnabled ? "on" : ""}`}
          type="button" role="switch" aria-checked={engineEnabled} aria-label={translateText("Follow-up engine")}
          onClick={() => {
            setEngineEnabled(!engineEnabled);
            tell(`Follow-up engine ${engineEnabled ? "paused" : "running"}.`);
          }}
        >
          <i className="bk-switch-track" aria-hidden="true" />
          {localizeNode(engineEnabled ? "Engine active" : "Engine paused")}
        </button>
      </div>
      <div className="af-settings-grid">
        <article>
          <span>
            <Timer size={17} />
          </span>
          <div>
            <b>{translateText("Response delay")}</b>
            <p>{translateText("Wait before the assistant sends its first response.")}</p>
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
            <b>{translateText("AI tone / personality")}</b>
            <p>{translateText("Default voice used across follow-up messages.")}</p>
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
            <b>{translateText("Maximum follow-up attempts")}</b>
            <p>{translateText("Stop the automated sequence after this many unanswered attempts.")}</p>
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
            <b>{translateText("Automatic escalation")}</b>
            <p>{translateText("Pause AI and request a human when the lead needs personal support.")}</p>
          </div>
          <button
            className={`af-switch ${followUpSettings.autoEscalation ? "on" : ""}`}
            type="button" role="switch" aria-checked={followUpSettings.autoEscalation}
            aria-label={translateText("Toggle automatic escalation")}
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
            <b>{translateText("Consent-first messaging")}</b>
            <p>{translateText("Phone capture never grants WhatsApp or promotional messaging consent.")}</p>
          </div>
          <span className="af-safe-label">{translateText("Always enforced")}</span>
        </article>
      </div>
      <div className="af-settings-save">
        <span>{translateText("Changes are saved to this workspace.")}</span>
        <button className="af-button-primary" onClick={saveSettings}>
          <Save size={14} />{translateText(" Save Settings")}</button>
      </div>
    </section>
  );
  const renderOtherTab = () => {
    if (tab === "AI Assistants")
      return (
        <section className="af-panel af-full-panel">
          <div className="af-panel-heading">
            <div>
              <h2>{translateText("AI Assistants")}</h2>
              <p>{translateText("Business-specific assistants, configured for your workspace.")}</p>
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
              <Plus size={14} />{translateText(" Create AI Assistant")}</button>
          </div>
          <div className="af-assistant-wide">
            <div className="af-bot-avatar">
              <Bot size={28} />
              <i />
            </div>
            <div>
              <b>{localizeNode(assistantProfile.name)}</b>
              <p>
                {localizeNode(assistantProfile.role)} · {localizeNode(assistantProfile.language)}
              </p>
              <div className="af-assistant-tags">
                <span>{localizeNode(assistantProfile.goal)}</span>
                <span>{localizeNode(assistantEnabled ? "Active" : "Paused")}</span>
                <span>{translateText("Knowledge base · ")}{localizeNode(knowledgeItems.length)}{translateText(" sources")}</span>
              </div>
            </div>
            <button
              className="af-button-secondary"
              onClick={() => setModal("test")}
            >
              <Sparkles size={14} />{translateText(" Test assistant")}</button>
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
              <Settings2 size={14} />{translateText(" Edit")}</button>
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
          {localizeNode(renderKpis())}
          {localizeNode(renderAnalytics())}
          <div className="af-panel af-performance-detail">
            <h2>{translateText("Lifecycle outcomes")}</h2>
            <div className="af-outcome-list">
              {localizeNode(FOLLOW_UP_LIFECYCLE.map((item) => (
                <div key={item.state}>
                  <span>{localizeNode(item.label)}</span>
                  <i>
                    <b
                      style={{
                        width: `${Math.min(100, leads.filter((lead) => lead.followUpState === item.state).length * 13 + 3)}%`,
                      }}
                    />
                  </i>
                  <strong>
                    {
                      localizeNode(leads.filter((lead) => lead.followUpState === item.state)
                        .length)
                    }
                  </strong>
                </div>
              )))}
            </div>
          </div>
        </div>
      );
    return null;
  };

  return (
    <main className="af-page flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      {api.error && <div className="af-safety-note" role="alert">{api.error}<button className="af-button-secondary" onClick={api.retry}>Retry</button></div>}
      {agentConfig.error && <div className="af-safety-note" role="alert">{agentConfig.error}<button className="af-button-secondary" onClick={agentConfig.retry}>Retry assistant settings</button></div>}
      <div className="af-page-title">
        <div>
          <h1>
            <Sparkles size={21} />{translateText(" AI Follow-Up")}</h1>
          <p>{translateText("Conversations, follow up with leads and turn them into customers")}</p>
        </div>
        <div className="module-header-actions"><a className="af-button-secondary" href="/dashboard/follow-up?tab=templates">{translateText("Automation templates")} <ArrowRight size={14}/></a>
        <button
          className="af-button-primary"
          onClick={() => {
            setAssistantStep(1);
            setNewAssistantName("");
            setAssistantRole("");
            setModal("create-assistant");
          }}
        >
          <Plus size={15} />{translateText(" Create AI Assistant")}</button>
        </div>
      </div>
      <div className="af-channel-row">{localizeNode(renderChannelCards())}</div>
      <div className="af-tabs-row">
        <nav className="af-tabs" aria-label={translateText("AI Follow-Up sections")}>
          {localizeNode(tabs.map((item) => {
            const Icon = tabIcons[item];
            return (
              <button
                key={item}
                className={`relative ${tab === item ? "active" : ""}`}
                onClick={() => setTab(item)}
              >
                {localizeNode(tab === item && (
                  <motion.div
                    layoutId="activeAIFollowUpTab"
                    className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#7C3AED] rounded-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                ))}
                <span className="relative z-10 flex items-center gap-[6px]">
                  {localizeNode(Icon && <Icon size={16} strokeWidth={1.75} />)}
                  {localizeNode(item)}
                </span>
              </button>
            );
          }))}
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
      {localizeNode(renderKpis())}
      <AnimatePresence mode="wait">
        <motion.div
          className="flex-1 min-h-0 w-full h-full flex flex-col"
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {localizeNode(tab === "Overview"
            ? renderOverview()
            : tab === "Conversations"
              ? renderConversationTab()
              : renderOtherTab())}
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
                <span className="af-eyebrow">{translateText("CANONICAL CRM RECORD")}</span>
                <h2>{translateText("Follow-up details")}</h2>
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
                <b>{localizeNode(selectedLead.name)}</b>
                <span>
                  {localizeNode(selectedLead.company)} · {selectedLead.email}
                </span>
                <small>{translateText("Lead ID · ")}{localizeNode(selectedLead.id)}</small>
              </div>
            </div>
            <div className="af-drawer-status">
              <span>{translateText("Lifecycle state")}</span>
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
            <h3>{translateText("Explicit channel consent")}</h3>
            <p className="af-drawer-note">{translateText("Phone number capture is not messaging permission. Toggle only when consent has been recorded.")}</p>
            {localizeNode((
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
                  <b>{localizeNode(item.label)}</b>
                  <small>
                    {localizeNode(selectedLead[item.key]
                      ? "Consent recorded"
                      : "No consent recorded")}
                  </small>
                </span>
                <button
                  className={`af-switch ${selectedLead[item.key] ? "on" : ""}`}
                  type="button" role="switch" aria-checked={Boolean(selectedLead[item.key])}
                  onClick={() =>
                    dispatch(
                      setLeadConsent({
                        id: selectedLead.id,
                        consent: { [item.key]: !selectedLead[item.key] },
                      }),
                    )
                  }
                  aria-label={translateText(`Toggle ${item.label}`)}
                >
                  <i />
                </button>
              </label>
            )))}
            <div className="af-message-demo">
              <label>{translateText("Message")}</label>
              <button type="button" className="af-button-secondary" disabled={generating || agentConfig.loading || Boolean(agentConfig.error)} onClick={() => void generateDraft('lead')}><Sparkles size={14}/>{generating ? 'Generating…' : 'Generate AI draft'}</button>
              <textarea
                value={messageText}
                disabled={generating}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder={translateText("Write a consent-checked follow-up...")}
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
                        <WhatsAppBrand size={16} />{translateText(" WhatsApp")}</>
                    ),
                  },
                  {
                    value: "instagram",
                    label: (
                      <>
                        <InstagramBrand size={16} />{translateText(" Instagram")}</>
                    ),
                  },
                  {
                    value: "messenger",
                    label: (
                      <>
                        <MessengerBrand size={16} />{translateText(" Messenger")}</>
                    ),
                  },
                  {
                    value: "email",
                    label: (
                      <>
                        <Mail size={15} />{translateText(" Email")}</>
                    ),
                  },
                ]}
              />
              <button
                className="af-button-primary"
                onClick={() => {
                  if (messageText.trim()) {
                    void queueFollowUpMessage(selectedLead, selectedChannel).then(sent => { if (sent) setMessageText(''); });
                  } else tell("Write a message before sending.");
                }}
              >
                <Send size={14} />{translateText(" Check consent & queue")}</button>
              <small>{translateText("Delivery requires a connected channel and verified consent.")}</small>
            </div>
            <div className="af-lead-activity">
              <h3>{translateText("Recent CRM activity")}</h3>
              {localizeNode(selectedLead.activities.slice(0, 5).map((activity) => (
                <div key={activity.id}>
                  <i />
                  <span>
                    <b>{localizeNode(activity.title)}</b>
                    <small>
                      {localizeNode(activity.detail)} · {localizeNode(activity.at)}
                    </small>
                  </span>
                </div>
              )))}
            </div>
            <button
              className="af-button-secondary af-open-crm"
              onClick={() =>
                navigate(
                  `/dashboard/crm?leadId=${encodeURIComponent(selectedLead.id)}`,
                )
              }
            >{translateText("Open canonical record ")}<ArrowRight size={14} />
            </button>
          </aside>
        </div>
      )}
      {localizeNode(modal && (
        <Modal
          title={
            translateText(modal === "create-assistant"
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
                              : "Assistant settings")
          }
          subtitle={
            modal === "test"
              ? translateText("Test real-time grounded responses using your connected knowledge base.")
              : modal === "knowledge-source"
                ? translateText("Upload verified business documents or paste guidelines for your assistant.")
                : modal === "create-assistant" || modal === "edit-assistant"
                  ? translateText("Configure persona identity, operational rules, and conversion goals.")
                  : modal === "new-sequence" || modal === "new-workflow" || modal === "edit-workflow"
                    ? translateText("Automate lifecycle transitions and scheduled outreach.")
                    : modal === "template"
                      ? translateText("Build consistent, consent-checked messaging templates.")
                      : translateText("Manage channel connections and messaging consent policies.")
          }
          width={modal === "test" ? "min(680px, 95vw)" : undefined}
          close={() => setModal("")}
        >
          {localizeNode((modal === "create-assistant" || modal === "edit-assistant") && (
            <div className="af-modal-form">
              {localizeNode(modal === "create-assistant" && (
                <div className="af-wizard-progress">
                  <span className={assistantStep >= 1 ? "active" : ""}>{translateText("1 · Profile")}</span>
                  <i />
                  <span className={assistantStep >= 2 ? "active" : ""}>{translateText("2 · Configure")}</span>
                </div>
              ))}
              {localizeNode(modal === "edit-assistant" || assistantStep === 1 ? (
                <>
                  <label>{translateText("Assistant name")}<input
                      value={newAssistantName}
                      onChange={(event) =>
                        setNewAssistantName(event.target.value)
                      }
                      placeholder={translateText("e.g. Upclick Fitness Coach")}
                    />
                  </label>
                  <label>{translateText("Role / persona")}<input
                      value={assistantRole}
                      onChange={(event) => setAssistantRole(event.target.value)}
                      placeholder={translateText("e.g. Friendly fitness coach")}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>{translateText("Language")}<MenuSelect
                      value={assistantLanguage}
                      onChange={setAssistantLanguage}
                      options={[
                        "Auto-detect Arabic / English",
                        "English",
                        "Arabic",
                      ].map((item) => ({ value: item, label: item }))}
                    />
                  </label>
                  <label>{translateText("Primary goal")}<MenuSelect
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
                    <span>{translateText("The assistant uses your ")}{localizeNode(knowledgeItems.length)}{translateText(" configured knowledge sources and respects each lead's messaging consent.")}</span>
                  </div>
                </>
              ))}
              <div className="af-modal-actions">
                {localizeNode(modal === "create-assistant" && assistantStep === 2 && (
                  <button
                    className="af-button-secondary"
                    onClick={() => setAssistantStep(1)}
                  >{translateText("Back")}</button>
                ))}
                {localizeNode(modal === "create-assistant" && assistantStep === 1 ? (
                  <button
                    className="af-button-primary"
                    disabled={!newAssistantName.trim() || !assistantRole.trim()}
                    onClick={() => setAssistantStep(2)}
                  >{translateText("Continue ")}<ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    className="af-button-primary"
                    onClick={saveAssistant}
                    disabled={!newAssistantName.trim() || !assistantRole.trim() || agentConfig.loading || agentConfig.saving || Boolean(agentConfig.error) || api.loading || api.saving || Boolean(api.error)}
                  >
                    {localizeNode(modal === "edit-assistant"
                      ? "Save changes"
                      : "Create active assistant")}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {modal === "test" && <GosPlayground />}
          {localizeNode((modal === "new-sequence" ||
            modal === "new-workflow" ||
            modal === "edit-workflow") && (
            <div className="af-modal-form">
              {localizeNode(modal === "new-workflow" && (
                <div className="af-wizard-progress">
                  <span className={workflowWizardStep >= 1 ? "active" : ""}>{translateText("1 · Trigger")}</span>
                  <i />
                  <span className={workflowWizardStep >= 2 ? "active" : ""}>{translateText("2 · Actions")}</span>
                </div>
              ))}
              {localizeNode((modal !== "new-workflow" || workflowWizardStep === 1) && (
                <>
                  <label>
                    {localizeNode(modal === "new-sequence"
                      ? "Sequence name"
                      : "Workflow name")}
                    <input
                      value={newWorkflowName}
                      onChange={(event) =>
                        setNewWorkflowName(event.target.value)
                      }
                      placeholder={translateText("e.g. Qualified lead follow-up")}
                    />
                  </label>
                  <label>{translateText("Trigger event")}<MenuSelect
                      value={workflowFrom}
                      onChange={setWorkflowFrom}
                      options={FOLLOW_UP_LIFECYCLE.map((item) => ({
                        value: item.state,
                        label: item.label,
                      }))}
                    />
                  </label>
                  <label>{translateText("Lifecycle outcome")}<MenuSelect
                      value={workflowTo}
                      onChange={setWorkflowTo}
                      options={FOLLOW_UP_LIFECYCLE.map((item) => ({
                        value: item.state,
                        label: item.label,
                      }))}
                    />
                  </label>
                </>
              ))}
              {localizeNode((modal === "edit-workflow" ||
                (modal === "new-workflow" && workflowWizardStep === 2)) && (
                <label>{translateText("Action type")}<MenuSelect
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
              ))}
              <label>{translateText("Follow-up message")}<textarea value={workflowMessage} disabled={generating} onChange={event => setWorkflowMessage(event.target.value)} maxLength={20000} placeholder={translateText("Write the message this workflow should send")}/></label>
              <button type="button" className="af-button-secondary" disabled={generating || agentConfig.loading || Boolean(agentConfig.error) || !['email', 'whatsapp'].includes((modal === 'new-sequence' ? sequenceSteps[0]?.action : workflowAction)?.toLowerCase())} onClick={() => void generateDraft('workflow')}><Sparkles size={14}/>{generating ? 'Generating…' : 'Generate AI draft'}</button>
              {localizeNode(modal === "new-sequence" && (
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
                            id: `step-${Date.now()}`,
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
              ))}
              {localizeNode((modal !== "new-workflow" || workflowWizardStep === 2) && (
                <>
                  <label className="af-check-row">
                    <input
                      type="checkbox"
                      checked={workflowActive}
                      onChange={(event) =>
                        setWorkflowActive(event.target.checked)
                      }
                    />{localizeNode(" ")}{translateText("Activate immediately")}</label>
                  <div className="af-safety-note">
                    <ShieldCheck size={16} />
                    <span>{translateText("Messaging actions check channel consent and connection status before they run.")}</span>
                  </div>
                </>
              ))}
              {localizeNode(modal === "new-workflow" && workflowWizardStep === 1 ? (
                <div className="af-modal-actions">
                  <button
                    className="af-button-primary"
                    disabled={!newWorkflowName.trim()}
                    onClick={() => setWorkflowWizardStep(2)}
                  >{translateText("Configure action ")}<ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <div className="af-modal-actions">
                  {localizeNode(modal === "new-workflow" && (
                    <button
                      className="af-button-secondary"
                      onClick={() => setWorkflowWizardStep(1)}
                    >{translateText("Back")}</button>
                  ))}
                  <button
                    className="af-button-primary"
                    disabled={!newWorkflowName.trim()}
                    onClick={addWorkflow}
                  >
                    {localizeNode(modal === "edit-workflow"
                      ? "Save changes"
                      : modal === "new-sequence"
                        ? "Save sequence"
                        : "Create workflow")}
                  </button>
                </div>
              ))}
            </div>
          ))}
          {localizeNode(modal === "knowledge-source" && (
            <div className="af-modal-form">
              <label>{translateText("Source type")}<MenuSelect
                  value={knowledgeType}
                  onChange={(value) => {
                    setKnowledgeType(value as "url" | "file" | "text" | "instructions");
                    setKnowledgeFile(null);
                    setKnowledgeValue("");
                    setKnowledgeFileName("");
                  }}
                  options={[
                    {
                      value: "instructions",
                      label: (
                        <>
                          <Link2 size={14} />{translateText(" Instructions")}</>
                      ),
                    },
                    {
                      value: "file",
                      label: (
                        <>
                          <FileText size={14} />{translateText(" File upload")}</>
                      ),
                    },
                    {
                      value: "text",
                      label: (
                        <>
                          <ScanText size={14} />{translateText(" Text snippet")}</>
                      ),
                    },
                  ]}
                />
              </label>
              <label>{translateText("Source name")}<input
                  value={knowledgeName}
                  onChange={(event) => setKnowledgeName(event.target.value)}
                  placeholder={translateText("e.g. Pricing and membership")}
                />
              </label>
              {localizeNode(knowledgeType === "url" && (
                <label>{translateText("Website URL")}<input
                    type="url"
                    value={knowledgeValue}
                    onChange={(event) => setKnowledgeValue(event.target.value)}
                    placeholder={translateText("https://example.com/services")}
                  />
                </label>
              ))}
              {localizeNode((knowledgeType === "text" || knowledgeType === "instructions") && (
                <label>{translateText("Text snippet")}<textarea
                    value={knowledgeValue}
                    onChange={(event) => setKnowledgeValue(event.target.value)}
                    placeholder={translateText("Paste verified business information for the assistant...")}
                  />
                </label>
              ))}
              {localizeNode(knowledgeType === "file" && (
                <label>{translateText("Choose document")}<input
                    type="file"
                    accept=".pdf,.txt,.md,.csv"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      setKnowledgeFile(file ?? null);
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
              ))}
              <div className="af-safety-note">
                <ShieldCheck size={16} />
                <span>{translateText("Only verified business content should be added. TXT, MD, CSV and PDF files are uploaded securely and indexed in the background.")}</span>
              </div>
              <button
                className="af-button-primary"
                disabled={uploading || api.loading || Boolean(api.error)}
                onClick={saveKnowledgeSource}
              >
                <Plus size={14} />{uploading ? "Uploading…" : translateText(" Add to Knowledge Base")}</button>
            </div>
          ))}
          {localizeNode(modal === "template" && (
            <div className="af-modal-form">
              <label>{translateText("Template title")}<input
                  value={templateTitle}
                  onChange={(event) => setTemplateTitle(event.target.value)}
                  placeholder={translateText("e.g. Friendly appointment follow-up")}
                />
              </label>
              <label>{translateText("Category")}<MenuSelect
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
              <label>{translateText("Prompt instructions")}<textarea
                  value={templatePrompt}
                  onChange={(event) => setTemplatePrompt(event.target.value)}
                  placeholder={translateText("Describe the assistant's response goal, tone, and boundaries...")}
                />
              </label>
              <label>{translateText("Variable tags")}<input
                  value={templateVariables}
                  onChange={(event) => setTemplateVariables(event.target.value)}
                  placeholder={translateText("{customer_name}, {appointment_time}")}
                />
              </label>
              <div className="af-modal-copy">{translateText("Use variable tags such as ")}<code>{"{customer_name}"}</code>{translateText(" in your prompt. Consent is checked when a message is sent.")}</div>
              <button className="af-button-primary" onClick={saveTemplate}>
                <Save size={14} />{localizeNode(" ")}
                {localizeNode(editingTemplateId
                  ? "Save template changes"
                  : "Create prompt template")}
              </button>
            </div>
          ))}
          {localizeNode(modal === "channel" && (
            <div className="af-modal-form">
              <p className="af-modal-copy">{translateText("These preferences control automation. Authorize your messaging accounts in Settings → Integrations.")}</p>
              <label>{translateText("Channel status")}<MenuSelect
                  value={channelsOn[selectedChannel] ? "Connected" : "Paused"}
                  onChange={(value) => void changeChannel(selectedChannel, value === "Connected")}
                  options={["Connected", "Paused"].map((item) => ({
                    value: item,
                    label: item,
                  }))}
                />
              </label>
              <label>{translateText("Consent policy")}<MenuSelect
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
              >{translateText("Save channel settings")}</button>
            </div>
          ))}
        </Modal>
      ))}{localizeNode(" ")}
    </main>
  );
};

export default AIFollowUp;
