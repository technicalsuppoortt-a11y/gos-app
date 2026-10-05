import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArrowRight,
  BellOff,
  Bot,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleCheck,
  ExternalLink,
  FileText,
  LayoutTemplate,
  LoaderCircle,
  Mail,
  MailOpen,
  MapPin,
  MessageCircle,
  MessageSquarePlus,
  Mic,
  MoreHorizontal,
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
import type { Lead } from "../data/mockData";
import { showToast } from "../utils/toast";
import { ChannelIcon } from "./inbox/ChannelIcons";
import {
  channelMeta,
  channelOrder,
  currentUser,
  followUpRuleLabels,
  initialConversations,
  makeId,
  replyTemplates,
  stages,
  tagMeta,
  teamMembers,
} from "./inbox/inboxData";
import type {
  Activity,
  ActivityKind,
  Attachment,
  ChannelId,
  Conversation,
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

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
/* ------------------------------------------------------------------ */
const CARD =
  "rounded-2xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-white/[0.06] dark:bg-[#111522]";
const HEADING = "text-slate-900 dark:text-slate-100";
const MUTED = "text-slate-500 dark:text-slate-400";
const SUBTLE = "text-slate-400 dark:text-slate-500";
const ICON_BTN =
  "grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200/80 bg-white text-slate-500 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400 dark:hover:bg-purple-500/10 dark:hover:text-purple-300";
const POPOVER =
  "absolute z-40 overflow-hidden rounded-xl border border-slate-100 bg-white p-1.5 shadow-[0_18px_45px_-12px_rgba(30,27,75,0.25)] dark:border-white/10 dark:bg-[#161b2b]";
const MENU_ITEM =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white";

const popIn = {
  initial: { opacity: 0, y: 6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 4, scale: 0.98 },
  transition: { duration: 0.14, ease: "easeOut" as const },
};

const nowTime = () =>
  new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

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
  const track = size === "sm" ? "h-[18px] w-8" : "h-[22px] w-10";
  const knob = size === "sm" ? "h-3.5 w-3.5" : "h-[18px] w-[18px]";
  const shift = size === "sm" ? "translate-x-[14px]" : "translate-x-[18px]";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 disabled:cursor-not-allowed disabled:opacity-50 ${track} ${
        checked
          ? "bg-[#7C5CFC] shadow-[0_2px_8px_-2px_rgba(124,92,252,0.6)]"
          : "bg-slate-200 dark:bg-white/15"
      }`}
    >
      <span
        className={`${knob} rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? shift : "translate-x-0"}`}
      />
    </button>
  );
}

function TagPill({ tag, onRemove, compact }: { tag: TagId; onRemove?: () => void; compact?: boolean }) {
  return (
    <span
      className={`group inline-flex items-center gap-1 whitespace-nowrap rounded-md font-semibold ${
        compact ? "h-[18px] px-1.5 text-[10px]" : "h-[22px] px-2 text-[11px]"
      } ${tagMeta[tag].className}`}
    >
      {tagMeta[tag].label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${tagMeta[tag].label} tag`}
          className="-mr-1 hidden h-4 w-4 place-items-center rounded opacity-70 hover:opacity-100 group-hover:grid"
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      )}
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
  const badge = Math.max(14, Math.round(size * 0.42));
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {person.avatar ? (
        <img
          src={person.avatar}
          alt={person.name}
          className="h-full w-full rounded-full object-cover ring-2 ring-white dark:ring-[#111522]"
          draggable={false}
        />
      ) : (
        <span
          className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-[#A48BFF] to-[#6D4DF2] font-semibold text-white ring-2 ring-white dark:ring-[#111522]"
          style={{ fontSize: Math.round(size * 0.36) }}
        >
          {person.initials}
        </span>
      )}
      {channel && (
        <span
          className="absolute -bottom-0.5 -right-0.5 grid place-items-center rounded-full bg-white p-[1.5px] shadow-sm dark:bg-[#111522]"
          style={{ width: badge + 3, height: badge + 3 }}
        >
          <ChannelIcon channel={channel} size={badge} />
        </span>
      )}
    </span>
  );
}

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <b key={index} className="font-semibold text-slate-900 dark:text-white">
        {part.slice(2, -2)}
      </b>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    ),
  );
}

function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-2.5">
      {text.split("\n\n").map((block, blockIndex) => {
        const lines = block.split("\n");
        const nodes: React.ReactNode[] = [];
        let list: string[] = [];
        const flush = () => {
          if (!list.length) return;
          nodes.push(
            <ul key={`ul-${nodes.length}`} className="list-disc space-y-0.5 pl-5 marker:text-slate-400">
              {list.map((item, i) => (
                <li key={i}>{renderInline(item)}</li>
              ))}
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
          nodes.push(<p key={`p-${lineIndex}`}>{renderInline(line)}</p>);
        });
        flush();
        return <div key={blockIndex}>{nodes}</div>;
      })}
    </div>
  );
}

function VoicePlayer({ note, tone = "light" }: { note: VoiceNote; tone?: "light" | "brand" }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <div className="flex min-w-[200px] items-center gap-2.5">
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
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#7C5CFC] text-white shadow-sm transition hover:bg-[#6a4bf0]"
      >
        {playing ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" className="ml-0.5" />}
      </button>
      <span className="flex h-6 flex-1 items-center gap-[2px]">
        {Array.from({ length: 28 }, (_, i) => (
          <i
            key={i}
            className={`w-[3px] rounded-full ${tone === "brand" ? "bg-purple-300" : "bg-slate-300"} ${playing ? "animate-pulse" : ""}`}
            style={{ height: `${5 + ((i * 7) % 15)}px` }}
          />
        ))}
      </span>
      <small className={`text-[11px] tabular-nums ${MUTED}`}>{formatDuration(note.duration)}</small>
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
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const crmLead = useSelector((state: RootState) => state.crm.leads.find(lead => lead.id === params.get('leadId')));
  const requestedChannel = params.get('channel');
  const linkedChannel: ChannelId = channelOrder.includes(requestedChannel as ChannelId) ? requestedChannel as ChannelId : 'webchat';
  const linkedConversation: Conversation | undefined = crmLead ? initialConversations.find(c => c.email === crmLead.email && (!requestedChannel || c.channel === linkedChannel)) ?? {
    id: `crm-${crmLead.id}-${linkedChannel}`, name: crmLead.name, initials: crmLead.avatar, channel: linkedChannel,
    preview: 'No messages yet', time: 'Just now', unread: 0, tags: [], stage: crmLead.lifecycleStage,
    source: crmLead.source, phone: crmLead.phone ?? '', email: crmLead.email, location: '', assignee: crmLead.owner,
    aiAutoReply: false, takenOver: true, followUp: Boolean(crmLead.nextFollowUp), followUpRules: [], starred: false, messages: [], activity: [],
  } : undefined;
  const [conversations, setConversations] = useState<Conversation[]>(() => linkedConversation && !initialConversations.some(c => c.id === linkedConversation.id) ? [linkedConversation, ...initialConversations] : initialConversations);
  const [activeId, setActiveId] = useState(() => linkedConversation?.id ?? initialConversations[0].id);
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

  const [mode, setMode] = useState<ComposerMode>("reply");
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [assistLoading, setAssistLoading] = useState(false);
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

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];
  const aiReplying = aiMode && active.aiAutoReply && !active.takenOver;

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
      if (folder === "mine" && c.assignee !== currentUser.name) return false;
      if (tagFilter.length && !c.tags.some((t) => tagFilter.includes(t))) return false;
      if (query && !`${c.name} ${c.preview} ${c.email}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [channelFilter, conversations, folder, search, tagFilter]);

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
    setConversations((list) => list.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    setDraft("");
    setMode("reply");
    setEditingLead(false);
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
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined") {
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

  const canSend = Boolean(draft.trim() || attachments.length || voiceDraft);

  const send = () => {
    if (!canSend) return;
    const text = draft.trim();
    const message: Message = {
      id: makeId("m"),
      sender: mode === "note" ? "note" : "agent",
      text: text || undefined,
      time: nowTime(),
      attachments: attachments.length ? attachments : undefined,
      voice: voiceDraft ?? undefined,
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
          text: mode === "note" ? "Internal note added" : "You sent a message",
          time: "Just now",
        },
        ...c.activity,
      ],
    }));
    setDraft("");
    setAttachments([]);
    setVoiceDraft(null);
    setElapsed(0);
    if (mode === "reply") setSent(true);
  };

  const runAiAssist = () => {
    if (assistLoading) return;
    setAssistLoading(true);
    const lastCustomer = [...active.messages].reverse().find((m) => m.sender === "customer")?.text ?? "";
    const first = active.name.split(" ")[0];
    const lower = lastCustomer.toLowerCase();
    const suggestion = lower.includes("price") || lower.includes("cost")
      ? `Hi ${first}! Our plans start at €97/month (Basic), €197/month for Pro — our most popular — and €297/month for VIP. Would you like me to book you a free consultation to find the right fit?`
      : lower.includes("book") || lower.includes("session") || lower.includes("time")
        ? `Of course, ${first}! I have openings this Thursday at 6 PM and Saturday at 11 AM. Which one works best for you?`
        : lower.includes("online") || lower.includes("dubai") || lower.includes("city")
          ? `Great question, ${first}! Our coaching is 100% online, so you can join from anywhere with weekly video check-ins.`
          : `Thanks for reaching out, ${first}! I'd be happy to help — could you tell me a bit more about your goals so I can recommend the best plan?`;
    window.setTimeout(() => {
      setDraft(suggestion);
      setMode("reply");
      setAssistLoading(false);
      inputRef.current?.focus();
    }, 750);
  };

  /* ---------------- right panel actions ---------------- */
  const addTag = (tag: TagId) => {
    updateActive((c) => ({ tags: [...c.tags, tag] }));
    logActivity("tag", `Tag added: ${tagMeta[tag].label}`);
    setTagMenuOpen(false);
  };

  const removeTag = (tag: TagId) => {
    updateActive((c) => ({ tags: c.tags.filter((t) => t !== tag) }));
    logActivity("tag", `Tag removed: ${tagMeta[tag].label}`);
  };

  const toggleTakeover = () => {
    const takingOver = !active.takenOver;
    updateActive({ takenOver: takingOver, aiAutoReply: !takingOver });
    logActivity("handoff", takingOver ? `${currentUser.name} took over` : "Conversation handed back to AI");
    showToast.success(
      takingOver ? `You're now handling ${active.name.split(" ")[0]}'s conversation.` : "AI is handling this conversation again.",
    );
    if (takingOver) inputRef.current?.focus();
  };

  const archiveActive = () => {
    const remaining = conversations.filter((c) => c.id !== active.id);
    if (!remaining.length) return;
    setConversations(remaining);
    setActiveId(remaining[0].id);
    setMoreOpen(false);
    showToast.success(`Conversation with ${active.name} archived.`);
  };

  const assigneeMember = teamMembers.find((m) => m.name === active.assignee) ?? teamMembers[0];
  const availableTags = (Object.keys(tagMeta) as TagId[]).filter((t) => !active.tags.includes(t));

  /* ------------------------------------------------------------------ */
  return (
    <div className="inbox-root flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-3 overflow-hidden bg-slate-50/50 p-3 dark:bg-transparent">
      {/* ============ Channel filter strip ============ */}
      <div className={`${CARD} flex h-[54px] shrink-0 items-center gap-3 px-2.5`}>
        <div className="inbox-scroll-x flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" role="tablist" aria-label="Filter by channel">
          {(["all", ...channelOrder] as const).map((id) => {
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
                {isActive && (
                  <motion.span
                    layoutId="inbox-channel-pill"
                    className="absolute inset-0 rounded-xl bg-purple-50 ring-1 ring-inset ring-purple-200/70 dark:bg-purple-500/15 dark:ring-purple-400/25"
                    transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {id === "all" ? (
                    <span className="grid h-5 w-5 place-items-center rounded-md bg-purple-100 text-purple-600 dark:bg-purple-500/25 dark:text-purple-200">
                      <MessageCircle size={12} strokeWidth={2.5} />
                    </span>
                  ) : (
                    <ChannelIcon channel={id} size={18} />
                  )}
                  {id === "all" ? "All" : channelMeta[id].label}
                  <span
                    className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
                      isActive
                        ? "bg-[#7C5CFC] text-white"
                        : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
                    }`}
                  >
                    {channelCounts[id]}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-purple-100 bg-gradient-to-r from-purple-50 to-white py-1.5 pl-3 pr-2 dark:border-purple-400/20 dark:from-purple-500/10 dark:to-transparent">
          <Sparkles size={15} className="text-[#7C5CFC]" fill="currentColor" />
          <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">AI Active</span>
          <Toggle
            checked={aiMode}
            onChange={(value) => {
              setAiMode(value);
              showToast.success(value ? "AI replies resumed across all channels." : "AI replies paused across all channels.");
            }}
            label="Toggle AI across the inbox"
          />
        </div>
      </div>

      {/* ============ 3-column workspace ============ */}
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        {/* ---------- Column 1: conversation list ---------- */}
        <aside className={`${CARD} hidden min-h-0 w-[300px] shrink-0 flex-col md:flex 2xl:w-[340px]`} aria-label="Conversations">
          <div className="flex shrink-0 items-center gap-1 border-b border-slate-100 px-3 pt-2 dark:border-white/[0.06]" role="tablist">
            {(
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
                {label}
                {id === "unread" && unreadTotal > 0 && (
                  <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {unreadTotal}
                  </span>
                )}
                {folder === id && (
                  <motion.span layoutId="inbox-folder-underline" className="absolute inset-x-1.5 -bottom-px h-[2px] rounded-full bg-[#7C5CFC]" />
                )}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2 p-3">
            <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 transition focus-within:border-purple-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-purple-100 dark:border-white/10 dark:bg-white/[0.03] dark:focus-within:ring-purple-500/10">
              <Search size={15} className={SUBTLE} />
              <input
                id="inbox-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="min-w-0 flex-1 bg-transparent text-[12.5px] text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
              />
              {search && (
                <button onClick={() => setSearch("")} aria-label="Clear search" className={`${SUBTLE} hover:text-slate-600`}>
                  <X size={14} />
                </button>
              )}
            </label>
            <div className="relative" ref={filterRef}>
              <button
                id="inbox-filter"
                onClick={() => setFilterOpen((v) => !v)}
                aria-label="Filter conversations"
                aria-expanded={filterOpen}
                className={`${ICON_BTN} relative h-9 w-9 ${filterOpen || tagFilter.length ? "border-purple-200 bg-purple-50 text-purple-600" : ""}`}
              >
                <SlidersHorizontal size={15} />
                {tagFilter.length > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#7C5CFC] px-1 text-[9px] font-bold text-white">
                    {tagFilter.length}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {filterOpen && (
                  <motion.div {...popIn} className={`${POPOVER} right-0 top-[calc(100%+6px)] w-52`}>
                    <p className={`px-2.5 pb-1 pt-1.5 text-[10.5px] font-bold uppercase tracking-wider ${SUBTLE}`}>Filter by tag</p>
                    {(Object.keys(tagMeta) as TagId[]).map((tag) => {
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
                              checked ? "border-[#7C5CFC] bg-[#7C5CFC] text-white" : "border-slate-300 dark:border-white/20"
                            }`}
                          >
                            {checked && <Check size={11} strokeWidth={3} />}
                          </span>
                          <TagPill tag={tag} />
                        </button>
                      );
                    })}
                    <div className="mt-1 border-t border-slate-100 pt-1 dark:border-white/10">
                      <button onClick={() => setTagFilter([])} className={`${MENU_ITEM} justify-center text-purple-600`}>
                        Clear filters
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <ul className="inbox-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
            {visible.map((c) => {
              const isActive = c.id === active.id;
              return (
                <li key={c.id}>
                  <button
                    id={`inbox-conversation-${c.id}`}
                    onClick={() => selectConversation(c.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={`group relative flex w-full items-start gap-3 rounded-xl border px-2.5 py-2.5 text-left overflow-hidden transition ${
                      isActive
                        ? "border-purple-100 bg-gradient-to-r from-purple-50/80 to-transparent shadow-[0_1px_2px_rgba(124,92,252,0.05)] dark:border-purple-500/20 dark:from-purple-500/10"
                        : "border-transparent hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                    }`}
                  >
                    {isActive && <span className="absolute bottom-0 left-0 top-0 w-1 bg-[#7C5CFC]" />}
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
                        {c.preview}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
                      <span className={`whitespace-nowrap text-[10.5px] leading-4 ${SUBTLE}`}>{c.time}</span>
                      <span className="flex h-[18px] items-center gap-1">
                        {c.starred && <Star size={11} className="text-amber-400" fill="currentColor" />}
                        <ChannelIcon channel={c.channel} size={15} />
                        {c.unread > 0 && (
                          <span className="grid h-[17px] min-w-[17px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                            {c.unread}
                          </span>
                        )}
                      </span>
                      {c.tags[0] && <TagPill tag={c.tags[0]} compact />}
                    </span>
                  </button>
                </li>
              );
            })}
            {!visible.length && (
              <li className="flex flex-col items-center px-6 py-14 text-center">
                <span className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-purple-50 text-purple-500 dark:bg-purple-500/15">
                  <Search size={18} />
                </span>
                <b className={`text-[13px] ${HEADING}`}>No conversations found</b>
                <p className={`mt-1 text-[12px] ${MUTED}`}>Try a different channel, folder or search term.</p>
              </li>
            )}
          </ul>
        </aside>

        {/* ---------- Column 2: chat thread ---------- */}
        <section className={`${CARD} flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden`} aria-label={`Conversation with ${active.name}`}>
          {/* chat header */}
          <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-5 py-3 dark:border-white/[0.06]">
            <Avatar person={active} size={42} />
            <div className="min-w-0">
              <h2 className={`truncate text-[15px] font-bold leading-5 ${HEADING}`}>{active.name}</h2>
              <p className={`mt-0.5 flex items-center gap-1.5 text-[12px] ${MUTED}`}>
                <ChannelIcon channel={active.channel} size={14} />
                {channelMeta[active.channel].label}
              </p>
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 pl-2">
              {active.tags[0] && <TagPill tag={active.tags[0]} />}
              {aiReplying ? (
                <span className="inline-flex h-[22px] items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-600 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <Sparkles size={11} fill="currentColor" /> AI Active
                </span>
              ) : (
                <span className="inline-flex h-[22px] items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] font-semibold text-slate-500 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                  <UserRound size={11} /> {active.takenOver ? "You're handling" : "AI paused"}
                </span>
              )}
            </div>
            <button
              id="inbox-star"
              onClick={() => updateActive((c) => ({ starred: !c.starred }))}
              aria-label={active.starred ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={active.starred}
              className={`${ICON_BTN} h-9 w-9 ${active.starred ? "border-amber-200 bg-amber-50 text-amber-500 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-500" : ""}`}
            >
              <Star size={16} fill={active.starred ? "currentColor" : "none"} />
            </button>
            <div className="relative" ref={moreRef}>
              <button
                id="inbox-more"
                onClick={() => setMoreOpen((v) => !v)}
                aria-label="More options"
                aria-expanded={moreOpen}
                className={`${ICON_BTN} h-9 w-9`}
              >
                <MoreHorizontal size={16} />
              </button>
              <AnimatePresence>
                {moreOpen && (
                  <motion.div {...popIn} className={`${POPOVER} right-0 top-[calc(100%+6px)] w-56`}>
                    <button
                      className={MENU_ITEM}
                      onClick={() => {
                        updateActive({ unread: 1 });
                        setMoreOpen(false);
                      }}
                    >
                      <MailOpen size={15} className={SUBTLE} /> Mark as unread
                    </button>
                    <button
                      className={MENU_ITEM}
                      onClick={() => {
                        updateActive({ assignee: currentUser.name });
                        logActivity("handoff", `Assigned to ${currentUser.name}`);
                        setMoreOpen(false);
                      }}
                    >
                      <UserRoundCheck size={15} className={SUBTLE} /> Assign to me
                    </button>
                    <button
                      className={MENU_ITEM}
                      onClick={() => {
                        setMoreOpen(false);
                        showToast.success(`Notifications muted for ${active.name}.`);
                      }}
                    >
                      <BellOff size={15} className={SUBTLE} /> Mute notifications
                    </button>
                    <div className="my-1 border-t border-slate-100 dark:border-white/10" />
                    <button className={`${MENU_ITEM} text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400`} onClick={archiveActive}>
                      <Archive size={15} /> Archive conversation
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </header>

          {/* message thread */}
          <div ref={threadRef} className="inbox-scroll inbox-thread-bg min-h-0 flex-1 overflow-y-auto px-5 py-4 2xl:px-8">
            <div className="mb-4 flex justify-center">
              <span className="rounded-full border border-slate-100 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                Today
              </span>
            </div>
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {active.messages.map((m) => {
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
                      {incoming && <Avatar person={active} size={30} />}
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
                          {isNote && (
                            <span className="mb-1 flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                              <StickyNote size={11} /> Internal note
                            </span>
                          )}
                          {m.text && <RichText text={m.text} />}
                          {m.voice && (
                            <div className={m.text ? "mt-2" : ""}>
                              <VoicePlayer note={m.voice} tone={incoming ? "light" : "brand"} />
                            </div>
                          )}
                          {m.attachments && (
                            <div className={`flex flex-wrap gap-2 ${m.text || m.voice ? "mt-2.5" : ""}`}>
                              {m.attachments.map((file) =>
                                file.isImage ? (
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
                                      <small className={`text-[11px] ${MUTED}`}>{bytesLabel(file.size)}</small>
                                    </span>
                                  </a>
                                ),
                              )}
                            </div>
                          )}
                          {m.card === "consultation" && (
                            <button
                              onClick={() => navigate("/dashboard/booking")}
                              className="group mt-3 flex w-full items-center gap-3 rounded-xl border border-purple-100 bg-white p-3 text-left shadow-[0_1px_2px_rgba(124,92,252,0.08)] transition hover:-translate-y-px hover:border-purple-200 hover:shadow-md dark:border-purple-400/20 dark:bg-white/5"
                            >
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 text-[#7C5CFC] dark:from-purple-500/25 dark:to-purple-500/10">
                                <CalendarDays size={19} strokeWidth={2.2} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <b className={`block text-[13px] font-semibold ${HEADING}`}>Book a Free Consultation</b>
                                <small className={`text-[12px] ${MUTED}`}>Choose a time that works for you.</small>
                              </span>
                              <ChevronRight size={16} className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-purple-500" />
                            </button>
                          )}
                        </div>
                        <span className={`mt-1 flex items-center gap-1 px-1 text-[10.5px] ${SUBTLE}`}>
                          {m.sender === "ai" && (
                            <>
                              <Sparkles size={10} className="text-purple-400" fill="currentColor" /> AI Assistant ·
                            </>
                          )}
                          {m.sender === "agent" && <>{currentUser.name} ·</>}
                          {m.time}
                          {(m.sender === "ai" || m.sender === "agent") && <CheckCheck size={13} className="text-purple-400" />}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* composer */}
          <div className="shrink-0 border-t border-slate-100 px-4 pb-3 pt-2 dark:border-white/[0.06]">
            <div className="flex items-center gap-1" role="tablist" aria-label="Composer mode">
              {(
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
                  {label}
                  {mode === id && (
                    <motion.span
                      layoutId="inbox-mode-underline"
                      className={`absolute inset-x-2 bottom-0 h-[2px] rounded-full ${id === "note" ? "bg-amber-400" : "bg-[#7C5CFC]"}`}
                    />
                  )}
                </button>
              ))}
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
              <button id="inbox-attach" onClick={() => fileInputRef.current?.click()} aria-label="Attach files" className={ICON_BTN}>
                <Paperclip size={15} />
              </button>
              <div className="relative" ref={templatesRef}>
                <button
                  id="inbox-templates"
                  onClick={() => setTemplatesOpen((v) => !v)}
                  aria-expanded={templatesOpen}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 text-[12px] font-semibold text-slate-600 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300"
                >
                  <LayoutTemplate size={14} /> Templates
                </button>
                <AnimatePresence>
                  {templatesOpen && (
                    <motion.div {...popIn} className={`${POPOVER} bottom-[calc(100%+6px)] left-0 w-72`}>
                      <p className={`px-2.5 pb-1 pt-1.5 text-[10.5px] font-bold uppercase tracking-wider ${SUBTLE}`}>Saved replies</p>
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
                {assistLoading ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {assistLoading ? "Writing…" : "AI Assist"}
              </button>
              <div className="ml-auto flex items-center gap-2">
                <Toggle
                  size="sm"
                  checked={active.aiAutoReply && !active.takenOver}
                  disabled={!aiMode}
                  onChange={(value) => {
                    updateActive({ aiAutoReply: value, takenOver: value ? false : active.takenOver });
                    logActivity(value ? "ai" : "handoff", value ? "AI auto-reply enabled" : "AI auto-reply disabled");
                  }}
                  label="AI auto-reply for this conversation"
                />
                <button
                  onClick={() => navigate("/dashboard/follow-up")}
                  className={`flex items-center gap-0.5 text-[12px] font-medium transition hover:text-purple-600 ${MUTED}`}
                >
                  {!aiMode ? "AI paused workspace-wide" : aiReplying ? "AI will reply automatically" : "AI auto-reply off"}
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="inbox-scroll-x mt-2 flex gap-2 overflow-x-auto pb-1">
                {attachments.map((file) => (
                  <div key={file.id} className="relative flex h-12 w-48 shrink-0 items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-1.5 pr-7 dark:border-white/10 dark:bg-white/5">
                    {file.isImage ? (
                      <img src={file.url} alt="" className="h-9 w-9 rounded-lg object-cover" />
                    ) : (
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-500/15">
                        <FileText size={15} />
                      </span>
                    )}
                    <span className="min-w-0">
                      <b className={`block truncate text-[11.5px] font-semibold ${HEADING}`}>{file.name}</b>
                      <small className={`text-[10.5px] ${MUTED}`}>{bytesLabel(file.size)}</small>
                    </span>
                    <button onClick={() => removeAttachment(file.id)} aria-label={`Remove ${file.name}`} className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-2 flex items-end gap-2">
              {recording ? (
                <div className="flex h-11 flex-1 items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/60 px-3 dark:border-rose-400/20 dark:bg-rose-500/10">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                  </span>
                  <b className="text-[12.5px] font-semibold text-rose-600 dark:text-rose-300">Recording</b>
                  <span className="text-[12.5px] font-bold tabular-nums text-rose-600 dark:text-rose-300">{formatDuration(elapsed)}</span>
                  <span className="flex flex-1 items-center gap-[3px]">
                    {Array.from({ length: 22 }, (_, i) => (
                      <i key={i} className="inbox-wave w-[3px] rounded-full bg-rose-300" style={{ animationDelay: `${(i % 7) * 90}ms` }} />
                    ))}
                  </span>
                  <button onClick={cancelRecording} aria-label="Discard recording" className="grid h-7 w-7 place-items-center rounded-lg text-rose-500 hover:bg-rose-100">
                    <Trash size={14} />
                  </button>
                  <button onClick={stopRecording} className="flex h-7 items-center gap-1.5 rounded-lg bg-rose-500 px-2.5 text-[12px] font-semibold text-white hover:bg-rose-600">
                    <span className="h-2 w-2 rounded-[2px] bg-white" /> Stop
                  </button>
                </div>
              ) : voiceDraft ? (
                <div className="flex h-11 flex-1 items-center gap-3 rounded-xl border border-purple-100 bg-purple-50/50 px-3 dark:border-purple-400/20 dark:bg-purple-500/10">
                  <VoicePlayer note={voiceDraft} tone="brand" />
                  <button onClick={cancelRecording} aria-label="Discard voice message" className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500">
                    <Trash size={14} />
                  </button>
                </div>
              ) : (
                <label
                  className={`flex min-h-11 flex-1 items-end gap-2 rounded-xl border px-3.5 py-2.5 transition focus-within:ring-4 ${
                    mode === "note"
                      ? "border-amber-200 bg-amber-50/60 focus-within:border-amber-300 focus-within:ring-amber-100 dark:border-amber-400/20 dark:bg-amber-500/10 dark:focus-within:ring-amber-500/10"
                      : "border-slate-200/80 bg-white focus-within:border-purple-300 focus-within:ring-purple-100 dark:border-white/10 dark:bg-white/[0.03] dark:focus-within:ring-purple-500/10"
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
                    placeholder={mode === "note" ? "Write an internal note — only your team can see this..." : "Type a message..."}
                    className="max-h-[120px] min-w-0 flex-1 resize-none bg-transparent text-[13px] leading-6 text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    id="inbox-voice"
                    onClick={startRecording}
                    aria-label="Record voice message"
                    className="mb-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-purple-50 hover:text-purple-600"
                  >
                    <Mic size={17} />
                  </button>
                </label>
              )}
              <button
                id="inbox-send"
                onClick={send}
                disabled={recording}
                aria-disabled={!canSend}
                aria-label={mode === "note" ? "Add note" : "Send message"}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl p-3 text-white shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
                  mode === "note" ? "bg-amber-500 hover:bg-amber-600" : "bg-[#7C5CFC] hover:bg-[#6b4ce6]"
                }`}
              >
                {mode === "note" ? <StickyNote size={18} /> : <Send size={18} strokeWidth={2.2} />}
              </button>
            </div>
          </div>
        </section>

        {/* ---------- Column 3: CRM + AI context ---------- */}
        <aside className="inbox-scroll hidden min-h-0 w-[300px] shrink-0 flex-col gap-2.5 overflow-y-auto min-[1200px]:flex 2xl:w-[330px]" aria-label="Lead details">
          {/* contact summary */}
          <div className={`${CARD} shrink-0 p-3.5`}>
            <div className="flex items-start gap-3">
              <Avatar person={active} size={48} />
              <div className="min-w-0 flex-1">
                <h3 className={`truncate text-[15px] font-bold ${HEADING}`}>{active.name}</h3>
                <p className={`mt-0.5 flex items-center gap-1.5 text-[12px] ${MUTED}`}>
                  <ChannelIcon channel={active.channel} size={14} /> {channelMeta[active.channel].label}
                </p>
              </div>
              <div className="relative" ref={leadMenuRef}>
                <button
                  id="inbox-lead-more"
                  onClick={() => setLeadMenuOpen((v) => !v)}
                  aria-label="Contact options"
                  aria-expanded={leadMenuOpen}
                  className={ICON_BTN}
                >
                  <MoreHorizontal size={15} />
                </button>
                <AnimatePresence>
                  {leadMenuOpen && (
                    <motion.div {...popIn} className={`${POPOVER} right-0 top-[calc(100%+6px)] w-52`}>
                      <button className={MENU_ITEM} onClick={() => { setEditingLead(true); setLeadMenuOpen(false); }}>
                        <Pencil size={15} className={SUBTLE} /> Edit Lead Details
                      </button>
                      <button className={MENU_ITEM} onClick={() => { setTagMenuOpen(true); setLeadMenuOpen(false); }}>
                        <Tag size={15} className={SUBTLE} /> Manage Tags
                      </button>
                      <button className={MENU_ITEM} onClick={() => { setAssigneeOpen(true); setLeadMenuOpen(false); }}>
                        <UserRound size={15} className={SUBTLE} /> Reassign Lead
                      </button>
                      <button className={MENU_ITEM} onClick={() => { showToast.success("Contact muted."); setLeadMenuOpen(false); }}>
                        <BellOff size={15} className={SUBTLE} /> Block / Mute Contact
                      </button>
                      <div className="my-1 border-t border-slate-100 dark:border-white/10" />
                      <button className={`${MENU_ITEM} text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400`} onClick={() => { archiveActive(); setLeadMenuOpen(false); }}>
                        <Trash size={15} /> Delete Conversation
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-[60px]">
              {active.tags.map((tag) => (
                <TagPill key={tag} tag={tag} onRemove={() => removeTag(tag)} />
              ))}
              <div className="relative" ref={tagMenuRef}>
                <button
                  id="inbox-add-tag"
                  onClick={() => setTagMenuOpen((v) => !v)}
                  disabled={!availableTags.length}
                  aria-label="Add tag"
                  className="grid h-[22px] w-[22px] place-items-center rounded-md border border-dashed border-slate-300 text-slate-400 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-600 disabled:opacity-40 dark:border-white/20"
                >
                  <Plus size={13} />
                </button>
                <AnimatePresence>
                  {tagMenuOpen && (
                    <motion.div {...popIn} className={`${POPOVER} left-0 top-[calc(100%+6px)] w-44`}>
                      {availableTags.map((tag) => (
                        <button key={tag} onClick={() => addTag(tag)} className={MENU_ITEM}>
                          <TagPill tag={tag} />
                        </button>
                      ))}
                    </motion.div>
                  )}
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
                  {href ? (
                    <a href={href} className="truncate text-slate-700 transition hover:text-purple-600 dark:text-slate-200">
                      {value}
                    </a>
                  ) : (
                    <span className="truncate text-slate-700 dark:text-slate-200">{value}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* lead details */}
          <div className={`${CARD} shrink-0 p-3.5`}>
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className={`text-[13.5px] font-bold ${HEADING}`}>Lead Details</h3>
              <button
                id="inbox-edit-lead"
                onClick={() => {
                  if (editingLead) showToast.success("Lead details saved.");
                  setEditingLead((v) => !v);
                }}
                className={`flex h-7 items-center gap-1 rounded-lg px-2.5 text-[11.5px] font-semibold transition ${
                  editingLead
                    ? "bg-[#7C5CFC] text-white hover:bg-[#6a4bf0]"
                    : "bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-700 dark:bg-white/10 dark:text-slate-300"
                }`}
              >
                {editingLead ? <Check size={12} strokeWidth={3} /> : <Pencil size={11} />}
                {editingLead ? "Save" : "Edit"}
              </button>
            </div>
            <dl className="grid grid-cols-[92px_1fr] items-center gap-x-2 gap-y-2 text-[12px]">
              <dt className={MUTED}>Source</dt>
              <dd className="min-w-0">
                {editingLead ? (
                  <input
                    value={active.source}
                    onChange={(e) => updateActive({ source: e.target.value })}
                    className="h-7 w-full rounded-lg border border-purple-200 bg-white px-2 text-[12.5px] text-slate-800 outline-none focus:ring-4 focus:ring-purple-100 dark:border-purple-400/30 dark:bg-white/5 dark:text-slate-100"
                  />
                ) : (
                  <span className={`block truncate font-medium ${HEADING}`}>{active.source}</span>
                )}
              </dd>

              <dt className={MUTED}>Stage</dt>
              <dd className="relative">
                <select
                  id="inbox-stage"
                  value={active.stage}
                  onChange={(e) => {
                    updateActive({ stage: e.target.value });
                    logActivity("tag", `Stage changed to ${e.target.value}`);
                  }}
                  className="h-7 w-full cursor-pointer appearance-none rounded-lg border border-purple-100 bg-purple-50/60 pl-2.5 pr-7 text-[12px] font-semibold text-purple-700 outline-none transition hover:border-purple-200 focus:ring-4 focus:ring-purple-100 dark:border-purple-400/20 dark:bg-purple-500/10 dark:text-purple-200"
                >
                  {stages.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-purple-500" />
              </dd>

              <dt className={MUTED}>Assigned To</dt>
              <dd className="relative" ref={assigneeRef}>
                <button
                  id="inbox-assignee"
                  onClick={() => setAssigneeOpen((v) => !v)}
                  aria-expanded={assigneeOpen}
                  className="flex h-7 w-full items-center gap-2 rounded-lg border border-slate-200/80 bg-white pl-1 pr-2 text-left transition hover:border-purple-200 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  {assigneeMember.id === "ai" ? (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-purple-100 text-purple-600">
                      <Bot size={11} />
                    </span>
                  ) : (
                    <Avatar person={assigneeMember} size={20} />
                  )}
                  <span className={`flex-1 truncate text-[12px] font-semibold ${HEADING}`}>{assigneeMember.name}</span>
                  <ChevronDown size={13} className={`${SUBTLE} transition ${assigneeOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {assigneeOpen && (
                    <motion.div {...popIn} className={`${POPOVER} right-0 top-[calc(100%+6px)] w-full min-w-[180px]`}>
                      {teamMembers.map((member) => (
                        <button
                          key={member.id}
                          className={MENU_ITEM}
                          onClick={() => {
                            updateActive({ assignee: member.name });
                            logActivity("handoff", `Assigned to ${member.name}`);
                            setAssigneeOpen(false);
                          }}
                        >
                          {member.id === "ai" ? (
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-purple-100 text-purple-600">
                              <Bot size={13} />
                            </span>
                          ) : (
                            <Avatar person={member} size={24} />
                          )}
                          <span className="flex-1">{member.name}</span>
                          {member.name === active.assignee && <Check size={14} className="text-purple-600" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </dd>

              <dt className={MUTED}>Last Activity</dt>
              <dd className={`font-medium ${HEADING}`}>{active.time}</dd>
            </dl>
          </div>

          {/* AI follow-up */}
          <div className={`${CARD} shrink-0 p-3.5`}>
            <div className="flex items-center gap-2">
              <h3 className={`text-[13.5px] font-bold ${HEADING}`}>AI Follow-Up</h3>
              <span
                className={`rounded-md border px-2 py-[1px] text-[10.5px] font-semibold ${
                  active.followUp
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/10 dark:text-slate-400"
                }`}
              >
                {active.followUp ? "Active" : "Paused"}
              </span>
              <span className="ml-auto">
                <Toggle
                  checked={active.followUp}
                  onChange={(value) => {
                    updateActive({ followUp: value });
                    logActivity("ai", value ? "AI follow-up activated" : "AI follow-up paused");
                  }}
                  label="Toggle AI follow-up"
                />
              </span>
            </div>
            <ul className={`mt-2.5 space-y-1.5 transition-opacity ${active.followUp ? "" : "opacity-50"}`}>
              {followUpRuleLabels.map((label, index) => {
                const on = active.followUpRules[index];
                return (
                  <li key={label}>
                    <button
                      disabled={!active.followUp}
                      onClick={() =>
                        updateActive((c) => ({
                          followUpRules: c.followUpRules.map((r, i) => (i === index ? !r : r)),
                        }))
                      }
                      className="flex w-full items-center gap-2.5 text-left text-[12px] text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed dark:text-slate-300"
                    >
                      {on ? (
                        <CircleCheck size={15} className="shrink-0 text-emerald-500" />
                      ) : (
                        <Circle size={15} className="shrink-0 text-slate-300 dark:text-slate-600" />
                      )}
                      {label}
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              onClick={() => navigate("/dashboard/follow-up")}
              className="mt-2.5 flex w-full items-center gap-2 rounded-lg border border-slate-200/80 px-2.5 py-1.5 text-[12px] font-medium text-purple-700 transition hover:border-purple-200 hover:bg-purple-50/60 dark:border-white/10 dark:text-purple-300"
            >
              <SlidersHorizontal size={14} className="text-purple-500" />
              Customize workflow
              <ChevronRight size={15} className="ml-auto text-slate-400" />
            </button>
          </div>

          <div className="shrink-0 space-y-2">
            <button
              id="inbox-take-over"
              onClick={toggleTakeover}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C5CFC] py-3 text-[13px] font-medium text-white shadow-sm transition hover:bg-[#6b4ce6] active:scale-[0.99]"
            >
              {active.takenOver ? <Bot size={16} /> : <UserRound size={16} />}
              {active.takenOver ? "Hand back to AI" : "Take over conversation"}
            </button>
            <button
              id="inbox-open-crm"
              onClick={() => navigate("/dashboard/crm")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-purple-200 bg-white py-2.5 text-[13px] font-medium text-purple-600 transition hover:bg-purple-50 dark:border-purple-400/30 dark:bg-transparent dark:text-purple-300 dark:hover:bg-purple-500/10"
            >
              <ExternalLink size={15} /> Open in CRM
            </button>
          </div>

          {/* recent activity */}
          <div className={`${CARD} flex min-h-[168px] flex-1 flex-col p-3.5`}>
            <div className="mb-2.5 flex shrink-0 items-center justify-between">
              <h3 className={`text-[13.5px] font-bold ${HEADING}`}>Recent Activity</h3>
              <button
                id="inbox-activity-view-all"
                onClick={() => navigate("/dashboard/activity")}
                className="inline-flex items-center gap-0.5 text-[11.5px] font-semibold text-purple-600 transition hover:gap-1 hover:text-purple-700 dark:text-purple-300"
              >
                View all <ArrowRight size={12} strokeWidth={2.5} />
              </button>
            </div>
            <ol className="inbox-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto">
              {active.activity.map((item) => {
                const style = activityStyle[item.kind];
                const Icon = style.icon;
                return (
                  <li key={item.id} className="flex items-center gap-2.5">
                    <span className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full ${style.className}`}>
                      <Icon size={12} strokeWidth={2.4} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-slate-700 dark:text-slate-200">{item.text}</span>
                    <time className={`shrink-0 text-[11px] ${SUBTLE}`}>{item.time}</time>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Inbox;
