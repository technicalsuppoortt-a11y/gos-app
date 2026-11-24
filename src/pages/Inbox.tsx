import { useCloudState, useEntities } from '../backend/workspace';
import { backendError } from '../backend/firebase';
import { gosApi } from '../backend/gosApi';
import { useGosAI } from '../backend/useGosAI';
import { useGosInbox } from '../backend/useGosInbox';
import { api as channelsApi } from './flow-builder/api';
import { localDemoEnabled, useDemoState } from '../backend/localDemo';
import { useSupportRouting } from '../backend/supportRouting';
import { isSupportMemberRole } from '../pages/settings/localState';
import { matchesLocalizedSearch } from '../utils/arabicSearch';
import { useUILanguage, translateText, localizeNode } from '../i18n/display';
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BellOff,
  Bot,
  CalendarDays,
  Check,
  CheckCheck,
  CircleAlert,
  Clock3,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleCheck,
  CornerDownRight,
  ExternalLink,
  FileText,
  LayoutTemplate,
  Link2,
  LoaderCircle,
  Mail,
  MailOpen,
  MapPin,
  MessageCircle,
  MessageSquarePlus,
  Mic,
  MoreHorizontal,
  MousePointerClick,
  Paperclip,
  Pause,
  Pencil,
  Phone,
  Play,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Star,
  StickyNote,
  Tag,
  Trash,
  UserRound,
  UserRoundCheck,
  X,
} from "lucide-react";
import type { Lead } from "../types/business";
import { showToast } from "../utils/toast";
import { Select } from "../components/ui/Select";
import { ChannelIcon } from "./inbox/ChannelIcons";
import { RemoteAttachment } from "./inbox/RemoteAttachment";
import {
  channelMeta,
  channelOrder,
  followUpRuleLabels,
  makeId,
  stages,
  tagMeta,
  demoConversations,
  demoReplyTemplates,
} from "./inbox/inboxData";
import type {
  Activity,
  ActivityKind,
  Attachment,
  ChannelId,
  Conversation,
  InboxMessageButton,
  Message,
  TagId,
  VoiceNote,
} from "./inbox/inboxData";
import "./inbox.css";

type Props = {
  selected: Lead;
  activeChannel: string;
  setActiveChannel: (value: string) => void;
  activeConversation: string;
  setActiveConversation: (value: string) => void;
  aiMode: boolean;
  setAiMode: (value: boolean) => void;
  sent: boolean;
  setSent: (value: boolean) => void;
};

type Folder = "all" | "unread" | "mine";
type ComposerMode = "reply" | "note";
const serverOwnedFields = new Set<keyof Conversation>(['id', 'messages', 'preview', 'time', 'unread']);

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
/* ------------------------------------------------------------------ */
const CARD =
  "rounded-2xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-purple-300/[0.14] dark:bg-[#13172b] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_28px_-16px_rgba(3,5,16,0.82)]";
const HEADING = "text-slate-900 dark:text-[#f6f7ff]";
const MUTED = "text-slate-500 dark:text-[#c7d0ec]";
const SUBTLE = "text-slate-400 dark:text-[#a2aed0]";
const ICON_BTN =
  "grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200/80 bg-white text-slate-500 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-600 dark:border-purple-300/[0.16] dark:bg-white/[0.04] dark:text-[#bcc6e5] dark:hover:border-purple-400/35 dark:hover:bg-purple-500/15 dark:hover:text-purple-200";
const POPOVER =
  "absolute z-40 overflow-hidden rounded-xl border border-slate-100 bg-white p-1.5 shadow-[0_18px_45px_-12px_rgba(30,27,75,0.25)] dark:border-purple-300/[0.2] dark:bg-[#171c36]";
const MENU_ITEM =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-[12.5px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white";

const popIn = {
  initial: { opacity: 0, y: 6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 4, scale: 0.98 },
  transition: { duration: 0.14, ease: "easeOut" as const },
};

const nowTime = () =>
  new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

const formatInboxTime = (value: string | undefined, language: string) => {
  if (!value) return "";
  const raw = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw;
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return raw;
  const date = new Date(ms);
  const now = new Date();
  const isAr = language.startsWith("ar");
  const locale = isAr ? "ar-EG" : "en-US";
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return isAr
      ? `أمس ${date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}`
      : `Yesterday ${date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}`;
  }
  return date.toLocaleString(locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

const bytesLabel = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const formatDuration = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

/* ------------------------------------------------------------------ */
/* Small shared primitives                                             */
/* ------------------------------------------------------------------ */
function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose, ref]);
}

function Toggle({
  checked,
  onChange,
  label,
  size = "md",
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  useUILanguage();
  const track = size === "sm" ? "h-[18px] w-8" : "h-[22px] w-10";
  const knob = size === "sm" ? "h-3.5 w-3.5" : "h-[18px] w-[18px]";
  const shift = size === "sm" ? "translate-x-[14px]" : "translate-x-[18px]";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={translateText(label)}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex shrink-0 items-center px-[2px] rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 disabled:cursor-not-allowed disabled:opacity-50 ${track} ${
        checked
          ? "bg-[#7C3AED] shadow-[0_2px_8px_-2px_rgba(124,92,252,0.6)]"
          : "bg-slate-200 dark:bg-white/15"
      }`}
    >
      <span
        className={`block ${knob} rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? shift : "translate-x-0"}`}
      />
    </button>
  );
}

function TagPill({ tag, onRemove, compact }: { tag: TagId; onRemove?: () => void; compact?: boolean }) {
  useUILanguage();
  return (
    <span
      className={`group inline-flex items-center gap-1 whitespace-nowrap rounded-md font-semibold ${
        compact ? "h-[18px] px-1.5 text-[10px]" : "h-[22px] px-2 text-[11px]"
      } ${tagMeta[tag].className}`}
    >
      {localizeNode(tagMeta[tag].label)}
      {localizeNode(onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={translateText(`Remove ${tagMeta[tag].label} tag`)}
          className="-mr-1 hidden h-4 w-4 place-items-center rounded opacity-70 hover:opacity-100 group-hover:grid"
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      ))}
    </span>
  );
}

function Avatar({
  person,
  size = 40,
  channel,
}: {
  person: { name: string; avatar?: string; initials: string };
  size?: number;
  channel?: ChannelId;
}) {
  useUILanguage();
  const badge = Math.max(14, Math.round(size * 0.42));
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {localizeNode(person.avatar ? (
        <img
          src={person.avatar}
          alt={translateText(person.name)}
          className="h-full w-full rounded-full object-cover ring-2 ring-white dark:ring-[#111522]"
          draggable={false}
        />
      ) : (
        <span
          className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] font-semibold text-white ring-2 ring-white dark:ring-[#111522]"
          style={{ fontSize: Math.round(size * 0.36) }}
        >
          {localizeNode(person.initials)}
        </span>
      ))}
      {localizeNode(channel && (
        <span
          className="absolute -bottom-0.5 -right-0.5 grid place-items-center rounded-full bg-white p-[1.5px] shadow-sm dark:bg-[#111522]"
          style={{ width: badge + 3, height: badge + 3 }}
        >
          <ChannelIcon channel={channel} size={badge} />
        </span>
      ))}
    </span>
  );
}

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <b key={index} className="font-semibold text-slate-900 dark:text-white">
        {localizeNode(part.slice(2, -2))}
      </b>
    ) : (
      <React.Fragment key={index}>{localizeNode(part)}</React.Fragment>
    ),
  );
}

function RichText({ text }: { text: string }) {
  useUILanguage();
  return (
    <div className="space-y-2.5">
      {localizeNode(text.split("\n\n").map((block, blockIndex) => {
        const lines = block.split("\n");
        const nodes: React.ReactNode[] = [];
        let list: string[] = [];
        const flush = () => {
          if (!list.length) return;
          nodes.push(
            <ul key={`ul-${nodes.length}`} className="list-disc space-y-0.5 ps-5 marker:text-slate-400">
              {localizeNode(list.map((item, i) => (
                <li key={i}>{localizeNode(renderInline(item))}</li>
              )))}
            </ul>,
          );
          list = [];
        };
        lines.forEach((line, lineIndex) => {
          if (line.startsWith("- ")) {
            list.push(line.slice(2));
            return;
          }
          flush();
          nodes.push(<p key={`p-${lineIndex}`}>{localizeNode(renderInline(line))}</p>);
        });
        flush();
        return <div key={blockIndex}>{localizeNode(nodes)}</div>;
      }))}
    </div>
  );
}

function VoicePlayer({ note, tone = "light" }: { note: VoiceNote; tone?: "light" | "brand" }) {
  useUILanguage();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <div className="flex min-w-[165px] max-w-full items-center gap-2.5 sm:min-w-[200px]">
      <audio ref={audioRef} src={note.url} onEnded={() => setPlaying(false)} className="hidden" />
      <button
        type="button"
        onClick={() => {
          const audio = audioRef.current;
          if (!audio) return;
          if (audio.paused) {
            void audio.play();
            setPlaying(true);
          } else {
            audio.pause();
            setPlaying(false);
          }
        }}
        aria-label={translateText(playing ? "Pause voice message" : "Play voice message")}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#7C3AED] text-white shadow-sm transition hover:bg-[#7C3AED]"
      >
        {localizeNode(playing ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" className="ms-0.5" />)}
      </button>
      <span className="flex h-6 flex-1 items-center gap-[2px]">
        {localizeNode(Array.from({ length: 28 }, (_, i) => (
          <i
            key={i}
            className={`w-[3px] rounded-full ${tone === "brand" ? "bg-purple-300" : "bg-slate-300"} ${playing ? "animate-pulse" : ""}`}
            style={{ height: `${5 + ((i * 7) % 15)}px` }}
          />
        )))}
      </span>
      <small className={`text-[11px] tabular-nums ${MUTED}`}>{localizeNode(formatDuration(note.duration))}</small>
    </div>
  );
}

const activityStyle: Record<ActivityKind, { icon: React.ElementType; className: string }> = {
  ai: { icon: Bot, className: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300" },
  customer: { icon: MessageCircle, className: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" },
  tag: { icon: Tag, className: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" },
  created: { icon: MessageSquarePlus, className: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300" },
  agent: { icon: Send, className: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300" },
  note: { icon: StickyNote, className: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300" },
  handoff: { icon: UserRoundCheck, className: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300" },
};

/* ------------------------------------------------------------------ */
/* Inbox page                                                          */
/* ------------------------------------------------------------------ */
export const Inbox: React.FC<Props> = ({ aiMode, setAiMode, setSent }) => {
  const language = useUILanguage();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const allCrmLeads = useSelector((state: RootState) => state.crm.leads);
  const crmLead = allCrmLeads.find(lead => lead.id === params.get('leadId'));
  const requestedConvId = params.get('conversationId') || '';
  const requestedChannel = params.get('channel');
  const linkedChannel: ChannelId = channelOrder.includes(requestedChannel as ChannelId) ? requestedChannel as ChannelId : 'webchat';
  const authUser = useSelector((state: RootState) => state.auth.user);
  const currentUser = { id: authUser?.id ?? '', name: authUser?.name ?? '', initials: (authUser?.name ?? '').slice(0,2), avatar: authUser?.avatar };

  const {
    members: workspaceMembers,
    getShiftStatus,
    findAssignment,
    routeRecord,
    manualAssign,
    updateMeta,
  } = useSupportRouting();
  const teamMembers = useMemo(() => {
    const seen = new Set<string>();
    const list: {
      id: string;
      name: string;
      email?: string;
      role?: string;
      initials: string;
      avatar?: string;
      isSupport?: boolean;
      onShift?: boolean;
      allocation?: number;
    }[] = [];
    const pushMember = (item: (typeof list)[number]) => {
      if (!item.name.trim()) return;
      const key = (item.email || item.id || item.name).trim().toLowerCase();
      if (seen.has(key) || list.some(x => x.name.trim().toLowerCase() === item.name.trim().toLowerCase())) return;
      seen.add(key);
      list.push(item);
    };
    if (currentUser.name) {
      const meWs = workspaceMembers.find(
        m => m.id === currentUser.id || m.authUid === currentUser.id || (authUser?.email && m.email?.toLowerCase() === authUser.email.toLowerCase()),
      );
      const isSup = meWs ? isSupportMemberRole(meWs) : false;
      pushMember({
        ...currentUser,
        email: authUser?.email,
        role: meWs?.role || authUser?.teamRole || 'Owner',
        isSupport: isSup,
        onShift: meWs && isSup ? getShiftStatus(meWs).onShift : true,
        allocation: meWs?.leadAllocationPercent,
      });
    }
    for (const m of workspaceMembers) {
      if (m.active === false || !m.name) continue;
      const isSup = !m.isOwner && m.role !== 'Owner' && isSupportMemberRole(m);
      pushMember({
        id: m.authUid || m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        initials: m.name.slice(0, 2).toUpperCase(),
        avatar: undefined,
        isSupport: isSup,
        onShift: isSup ? getShiftStatus(m).onShift : true,
        allocation: m.leadAllocationPercent,
      });
    }
    return list.length ? list : [{ ...currentUser } as (typeof list)[number]];
  }, [workspaceMembers, currentUser.id, currentUser.name, currentUser.avatar, authUser?.email, authUser?.teamRole, getShiftStatus]);
  const liveTemplates = useEntities<{ title: string; prompt?: string; content?: string }>('templates').map(item => ({ title: item.title, body: item.prompt || item.content || '' }));
  const [apiSelectedId, setApiSelectedId] = useState('');
  const explicitDemo = import.meta.env.VITE_LOCAL_DEMO === 'true';
  const gosAI = useGosAI();
  const inboxApi = useGosInbox(!explicitDemo, apiSelectedId);
  const initialConversations = inboxApi.conversations;
  const demoInbox = explicitDemo;
  const isAr = language.startsWith('ar');
  const [aiReplySending, setAiReplySending] = useState(false);
  const samples = useMemo(() => demoConversations(currentUser.name || 'Alex Morgan'), [currentUser.name]);
  const [localConversations, setLocalConversations] = useDemoState<Conversation[]>('inbox', samples);
  const replyTemplates = demoInbox && !liveTemplates.length ? demoReplyTemplates : liveTemplates;
  const linkedConversation: Conversation | undefined = crmLead ? initialConversations.find(c => c.email === crmLead.email && (!requestedChannel || c.channel === linkedChannel)) ?? {
    id: `crm-${crmLead.id}-${linkedChannel}`, name: crmLead.name, initials: crmLead.avatar, channel: linkedChannel,
    preview: 'No messages yet', time: 'Just now', unread: 0, tags: [], stage: crmLead.lifecycleStage,
    source: crmLead.source, phone: crmLead.phone ?? '', email: crmLead.email, location: '', assignee: crmLead.owner,
    aiAutoReply: false, takenOver: true, followUp: Boolean(crmLead.nextFollowUp), followUpRules: [], starred: false, messages: [], activity: [],
  } : undefined;
  const [liveOverrides, setLiveOverrides] = useState<Record<string, Partial<Conversation>>>({});
  const [archivedLiveIds, setArchivedLiveIds] = useState<Set<string>>(() => new Set());
  const [pendingReplies, setPendingReplies] = useState<Record<string, Message[]>>({});
  // The connected channels decide which filters show, and keep the inbox open while it is still empty.
  const [connectedChannels, setConnectedChannels] = useState<ChannelId[] | null>(null);
  useEffect(() => {
    if (demoInbox) return;
    channelsApi.channels()
      .then(list => setConnectedChannels(list.filter(c => c.status === 'connected').map(c => c.channel as ChannelId).filter(id => channelOrder.includes(id))))
      .catch(() => setConnectedChannels(null));
  }, [demoInbox]);
  const matchLeadForConv = (c: Pick<Conversation, 'id' | 'email' | 'phone' | 'name'>) => {
    const email = (c.email || '').trim().toLowerCase();
    const phone = (c.phone || '').replace(/[^\d+]/g, '');
    return allCrmLeads.find(lead => {
      if (c.id.startsWith(`crm-${lead.id}-`)) return true;
      if (email && lead.email?.trim().toLowerCase() === email) return true;
      if (phone && phone.length >= 6 && (lead.phone || '').replace(/[^\d+]/g, '') === phone) return true;
      return false;
    });
  };
  const conversations = useMemo(() => {
    const base = demoInbox ? localConversations : inboxApi.conversations;
    const withLinked = linkedConversation && !base.some(c => c.id === linkedConversation.id)
      ? [linkedConversation, ...base]
      : base;
    return withLinked
      /* Facebook channel disabled across Inbox */
      .filter(c => c.channel !== 'facebook' && !archivedLiveIds.has(c.id))
      .map(c => {
        const localPatch = demoInbox ? undefined : liveOverrides[c.id];
        const matchedLead = matchLeadForConv(c);
        const unified = findAssignment({
          conversationId: c.id,
          leadId: matchedLead?.id,
          email: c.email,
          phone: c.phone,
        });
        const patched = localPatch ? { ...c, ...localPatch } : c;
        // Replies on their way to the customer show at once, until the server copy arrives.
        const pending = demoInbox ? [] : (pendingReplies[c.id] || []).filter(p => p.status === 'sending' || !c.messages.some(m => m.sender === 'agent' && m.text === p.text && Date.parse(m.time) >= Date.parse(p.time) - 60000));
        const merged = pending.length ? { ...patched, messages: [...patched.messages, ...pending], preview: pending.at(-1)?.text || patched.preview } : patched;
        const resolvedAssignee =
          unified?.assignedAgentName ||
          (matchedLead?.assignedAgentName && matchedLead.assignedAgentName !== 'Unassigned' ? matchedLead.assignedAgentName : '') ||
          (matchedLead?.owner && matchedLead.owner !== 'Unassigned' ? matchedLead.owner : '') ||
          merged.assignee;
        const validTags = Array.isArray(unified?.tags)
          ? unified!.tags!.filter((t): t is TagId => t in tagMeta)
          : undefined;
        return {
          ...merged,
          assignee: resolvedAssignee || merged.assignee,
          takenOver: typeof unified?.takenOver === 'boolean' ? unified.takenOver : merged.takenOver,
          aiAutoReply: typeof unified?.aiAutoReply === 'boolean' ? unified.aiAutoReply : merged.aiAutoReply,
          stage: unified?.stage || merged.stage,
          tags: validTags && validTags.length ? validTags : merged.tags,
        };
      });
  }, [demoInbox, localConversations, inboxApi.conversations, linkedConversation, archivedLiveIds, liveOverrides, pendingReplies, allCrmLeads, findAssignment]);
  // Connected channels, plus any channel that already has conversations, so old threads stay reachable.
  const visibleChannels = demoInbox || !connectedChannels ? channelOrder : channelOrder.filter(id => connectedChannels.includes(id) || conversations.some(c => c.channel === id));
  const setConversations: typeof setLocalConversations = demoInbox
    ? setLocalConversations
    : (updater) => {
        const nextList = typeof updater === 'function' ? updater(conversations) : updater;
        const nextIds = new Set(nextList.map(item => item.id));
        const removed = conversations.filter(item => !nextIds.has(item.id)).map(item => item.id);
        if (removed.length) {
          setArchivedLiveIds(prev => {
            const copy = new Set(prev);
            removed.forEach(id => copy.add(id));
            return copy;
          });
        }
        // Keep only the fields the user changed here. Messages, preview, time and unread come from the
        // server, so a local copy of them would hide new messages until the page reloads.
        const current = new Map(conversations.map(item => [item.id, item]));
        setLiveOverrides(prev => {
          const next = { ...prev };
          nextList.forEach(item => {
            const before = current.get(item.id);
            const patch: Partial<Conversation> = {};
            (Object.keys(item) as (keyof Conversation)[]).forEach(key => {
              if (serverOwnedFields.has(key) || (before && before[key] === item[key])) return;
              (patch as Record<string, unknown>)[key] = item[key];
            });
            if (Object.keys(patch).length) next[item.id] = { ...(next[item.id] || {}), ...patch };
          });
          return next;
        });
      };
  const [activeId, setActiveId] = useState(() => requestedConvId || linkedConversation?.id || initialConversations[0]?.id || '');
  useEffect(() => { setApiSelectedId(activeId); }, [activeId]);
  useEffect(() => {
    if (requestedConvId && conversations.some(c => c.id === requestedConvId)) {
      setActiveId(requestedConvId);
    } else if (linkedConversation?.id && conversations.some(c => c.id === linkedConversation.id)) {
      setActiveId(linkedConversation.id);
    } else if (!activeId && conversations[0]?.id) {
      setActiveId(conversations[0].id);
    }
  }, [requestedConvId, linkedConversation?.id, conversations, activeId]);
  const [channelFilter, setChannelFilter] = useState<ChannelId | "all">(() => requestedChannel && crmLead ? linkedChannel : 'all');
  const [folder, setFolder] = useState<Folder>("all");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<TagId[]>([]);

  const [filterOpen, setFilterOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(false);
  const [leadMenuOpen, setLeadMenuOpen] = useState(false);
  const [mobileInboxPane, setMobileInboxPane] = useState<"list" | "thread" | "details">(() => (requestedConvId || linkedConversation?.id ? "thread" : "list"));

  const [mode, setMode] = useState<ComposerMode>("reply");
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [replyButtons, setReplyButtons] = useState<InboxMessageButton[]>([]);
  const [buttonsEditorOpen, setButtonsEditorOpen] = useState(false);
  const [assistLoading, setAssistLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState<VoiceNote | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const filterRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const templatesRef = useRef<HTMLDivElement>(null);
  const tagMenuRef = useRef<HTMLDivElement>(null);
  const assigneeRef = useRef<HTMLDivElement>(null);
  const leadMenuRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const cancelRecordingRef = useRef(false);
  const elapsedRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const objectUrlsRef = useRef(new Set<string>());

  useClickOutside(filterRef, filterOpen, () => setFilterOpen(false));
  useClickOutside(moreRef, moreOpen, () => setMoreOpen(false));
  useClickOutside(templatesRef, templatesOpen, () => setTemplatesOpen(false));
  useClickOutside(tagMenuRef, tagMenuOpen, () => setTagMenuOpen(false));
  useClickOutside(assigneeRef, assigneeOpen, () => setAssigneeOpen(false));
  useClickOutside(leadMenuRef, leadMenuOpen, () => setLeadMenuOpen(false));

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0] ?? { id: '', name: '', initials: '', channel: 'webchat', preview: '', time: '', unread: 0, tags: [], stage: '', source: '', phone: '', email: '', location: '', assignee: '', aiAutoReply: false, takenOver: true, followUp: false, followUpRules: [], starred: false, messages: [], activity: [] } as Conversation;
  const activeMatchedLead = useMemo(() => (active.id ? matchLeadForConv(active) : undefined), [active, allCrmLeads]);
  const readyKnowledgeCount = useMemo(
    () => gosAI.sources.filter((s) => s.status === 'ready' && s.type !== 'instructions').length,
    [gosAI.sources],
  );
  const workspaceAiLive = demoInbox ? aiMode : Boolean(gosAI.assistant.live_enabled);
  const activeChannelKey = active.channel === 'email' ? 'webchat' : active.channel;
  const activeChannelLive = demoInbox ? true : Boolean(gosAI.assistant.channels?.[activeChannelKey]);
  const aiReplying = workspaceAiLive && activeChannelLive && active.aiAutoReply && !active.takenOver;

  useEffect(() => {
    if (!demoInbox && !gosAI.loading && gosAI.assistant.live_enabled !== aiMode) {
      setAiMode(Boolean(gosAI.assistant.live_enabled));
    }
  }, [demoInbox, gosAI.loading, gosAI.assistant.live_enabled]);

  const toggleWorkspaceAi = async (value: boolean) => {
    if (demoInbox) {
      setAiMode(value);
      showToast.success(value ? translateText("AI replies resumed across all channels.") : translateText("AI replies paused across all channels."));
      return;
    }
    if (value && readyKnowledgeCount === 0) {
      showToast.error(isAr ? 'ارفع ودرّب قاعدة المعرفة أولاً حتى يتمكن الذكاء الاصطناعي من الرد.' : translateText('Upload and train your Knowledge Base first before going live.'));
      return;
    }
    const ok = await gosAI.updateAssistant({ live_enabled: value });
    if (ok) {
      setAiMode(value);
      showToast.success(
        value
          ? (isAr ? 'تم تفعيل الرد التلقائي بالذكاء الاصطناعي.' : translateText('AI auto-replies are now live across enabled channels.'))
          : (isAr ? 'تم إيقاف الرد التلقائي مؤقتاً.' : translateText('AI auto-replies paused workspace-wide.')),
      );
    }
  };

  const enableActiveChannelAi = async () => {
    if (demoInbox) return;
    try {
      await gosApi.updateChannel(activeChannelKey, true);
      const ok = await gosAI.updateAssistant({
        live_enabled: true,
        channels: { ...gosAI.assistant.channels, [activeChannelKey]: true },
      });
      if (ok) {
        setAiMode(true);
        showToast.success(isAr ? `تم تفعيل الرد التلقائي لقناة ${channelMeta[active.channel].label}.` : `AI auto-reply enabled for ${channelMeta[active.channel].label}.`);
      }
    } catch (error) {
      showToast.error(backendError(error));
    }
  };

  const triggerAiReplyNow = async () => {
    if (!active.id || aiReplySending) return;
    setAiReplySending(true);
    try {
      const res = await gosApi.triggerConversationAiReply(active.id);
      if (res.outcome === 'handoff' || !res.message) {
        showToast.info(
          isAr
            ? 'لم يجد الذكاء الاصطناعي إجابة مطابقة في قاعدة المعرفة لهذه الرسالة — أضف المعلومة لقاعدة المعرفة أو رد يدوياً.'
            : translateText('No matching answer was found in your Knowledge Base for this message — add it to Knowledge or reply manually.'),
        );
      } else {
        updateActive({ aiAutoReply: true, takenOver: false, aiState: 'answered' });
        showToast.success(isAr ? 'تم إرسال رد الذكاء الاصطناعي من قاعدة المعرفة!' : translateText('AI reply sent from your Knowledge Base!'));
      }
      inboxApi.retry();
    } catch (error) {
      showToast.error(backendError(error));
    } finally {
      setAiReplySending(false);
    }
  };

  const channelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: conversations.length };
    channelOrder.forEach((id) => {
      counts[id] = conversations.filter((c) => c.channel === id).length;
    });
    return counts;
  }, [conversations]);

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unread, 0),
    [conversations],
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (channelFilter !== "all" && c.channel !== channelFilter) return false;
      if (folder === "unread" && c.unread === 0) return false;
      if (folder === "mine") {
        const matched = matchLeadForConv(c);
        const unified = findAssignment({ conversationId: c.id, leadId: matched?.id, email: c.email, phone: c.phone });
        const assignedByName = (c.assignee || '').trim().toLowerCase() === (currentUser.name || '').trim().toLowerCase();
        const assignedById = Boolean(currentUser.id && unified?.assignedTo === currentUser.id);
        if (!assignedByName && !assignedById) return false;
      }
      if (tagFilter.length && !c.tags.some((t) => tagFilter.includes(t))) return false;
      if (query && !matchesLocalizedSearch(search, [c.name, c.preview, c.email, c.assignee])) return false;
      return true;
    });
  }, [channelFilter, conversations, folder, search, tagFilter, currentUser.id, currentUser.name, findAssignment, allCrmLeads, language]);

  // Switching to a channel tab must not leave another channel's thread open.
  useEffect(() => {
    if (channelFilter === 'all') return;
    const current = conversations.find((c) => c.id === activeId);
    if (current?.channel === channelFilter) return;
    const next = visible[0]?.id;
    if (next && next !== activeId) setActiveId(next);
  }, [channelFilter, visible]);

  /* ---------------- helpers ---------------- */
  const updateActive = (patch: Partial<Conversation> | ((c: Conversation) => Partial<Conversation>)) =>
    setConversations((list) =>
      list.map((c) =>
        c.id === active.id ? { ...c, ...(typeof patch === "function" ? patch(c) : patch) } : c,
      ),
    );

  const logActivity = (kind: ActivityKind, text: string) =>
    updateActive((c) => ({
      activity: [{ id: makeId("a"), kind, text, time: "Just now" } as Activity, ...c.activity],
    }));

  const makeObjectUrl = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    objectUrlsRef.current.add(url);
    return url;
  };

  const selectConversation = (id: string) => {
    setActiveId(id);
    if (demoInbox) setConversations((list) => list.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    setDraft("");
    setMode("reply");
    setEditingLead(false);
    setMobileInboxPane("thread");
  };

  /* ---------------- effects ---------------- */
  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [active.id, active.messages.length]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  /* ---------------- composer actions ---------------- */
  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const next = Array.from(files).map((file) => ({
      id: makeId("f"),
      name: file.name,
      size: file.size,
      url: makeObjectUrl(file),
      isImage: file.type.startsWith("image/"),
    }));
    setAttachments((current) => [...current, ...next]);
  };

  const removeAttachment = (id: string) =>
    setAttachments((current) => current.filter((item) => item.id !== id));

  const startRecording = async () => {
    if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined") {
      showToast.error("Voice recording isn't supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      cancelRecordingRef.current = false;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (!cancelRecordingRef.current && chunksRef.current.length) {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          setVoiceDraft({ url: makeObjectUrl(blob), duration: Math.max(1, elapsedRef.current) });
        }
        setRecording(false);
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        timerRef.current = null;
      };
      recorder.start();
      elapsedRef.current = 0;
      setElapsed(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }, 1000);
    } catch {
      showToast.error("Microphone access was blocked. Check your browser permissions.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const cancelRecording = () => {
    cancelRecordingRef.current = true;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setRecording(false);
    setVoiceDraft(null);
    setElapsed(0);
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const canSend = !sending && Boolean(draft.trim() || attachments.length || voiceDraft);

  // Shows the reply as "Sending…" at once; a rejected reply stays in the thread with Meta's reason and a retry.
  const deliverReply = async (conversationId: string, text: string, messageId: string, buttons: InboxMessageButton[] = []) => {
    const cleanButtons = buttons
      .map((b, idx) => ({
        id: b.id || `staff_btn_${idx + 1}`,
        title: b.title.trim().slice(0, 20),
        kind: b.kind === 'url' && b.url?.trim() ? ('url' as const) : ('reply' as const),
        url: b.kind === 'url' && b.url?.trim() ? b.url.trim() : null,
      }))
      .filter((b) => b.title.length > 0)
      .slice(0, 3);
    const put = (patch: Partial<Message>) => setPendingReplies(prev => {
      const list = prev[conversationId] || [];
      const base: Message = { id: messageId, sender: 'agent', text, time: new Date().toISOString(), ...(cleanButtons.length ? { buttons: cleanButtons } : {}) };
      const exists = list.some(m => m.id === messageId);
      return { ...prev, [conversationId]: exists ? list.map(m => (m.id === messageId ? { ...m, ...patch } : m)) : [...list, { ...base, ...patch }] };
    });
    put({ status: 'sending', error: undefined });
    setSending(true);
    try {
      await gosApi.replyToConversation(conversationId, text, cleanButtons);
      // The server copy replaces this one on the next refresh.
      put({ status: undefined });
      setSent(true);
      inboxApi.retry();
    } catch (error) {
      const reason = backendError(error);
      put({ status: 'failed', error: reason });
      showToast.error(reason);
    } finally { setSending(false); }
  };
  const dismissFailedReply = (conversationId: string, messageId: string) =>
    setPendingReplies(prev => ({ ...prev, [conversationId]: (prev[conversationId] || []).filter(m => m.id !== messageId) }));

  const send = async () => {
    if (!canSend) return;
    const text = draft.trim();
    const requestId = crypto.randomUUID();
    const attachedButtons = replyButtons.filter((b) => b.title.trim().length > 0).slice(0, 3);
    if (!demoInbox) {
      // The API sends text replies (with optional interactive buttons); notes, files and voice notes stay demo-only for now.
      if (mode === 'note' || attachments.length || voiceDraft || !text) { showToast.info('Only text replies can be sent to customers for now.'); return; }
      setSending(true);
      const conversationId = active.id;
      setDraft('');
      setReplyButtons([]);
      setButtonsEditorOpen(false);
      await deliverReply(conversationId, text, requestId, attachedButtons);
      return;
    }
    const message: Message = {
      id: requestId,
      sender: mode === "note" ? "note" : "agent",
      text: text || undefined,
      time: nowTime(),
      attachments: attachments.length ? attachments : undefined,
      voice: voiceDraft ?? undefined,
      ...(mode === "reply" && attachedButtons.length ? { buttons: attachedButtons } : {}),
    };
    updateActive((c) => ({
      messages: [...c.messages, message],
      ...(mode === "reply"
        ? {
            preview: text || (voiceDraft ? "🎤 Voice message" : `📎 ${attachments.length} attachment${attachments.length > 1 ? "s" : ""}`),
            time: "Just now",
          }
        : {}),
      activity: [
        {
          id: makeId("a"),
          kind: mode === "note" ? "note" : "agent",
          text: mode === "note" ? "Internal note added" : demoInbox ? "Demo reply saved locally" : "Message queued for delivery",
          time: "Just now",
        },
        ...c.activity,
      ],
    }));
    setDraft("");
    setAttachments([]);
    setReplyButtons([]);
    setButtonsEditorOpen(false);
    setVoiceDraft(null);
    setElapsed(0);
    if (mode === "reply") setSent(true);
    if (mode === 'reply' && demoInbox) showToast.info('Demo reply saved locally');
  };

  const runAiAssist = async () => {
    if (assistLoading) return;
    if (demoInbox) {
      setDraft(active.id === 'demo-sarah'
        ? 'Yes, Sarah! The discovery call is online and takes about 30 minutes. I’ll send the meeting details once we confirm Thursday at 2 PM Cairo time. Feel free to bring any questions about your launch.'
        : active.id === 'demo-omar' ? demoReplyTemplates[1].body : demoReplyTemplates[2].body);
      showToast.info('Demo draft ready for review');
      return;
    }
    setAssistLoading(true);
    try {
      const result = await gosApi.smartReply([...active.messages].reverse().find(message => message.sender === 'customer')?.text || 'What services do you offer?');
      setDraft(result.test.answer || 'A teammate will follow up.'); showToast.info('Draft outcome: ' + result.test.outcome); showToast.success('AI draft ready for review');
    } catch (error) { showToast.error(backendError(error)); } finally { setAssistLoading(false); }
  };

  const addTag = (tag: TagId) => {
    updateActive((c) => ({ tags: [...c.tags, tag] }));
    logActivity("tag", `Tag added: ${tagMeta[tag].label}`);
    void updateMeta({
      conversationId: active.id,
      leadId: activeMatchedLead?.id,
      customerName: active.name || 'Visitor',
      customerEmail: active.email,
      customerPhone: active.phone,
      patch: { tags: [...new Set([...active.tags, tag])] },
    });
    setTagMenuOpen(false);
  };

  const removeTag = (tag: TagId) => {
    updateActive((c) => ({ tags: c.tags.filter((t) => t !== tag) }));
    logActivity("tag", `Tag removed: ${tagMeta[tag].label}`);
    void updateMeta({
      conversationId: active.id,
      leadId: activeMatchedLead?.id,
      customerName: active.name || 'Visitor',
      customerEmail: active.email,
      customerPhone: active.phone,
      patch: { tags: active.tags.filter(t => t !== tag) },
    });
  };

  const toggleTakeover = async () => {
    const takingOver = !active.takenOver;
    updateActive({ takenOver: takingOver, aiAutoReply: !takingOver, aiState: takingOver ? 'human_takeover' : 'answered' });
    if (!demoInbox && active.id && !active.id.startsWith('crm-')) {
      try {
        await gosApi.setConversationAi(active.id, !takingOver);
      } catch (error) {
        showToast.error(backendError(error));
      }
    }
    if (takingOver) {
      void routeRecord({
        trigger: 'handoff',
        conversationId: active.id,
        leadId: activeMatchedLead?.id,
        customerName: active.name || 'Visitor',
        customerEmail: active.email,
        customerPhone: active.phone,
        channel: active.channel,
      }).then(routed => {
        if (routed?.assignedAgentName) {
          updateActive({
            assignee: routed.assignedAgentName,
            takenOver: true,
            aiAutoReply: false,
          });
          if (routed.assignedAgentName.trim().toLowerCase() !== currentUser.name.trim().toLowerCase()) {
            logActivity('handoff', `Routed to ${routed.assignedAgentName}`);
            showToast.info(`${translateText('Routed to')} ${routed.assignedAgentName}`);
          }
        }
      });
    } else {
      void updateMeta({
        conversationId: active.id,
        leadId: activeMatchedLead?.id,
        customerName: active.name || 'Visitor',
        customerEmail: active.email,
        customerPhone: active.phone,
        patch: { takenOver: false, aiAutoReply: true },
      });
    }
    logActivity("handoff", takingOver ? `${currentUser.name} took over` : "Conversation handed back to AI");
    showToast.success(
      takingOver
        ? (isAr ? `أنت تتولى الرد على ${active.name.split(" ")[0]} الآن.` : `You're now handling ${active.name.split(" ")[0]}'s conversation.`)
        : (isAr ? "تمت إعادة المحادثة للرد التلقائي بالذكاء الاصطناعي." : translateText("AI is handling this conversation again.")),
    );
    if (takingOver) inputRef.current?.focus();
  };

  const archiveActive = async () => {
    if (!active.id) return;
    if (!confirm(`Delete the conversation with ${active.name}?`)) return;
    if (!demoInbox) {
      try {
        await gosApi.deleteConversation(active.id);
      } catch (e) {
        showToast.error((e as Error).message || 'Could not delete the conversation.');
        return;
      }
    }
    const remaining = conversations.filter((c) => c.id !== active.id);
    setConversations(remaining);
    setActiveId(remaining[0]?.id ?? '');
    setMobileInboxPane("list");
    setMoreOpen(false);
    showToast.success(`Conversation with ${active.name} deleted.`);
  };

  const isInitialInboxLoading = !demoInbox && inboxApi.initialLoading && !conversations.length;
  if (isInitialInboxLoading) {
    return (
      <InboxWorkspaceSkeleton
        cardClass={CARD}
        loadingLabel={language === 'ar' ? 'جاري تحميل المحادثات...' : translateText('Loading conversations...')}
      />
    );
  }
  if (!conversations.length && !connectedChannels?.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="flex h-full w-full min-h-0 min-w-0 flex-col items-center justify-center gap-3 px-5 text-center"
      >
        <h2>{language === 'ar' ? 'لا توجد محادثات بعد' : translateText("No conversations yet")}</h2>
        <p className="w-full max-w-sm whitespace-normal break-words">{language === 'ar' ? 'ستظهر هنا رسائل العملاء من القنوات المربوطة فور وصولها.' : translateText("Customer messages from your connected channels will appear here as soon as they arrive.")}</p>
        <button className="button-primary" onClick={() => navigate('/dashboard/settings/integrations')}>{language === 'ar' ? 'إدارة القنوات' : translateText("Manage channels")}</button>
      </motion.div>
    );
  }
  const assigneeMember =
    teamMembers.find(m => m.name.trim().toLowerCase() === (active.assignee || '').trim().toLowerCase()) ??
    (active.assignee
      ? { id: 'assigned', name: active.assignee, initials: active.assignee.slice(0, 2).toUpperCase() }
      : teamMembers[0]);
  const availableTags = (Object.keys(tagMeta) as TagId[]).filter((t) => !active.tags.includes(t));

  /* ------------------------------------------------------------------ */
  return (
    <div data-mobile-pane={mobileInboxPane} className="inbox-root flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-3 overflow-hidden bg-slate-50/50 p-3 dark:bg-transparent">
      {!demoInbox && inboxApi.error && <div role="alert" className={CARD + ' p-3'}>{inboxApi.error} <button onClick={inboxApi.retry}>{translateText("Retry")}</button></div>}
      {!demoInbox && inboxApi.initialLoading && <div role="status" className="sr-only" aria-label={translateText("Loading conversations")} />}
      {/* ============ Channel filter strip ============ */}
      <div className={`${CARD} inbox-channel-strip flex h-[54px] shrink-0 items-center gap-2 sm:gap-3 px-2.5`}>
        <div className="inbox-scroll-x flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" role="tablist" aria-label={translateText("Filter by channel")}>
          {localizeNode((["all", ...visibleChannels] as const).map((id) => {
            const isActive = channelFilter === id;
            return (
              <button
                key={id}
                id={`inbox-channel-${id}`}
                role="tab"
                aria-selected={isActive}
                onClick={() => setChannelFilter(id)}
                className={`relative flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-[13px] font-semibold transition ${
                  isActive
                    ? "text-purple-700 dark:text-purple-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5"
                }`}
              >
                {localizeNode(isActive && (
                  <motion.span
                    layoutId="inbox-channel-pill"
                    className="absolute inset-0 rounded-xl bg-purple-50 ring-1 ring-inset ring-purple-200/70 dark:bg-purple-500/15 dark:ring-purple-400/25"
                    transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
                  />
                ))}
                <span className="relative z-10 flex items-center gap-2">
                  {localizeNode(id === "all" ? (
                    <span className="grid h-5 w-5 place-items-center rounded-md bg-purple-100 text-purple-600 dark:bg-purple-500/25 dark:text-purple-200">
                      <MessageCircle size={12} strokeWidth={2.5} />
                    </span>
                  ) : (
                    <ChannelIcon channel={id} size={18} />
                  ))}
                  {localizeNode(id === "all" ? "All" : channelMeta[id].label)}
                  <span
                    className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
                      isActive
                        ? "bg-[#7C3AED] text-white"
                        : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
                    }`}
                  >
                    {localizeNode(channelCounts[id])}
                  </span>
                </span>
              </button>
            );
          }))}
        </div>
        <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-purple-100 bg-gradient-to-r from-purple-50 to-white py-1.5 ps-3 pe-2 dark:border-purple-400/20 dark:from-purple-500/10 dark:to-transparent">
          <Sparkles size={15} className="text-[#7C3AED]" fill="currentColor" />
          <span className="hidden sm:inline text-[13px] font-semibold text-slate-800 dark:text-slate-100">{translateText(demoInbox ? 'Local demo' : workspaceAiLive ? 'AI Active' : 'AI Paused')}</span>
          <Toggle
            checked={workspaceAiLive}
            disabled={gosAI.saving}
            onChange={(value) => void toggleWorkspaceAi(value)}
            label="Toggle AI across the inbox"
          />
        </div>
      </div>

      {/* ============ 3-column workspace ============ */}
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        {/* ---------- Column 1: conversation list ---------- */}
        <aside className={`${CARD} inbox-col-list flex min-h-0 w-[300px] shrink-0 flex-col 2xl:w-[340px]`} aria-label={translateText("Conversations")}>
          <div className="flex shrink-0 items-center gap-1 border-b border-slate-100 px-3 pt-2 dark:border-white/[0.06]" role="tablist">
            {localizeNode((
              [
                ["all", "All"],
                ["unread", "Unread"],
                ["mine", "Assigned to me"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                id={`inbox-folder-${id}`}
                role="tab"
                aria-selected={folder === id}
                onClick={() => setFolder(id)}
                className={`relative flex h-9 items-center gap-1.5 px-2.5 text-[12.5px] font-semibold transition ${
                  folder === id ? "text-purple-700 dark:text-purple-300" : `${MUTED} hover:text-slate-800 dark:hover:text-slate-200`
                }`}
              >
                {localizeNode(label)}
                {localizeNode(id === "unread" && unreadTotal > 0 && (
                  <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {localizeNode(unreadTotal)}
                  </span>
                ))}
                {localizeNode(folder === id && (
                  <motion.span layoutId="inbox-folder-underline" className="absolute inset-x-1.5 -bottom-px h-[2px] rounded-full bg-[#7C3AED]" />
                ))}
              </button>
            )))}
          </div>

          <div className="flex shrink-0 items-center gap-2 p-3">
            <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 transition focus-within:border-purple-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-purple-100 dark:border-white/10 dark:bg-white/[0.03] dark:focus-within:ring-purple-500/10">
              <Search size={15} className={SUBTLE} />
              <input
                id="inbox-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={translateText("Search conversations...")}
                className="min-w-0 flex-1 bg-transparent text-[12.5px] text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
              />
              {localizeNode(search && (
                <button onClick={() => setSearch("")} aria-label={translateText("Clear search")} className={`${SUBTLE} hover:text-slate-600`}>
                  <X size={14} />
                </button>
              ))}
            </label>
            <div className="relative" ref={filterRef}>
              <button
                id="inbox-filter"
                onClick={() => setFilterOpen((v) => !v)}
                aria-label={translateText("Filter conversations")}
                aria-expanded={filterOpen}
                className={`${ICON_BTN} relative h-9 w-9 ${filterOpen || tagFilter.length ? "border-purple-200 bg-purple-50 text-purple-600" : ""}`}
              >
                <SlidersHorizontal size={15} />
                {localizeNode(tagFilter.length > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#7C3AED] px-1 text-[9px] font-bold text-white">
                    {localizeNode(tagFilter.length)}
                  </span>
                ))}
              </button>
              <AnimatePresence>
                {localizeNode(filterOpen && (
                  <motion.div {...popIn} className={`${POPOVER} end-0 top-[calc(100%+6px)] w-52`}>
                    <p className={`px-2.5 pb-1 pt-1.5 text-[10.5px] font-bold uppercase tracking-wider ${SUBTLE}`}>{translateText("Filter by tag")}</p>
                    {localizeNode((Object.keys(tagMeta) as TagId[]).map((tag) => {
                      const checked = tagFilter.includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() =>
                            setTagFilter((current) => (checked ? current.filter((t) => t !== tag) : [...current, tag]))
                          }
                          className={MENU_ITEM}
                        >
                          <span
                            className={`grid h-4 w-4 place-items-center rounded border transition ${
                              checked ? "border-[#7C3AED] bg-[#7C3AED] text-white" : "border-slate-300 dark:border-white/20"
                            }`}
                          >
                            {localizeNode(checked && <Check size={11} strokeWidth={3} />)}
                          </span>
                          <TagPill tag={tag} />
                        </button>
                      );
                    }))}
                    <div className="mt-1 border-t border-slate-100 pt-1 dark:border-white/10">
                      <button onClick={() => setTagFilter([])} className={`${MENU_ITEM} justify-center text-purple-600`}>{translateText("Clear filters")}</button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <ul className="inbox-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
            {localizeNode(visible.map((c) => {
              const isActive = c.id === active.id;
              return (
                <li key={c.id}>
                  <button
                    id={`inbox-conversation-${c.id}`}
                    onClick={() => selectConversation(c.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={`group relative flex w-full items-start gap-3 rounded-xl border px-2.5 py-2.5 text-start overflow-hidden transition ${
                      isActive
                        ? "border-purple-100 bg-gradient-to-r from-purple-50/80 to-transparent shadow-[0_1px_2px_rgba(124,92,252,0.05)] dark:border-purple-500/20 dark:from-purple-500/10"
                        : "border-transparent hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                    }`}
                  >
                    {localizeNode(isActive && <span className="absolute bottom-0 start-0 top-0 w-1 bg-[#7C3AED]" />)}
                    <Avatar person={c} size={40} channel={c.channel} />
                    <span className="min-w-0 flex-1 pt-0.5">
                      <span className={`block truncate text-[13px] font-bold ${HEADING}`}>
                        {c.name}
                      </span>
                      <span
                        className={`mt-0.5 line-clamp-2 text-[12px] leading-[17px] ${
                          c.unread ? "text-slate-600 dark:text-slate-300" : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {localizeNode(c.preview)}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
                      <span className={`whitespace-nowrap text-[10.5px] leading-4 ${SUBTLE}`}>{formatInboxTime(c.time, language)}</span>
                      <span className="flex h-[18px] items-center gap-1">
                        {localizeNode(c.starred && <Star size={11} className="text-amber-400" fill="currentColor" />)}
                        <ChannelIcon channel={c.channel} size={15} />
                        {localizeNode(c.unread > 0 && (
                          <span className="grid h-[17px] min-w-[17px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                            {localizeNode(c.unread)}
                          </span>
                        ))}
                      </span>
                      {localizeNode(c.tags[0] && <TagPill tag={c.tags[0]} compact />)}
                    </span>
                  </button>
                </li>
              );
            }))}
            {localizeNode(!visible.length && !(!demoInbox && inboxApi.initialLoading) && (
              <li className="flex flex-col items-center px-6 py-14 text-center">
                <span className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-purple-50 text-purple-500 dark:bg-purple-500/15">
                  <Search size={18} />
                </span>
                <b className={`text-[13px] ${HEADING}`}>{translateText("No conversations found")}</b>
                <p className={`mt-1 text-[12px] ${MUTED}`}>{translateText("Try a different channel, folder or search term.")}</p>
              </li>
            ))}
          </ul>
        </aside>

        {conversations.length > 0 ? (<>
        {/* ---------- Column 2: chat thread ---------- */}
        <section className={`${CARD} inbox-col-thread flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden`} aria-label={translateText(`Conversation with ${active.name}`)}>
          {/* chat header */}
          <header className="inbox-thread-header flex shrink-0 items-center gap-2 sm:gap-3 border-b border-slate-100 px-3 sm:px-5 py-2.5 sm:py-3 dark:border-white/[0.06]">
            <button type="button" onClick={() => setMobileInboxPane("list")} aria-label={language === "ar" ? "العودة للمحادثات" : translateText("Back to conversations")} className={`${ICON_BTN} relative h-9 w-9 md:hidden`}>
              <ArrowLeft size={16} className="rtl:rotate-180" />
              {unreadTotal > 0 && <span className="absolute -end-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{unreadTotal}</span>}
            </button>
          {/* chat header */}

            <Avatar person={active} size={42} />
            <div className="min-w-0">
              <h2 className={`truncate text-[15px] font-bold leading-5 ${HEADING}`}>{active.name}</h2>
              <p className={`mt-0.5 flex items-center gap-1.5 text-[12px] ${MUTED}`}>
                <ChannelIcon channel={active.channel} size={14} />
                {localizeNode(channelMeta[active.channel].label)}
              </p>
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 ps-2">
              {localizeNode(active.tags[0] && <TagPill tag={active.tags[0]} />)}
              {localizeNode(aiReplying ? (
                <span className="inline-flex h-[22px] items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-600 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <Sparkles size={11} fill="currentColor" />{translateText(" AI Active")}</span>
              ) : active.aiState === 'handoff' ? (
                <span className="inline-flex h-[22px] items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 text-[11px] font-semibold text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-300">
                  <CircleAlert size={11} /> {isAr ? 'بانتظار رد الفريق' : translateText('Needs Human')}
                </span>
              ) : (
                <span className="inline-flex h-[22px] items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] font-semibold text-slate-500 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                  <UserRound size={11} />{' '}
                  {active.takenOver
                    ? active.assignee && active.assignee.trim().toLowerCase() !== (currentUser.name || '').trim().toLowerCase()
                      ? `${translateText('Handled by')} ${active.assignee}`
                      : translateText("You're handling")
                    : translateText('AI paused')}
                </span>
              ))}
              {active.lastAction?.type === 'book' && (
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/booking?tab=bookings')}
                  className="inline-flex h-[22px] items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-300"
                >
                  <CalendarDays size={11} />
                  <span>
                    {isAr ? 'تم الحجز' : 'Booked'}
                    {active.lastAction.booking_code ? ` · #${active.lastAction.booking_code}` : ''}
                  </span>
                </button>
              )}
            </div>
            <button
              id="inbox-star"
              onClick={() => updateActive((c) => ({ starred: !c.starred }))}
              aria-label={translateText(active.starred ? "Remove from favorites" : "Add to favorites")}
              aria-pressed={active.starred}
              className={`${ICON_BTN} h-9 w-9 ${active.starred ? "border-amber-200 bg-amber-50 text-amber-500 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-500" : ""}`}
            >
              <Star size={16} fill={active.starred ? "currentColor" : "none"} />
            </button>
            <button type="button" onClick={() => setMobileInboxPane("details")} aria-label={language === "ar" ? "تفاصيل العميل" : translateText("Lead details")} className={`${ICON_BTN} h-9 w-9 md:hidden`}><UserRound size={16} /></button>
            <div className="relative" ref={moreRef}>
              <button
                id="inbox-more"
                onClick={() => setMoreOpen((v) => !v)}
                aria-label={translateText("More options")}
                aria-expanded={moreOpen}
                className={`${ICON_BTN} h-9 w-9`}
              >
                <MoreHorizontal size={16} />
              </button>
              <AnimatePresence>
                {localizeNode(moreOpen && (
                  <motion.div {...popIn} className={`${POPOVER} end-0 top-[calc(100%+6px)] w-56`}>
                    <button
                      className={MENU_ITEM}
                      onClick={() => {
                        updateActive({ unread: 1 });
                        setMoreOpen(false);
                      }}
                    >
                      <MailOpen size={15} className={SUBTLE} />{translateText(" Mark as unread")}</button>
                    <button
                      className={MENU_ITEM}
                      onClick={() => {
                        updateActive({ assignee: currentUser.name });
                        void manualAssign({
                          conversationId: active.id,
                          leadId: activeMatchedLead?.id,
                          customerName: active.name || 'Visitor',
                          customerEmail: active.email,
                          customerPhone: active.phone,
                          channel: active.channel,
                          agent: {
                            id: currentUser.id || 'owner',
                            name: currentUser.name || 'Workspace Owner',
                            email: authUser?.email,
                            role: authUser?.teamRole || 'Owner',
                          },
                        });
                        logActivity("handoff", `Assigned to ${currentUser.name}`);
                        setMoreOpen(false);
                      }}
                    >
                      <UserRoundCheck size={15} className={SUBTLE} />{translateText(" Assign to me")}</button>
                    <button
                      className={MENU_ITEM}
                      onClick={() => {
                        setMoreOpen(false);
                        showToast.success(`Notifications muted for ${active.name}.`);
                      }}
                    >
                      <BellOff size={15} className={SUBTLE} />{translateText(" Mute notifications")}</button>
                    <div className="my-1 border-t border-slate-100 dark:border-white/10" />
                    <button className={`${MENU_ITEM} text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400`} onClick={archiveActive}>
                      <Archive size={15} />{translateText(" Archive conversation")}</button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </header>

          {/* Live AI & Knowledge Base status banner */}
          {!demoInbox && active.id && (readyKnowledgeCount === 0 || !workspaceAiLive || !activeChannelLive || active.aiState === 'handoff' || active.takenOver || active.aiState === 'human_takeover') && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/70 bg-amber-50/70 px-4 py-2 text-[12px] text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles size={14} className="shrink-0 text-amber-600 dark:text-amber-300" />
                <span className="truncate">
                  {readyKnowledgeCount === 0
                    ? (isAr ? 'قاعدة المعرفة غير مدرّبة بعد — ارفع ملفاتك أو نصوصك حتى يبدأ الذكاء الاصطناعي في الرد تلقائياً.' : translateText('Knowledge Base is not trained yet — upload sources so AI can reply automatically.'))
                    : !workspaceAiLive
                      ? (isAr ? 'الرد التلقائي بالذكاء الاصطناعي متوقف حالياً على مستوى مساحة العمل.' : translateText('AI auto-reply is currently paused workspace-wide.'))
                      : !activeChannelLive
                        ? (isAr ? `الرد التلقائي متوقف على قناة ${channelMeta[active.channel].label}.` : `AI auto-reply is paused on ${channelMeta[active.channel].label}.`)
                        : active.aiState === 'handoff'
                          ? (isAr ? 'تم تحويل المحادثة للفريق وإيقاف الرد التلقائي مؤقتاً حتى يتواصل أحد ممثلي الفريق مع العميل.' : 'Conversation handed off to your team — AI auto-reply is paused so a teammate can take over cleanly.')
                          : (isAr ? 'تم إيقاف الرد التلقائي لهذه المحادثة لأن أحد أعضاء الفريق (أو تطبيق واتساب بزنس) تولّى الرد يدوياً.' : 'AI auto-reply is paused on this chat because a teammate (or WhatsApp Business app) took over manually.')}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {readyKnowledgeCount === 0 ? (
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/follow-up')}
                    className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-700"
                  >
                    {isAr ? 'فتح قاعدة المعرفة' : translateText('Open Knowledge')}
                  </button>
                ) : !workspaceAiLive ? (
                  <button
                    type="button"
                    disabled={gosAI.saving}
                    onClick={() => void toggleWorkspaceAi(true)}
                    className="rounded-lg bg-[#7C3AED] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
                  >
                    {isAr ? 'تفعيل الرد التلقائي' : translateText('Turn AI On')}
                  </button>
                ) : !activeChannelLive ? (
                  <button
                    type="button"
                    disabled={gosAI.saving}
                    onClick={() => void enableActiveChannelAi()}
                    className="rounded-lg bg-[#7C3AED] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
                  >
                    {isAr ? `تفعيل ${channelMeta[active.channel].label}` : `Enable ${channelMeta[active.channel].label}`}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void toggleTakeover()}
                      className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-50 dark:border-amber-400/30 dark:bg-white/10 dark:text-amber-200"
                    >
                      {isAr ? 'إعادة تشغيل الرد التلقائي' : 'Resume AI'}
                    </button>
                    <button
                      type="button"
                      disabled={aiReplySending}
                      onClick={() => void triggerAiReplyNow()}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#7C3AED] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
                    >
                      {aiReplySending ? <LoaderCircle size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      <span>{aiReplySending ? (isAr ? 'جارٍ الرد…' : translateText('Replying…')) : (isAr ? 'رد بالذكاء الاصطناعي' : translateText('Reply with AI'))}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* message thread */}
          <div ref={threadRef} className="inbox-scroll inbox-thread-bg min-h-0 flex-1 overflow-y-auto px-5 py-4 2xl:px-8">
            <div className="mb-4 flex justify-center">
              <span className="rounded-full border border-slate-100 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">{translateText("Today")}</span>
            </div>
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {localizeNode(active.messages.map((m) => {
                  const incoming = m.sender === "customer";
                  const isNote = m.sender === "note";
                  return (
                    <motion.div
                      key={m.id}
                      layout="position"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className={`flex items-end gap-2.5 ${incoming ? "justify-start" : "justify-end"}`}
                    >
                      {localizeNode(incoming && <Avatar person={active} size={30} />)}
                      <div className={`flex max-w-[78%] flex-col ${incoming ? "items-start" : "items-end"} 2xl:max-w-[68%]`}>
                        <div
                          className={`rounded-2xl px-4 py-3 text-[13px] leading-[1.6] ${
                            incoming
                              ? "rounded-bl-md border border-slate-100 bg-white text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
                              : isNote
                                ? "rounded-br-md border border-amber-200/70 bg-amber-50 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100"
                                : "rounded-br-md border border-purple-100 bg-purple-50/70 text-[#2E2A4A] dark:border-purple-400/20 dark:bg-purple-500/15 dark:text-purple-100"
                          }`}
                        >
                          {localizeNode(isNote && (
                            <span className="mb-1 flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                              <StickyNote size={11} />{translateText(" Internal note")}</span>
                          ))}
                          {localizeNode(m.text && <RichText text={m.text} />)}
                          {localizeNode(m.voice && (
                            <div className={m.text ? "mt-2" : ""}>
                              <VoicePlayer note={m.voice} tone={incoming ? "light" : "brand"} />
                            </div>
                          ))}
                          {localizeNode(m.attachments && (
                            <div className={`flex flex-wrap gap-2 ${m.text || m.voice ? "mt-2.5" : ""}`}>
                              {localizeNode(m.attachments.map((file) =>
                                file.remote ? (
                                  <RemoteAttachment key={file.id} file={file} />
                                ) : file.isImage ? (
                                  <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl ring-1 ring-black/5">
                                    <img src={file.url} alt={file.name} className="h-32 w-44 object-cover" />
                                  </a>
                                ) : (
                                  <a
                                    key={file.id}
                                    href={file.url}
                                    download={file.name}
                                    className="flex max-w-[230px] items-center gap-2.5 rounded-xl border border-slate-200/70 bg-white px-3 py-2 transition hover:border-purple-200 dark:border-white/10 dark:bg-white/5"
                                  >
                                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-500/15">
                                      <FileText size={15} />
                                    </span>
                                    <span className="min-w-0">
                                      <b className={`block truncate text-[12px] font-semibold ${HEADING}`}>{file.name}</b>
                                      <small className={`text-[11px] ${MUTED}`}>{localizeNode(bytesLabel(file.size))}</small>
                                    </span>
                                  </a>
                                ),
                              ))}
                            </div>
                          ))}
                          {m.action?.type === 'book' && (
                            <button
                              type="button"
                              onClick={() => navigate('/dashboard/booking?tab=bookings')}
                              className="group mt-3 flex w-full items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-start shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-400/25 dark:bg-emerald-500/10"
                            >
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
                                <CalendarDays size={17} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <b className="block text-[12.5px] font-bold text-emerald-900 dark:text-emerald-200">
                                  {isAr ? 'تم تأكيد وحفظ الموعد في التقويم' : 'Booking Saved in Calendar'}
                                  {m.action.booking_code ? ` · #${m.action.booking_code}` : ''}
                                </b>
                                <small className="block truncate text-[11.5px] text-emerald-700 dark:text-emerald-300">
                                  {[m.action.service_name, m.action.date && m.action.time ? `${m.action.date} · ${m.action.time}` : m.action.detail, m.action.location].filter(Boolean).join(' · ')}
                                </small>
                              </span>
                              <ChevronRight size={15} className="shrink-0 text-emerald-600 transition group-hover:translate-x-0.5 dark:text-emerald-300" />
                            </button>
                          )}
                          {m.buttons && m.buttons.length > 0 && (
                            <div className="mt-2.5 border-t border-purple-200/50 pt-2 dark:border-purple-400/20">
                              <span className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-purple-600/80 dark:text-purple-300/80">
                                <MousePointerClick size={11} />
                                {isAr ? 'أزرار تفاعلية مرسلة للعميل' : translateText('Interactive buttons')}
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {m.buttons.map((btn) =>
                                  btn.kind === 'url' && btn.url ? (
                                    <a
                                      key={btn.id}
                                      href={btn.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-purple-700 shadow-xs transition hover:border-purple-400 hover:bg-purple-50 dark:border-purple-400/30 dark:bg-white/10 dark:text-purple-200 dark:hover:bg-purple-500/20"
                                    >
                                      <span>{btn.title}</span>
                                      <ExternalLink size={11} />
                                    </a>
                                  ) : (
                                    <span
                                      key={btn.id}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200/90 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-purple-800 shadow-xs dark:border-purple-400/30 dark:bg-white/10 dark:text-purple-100"
                                    >
                                      <CornerDownRight size={11} className="text-purple-500 dark:text-purple-300" />
                                      <span>{btn.title}</span>
                                    </span>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                          {localizeNode(m.card === "consultation" && (
                            <button
                              onClick={() => navigate("/dashboard/booking")}
                              className="group mt-3 flex w-full items-center gap-3 rounded-xl border border-purple-100 bg-white p-3 text-start shadow-[0_1px_2px_rgba(124,92,252,0.08)] transition hover:-translate-y-px hover:border-purple-200 hover:shadow-md dark:border-purple-400/20 dark:bg-white/5"
                            >
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 text-[#7C3AED] dark:from-purple-500/25 dark:to-purple-500/10">
                                <CalendarDays size={19} strokeWidth={2.2} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <b className={`block text-[13px] font-semibold ${HEADING}`}>{translateText("Book a Free Consultation")}</b>
                                <small className={`text-[12px] ${MUTED}`}>{translateText("Choose a time that works for you.")}</small>
                              </span>
                              <ChevronRight size={16} className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-purple-500" />
                            </button>
                          ))}
                        </div>
                        <span className={`mt-1 flex items-center gap-1 px-1 text-[10.5px] ${SUBTLE}`}>
                          {localizeNode(m.sender === "ai" && (
                            <>
                              <Sparkles size={10} className="text-purple-400" fill="currentColor" />{translateText(" AI Assistant ·")}
                              {(m.citationsCount ?? 0) > 0 && (
                                <span className="rounded bg-purple-100/80 px-1.5 py-0.5 text-[9.5px] font-semibold text-purple-700 dark:bg-purple-500/20 dark:text-purple-200">
                                  {isAr ? 'من قاعدة المعرفة' : translateText('Knowledge Base')}
                                </span>
                              )}
                            </>
                          ))}
                          {localizeNode(m.sender === "agent" && <>{currentUser.name} ·</>)}
                          {formatInboxTime(m.time, language)}
                          {m.status === 'sending' ? (
                            <span className="inline-flex items-center gap-1 text-slate-400"><Clock3 size={12} />{translateText("Sending…")}</span>
                          ) : m.status === 'failed' ? (
                            <span className="inline-flex items-center gap-1 font-medium text-rose-500"><CircleAlert size={12} />{translateText("Not sent")}</span>
                          ) : m.status === 'unconfirmed' ? (
                            <span className="inline-flex items-center gap-1 text-amber-500" title={m.error}><CircleAlert size={12} />{translateText("Not confirmed")}</span>
                          ) : localizeNode((m.sender === "ai" || m.sender === "agent") && <CheckCheck size={13} className="text-purple-400" />)}
                        </span>
                        {(m.status === 'failed' || m.status === 'unconfirmed') && m.error && (
                          <div className={`mt-1 max-w-[320px] rounded-lg px-2.5 py-1.5 text-[11.5px] leading-snug ${m.status === 'failed' ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
                            {m.error}
                            {m.status === 'failed' && (
                              <span className="mt-1 flex gap-3">
                                <button type="button" disabled={sending} className="font-semibold underline disabled:opacity-50" onClick={() => void deliverReply(active.id, m.text || '', m.id, m.buttons || [])}>{translateText("Retry")}</button>
                                <button type="button" className="underline opacity-80" onClick={() => dismissFailedReply(active.id, m.id)}>{translateText("Remove")}</button>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                }))}
              </AnimatePresence>
            </div>
          </div>

          {/* composer */}
          <div className="shrink-0 border-t border-slate-100 px-4 pb-3 pt-2 dark:border-white/[0.06]">
            <div className="flex items-center gap-1" role="tablist" aria-label={translateText("Composer mode")}>
              {localizeNode((
                [
                  ["reply", "Reply"],
                  ["note", "Note"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  id={`inbox-mode-${id}`}
                  role="tab"
                  aria-selected={mode === id}
                  onClick={() => setMode(id)}
                  className={`relative h-8 px-3 text-[12.5px] font-semibold transition ${
                    mode === id
                      ? id === "note"
                        ? "text-amber-600 dark:text-amber-300"
                        : "text-purple-700 dark:text-purple-300"
                      : `${MUTED} hover:text-slate-800 dark:hover:text-slate-200`
                  }`}
                >
                  {localizeNode(label)}
                  {localizeNode(mode === id && (
                    <motion.span
                      layoutId="inbox-mode-underline"
                      className={`absolute inset-x-2 bottom-0 h-[2px] rounded-full ${id === "note" ? "bg-amber-400" : "bg-[#7C3AED]"}`}
                    />
                  ))}
                </button>
              )))}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button id="inbox-attach" onClick={() => fileInputRef.current?.click()} aria-label={translateText("Attach files")} className={ICON_BTN}>
                <Paperclip size={15} />
              </button>
              <div className="relative" ref={templatesRef}>
                <button
                  id="inbox-templates"
                  onClick={() => setTemplatesOpen((v) => !v)}
                  aria-expanded={templatesOpen}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 text-[12px] font-semibold text-slate-600 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300"
                >
                  <LayoutTemplate size={14} />{translateText(" Templates")}</button>
                <AnimatePresence>
                  {templatesOpen && (
                    <motion.div {...popIn} className={`${POPOVER} bottom-[calc(100%+6px)] start-0 w-72 max-w-[calc(100vw-32px)]`}>
                      <p className={`px-2.5 pb-1 pt-1.5 text-[10.5px] font-bold uppercase tracking-wider ${SUBTLE}`}>{translateText("Saved replies")}</p>
                      {replyTemplates.map((t) => (
                        <button
                          key={t.title}
                          className={`${MENU_ITEM} flex-col items-start gap-0.5`}
                          onClick={() => {
                            setDraft(t.body);
                            setMode("reply");
                            setTemplatesOpen(false);
                            inputRef.current?.focus();
                          }}
                        >
                          <span className={`text-[12.5px] font-semibold ${HEADING}`}>{t.title}</span>
                          <span className={`line-clamp-1 text-[11.5px] font-normal ${MUTED}`}>{t.body.replace(/\*\*/g, "").replace(/\n/g, " ")}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                id="inbox-ai-assist"
                onClick={runAiAssist}
                disabled={assistLoading}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-purple-100 bg-purple-50/70 px-2.5 text-[12px] font-semibold text-purple-700 transition hover:border-purple-200 hover:bg-purple-100 disabled:opacity-70 dark:border-purple-400/20 dark:bg-purple-500/10 dark:text-purple-200"
              >
                {localizeNode(assistLoading ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />)}
                {localizeNode(assistLoading ? "Writing…" : "AI Assist")}
              </button>
              <button
                type="button"
                id="inbox-buttons-toggle"
                onClick={() => {
                  setButtonsEditorOpen((v) => !v);
                  if (!buttonsEditorOpen && replyButtons.length === 0) {
                    setReplyButtons([{ id: 'btn_1', title: '', kind: 'reply', url: null }]);
                  }
                }}
                className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-semibold transition ${
                  buttonsEditorOpen || replyButtons.some((b) => b.title.trim())
                    ? 'border-purple-300 bg-purple-100/80 text-purple-800 dark:border-purple-400/40 dark:bg-purple-500/25 dark:text-purple-100'
                    : 'border-slate-200/80 bg-white text-slate-600 hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300'
                }`}
              >
                <MousePointerClick size={13.5} />
                <span>{isAr ? 'أزرار تفاعلية' : translateText('Buttons')}</span>
                {replyButtons.filter((b) => b.title.trim()).length > 0 && (
                  <span className="rounded-full bg-[#7C3AED] px-1.5 text-[10px] font-bold text-white">
                    {replyButtons.filter((b) => b.title.trim()).length}
                  </span>
                )}
              </button>
              <div className="ms-auto flex items-center gap-2">
                <Toggle
                  size="sm"
                  checked={active.aiAutoReply && !active.takenOver}
                  disabled={!workspaceAiLive}
                  onChange={async (value) => {
                    updateActive({ aiAutoReply: value, takenOver: !value, aiState: value ? 'answered' : 'human_takeover' });
                    if (!demoInbox && active.id && !active.id.startsWith('crm-')) {
                      try {
                        await gosApi.setConversationAi(active.id, value);
                      } catch (error) {
                        showToast.error(backendError(error));
                      }
                    }
                    logActivity(value ? "ai" : "handoff", value ? "AI auto-reply enabled" : "AI auto-reply disabled");
                  }}
                  label="AI auto-reply for this conversation"
                />
                <button
                  onClick={() => navigate("/dashboard/follow-up")}
                  className={`hidden sm:flex items-center gap-0.5 text-[12px] font-medium transition hover:text-purple-600 ${MUTED}`}
                >
                  {localizeNode(!workspaceAiLive ? "AI paused workspace-wide" : aiReplying ? "AI will reply automatically" : "AI auto-reply off")}
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {buttonsEditorOpen && mode === 'reply' && (
              <div className="mt-2 rounded-xl border border-purple-200/80 bg-purple-50/50 p-2.5 dark:border-purple-400/20 dark:bg-purple-500/10">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-purple-800 dark:text-purple-200">
                    <MousePointerClick size={12} />
                    {isAr ? 'أضف حتى 3 أزرار تفاعلية (حد أقصى 20 حرف لكل زر)' : translateText('Attach up to 3 interactive buttons (max 20 chars each)')}
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    {(
                      [
                        {
                          label: isAr ? 'حجز / أسعار' : translateText('Book / Prices'),
                          items: isAr
                            ? [
                                { id: 'p_book', title: 'حجز موعد', kind: 'reply' as const, url: null },
                                { id: 'p_price', title: 'الخدمات والأسعار', kind: 'reply' as const, url: null },
                                { id: 'p_team', title: 'تواصل مع الفريق', kind: 'reply' as const, url: null },
                              ]
                            : [
                                { id: 'p_book', title: 'Book Appointment', kind: 'reply' as const, url: null },
                                { id: 'p_price', title: 'Services & Prices', kind: 'reply' as const, url: null },
                                { id: 'p_team', title: 'Talk to Team', kind: 'reply' as const, url: null },
                              ],
                        },
                        {
                          label: isAr ? 'تأكيد / تعديل' : translateText('Confirm / Reschedule'),
                          items: isAr
                            ? [
                                { id: 'p_yes', title: 'تأكيد الموعد', kind: 'reply' as const, url: null },
                                { id: 'p_resch', title: 'تغيير الوقت', kind: 'reply' as const, url: null },
                              ]
                            : [
                                { id: 'p_yes', title: 'Confirm Slot', kind: 'reply' as const, url: null },
                                { id: 'p_resch', title: 'Pick Another Time', kind: 'reply' as const, url: null },
                              ],
                        },
                      ]
                    ).map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setReplyButtons(preset.items)}
                        className="rounded-md border border-purple-200 bg-white px-2 py-0.5 text-[10.5px] font-semibold text-purple-700 hover:bg-purple-100 dark:border-purple-400/30 dark:bg-white/10 dark:text-purple-200"
                      >
                        + {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {replyButtons.map((btn, idx) => (
                    <div key={btn.id} className="flex flex-wrap items-center gap-1.5">
                      <input
                        type="text"
                        maxLength={20}
                        value={btn.title}
                        onChange={(e) =>
                          setReplyButtons((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, title: e.target.value.slice(0, 20) } : item)),
                          )
                        }
                        placeholder={isAr ? `عنوان الزر ${idx + 1} (مثال: حجز موعد)` : `Button ${idx + 1} label (e.g. Book Call)`}
                        className="h-8 min-w-[160px] flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] text-slate-800 outline-none focus:border-purple-400 dark:border-white/15 dark:bg-slate-900/70 dark:text-white"
                      />
                      <button
                        type="button"
                        title={isAr ? 'تبديل بين زر رد سريع ورابط خارجي' : translateText('Toggle reply button vs URL link')}
                        onClick={() =>
                          setReplyButtons((prev) =>
                            prev.map((item, i) =>
                              i === idx
                                ? { ...item, kind: item.kind === 'url' ? 'reply' : 'url', url: item.kind === 'url' ? null : item.url || 'https://' }
                                : item,
                            ),
                          )
                        }
                        className={`flex h-8 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold ${
                          btn.kind === 'url'
                            ? 'border-purple-300 bg-purple-100 text-purple-800 dark:border-purple-400/40 dark:bg-purple-500/25 dark:text-purple-100'
                            : 'border-slate-200 bg-white text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300'
                        }`}
                      >
                        {btn.kind === 'url' ? <Link2 size={12} /> : <CornerDownRight size={12} />}
                        <span>{btn.kind === 'url' ? 'URL' : isAr ? 'رد' : 'Reply'}</span>
                      </button>
                      {btn.kind === 'url' && (
                        <input
                          type="url"
                          dir="ltr"
                          value={btn.url || ''}
                          onChange={(e) =>
                            setReplyButtons((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, url: e.target.value } : item)),
                            )
                          }
                          placeholder="https://..."
                          className="h-8 min-w-[170px] flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] text-slate-800 outline-none focus:border-purple-400 dark:border-white/15 dark:bg-slate-900/70 dark:text-white"
                        />
                      )}
                      <span className="text-[10px] tabular-nums text-slate-400">{btn.title.length}/20</span>
                      <button
                        type="button"
                        aria-label={translateText('Remove button')}
                        onClick={() => setReplyButtons((prev) => prev.filter((_, i) => i !== idx))}
                        className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/15"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                {replyButtons.length < 3 && (
                  <button
                    type="button"
                    onClick={() =>
                      setReplyButtons((prev) => [...prev, { id: `btn_${Date.now()}`, title: '', kind: 'reply', url: null }])
                    }
                    className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-purple-700 hover:text-purple-900 dark:text-purple-300"
                  >
                    <Plus size={13} />
                    {isAr ? 'إضافة زر آخر' : translateText('Add another button')}
                  </button>
                )}
              </div>
            )}

            {localizeNode(attachments.length > 0 && (
              <div className="inbox-scroll-x mt-2 flex gap-2 overflow-x-auto pb-1">
                {localizeNode(attachments.map((file) => (
                  <div key={file.id} className="relative flex h-12 w-48 shrink-0 items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-1.5 pe-7 dark:border-white/10 dark:bg-white/5">
                    {localizeNode(file.isImage ? (
                      <img src={file.url} alt={translateText("")} className="h-9 w-9 rounded-lg object-cover" />
                    ) : (
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-500/15">
                        <FileText size={15} />
                      </span>
                    ))}
                    <span className="min-w-0">
                      <b className={`block truncate text-[11.5px] font-semibold ${HEADING}`}>{file.name}</b>
                      <small className={`text-[10.5px] ${MUTED}`}>{localizeNode(bytesLabel(file.size))}</small>
                    </span>
                    <button onClick={() => removeAttachment(file.id)} aria-label={translateText(`Remove ${file.name}`)} className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500">
                      <X size={12} />
                    </button>
                  </div>
                )))}
              </div>
            ))}

            <div className="mt-2 flex items-end gap-2">
              {localizeNode(recording ? (
                <div className="flex h-11 flex-1 items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/60 px-3 dark:border-rose-400/20 dark:bg-rose-500/10">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                  </span>
                  <b className="text-[12.5px] font-semibold text-rose-600 dark:text-rose-300">{translateText("Recording")}</b>
                  <span className="text-[12.5px] font-bold tabular-nums text-rose-600 dark:text-rose-300">{localizeNode(formatDuration(elapsed))}</span>
                  <span className="flex flex-1 items-center gap-[3px]">
                    {localizeNode(Array.from({ length: 22 }, (_, i) => (
                      <i key={i} className="inbox-wave w-[3px] rounded-full bg-rose-300" style={{ animationDelay: `${(i % 7) * 90}ms` }} />
                    )))}
                  </span>
                  <button onClick={cancelRecording} aria-label={translateText("Discard recording")} className="grid h-7 w-7 place-items-center rounded-lg text-rose-500 hover:bg-rose-100">
                    <Trash size={14} />
                  </button>
                  <button onClick={stopRecording} className="flex h-7 items-center gap-1.5 rounded-lg bg-rose-500 px-2.5 text-[12px] font-semibold text-white hover:bg-rose-600">
                    <span className="h-2 w-2 rounded-[2px] bg-white" />{translateText(" Stop")}</button>
                </div>
              ) : voiceDraft ? (
                <div className="flex h-11 flex-1 items-center gap-3 rounded-xl border border-purple-100 bg-purple-50/50 px-3 dark:border-purple-400/20 dark:bg-purple-500/10">
                  <VoicePlayer note={voiceDraft} tone="brand" />
                  <button onClick={cancelRecording} aria-label={translateText("Discard voice message")} className="ms-auto grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500">
                    <Trash size={14} />
                  </button>
                </div>
              ) : (
                <label
                  className={`inbox-composer-box flex min-h-11 flex-1 items-end gap-2 rounded-xl border px-3.5 py-2.5 transition ${
                    mode === "note"
                      ? "border-amber-200 bg-amber-50/60 dark:border-amber-400/20 dark:bg-amber-500/10"
                      : "border-slate-200/80 bg-white dark:border-white/10 dark:bg-white/[0.03]"
                  }`}
                >
                  <textarea
                    id="inbox-message-input"
                    ref={inputRef}
                    rows={1}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder={translateText(mode === "note" ? "Write an internal note — only your team can see this..." : "Type a message...")}
                    className="max-h-[120px] min-w-0 flex-1 resize-none border-0 bg-transparent text-[13px] leading-6 text-slate-700 outline-none shadow-none ring-0 focus:border-0 focus:outline-none focus:shadow-none focus:ring-0 focus-visible:outline-none focus-visible:shadow-none focus-visible:ring-0 placeholder:text-slate-400 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    id="inbox-voice"
                    onClick={startRecording}
                    aria-label={translateText("Record voice message")}
                    className="mb-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-purple-50 hover:text-purple-600"
                  >
                    <Mic size={17} />
                  </button>
                </label>
              ))}
              <button
                id="inbox-send"
                onClick={send}
                disabled={recording}
                aria-disabled={!canSend}
                aria-label={translateText(mode === "note" ? "Add note" : "Send message")}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl p-3 text-white shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
                  mode === "note" ? "bg-amber-500 hover:bg-amber-600" : "bg-[#7C3AED] hover:bg-[#7C3AED]"
                }`}
              >
                {localizeNode(mode === "note" ? <StickyNote size={18} /> : <Send size={18} strokeWidth={2.2} />)}
              </button>
            </div>
          </div>
        </section>

        {/* ---------- Column 3: CRM + AI context ---------- */}
        <aside className="inbox-scroll inbox-col-details hidden min-h-0 w-[300px] shrink-0 flex-col gap-2.5 overflow-y-auto min-[1200px]:flex 2xl:w-[330px]" aria-label={translateText("Lead details")}>
          <div className={`${CARD} flex shrink-0 items-center gap-2.5 px-3 py-2.5 md:hidden`}>
            <button type="button" onClick={() => setMobileInboxPane("thread")} aria-label={language === "ar" ? "العودة للمحادثة" : translateText("Back to chat")} className={`${ICON_BTN} h-8 w-8`}>
              <ArrowLeft size={15} className="rtl:rotate-180" />
            </button>
            <b className={`text-[13.5px] font-bold ${HEADING}`}>{language === "ar" ? "تفاصيل العميل" : translateText("Lead Details")}</b>
          </div>
          {/* contact summary */}
          <div className={`${CARD} shrink-0 p-3.5`}>
            <div className="flex items-start gap-3">
              <Avatar person={active} size={48} />
              <div className="min-w-0 flex-1">
                <h3 className={`truncate text-[15px] font-bold ${HEADING}`}>{active.name}</h3>
                <p className={`mt-0.5 flex items-center gap-1.5 text-[12px] ${MUTED}`}>
                  <ChannelIcon channel={active.channel} size={14} /> {localizeNode(channelMeta[active.channel].label)}
                </p>
              </div>
              <div className="relative" ref={leadMenuRef}>
                <button
                  id="inbox-lead-more"
                  onClick={() => setLeadMenuOpen((v) => !v)}
                  aria-label={translateText("Contact options")}
                  aria-expanded={leadMenuOpen}
                  className={ICON_BTN}
                >
                  <MoreHorizontal size={15} />
                </button>
                <AnimatePresence>
                  {localizeNode(leadMenuOpen && (
                    <motion.div {...popIn} className={`${POPOVER} end-0 top-[calc(100%+6px)] w-52`}>
                      <button className={MENU_ITEM} onClick={() => { setEditingLead(true); setLeadMenuOpen(false); }}>
                        <Pencil size={15} className={SUBTLE} />{translateText(" Edit Lead Details")}</button>
                      <button className={MENU_ITEM} onClick={() => { setTagMenuOpen(true); setLeadMenuOpen(false); }}>
                        <Tag size={15} className={SUBTLE} />{translateText(" Manage Tags")}</button>
                      <button className={MENU_ITEM} onClick={() => { setAssigneeOpen(true); setLeadMenuOpen(false); }}>
                        <UserRound size={15} className={SUBTLE} />{translateText(" Reassign Lead")}</button>
                      <button className={MENU_ITEM} onClick={() => { showToast.success("Contact muted."); setLeadMenuOpen(false); }}>
                        <BellOff size={15} className={SUBTLE} />{translateText(" Block / Mute Contact")}</button>
                      <div className="my-1 border-t border-slate-100 dark:border-white/10" />
                      <button className={`${MENU_ITEM} text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400`} onClick={() => { archiveActive(); setLeadMenuOpen(false); }}>
                        <Trash size={15} />{translateText(" Delete Conversation")}</button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 ps-[60px]">
              {localizeNode(active.tags.map((tag) => (
                <TagPill key={tag} tag={tag} onRemove={() => removeTag(tag)} />
              )))}
              <div className="relative" ref={tagMenuRef}>
                <button
                  id="inbox-add-tag"
                  onClick={() => setTagMenuOpen((v) => !v)}
                  disabled={!availableTags.length}
                  aria-label={translateText("Add tag")}
                  className="grid h-[22px] w-[22px] place-items-center rounded-md border border-dashed border-slate-300 text-slate-400 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-600 disabled:opacity-40 dark:border-white/20"
                >
                  <Plus size={13} />
                </button>
                <AnimatePresence>
                  {localizeNode(tagMenuOpen && (
                    <motion.div {...popIn} className={`${POPOVER} start-0 top-[calc(100%+6px)] w-44`}>
                      {localizeNode(availableTags.map((tag) => (
                        <button key={tag} onClick={() => addTag(tag)} className={MENU_ITEM}>
                          <TagPill tag={tag} />
                        </button>
                      )))}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
            <ul className="mt-3 space-y-2">
              {[
                { key: 'phone', icon: Phone, value: active.phone, href: `tel:${active.phone.replace(/\s/g, "")}` },
                { key: 'email', icon: Mail, value: active.email, href: `mailto:${active.email}` },
                { key: 'location', icon: MapPin, value: active.location },
              ].filter(item => item.value).map(({ key, icon: Icon, value, href }) => (
                <li key={key} className="flex items-center gap-2.5 text-[12px]">
                  <Icon size={14} className={SUBTLE} />
                  {localizeNode(href ? (
                    <a href={href} className="truncate text-slate-700 transition hover:text-purple-600 dark:text-slate-200">
                      {localizeNode(value)}
                    </a>
                  ) : (
                    <span className="truncate text-slate-700 dark:text-slate-200">{localizeNode(value)}</span>
                  ))}
                </li>
              ))}
            </ul>
          </div>

          {/* lead details */}
          <div className={`${CARD} shrink-0 p-3.5`}>
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className={`text-[13.5px] font-bold ${HEADING}`}>{translateText("Lead Details")}</h3>
              <button
                id="inbox-edit-lead"
                onClick={() => {
                  if (editingLead) showToast.success("Lead details saved.");
                  setEditingLead((v) => !v);
                }}
                className={`flex h-7 items-center gap-1 rounded-lg px-2.5 text-[11.5px] font-semibold transition ${
                  editingLead
                    ? "bg-[#7C3AED] text-white hover:bg-[#7C3AED]"
                    : "bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-700 dark:bg-white/10 dark:text-slate-300"
                }`}
              >
                {localizeNode(editingLead ? <Check size={12} strokeWidth={3} /> : <Pencil size={11} />)}
                {localizeNode(editingLead ? "Save" : "Edit")}
              </button>
            </div>
            <dl className="grid grid-cols-[92px_1fr] items-center gap-x-2 gap-y-2 text-[12px]">
              <dt className={MUTED}>{translateText("Source")}</dt>
              <dd className="min-w-0">
                {localizeNode(editingLead ? (
                  <input
                    value={active.source}
                    onChange={(e) => updateActive({ source: e.target.value })}
                    className="h-7 w-full rounded-lg border border-purple-200 bg-white px-2 text-[12.5px] text-slate-800 outline-none focus:ring-4 focus:ring-purple-100 dark:border-purple-400/30 dark:bg-white/5 dark:text-slate-100"
                  />
                ) : (
                  <span className={`block truncate font-medium ${HEADING}`}>{localizeNode(active.source)}</span>
                ))}
              </dd>

              <dt className={MUTED}>{translateText("Stage")}</dt>
              <dd className="relative">
                <Select
                  value={active.stage}
                  onChange={(value) => {
                    updateActive({ stage: value });
                    void updateMeta({
                      conversationId: active.id,
                      leadId: activeMatchedLead?.id,
                      customerName: active.name || 'Visitor',
                      customerEmail: active.email,
                      customerPhone: active.phone,
                      patch: { stage: value },
                    });
                    logActivity("tag", `Stage changed to ${value}`);
                  }}
                  options={stages}
                  className="h-7"
                  triggerClassName="h-7 min-h-[28px] border-purple-100 bg-purple-50/60 text-[12px] font-semibold text-purple-700 py-0 dark:border-purple-400/20 dark:bg-purple-500/10 dark:text-purple-200"
                />
              </dd>

              <dt className={MUTED}>{translateText("Assigned To")}</dt>
              <dd className="relative" ref={assigneeRef}>
                <button
                  id="inbox-assignee"
                  onClick={() => setAssigneeOpen((v) => !v)}
                  aria-expanded={assigneeOpen}
                  className="flex h-7 w-full items-center gap-2 rounded-lg border border-slate-200/80 bg-white ps-1 pe-2 text-start transition hover:border-purple-200 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  {localizeNode(assigneeMember.id === "ai" ? (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-purple-100 text-purple-600">
                      <Bot size={11} />
                    </span>
                  ) : (
                    <Avatar person={assigneeMember} size={20} />
                  ))}
                  <span className={`flex-1 truncate text-[12px] font-semibold ${HEADING}`}>{assigneeMember.name}</span>
                  <ChevronDown size={13} className={`${SUBTLE} transition ${assigneeOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {localizeNode(assigneeOpen && (
                    <motion.div {...popIn} className={`${POPOVER} end-0 top-[calc(100%+6px)] w-full min-w-[180px]`}>
                      {localizeNode(teamMembers.map((member) => (
                        <button
                          key={member.id}
                          className={MENU_ITEM}
                          onClick={() => {
                            updateActive({ assignee: member.name });
                            void manualAssign({
                              conversationId: active.id,
                              leadId: activeMatchedLead?.id,
                              customerName: active.name || 'Visitor',
                              customerEmail: active.email,
                              customerPhone: active.phone,
                              channel: active.channel,
                              agent: {
                                id: member.id,
                                name: member.name,
                                email: member.email,
                                role: member.role,
                              },
                            });
                            logActivity("handoff", `Assigned to ${member.name}`);
                            setAssigneeOpen(false);
                          }}
                        >
                          {localizeNode(member.id === "ai" ? (
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-purple-100 text-purple-600">
                              <Bot size={13} />
                            </span>
                          ) : (
                            <Avatar person={member} size={24} />
                          ))}
                          <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate">
                            <span className="truncate">{member.name}</span>
                            {member.isSupport && (
                              <span
                                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                  member.onShift
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                    : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'
                                }`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${member.onShift ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                {typeof member.allocation === 'number' ? `${member.allocation}%` : translateText(member.onShift ? 'On Shift' : 'Off Shift')}
                              </span>
                            )}
                          </span>
                          {localizeNode(member.name === active.assignee && <Check size={14} className="text-purple-600" />)}
                        </button>
                      )))}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </dd>

              <dt className={MUTED}>{translateText("Last Activity")}</dt>
              <dd className={`font-medium ${HEADING}`}>{formatInboxTime(active.time, language)}</dd>
            </dl>
          </div>

          {/* AI follow-up */}
          <div className={`${CARD} shrink-0 p-3.5`}>
            <div className="flex items-center gap-2">
              <h3 className={`text-[13.5px] font-bold ${HEADING}`}>{translateText("AI Follow-Up")}</h3>
              <span
                className={`rounded-md border px-2 py-[1px] text-[10.5px] font-semibold ${
                  aiReplying
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/10 dark:text-slate-400"
                }`}
              >
                {localizeNode(aiReplying ? "Active" : "Paused")}
              </span>
              <span className="ms-auto">
                <Toggle
                  checked={aiReplying}
                  disabled={!workspaceAiLive}
                  onChange={async (value) => {
                    updateActive({ followUp: value, aiAutoReply: value, takenOver: !value, aiState: value ? 'answered' : 'human_takeover' });
                    if (!demoInbox && active.id && !active.id.startsWith('crm-')) {
                      try {
                        await gosApi.setConversationAi(active.id, value);
                      } catch (error) {
                        showToast.error(backendError(error));
                      }
                    }
                    logActivity("ai", value ? "AI follow-up activated" : "AI follow-up paused");
                  }}
                  label="Toggle AI follow-up"
                />
              </span>
            </div>
            {!demoInbox && (
              <p className={`mt-1.5 text-[11px] ${MUTED}`}>
                {isAr
                  ? `قاعدة المعرفة: ${readyKnowledgeCount} مصدر جاهز · ${channelMeta[active.channel].label}`
                  : `Knowledge Base: ${readyKnowledgeCount} ready ${readyKnowledgeCount === 1 ? 'source' : 'sources'} · ${channelMeta[active.channel].label}`}
              </p>
            )}
            <ul className={`mt-2.5 space-y-1.5 transition-opacity ${aiReplying ? "" : "opacity-50"}`}>
              {localizeNode(followUpRuleLabels.map((label, index) => {
                const on = active.followUpRules[index];
                return (
                  <li key={label}>
                    <button
                      disabled={!aiReplying}
                      onClick={() =>
                        updateActive((c) => ({
                          followUpRules: c.followUpRules.map((r, i) => (i === index ? !r : r)),
                        }))
                      }
                      className="flex w-full items-center gap-2.5 text-start text-[12px] text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed dark:text-slate-300"
                    >
                      {localizeNode(on ? (
                        <CircleCheck size={15} className="shrink-0 text-emerald-500" />
                      ) : (
                        <Circle size={15} className="shrink-0 text-slate-300 dark:text-slate-600" />
                      ))}
                      {localizeNode(label)}
                    </button>
                  </li>
                );
              }))}
            </ul>
            <button
              onClick={() => navigate("/dashboard/follow-up")}
              className="mt-2.5 flex w-full items-center gap-2 rounded-lg border border-slate-200/80 px-2.5 py-1.5 text-[12px] font-medium text-purple-700 transition hover:border-purple-200 hover:bg-purple-50/60 dark:border-white/10 dark:text-purple-300"
            >
              <SlidersHorizontal size={14} className="text-purple-500" />{translateText("Customize workflow")}<ChevronRight size={15} className="ms-auto text-slate-400" />
            </button>
          </div>

          <div className="shrink-0 space-y-2">
            <button
              id="inbox-take-over"
              onClick={toggleTakeover}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] py-3 text-[13px] font-medium text-white shadow-sm transition hover:bg-[#7C3AED] active:scale-[0.99]"
            >
              {localizeNode(active.takenOver ? <Bot size={16} /> : <UserRound size={16} />)}
              {localizeNode(active.takenOver ? "Hand back to AI" : "Take over conversation")}
            </button>
            <button
              id="inbox-open-crm"
              onClick={() =>
                navigate(
                  activeMatchedLead
                    ? `/dashboard/crm?leadId=${encodeURIComponent(activeMatchedLead.id)}`
                    : '/dashboard/crm',
                )
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-purple-200 bg-white py-2.5 text-[13px] font-medium text-purple-600 transition hover:bg-purple-50 dark:border-purple-400/30 dark:bg-transparent dark:text-purple-300 dark:hover:bg-purple-500/10"
            >
              <ExternalLink size={15} />{translateText(" Open in CRM")}</button>
          </div>

          {/* recent activity */}
          <div className={`${CARD} flex min-h-[168px] flex-1 flex-col p-3.5`}>
            <div className="mb-2.5 flex shrink-0 items-center justify-between">
              <h3 className={`text-[13.5px] font-bold ${HEADING}`}>{translateText("Recent Activity")}</h3>
              <button
                id="inbox-activity-view-all"
                onClick={() => navigate("/dashboard/activity")}
                className="inline-flex items-center gap-0.5 text-[11.5px] font-semibold text-purple-600 transition hover:gap-1 hover:text-purple-700 dark:text-purple-300"
              >{translateText("View all ")}<ArrowRight size={12} strokeWidth={2.5} />
              </button>
            </div>
            <ol className="inbox-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto">
              {localizeNode(active.activity.map((item) => {
                const style = activityStyle[item.kind];
                const Icon = style.icon;
                return (
                  <li key={item.id} className="flex items-center gap-2.5">
                    <span className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full ${style.className}`}>
                      <Icon size={12} strokeWidth={2.4} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-slate-700 dark:text-slate-200">{localizeNode(item.text)}</span>
                    <time className={`shrink-0 text-[11px] ${SUBTLE}`}>{localizeNode(item.time)}</time>
                  </li>
                );
              }))}
            </ol>
          </div>
        </aside>
        </>) : (
        <section className={`${CARD} flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-2 px-5 text-center`} aria-label={translateText("Conversations")}>
          <h2 className="text-[15px] font-semibold">{language === 'ar' ? 'لا توجد محادثات بعد' : translateText("No conversations yet")}</h2>
          <p className={`max-w-sm text-[13px] ${MUTED}`}>{language === 'ar' ? 'ستظهر هنا رسائل العملاء من القنوات المربوطة فور وصولها.' : translateText("Customer messages from your connected channels will appear here as soon as they arrive.")}</p>
        </section>
        )}
      </div>
    </div>
  );
};

function InboxWorkspaceSkeleton({
  cardClass,
  loadingLabel,
}: {
  cardClass: string;
  loadingLabel: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={loadingLabel}
      className="inbox-root inbox-skeleton-root flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-3 overflow-hidden bg-slate-50/50 p-3 dark:bg-transparent"
    >
      {/* Top channel filter bar skeleton */}
      <div className={`${cardClass} flex h-[54px] shrink-0 items-center justify-between gap-3 px-3`}>
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {[92, 108, 104, 112, 96, 88].map((w, idx) => (
            <span
              key={idx}
              style={{ width: w }}
              className="inbox-skel-shimmer h-9 shrink-0 rounded-xl"
            />
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-purple-100/80 bg-purple-50/50 px-3 py-1.5 dark:border-purple-400/20 dark:bg-purple-500/10">
          <LoaderCircle size={14} className="animate-spin text-[#7C3AED] dark:text-[#A78BFA]" />
          <span className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">{loadingLabel}</span>
        </div>
      </div>

      {/* 3-column workspace skeleton */}
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        {/* Column 1: conversation list skeleton */}
        <aside className={`${cardClass} flex min-h-0 w-full shrink-0 flex-col md:w-[300px] 2xl:w-[340px]`} aria-hidden="true">
          <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-2.5 dark:border-white/[0.07]">
            <span className="inbox-skel-shimmer h-6 w-14 rounded-lg" />
            <span className="inbox-skel-shimmer h-6 w-16 rounded-lg" />
            <span className="inbox-skel-shimmer h-6 w-24 rounded-lg" />
          </div>
          <div className="flex shrink-0 items-center gap-2 p-3">
            <span className="inbox-skel-shimmer h-9 flex-1 rounded-xl" />
            <span className="inbox-skel-shimmer h-9 w-9 shrink-0 rounded-lg" />
          </div>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-hidden px-2.5 pb-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-xl border p-2.5 ${
                  i === 0
                    ? 'border-purple-100/80 bg-purple-50/40 dark:border-purple-400/15 dark:bg-purple-500/[0.07]'
                    : 'border-transparent'
                }`}
              >
                <span className="inbox-skel-shimmer h-10 w-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inbox-skel-shimmer h-3.5 w-28 rounded-md" />
                    <span className="inbox-skel-shimmer h-2.5 w-10 rounded-md" />
                  </div>
                  <span className="inbox-skel-shimmer block h-3 w-full rounded-md" />
                  <span className="inbox-skel-shimmer block h-2.5 w-2/3 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Column 2: thread skeleton */}
        <section className={`${cardClass} hidden min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex`} aria-hidden="true">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-white/[0.07]">
            <div className="flex items-center gap-3">
              <span className="inbox-skel-shimmer h-[42px] w-[42px] shrink-0 rounded-full" />
              <div className="space-y-2">
                <span className="inbox-skel-shimmer block h-4 w-36 rounded-md" />
                <span className="inbox-skel-shimmer block h-3 w-24 rounded-md" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inbox-skel-shimmer h-8 w-24 rounded-lg" />
              <span className="inbox-skel-shimmer h-8 w-8 rounded-lg" />
            </div>
          </div>
          <div className="inbox-thread-bg flex min-h-0 flex-1 flex-col justify-between gap-4 p-5">
            <div className="space-y-4">
              <div className="flex items-start gap-2.5">
                <span className="inbox-skel-shimmer h-8 w-8 shrink-0 rounded-full" />
                <span className="inbox-skel-shimmer h-16 w-64 max-w-[70%] rounded-2xl" />
              </div>
              <div className="flex justify-end">
                <span className="inbox-skel-shimmer h-14 w-72 max-w-[72%] rounded-2xl" />
              </div>
              <div className="flex items-start gap-2.5">
                <span className="inbox-skel-shimmer h-8 w-8 shrink-0 rounded-full" />
                <span className="inbox-skel-shimmer h-20 w-80 max-w-[75%] rounded-2xl" />
              </div>
            </div>
            <div className="flex items-center justify-center py-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-200/60 bg-white/90 px-3.5 py-1.5 text-[12px] font-medium text-slate-600 shadow-sm dark:border-purple-400/20 dark:bg-[#171c32]/90 dark:text-slate-200">
                <LoaderCircle size={13} className="animate-spin text-[#7C3AED] dark:text-[#A78BFA]" />
                <span>{loadingLabel}</span>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 p-3 dark:border-white/[0.07]">
            <span className="inbox-skel-shimmer block h-16 w-full rounded-xl" />
          </div>
        </section>

        {/* Column 3: contact details skeleton */}
        <aside className={`${cardClass} hidden min-h-0 w-[290px] shrink-0 flex-col gap-4 p-4 xl:flex 2xl:w-[320px]`} aria-hidden="true">
          <div className="flex flex-col items-center gap-2.5 border-b border-slate-100 pb-4 pt-2 dark:border-white/[0.07]">
            <span className="inbox-skel-shimmer h-14 w-14 rounded-full" />
            <span className="inbox-skel-shimmer h-4 w-32 rounded-md" />
            <span className="inbox-skel-shimmer h-3 w-24 rounded-md" />
          </div>
          <div className="space-y-3">
            <span className="inbox-skel-shimmer block h-3 w-20 rounded-md" />
            <span className="inbox-skel-shimmer block h-9 w-full rounded-xl" />
            <span className="inbox-skel-shimmer block h-9 w-full rounded-xl" />
            <span className="inbox-skel-shimmer block h-9 w-full rounded-xl" />
          </div>
          <div className="mt-auto space-y-2.5 border-t border-slate-100 pt-4 dark:border-white/[0.07]">
            <span className="inbox-skel-shimmer block h-3 w-28 rounded-md" />
            <span className="inbox-skel-shimmer block h-7 w-full rounded-lg" />
            <span className="inbox-skel-shimmer block h-7 w-5/6 rounded-lg" />
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Inbox;
