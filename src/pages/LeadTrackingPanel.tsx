import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  BellRing,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe2,
  History,
  Mail,
  MessageCircle,
  Package,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings2,
  Share2,
  Sparkles,
  Target,
  Users,
  X,
} from 'lucide-react';
import {
  gosApi,
  type LeadTrackingOverview,
  type LeadTrackingSettings,
  type TrackChannelMode,
  type TrackedLead,
  type TrackId,
} from '../backend/gosApi';
import { auth } from '../backend/firebase';
import { uiDirection, useUILanguage, translateText } from '../i18n/display';
import { showToast } from '../utils/toast';

// UID-scoped stale-while-revalidate cache so returning to Track Leads renders instantaneously (0ms).
const cachedOverviewByUid = new Map<string, { data: LeadTrackingOverview; fetchedAt: number }>();

type Props = {
  onConnectChannel?: (channel: 'whatsapp' | 'instagram' | 'messenger') => void;
};

type TrackMeta = {
  id: TrackId;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  icon: React.ElementType;
  accent: string;
  badgeBg: string;
};

const TRACK_DEFINITIONS: TrackMeta[] = [
  {
    id: 'bookings',
    titleEn: 'From Bookings & Calendar',
    titleAr: 'من الحجوزات والمواعيد',
    descEn: 'Confirmed appointments (24h & 1h reminders) & pending bookings',
    descAr: 'تأكيد المواعيد وتذكيرات قبل 24 ساعة وساعة + الحجوزات المعلقة',
    icon: Calendar,
    accent: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: 'products',
    titleEn: 'From Products & Services',
    titleAr: 'من المنتجات والخدمات',
    descEn: 'Courses, services, digital products & incomplete checkouts',
    descAr: 'الكورسات والخدمات والمنتجات الرقمية والطلبات غير المكتملة',
    icon: Package,
    accent: 'text-violet-600 dark:text-violet-400',
    badgeBg: 'bg-violet-500/10 border-violet-500/20',
  },
  {
    id: 'funnels',
    titleEn: 'From Funnel / Website / Form',
    titleAr: 'من الفانل والموقع والنماذج',
    descEn: 'Landing pages, sales funnels & embedded lead capture forms',
    descAr: 'صفحات الهبوط ومسارات البيع ونماذج تسجيل العملاء',
    icon: Globe2,
    accent: 'text-sky-600 dark:text-sky-400',
    badgeBg: 'bg-sky-500/10 border-sky-500/20',
  },
  {
    id: 'meta',
    titleEn: 'From Meta & Manual Entry',
    titleAr: 'من ميتا والإضافة اليدوية',
    descEn: 'Instagram, Facebook, WhatsApp & manually added CRM leads',
    descAr: 'إنستجرام وفيسبوك وواتساب والعملاء المضافون يدوياً',
    icon: Share2,
    accent: 'text-pink-600 dark:text-pink-400',
    badgeBg: 'bg-pink-500/10 border-pink-500/20',
  },
  {
    id: 'copilot',
    titleEn: 'From AI Copilot',
    titleAr: 'من المساعد الذكي AI Copilot',
    descEn: 'Leads & appointments captured through AI Copilot conversations',
    descAr: 'العملاء والمواعيد المسجلون عبر محادثات ونماذج AI Copilot',
    icon: Bot,
    accent: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    id: 'webchat',
    titleEn: 'From Website Chat',
    titleAr: 'من شات الموقع المباشر',
    descEn: 'Visitors chatting on your live website widget with phone or email',
    descAr: 'زوار شات الموقع المباشر ممن شاركوا رقم الهاتف أو البريد',
    icon: MessageCircle,
    accent: 'text-teal-600 dark:text-teal-400',
    badgeBg: 'bg-teal-500/10 border-teal-500/20',
  },
];

export const LeadTrackingPanel: React.FC<Props> = ({ onConnectChannel }) => {
  const lang = useUILanguage();
  const isAr = lang.startsWith('ar');
  const dir = uiDirection();
  const navigate = useNavigate();
  const t = React.useCallback((en: string, ar: string) => (isAr ? ar : translateText(en)), [isAr, lang]);

  const cacheKey = auth.currentUser?.uid || 'anon';
  const initialCache = cachedOverviewByUid.get(cacheKey)?.data ?? null;

  const [overview, setOverview] = React.useState<LeadTrackingOverview | null>(initialCache);
  const [draftSettings, setDraftSettings] = React.useState<LeadTrackingSettings | null>(initialCache?.settings ?? null);
  const [loading, setLoading] = React.useState(!initialCache);
  const [syncing, setSyncing] = React.useState(false);
  const [savingSettings, setSavingSettings] = React.useState(false);
  const [busyLeadId, setBusyLeadId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [trackFilter, setTrackFilter] = React.useState<'all' | TrackId>('all');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [search, setSearch] = React.useState('');
  const [showRulesPanel, setShowRulesPanel] = React.useState(false);

  // Manual Lead Enrollment Modal
  const [enrollOpen, setEnrollOpen] = React.useState(false);
  const [enrollBusy, setEnrollBusy] = React.useState(false);
  const [enrollForm, setEnrollForm] = React.useState({
    name: '',
    phone: '',
    email: '',
    source: 'WhatsApp',
    interest: '',
    send_now: true,
  });

  // SES Test Email Modal
  const [testEmailOpen, setTestEmailOpen] = React.useState(false);
  const [testEmailTo, setTestEmailTo] = React.useState('');
  const [testEmailBusy, setTestEmailBusy] = React.useState(false);

  // Lead History Modal
  const [historyLead, setHistoryLead] = React.useState<TrackedLead | null>(null);

  const applyOverview = React.useCallback((data: LeadTrackingOverview) => {
    const uid = auth.currentUser?.uid || 'anon';
    cachedOverviewByUid.set(uid, { data, fetchedAt: Date.now() });
    setOverview(data);
    setDraftSettings(data.settings);
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    const uid = auth.currentUser?.uid || 'anon';
    const cached = cachedOverviewByUid.get(uid);
    if (cached) {
      setOverview(cached.data);
      setDraftSettings(cached.data.settings);
      setLoading(false);
    }

    const loadFast = async () => {
      setError(null);
      try {
        // Phase 1: Instant read (?sync=0, ~200ms) so KPIs & leads paint immediately without waiting on full sync.
        const fastData = await gosApi.leadTracking(false, controller.signal);
        if (controller.signal.aborted) return;
        applyOverview(fastData);
        setLoading(false);

        // Phase 2: Quietly sync fresh workspace captures in the background only if empty or stale (>60s).
        const isStale = !cached || Date.now() - cached.fetchedAt > 60_000 || fastData.leads.length === 0;
        if (isStale) {
          setSyncing(true);
          try {
            const freshData = await gosApi.leadTracking(true, controller.signal);
            if (!controller.signal.aborted) {
              applyOverview(freshData);
            }
          } catch {
            // Non-blocking background refresh; keep already-rendered fast data intact.
          } finally {
            if (!controller.signal.aborted) setSyncing(false);
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        if (!cached) {
          setError(err instanceof Error ? err.message : t('Could not load lead tracking data.', 'تعذّر تحميل بيانات تتبع العملاء.'));
        }
        setLoading(false);
        setSyncing(false);
      }
    };

    void loadFast();
    return () => controller.abort();
  }, [applyOverview, t]);

  const persistSettings = async (patch: Record<string, any>, toastMsg?: string) => {
    setSavingSettings(true);
    try {
      const updated = await gosApi.updateLeadTrackingSettings(patch);
      applyOverview(updated);
      if (toastMsg) showToast.success(toastMsg);
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Could not save settings.', 'تعذّر حفظ الإعدادات.'));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleMaster = async () => {
    if (!draftSettings) return;
    const next = !draftSettings.enabled;
    setDraftSettings({ ...draftSettings, enabled: next });
    await persistSettings(
      { enabled: next },
      next
        ? t('Automated lead follow-up is now active.', 'تم تفعيل المتابعة التلقائية للعملاء.')
        : t('Automated lead follow-up paused.', 'تم إيقاف المتابعة التلقائية مؤقتاً.'),
    );
  };

  const handleTrackUpdate = async (
    trackId: TrackId,
    changes: Partial<{ enabled: boolean; channel: TrackChannelMode; whatsapp_template: string }>,
  ) => {
    if (!draftSettings) return;
    const nextTracks = {
      ...draftSettings.tracks,
      [trackId]: {
        ...draftSettings.tracks[trackId],
        ...changes,
      },
    };
    setDraftSettings({ ...draftSettings, tracks: nextTracks });
    await persistSettings(
      { tracks: { [trackId]: nextTracks[trackId] } },
      t('Track settings updated.', 'تم تحديث إعدادات المسار.'),
    );
  };

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftSettings) return;
    await persistSettings(
      {
        business_name: draftSettings.business_name,
        reply_to_email: draftSettings.reply_to_email,
        default_language: draftSettings.default_language,
        tone: draftSettings.tone,
        first_delay_minutes: draftSettings.first_delay_minutes,
        second_delay_hours: draftSettings.second_delay_hours,
        third_delay_hours: draftSettings.third_delay_hours,
        max_attempts: draftSettings.max_attempts,
        booking_reminder_24h: draftSettings.booking_reminder_24h,
        booking_reminder_1h: draftSettings.booking_reminder_1h,
      },
      t('Follow-up timing & reminder rules saved.', 'تم حفظ قواعد التوقيت والتذكيرات بنجاح.'),
    );
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setError(null);
    try {
      const data = await gosApi.syncLeadTracking();
      applyOverview(data);
      setLoading(false);
      showToast.success(t('All workspace lead sources synchronized.', 'تمت مزامنة جميع مصادر العملاء بنجاح.'));
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Sync failed.', 'فشلت المزامنة.'));
    } finally {
      setSyncing(false);
    }
  };

  const handleLeadAction = async (lead: TrackedLead, action: 'send' | 'pause' | 'resume') => {
    setBusyLeadId(lead.id);
    try {
      const res =
        action === 'send'
          ? await gosApi.sendTrackedLeadNow(lead.id)
          : action === 'pause'
            ? await gosApi.pauseTrackedLead(lead.id)
            : await gosApi.resumeTrackedLead(lead.id);
      applyOverview(res.overview);
      if (action === 'send') {
        if (res.lead?.last_error) {
          showToast.error(res.lead.last_error);
        } else {
          showToast.success(
            t(
              `Follow-up sent to ${lead.name} via ${(res.lead?.last_channel || 'auto').toUpperCase()}.`,
              `تم إرسال المتابعة إلى ${lead.name} عبر ${(res.lead?.last_channel || 'auto').toUpperCase()}.`,
            ),
          );
        }
      } else {
        showToast.success(
          action === 'pause'
            ? t('Paused automated follow-ups for this lead.', 'تم إيقاف المتابعة التلقائية لهذا العميل.')
            : t('Resumed automated follow-ups for this lead.', 'تم استئناف المتابعة التلقائية لهذا العميل.'),
        );
      }
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Action failed.', 'تعذّر تنفيذ الإجراء.'));
    } finally {
      setBusyLeadId(null);
    }
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollForm.phone.trim() && !enrollForm.email.trim()) {
      showToast.error(t('Enter a phone number or email address to track this lead.', 'أدخل رقم الهاتف أو البريد الإلكتروني لتتبع العميل.'));
      return;
    }
    setEnrollBusy(true);
    try {
      const res = await gosApi.enrollTrackedLead(enrollForm);
      applyOverview(res.overview);
      setEnrollOpen(false);
      setEnrollForm({ name: '', phone: '', email: '', source: 'WhatsApp', interest: '', send_now: true });
      if (res.lead?.last_error && enrollForm.send_now) {
        showToast.error(res.lead.last_error);
      } else {
        showToast.success(
          enrollForm.send_now
            ? t('Lead added, tracked, and initial follow-up sent!', 'تمت إضافة العميل وتفعيله وإرسال أول رسالة متابعة!')
            : t('Lead added and scheduled for automatic follow-up!', 'تمت إضافة العميل وجدولة المتابعة التلقائية بنجاح!'),
        );
      }
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Could not enroll lead.', 'تعذّر إضافة العميل.'));
    } finally {
      setEnrollBusy(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailTo.trim()) return;
    setTestEmailBusy(true);
    try {
      await gosApi.sendLeadTrackingTestEmail(testEmailTo.trim());
      showToast.success(t('AWS SES test email delivered! Check your inbox.', 'تم إرسال البريد التجريبي عبر AWS SES بنجاح! تفقد بريدك.'));
      setTestEmailOpen(false);
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Test email failed.', 'فشل إرسال البريد التجريبي.'));
    } finally {
      setTestEmailBusy(false);
    }
  };

  const formatKindLabel = (kind: string) => {
    switch (kind) {
      case 'welcome':
        return t('1st Welcome Follow-Up', 'رسالة الترحيب والمتابعة الأولى');
      case 'followup_2':
        return t('2nd Follow-Up Check-in', 'رسالة المتابعة الثانية');
      case 'followup_3':
        return t('Final Follow-Up Note', 'رسالة المتابعة الأخيرة');
      case 'reminder_24h':
        return t('24h Appointment Reminder', 'تذكير بالموعد قبل 24 ساعة');
      case 'reminder_1h':
        return t('1h Appointment Reminder', 'تذكير بالموعد قبل ساعة');
      case 'pending_checkout':
        return t('Incomplete Checkout Help', 'متابعة إتمام الطلب / الحجز');
      default:
        return kind;
    }
  };

  const formatStatusBadge = (status: TrackedLead['status']) => {
    switch (status) {
      case 'scheduled':
        return { label: t('Scheduled', 'مجدول'), cls: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/25' };
      case 'active':
        return { label: t('Following Up', 'قيد المتابعة'), cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/25' };
      case 'reminded':
        return { label: t('Reminded', 'تم التذكير'), cls: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/25' };
      case 'replied':
        return { label: t('Replied', 'تم الرد'), cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25' };
      case 'converted':
        return { label: t('Converted', 'عميل فعلي'), cls: 'bg-emerald-600/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/30' };
      case 'paused':
        return { label: t('Paused', 'متوقف'), cls: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/25' };
      case 'completed':
        return { label: t('Sequence Done', 'اكتملت المتابعة'), cls: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/25' };
      case 'unreachable':
        return { label: t('Needs Contact Info', 'ينقصه هاتف/بريد'), cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25' };
      default:
        return { label: status, cls: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/25' };
    }
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return '—';
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) return iso;
    const diffMins = Math.round((ms - Date.now()) / 60000);
    if (diffMins >= -2 && diffMins <= 2) return t('Due now', 'مستحقة الآن');
    if (diffMins > 2 && diffMins < 60) return isAr ? `خلال ${diffMins} دقيقة` : `In ${diffMins}m`;
    if (diffMins >= 60 && diffMins < 1440) {
      const hrs = Math.round(diffMins / 60);
      return isAr ? `خلال ${hrs} ساعة` : `In ${hrs}h`;
    }
    return new Date(ms).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredLeads = React.useMemo(() => {
    const list = overview?.leads ?? [];
    const q = search.trim().toLowerCase();
    return list.filter(item => {
      if (trackFilter !== 'all' && item.primary_track !== trackFilter && !(item.tracks || []).includes(trackFilter)) {
        return false;
      }
      if (statusFilter !== 'all') {
        if (statusFilter === 'contacted' && item.attempts <= 0) return false;
        if (statusFilter !== 'contacted' && item.status !== statusFilter) return false;
      }
      if (q) {
        const hay = [item.name, item.phone, item.phone_normalized, item.email, item.interest, ...(item.sources || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [overview?.leads, trackFilter, statusFilter, search]);

  if (loading) {
    return (
      <section dir={dir} className="af-panel p-8 flex items-center justify-center min-h-[320px]">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 text-sm font-medium">
          <RefreshCw size={18} className="animate-spin text-violet-600" />
          <span>{t('Syncing multi-source leads & tracking schedules…', 'جارٍ مزامنة مصادر العملاء وجداول المتابعة التلقائية…')}</span>
        </div>
      </section>
    );
  }

  const emailInfo = overview?.channels.email;
  const waConnected = Boolean(overview?.channels.whatsapp.connected);
  const igConnected = Boolean(overview?.channels.instagram.connected);
  // const msConnected = Boolean(overview?.channels.messenger.connected);
  const approvedWaTemplates = overview?.channels.whatsapp_templates ?? [];

  return (
    <div dir={dir} className="space-y-4 pb-8">
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void handleSyncNow()}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
          >
            {t('Retry', 'إعادة المحاولة')}
          </button>
        </div>
      )}

      {/* Top Hero & Provider Readiness Bar */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#111524]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
              <Target size={13} />
              <span>{t('Multi-Source Lead Tracking & Auto Follow-Up', 'تتبع العملاء الموحد والمتابعة التلقائية')}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t(
                'Track every lead by Phone or Email — follow up & send reminders automatically',
                'تتبع كل عميل برقم الهاتف أو البريد الإلكتروني — وأرسل المتابعات والتذكيرات تلقائياً',
              )}
            </h2>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {t(
                'Unifies duplicate contacts across Bookings, Services, Funnels, Forms, Meta (WhatsApp / Instagram / Facebook), AI Copilot, and Website Chat, then delivers smart follow-ups via connected Meta channels & UpKlick AWS SES Email.',
                'يوحّد بيانات العميل تلقائياً عبر الحجوزات والخدمات والفانل والنماذج وميتا (واتساب / إنستجرام / فيسبوك) وAI Copilot وشات الموقع، ويرسل المتابعات وتذكيرات المواعيد عبر قنوات ميتا المربوطة وبريد المنصة AWS SES.',
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {draftSettings && (
              <button
                type="button"
                onClick={() => void handleToggleMaster()}
                disabled={savingSettings}
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                  draftSettings.enabled
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-300 bg-slate-100 text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${draftSettings.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span>{draftSettings.enabled ? t('Auto Follow-Up: ON', 'المتابعة التلقائية: مفعّلة') : t('Auto Follow-Up: Paused', 'المتابعة التلقائية: متوقفة')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowRulesPanel(v => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            >
              <Settings2 size={14} />
              <span>{t('Timing & Reminders', 'التوقيت والتذكيرات')}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleSyncNow()}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              <span>{t('Sync Sources', 'مزامنة المصادر')}</span>
            </button>

            <button
              type="button"
              onClick={() => setEnrollOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-violet-700"
            >
              <Plus size={15} />
              <span>{t('Add & Track Lead', 'إضافة وتتبع عميل')}</span>
            </button>
          </div>
        </div>

        {/* Provider Readiness Strip (AWS SES + Meta Channels) */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              {t('Delivery Providers:', 'قنوات الإرسال المتاحة:')}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium ${
                emailInfo?.configured
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
              }`}
            >
              <Mail size={13} />
              <span>
                {emailInfo?.configured
                  ? t('Email Provider (AWS SES): Ready', 'مزود البريد (AWS SES): متصل وجاهز')
                  : t('Email Provider (AWS SES): Setup in .env', 'مزود البريد (AWS SES): بانتظار بيانات .env')}
              </span>
              {emailInfo?.region && (
                <code dir="ltr" className="rounded bg-black/5 px-1.5 py-0.5 text-[11px] dark:bg-white/10">
                  {emailInfo.region}
                </code>
              )}
            </span>

            <button
              type="button"
              onClick={() => onConnectChannel?.('whatsapp')}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium transition ${
                waConnected
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
              }`}
            >
              <MessageCircle size={13} />
              <span>WhatsApp: {waConnected ? t('Connected', 'مربوط') : t('Connect', 'ربط القناة')}</span>
            </button>

            <button
              type="button"
              onClick={() => onConnectChannel?.('instagram')}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium transition ${
                igConnected
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
              }`}
            >
              <Sparkles size={13} />
              <span>Instagram: {igConnected ? t('Connected', 'مربوط') : t('Connect', 'ربط القناة')}</span>
            </button>

            {/* Facebook channel integration disabled:
            <button
              type="button"
              onClick={() => onConnectChannel?.('messenger')}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium transition ${
                msConnected
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
              }`}
            >
              <Share2 size={13} />
              <span>Facebook: {msConnected ? t('Connected', 'مربوط') : t('Connect', 'ربط القناة')}</span>
            </button>
            */}
          </div>

          <button
            type="button"
            onClick={() => {
              setTestEmailTo(draftSettings?.reply_to_email || '');
              setTestEmailOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/25 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-500/20 dark:text-violet-300"
          >
            <Send size={12} />
            <span>{t('Send Test SES Email', 'إرسال بريد تجريبي SES')}</span>
          </button>
        </div>
      </section>

      {/* Collapsible Timing, Sender Identity & Appointment Reminder Settings */}
      {showRulesPanel && draftSettings && (
        <form
          onSubmit={handleSaveRules}
          className="rounded-2xl border border-violet-500/25 bg-white p-5 shadow-sm dark:bg-[#111524] space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('Automated Sequence Timing, Sender Identity & Booking Reminders', 'إعدادات توقيت المتابعة وهوية الإرسال وتذكيرات المواعيد')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t(
                  'Emails are sent via UpKlick AWS SES displaying your Business Name and Reply-To address so customers reply directly to you.',
                  'تُرسل رسائل البريد عبر مزود المنصة AWS SES باسم شركتك مع توجيه ردود العملاء مباشرةً إلى بريدك الخاص (Reply-To).',
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRulesPanel(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('Sender Business Name', 'اسم النشاط / الشركة في الرسائل')}
              </span>
              <input
                type="text"
                value={draftSettings.business_name}
                onChange={e => setDraftSettings({ ...draftSettings, business_name: e.target.value })}
                placeholder="UpKlick"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('Customer Reply-To Email', 'البريد المستلم لردود العملاء (Reply-To)')}
              </span>
              <input
                type="email"
                dir="ltr"
                value={draftSettings.reply_to_email}
                onChange={e => setDraftSettings({ ...draftSettings, reply_to_email: e.target.value })}
                placeholder="hello@yourcompany.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('Message Language', 'لغة رسائل المتابعة')}
              </span>
              <select
                value={draftSettings.default_language}
                onChange={e => setDraftSettings({ ...draftSettings, default_language: e.target.value as 'auto' | 'ar' | 'en' })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-white/10 dark:bg-[#191f34] dark:text-white"
              >
                <option value="auto">{t('Auto-detect per lead (AR / EN)', 'تلقائي حسب لغة العميل (عربي / إنجليزي)')}</option>
                <option value="ar">{t('Always Arabic', 'العربية دائماً')}</option>
                <option value="en">{t('Always English', 'الإنجليزية دائماً')}</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('Max Unanswered Attempts', 'أقصى عدد رسائل متابعة')}
              </span>
              <input
                type="number"
                min={1}
                max={6}
                value={draftSettings.max_attempts}
                onChange={e => setDraftSettings({ ...draftSettings, max_attempts: Number(e.target.value || 3) })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('1st Follow-Up Delay (minutes)', 'تأخير الرسالة الأولى (بالدقائق)')}
              </span>
              <input
                type="number"
                min={0}
                max={1440}
                value={draftSettings.first_delay_minutes}
                onChange={e => setDraftSettings({ ...draftSettings, first_delay_minutes: Number(e.target.value || 0) })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('2nd Follow-Up Delay (hours)', 'تأخير المتابعة الثانية (بالساعات)')}
              </span>
              <input
                type="number"
                min={1}
                max={336}
                value={draftSettings.second_delay_hours}
                onChange={e => setDraftSettings({ ...draftSettings, second_delay_hours: Number(e.target.value || 24) })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('3rd Follow-Up Delay (hours)', 'تأخير المتابعة الثالثة (بالساعات)')}
              </span>
              <input
                type="number"
                min={2}
                max={720}
                value={draftSettings.third_delay_hours}
                onChange={e => setDraftSettings({ ...draftSettings, third_delay_hours: Number(e.target.value || 72) })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </label>

            <div className="flex flex-col justify-end gap-2">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draftSettings.booking_reminder_24h}
                  onChange={e => setDraftSettings({ ...draftSettings, booking_reminder_24h: e.target.checked })}
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span>{t('Send 24h Appointment Reminder', 'إرسال تذكير قبل الموعد بـ 24 ساعة')}</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draftSettings.booking_reminder_1h}
                  onChange={e => setDraftSettings({ ...draftSettings, booking_reminder_1h: e.target.checked })}
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span>{t('Send 1h Appointment Reminder', 'إرسال تذكير قبل الموعد بساعة')}</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <Save size={14} />
              <span>{savingSettings ? t('Saving…', 'جارٍ الحفظ…') : t('Save Rules', 'حفظ الإعدادات')}</span>
            </button>
          </div>
        </form>
      )}

      {/* Summary KPIs */}
      {overview && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: t('Unified Leads', 'إجمالي المتتبعين'), val: overview.summary.total_tracked, icon: Users, color: 'text-violet-600 dark:text-violet-400' },
            { label: t('Scheduled Queue', 'متابعات مجدولة'), val: overview.summary.scheduled, icon: Clock, color: 'text-sky-600 dark:text-sky-400' },
            { label: t('Auto-Contacted', 'تمت متابعتهم'), val: overview.summary.contacted, icon: Send, color: 'text-indigo-600 dark:text-indigo-400' },
            { label: t('Reminders Sent', 'تذكيرات المواعيد'), val: overview.summary.reminded, icon: BellRing, color: 'text-amber-600 dark:text-amber-400' },
            { label: t('Customer Replies', 'ردود العملاء'), val: overview.summary.replied, icon: MessageCircle, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: t('Converted Won', 'تحولوا لعملاء'), val: overview.summary.converted, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
          ].map(card => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-[#111524] flex items-center gap-3"
            >
              <span className={`rounded-xl bg-slate-100 p-2.5 dark:bg-white/5 ${card.color}`}>
                <card.icon size={17} />
              </span>
              <div>
                <div className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">{card.val}</div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{card.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 6 Multi-Source Track Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {TRACK_DEFINITIONS.map(meta => {
          const cfg = draftSettings?.tracks?.[meta.id] ?? { enabled: true, channel: 'auto' as TrackChannelMode, whatsapp_template: '', whatsapp_language: 'ar' };
          const stats = overview?.track_stats?.[meta.id] ?? { total: 0, scheduled: 0, contacted: 0, replied: 0, converted: 0 };
          const Icon = meta.icon;
          const isSelected = trackFilter === meta.id;

          return (
            <article
              key={meta.id}
              className={`rounded-2xl border p-4 transition shadow-sm bg-white dark:bg-[#111524] ${
                isSelected
                  ? 'border-violet-500 ring-2 ring-violet-500/20'
                  : 'border-slate-200/80 dark:border-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className={`rounded-xl border p-2.5 ${meta.badgeBg} ${meta.accent}`}>
                    <Icon size={18} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {isAr ? meta.titleAr : translateText(meta.titleEn)}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {isAr ? meta.descAr : translateText(meta.descEn)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={cfg.enabled}
                  onClick={() => void handleTrackUpdate(meta.id, { enabled: !cfg.enabled })}
                  className={`af-switch ${cfg.enabled ? 'on' : ''}`}
                  title={cfg.enabled ? t('Track active', 'المسار مفعّل') : t('Track paused', 'المسار متوقف')}
                >
                  <i />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 dark:bg-white/5 dark:text-slate-200">
                    {stats.total} {t('leads', 'عميل')}
                  </span>
                  <span className="rounded-md bg-violet-500/10 px-2 py-0.5 font-semibold text-violet-700 dark:text-violet-300">
                    {stats.scheduled} {t('scheduled', 'مجدول')}
                  </span>
                  {stats.converted > 0 && (
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300">
                      {stats.converted} {t('won', 'عميل فعلي')}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setTrackFilter(isSelected ? 'all' : meta.id)}
                  className="text-violet-600 hover:underline font-semibold dark:text-violet-400"
                >
                  {isSelected ? t('Show all', 'عرض الكل') : t('Filter leads', 'تصفية العملاء')}
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="block">
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                    {t('Follow-Up Channel', 'قناة الإرسال التلقائي')}
                  </span>
                  <select
                    value={cfg.channel}
                    onChange={e => void handleTrackUpdate(meta.id, { channel: e.target.value as TrackChannelMode })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 dark:border-white/10 dark:bg-[#191f34] dark:text-slate-100"
                  >
                    <option value="auto">{t('Auto (Meta + AWS SES Email)', 'تلقائي ذكي (ميتا + بريد SES)')}</option>
                    <option value="whatsapp">{t('WhatsApp Only', 'واتساب فقط')}</option>
                    <option value="email">{t('Email Only (AWS SES)', 'البريد الإلكتروني فقط (SES)')}</option>
                    <option value="meta_dm">{t('Instagram / Messenger DM', 'رسائل إنستجرام / ماسنجر')}</option>
                  </select>
                </label>

                <label className="block">
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                    {t('WhatsApp Template (>24h)', 'قالب واتساب المعتمد (>24 ساعة)')}
                  </span>
                  <select
                    value={cfg.whatsapp_template}
                    onChange={e => void handleTrackUpdate(meta.id, { whatsapp_template: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 dark:border-white/10 dark:bg-[#191f34] dark:text-slate-100"
                  >
                    <option value="">{t('Auto-pick Approved Template', 'اختيار تلقائي لأول قالب معتمد')}</option>
                    {approvedWaTemplates.map(tpl => (
                      <option key={`${tpl.name}-${tpl.language}`} value={tpl.name}>
                        {tpl.name} ({tpl.language})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </article>
          );
        })}
      </div>

      {/* Unified Tracked Leads Table */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-[#111524] overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('Live Tracked Leads Queue', 'قائمة تتبع العملاء الموحدة وجدول المتابعة')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(
                'Tracked by normalized phone & email. Automated follow-ups stop immediately when a customer replies or converts.',
                'مرتبطون برقم الهاتف أو البريد الموحّد — تتوقف رسائل الإلحاح تلقائياً فور رد العميل أو إتمام الشراء.',
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('Search name, phone, email…', 'بحث بالاسم أو الهاتف أو البريد…')}
                className="rounded-xl border border-slate-200 bg-slate-50 ps-8 pe-3 py-1.5 text-xs text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white w-56"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 dark:border-white/10 dark:bg-[#191f34] dark:text-slate-100"
            >
              <option value="all">{t('All Statuses', 'كل الحالات')}</option>
              <option value="scheduled">{t('Scheduled', 'مجدول للمتابعة')}</option>
              <option value="active">{t('Following Up', 'قيد المتابعة')}</option>
              <option value="reminded">{t('Reminded', 'تم إرسال تذكير موعد')}</option>
              <option value="replied">{t('Replied', 'ردّ العميل')}</option>
              <option value="converted">{t('Converted', 'تحول لعميل')}</option>
              <option value="paused">{t('Paused', 'متوقف')}</option>
            </select>
          </div>
        </div>

        {/* Track Filter Pills */}
        <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10 flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setTrackFilter('all')}
            className={`rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap transition ${
              trackFilter === 'all'
                ? 'bg-violet-600 text-white'
                : 'text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-white/10'
            }`}
          >
            {t('All Tracks', 'كل المسارات')} ({overview?.leads.length ?? 0})
          </button>
          {TRACK_DEFINITIONS.map(tr => (
            <button
              key={tr.id}
              type="button"
              onClick={() => setTrackFilter(tr.id)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap transition ${
                trackFilter === tr.id
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-white/10'
              }`}
            >
              {isAr ? tr.titleAr : translateText(tr.titleEn)} ({overview?.track_stats?.[tr.id]?.total ?? 0})
            </button>
          ))}
        </div>

        {filteredLeads.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t('No tracked leads match your current filter.', 'لا يوجد عملاء متتبعون يطابقون التصفية الحالية.')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(
                'Add a lead manually or sync your workspace bookings, forms, products, and Meta inbox.',
                'أضف عميلاً يدوياً أو قم بمزامنة الحجوزات والنماذج والخدمات وصندوق رسائل ميتا.',
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50/90 text-[11px] uppercase text-slate-500 dark:bg-white/[0.03] dark:text-slate-400 border-b border-slate-100 dark:border-white/10">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">{t('Customer & Contact Key', 'العميل وبيانات التتبع')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('Captured From (Tracks)', 'مصدر القدوم')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('Follow-Up Status', 'حالة المتابعة')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('Next Scheduled Action', 'الإجراء التلقائي القادم')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('Latest Message / Delivery', 'آخر رسالة مرسلة')}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t('Actions', 'إجراءات')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredLeads.map(lead => {
                  const badge = formatStatusBadge(lead.status);
                  const isBusy = busyLeadId === lead.id;
                  const mergedCount = lead.linked_lead_ids?.length ?? 0;

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition">
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{lead.name || t('Lead', 'عميل')}</span>
                          {mergedCount > 1 && (
                            <span
                              className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300"
                              title={t('Unified duplicate CRM cards by phone/email', 'تم توحيد البطاقات المكررة تلقائياً')}
                            >
                              {isAr ? `${mergedCount} بطاقات موحدة` : `${mergedCount} unified`}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {lead.phone_normalized || lead.phone ? (
                            <div dir="ltr" className="inline-block me-2 font-mono">
                              {lead.phone_normalized || lead.phone}
                            </div>
                          ) : null}
                          {lead.email_normalized ? (
                            <div dir="ltr" className="inline-block font-mono">
                              {lead.email_normalized}
                            </div>
                          ) : null}
                        </div>
                        {(lead.appointment_service || lead.product_name || lead.interest) && (
                          <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-[230px]">
                            {lead.appointment_service || lead.product_name || lead.interest}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        <div className="flex flex-wrap gap-1">
                          {(lead.sources || []).map(src => (
                            <span
                              key={src}
                              className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                            >
                              {src}
                            </span>
                          ))}
                        </div>
                        {lead.appointment_at && (
                          <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <Calendar size={11} />
                            <span>{formatDateTime(lead.appointment_at)}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                        <div className="mt-1 text-[11px] text-slate-400">
                          {isAr
                            ? `المحاولات: ${lead.attempts} / ${draftSettings?.max_attempts ?? 3}`
                            : `Attempts: ${lead.attempts} / ${draftSettings?.max_attempts ?? 3}`}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        {lead.next_follow_up_at ? (
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-100">
                              {formatDateTime(lead.next_follow_up_at)}
                            </div>
                            <div className="text-[11px] text-violet-600 dark:text-violet-400">
                              {formatKindLabel(lead.next_action_kind)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">{t('No pending send', 'لا توجد رسالة معلقة')}</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 align-top max-w-[260px]">
                        {lead.last_error ? (
                          <div className="text-[11px] text-rose-600 dark:text-rose-400 line-clamp-2" title={lead.last_error}>
                            {lead.last_error}
                          </div>
                        ) : lead.last_message_excerpt ? (
                          <div>
                            <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:bg-white/10 dark:text-slate-300 mb-1">
                              {lead.last_channel || 'sent'}
                            </span>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                              {lead.last_message_excerpt}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">{t('Not contacted yet', 'لم تُرسل متابعة بعد')}</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 align-top text-end">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleLeadAction(lead, 'send')}
                            title={t('Send AI Follow-Up Now', 'إرسال متابعة ذكية الآن')}
                            className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                          >
                            <Send size={11} />
                            <span>{t('Send Now', 'إرسال الآن')}</span>
                          </button>

                          {lead.status === 'paused' ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleLeadAction(lead, 'resume')}
                              title={t('Resume automatic follow-up', 'استئناف المتابعة التلقائية')}
                              className="rounded-lg border border-slate-200 p-1.5 text-emerald-600 hover:bg-emerald-50 dark:border-white/10 dark:hover:bg-white/10"
                            >
                              <Play size={13} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleLeadAction(lead, 'pause')}
                              title={t('Pause automatic follow-up', 'إيقاف المتابعة التلقائية')}
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10"
                            >
                              <Pause size={13} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setHistoryLead(lead)}
                            title={t('Follow-Up History', 'سجل المتابعة')}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                          >
                            <History size={13} />
                          </button>

                          {lead.primary_lead_id && (
                            <button
                              type="button"
                              onClick={() => navigate(`/dashboard/contacts/${encodeURIComponent(lead.primary_lead_id)}`)}
                              title={t('Open in CRM', 'فتح بطاقة العميل في CRM')}
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                            >
                              <ExternalLink size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Manual Track Lead Modal */}
      {enrollOpen &&
        createPortal(
          <div
            dir={dir}
            className="fixed inset-0 z-[100000] grid place-items-center bg-slate-950/65 backdrop-blur-sm p-4"
            onMouseDown={e => {
              if (e.target === e.currentTarget) setEnrollOpen(false);
            }}
          >
            <form
              onSubmit={handleEnrollSubmit}
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#131829] space-y-4"
              onMouseDown={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('Add & Track Lead Manually', 'إضافة وتتبع عميل جديد تلقائياً')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t(
                      'Add a lead from Instagram, Facebook, WhatsApp, Website Chat, Booking, or Services by phone or email.',
                      'أضف عميلاً قادماً من إنستجرام أو فيسبوك أو واتساب أو شات الموقع أو الحجوزات وتتبعه برقم الهاتف أو البريد.',
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnrollOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('Lead Source', 'مصدر العميل')}
                  </span>
                  <select
                    value={enrollForm.source}
                    onChange={e => setEnrollForm({ ...enrollForm, source: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-white/10 dark:bg-[#191f34] dark:text-white"
                  >
                    <option value="WhatsApp">{t('Meta — WhatsApp', 'ميتا — واتساب')}</option>
                    <option value="Instagram">{t('Meta — Instagram', 'ميتا — إنستجرام')}</option>
                    {/* <option value="Facebook">{t('Meta — Facebook', 'ميتا — فيسبوك')}</option> */}
                    <option value="Website Chat">{t('Website Chat', 'شات الموقع المباشر')}</option>
                    <option value="Booking">{t('Bookings & Calendar', 'الحجوزات والمواعيد')}</option>
                    <option value="Services">{t('Products & Services', 'المنتجات والخدمات')}</option>
                    <option value="Forms">{t('Funnel / Website Form', 'الفانل / نماذج الموقع')}</option>
                    <option value="AI Copilot">AI Copilot</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('Customer Name', 'اسم العميل')}
                  </span>
                  <input
                    type="text"
                    value={enrollForm.name}
                    onChange={e => setEnrollForm({ ...enrollForm, name: e.target.value })}
                    placeholder={t('e.g. Ahmed Mohamed', 'مثال: أحمد محمد')}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('Phone / WhatsApp Number', 'رقم الهاتف / واتساب')}
                  </span>
                  <input
                    type="tel"
                    dir="ltr"
                    value={enrollForm.phone}
                    onChange={e => setEnrollForm({ ...enrollForm, phone: e.target.value })}
                    placeholder="+20 101 234 5678"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('Email Address', 'البريد الإلكتروني')}
                  </span>
                  <input
                    type="email"
                    dir="ltr"
                    value={enrollForm.email}
                    onChange={e => setEnrollForm({ ...enrollForm, email: e.target.value })}
                    placeholder="client@company.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('Service / Product Interest or Notes', 'الخدمة المطلوبة أو ملاحظات المتابعة')}
                </span>
                <textarea
                  rows={2}
                  value={enrollForm.interest}
                  onChange={e => setEnrollForm({ ...enrollForm, interest: e.target.value })}
                  placeholder={t('What did this lead ask about?', 'ما الخدمة أو العرض الذي يهتم به العميل؟')}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enrollForm.send_now}
                  onChange={e => setEnrollForm({ ...enrollForm, send_now: e.target.checked })}
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span>
                  {t(
                    'Send first personalized AI follow-up message immediately now',
                    'إرسال أول رسالة متابعة ذكية مخصصة للعميل الآن فوراً',
                  )}
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEnrollOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300"
                >
                  {t('Cancel', 'إلغاء')}
                </button>
                <button
                  type="submit"
                  disabled={enrollBusy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  <Send size={13} />
                  <span>{enrollBusy ? t('Saving…', 'جارٍ الحفظ…') : t('Track Lead', 'حفظ وبدء التتبع')}</span>
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}

      {/* Test AWS SES Email Modal */}
      {testEmailOpen &&
        createPortal(
          <div
            dir={dir}
            className="fixed inset-0 z-[100000] grid place-items-center bg-slate-950/65 backdrop-blur-sm p-4"
            onMouseDown={e => {
              if (e.target === e.currentTarget) setTestEmailOpen(false);
            }}
          >
            <form
              onSubmit={handleSendTestEmail}
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#131829] space-y-4"
              onMouseDown={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('Send Test Email (AWS SES)', 'تجربة إرسال البريد عبر AWS SES')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t(
                      'Verifies that UpKlick AWS SES delivers branded follow-up emails for your workspace.',
                      'يتحقق من جاهزية مزود البريد AWS SES لإرسال رسائل المتابعة باسم نشاطك التجاري.',
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTestEmailOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('Recipient Email Address', 'البريد الإلكتروني المستلم للتجربة')}
                </span>
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={testEmailTo}
                  onChange={e => setTestEmailTo(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </label>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTestEmailOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 dark:border-white/10 dark:text-slate-300"
                >
                  {t('Cancel', 'إلغاء')}
                </button>
                <button
                  type="submit"
                  disabled={testEmailBusy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  <Mail size={13} />
                  <span>{testEmailBusy ? t('Sending…', 'جارٍ الإرسال…') : t('Send Test', 'إرسال الآن')}</span>
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}

      {/* Lead Follow-Up History Modal */}
      {historyLead &&
        createPortal(
          <div
            dir={dir}
            className="fixed inset-0 z-[100000] grid place-items-center bg-slate-950/65 backdrop-blur-sm p-4"
            onMouseDown={e => {
              if (e.target === e.currentTarget) setHistoryLead(null);
            }}
          >
            <div
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#131829] space-y-4 max-h-[85vh] flex flex-col"
              onMouseDown={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('Follow-Up & Reminder Log', 'سجل رسائل المتابعة والتذكيرات')} — {historyLead.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400" dir="ltr">
                    {[historyLead.phone_normalized || historyLead.phone, historyLead.email_normalized].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryLead(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pe-1">
                {(historyLead.history ?? []).length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                    {t('No messages have been dispatched for this lead yet.', 'لم يتم إرسال رسائل متابعة لهذا العميل حتى الآن.')}
                  </p>
                ) : (
                  historyLead.history.map(entry => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.03] space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-violet-700 dark:text-violet-300">
                          {formatKindLabel(entry.kind)} · {entry.channel.toUpperCase()}
                        </span>
                        <span className="text-slate-400">{formatDateTime(entry.at)}</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line">{entry.excerpt}</p>
                      {entry.error && <p className="text-[11px] text-rose-600 dark:text-rose-400">{entry.error}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

