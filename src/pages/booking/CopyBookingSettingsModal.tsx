import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeftRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  FileText,
  HelpCircle,
  Layers,
  Loader2,
  MapPin,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useUILanguage } from '../../i18n/display';
import { showToast } from '../../utils/toast';
import {
  bookingColor,
  KEYS,
  normalizeBookingPage,
  readPages,
  syncQualificationQuestions,
  uid,
  write,
  type BookingPage,
} from './model';

export type CopyableSectionId =
  | 'details'
  | 'hosts'
  | 'location'
  | 'duration'
  | 'group'
  | 'availability'
  | 'form'
  | 'notifications'
  | 'templates'
  | 'after';

export const SECTION_NAME_TO_COPY_ID: Record<string, CopyableSectionId> = {
  Page: 'details',
  'Hosts & Resources': 'hosts',
  Location: 'location',
  Duration: 'duration',
  'Group / class': 'group',
  Availability: 'availability',
  'Booking form': 'form',
  Notifications: 'notifications',
  Templates: 'templates',
  'After booking': 'after',
};

type SectionOption = {
  id: CopyableSectionId;
  en: string;
  ar: string;
  icon: typeof FileText;
};

const COPY_SECTIONS: readonly SectionOption[] = [
  { id: 'details', en: 'Details', ar: 'التفاصيل', icon: FileText },
  { id: 'hosts', en: 'Hosts', ar: 'المضيفون', icon: Users },
  { id: 'availability', en: 'Availability', ar: 'التوفر والمواعيد', icon: CalendarDays },
  { id: 'form', en: 'Booking form', ar: 'نموذج الحجز', icon: FileText },
  { id: 'notifications', en: 'Notifications', ar: 'الإشعارات', icon: Bell },
  { id: 'after', en: 'After booking', ar: 'بعد الحجز', icon: Check },
  { id: 'location', en: 'Location', ar: 'المكان', icon: MapPin },
  { id: 'duration', en: 'Appointment types', ar: 'أنواع المواعيد', icon: Clock3 },
  { id: 'group', en: 'Group / class', ar: 'مجموعة / حصة', icon: Users },
  { id: 'templates', en: 'Templates', ar: 'القوالب', icon: Layers },
];

const CURRENT_DRAFT_ID = '__current_draft__';

export function applyCopiedBookingSections(
  target: BookingPage,
  sourceRaw: BookingPage,
  sections: ReadonlySet<CopyableSectionId>
): BookingPage {
  const source = normalizeBookingPage(structuredClone(sourceRaw));
  const next: BookingPage = structuredClone(target);

  if (sections.has('details')) {
    next.description = source.description;
    next.language = source.language;
    next.color = source.color;
    next.displayBranding = source.displayBranding;
    next.image = source.image;
    next.imageRound = source.imageRound;
    next.mediaType = source.mediaType;
    next.titleOverride = source.titleOverride;
    next.passwordProtect = source.passwordProtect;
    next.password = source.password;
    if (source.crmRouting) next.crmRouting = structuredClone(source.crmRouting);
  }

  if (sections.has('hosts')) {
    next.hostName = source.hostName;
    next.hostTimezone = source.hostTimezone;
  }

  if (sections.has('location')) {
    next.locations = source.locations.map(loc => ({ ...loc, id: uid() }));
    next.locationOptions = [...source.locationOptions];
    next.location = source.location;
  }

  if (sections.has('duration')) {
    next.duration = source.duration;
    next.durationOptions = [...source.durationOptions];
    next.customDuration = source.customDuration;
    next.free = source.free;
    next.price = source.price;
    next.currency = source.currency;
    next.priceType = source.priceType;
  }

  if (sections.has('group')) {
    next.groupCapacity = source.groupCapacity;
    next.dailyLimit = source.dailyLimit;
    next.displaySpotsLeft = source.displaySpotsLeft;
    next.requireApproval = source.requireApproval;
  }

  if (sections.has('availability')) {
    next.availability = structuredClone(source.availability);
    next.minNotice = source.minNotice;
    next.maxAdvanceBooking = source.maxAdvanceBooking;
    next.bufferTime = source.bufferTime;
    next.startIncrement = source.startIncrement;
    next.fixedDateRange = structuredClone(source.fixedDateRange);
    next.specificDateAvailability = source.specificDateAvailability.map(item => ({ ...item, id: uid() }));
    next.additionalWeekdayAvailability = source.additionalWeekdayAvailability.map(item => ({ ...item, id: uid() }));
    next.breaks = source.breaks.map(item => ({ ...item, id: uid() }));
    next.timezoneDisplay = source.timezoneDisplay;
    next.showTimezone = source.showTimezone;
    next.lookBusy = structuredClone(source.lookBusy);
    next.grayOutBusy = source.grayOutBusy;
    next.bookingLimits = source.bookingLimits.map(item => ({ ...item, id: uid() }));
    next.hostTimezone = source.hostTimezone;
  }

  if (sections.has('form')) {
    const clonedQuestions = structuredClone(source.questions);
    next.questions = clonedQuestions;
    next.qualificationQuestions = syncQualificationQuestions(clonedQuestions);
    next.formSettings = structuredClone(source.formSettings);
  }

  if (sections.has('notifications')) {
    next.notifications = structuredClone(source.notifications);
    next.notificationWorkflows = structuredClone(source.notificationWorkflows);
  }

  if (sections.has('templates')) {
    next.templateSettings = {
      ...next.templateSettings,
      previewMode: source.templateSettings.previewMode,
      previewTemplateId: source.templateSettings.previewTemplateId,
      emailNotificationMode: source.templateSettings.emailNotificationMode,
      emailTemplateId: source.templateSettings.emailTemplateId,
      templateName: source.templateSettings.templateName,
      templateTitle: source.templateSettings.templateTitle,
      templateSubtitle: source.templateSettings.templateSubtitle,
      templateColor: source.templateSettings.templateColor,
      templateImage: source.templateSettings.templateImage,
      templateIndustry: source.templateSettings.templateIndustry,
      templateKind: source.templateSettings.templateKind,
      templateBenefits: source.templateSettings.templateBenefits
        ? [...source.templateSettings.templateBenefits]
        : undefined,
    };
  }

  if (sections.has('after')) {
    next.afterBooking = structuredClone(source.afterBooking);
    next.templateSettings = {
      ...next.templateSettings,
      postBookingMode: source.templateSettings.postBookingMode,
      redirectUrl: source.templateSettings.redirectUrl,
      thankYouTemplateId: source.templateSettings.thankYouTemplateId,
    };
  }

  return normalizeBookingPage(next);
}

interface CopyBookingSettingsModalProps {
  initialSectionName: string;
  currentDraft: BookingPage;
  isEditingExisting: boolean;
  pages: BookingPage[];
  onApplyToDraft: (updated: BookingPage) => void;
  onClose: () => void;
}

export function CopyBookingSettingsModal({
  initialSectionName,
  currentDraft,
  isEditingExisting,
  pages,
  onApplyToDraft,
  onClose,
}: CopyBookingSettingsModalProps) {
  const ar = useUILanguage().startsWith('ar');
  const t = (en: string, arabic: string) => (ar ? arabic : en);

  const initialCopyId = SECTION_NAME_TO_COPY_ID[initialSectionName] ?? 'availability';
  const [selectedSections, setSelectedSections] = useState<Set<CopyableSectionId>>(
    () => new Set([initialCopyId])
  );
  const [phase, setPhase] = useState<'loading' | 'ready' | 'copying' | 'done'>('loading');
  const [storedPages, setStoredPages] = useState<BookingPage[]>(pages);
  const [sourceId, setSourceId] = useState<string>('');
  const [targetIds, setTargetIds] = useState<Set<string>>(() => new Set([CURRENT_DRAFT_ID]));
  const [sourceOpen, setSourceOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const sourceWrapRef = useRef<HTMLDivElement>(null);
  const targetWrapRef = useRef<HTMLDivElement>(null);

  // Merge prop pages with latest workspace storage and show a crisp initial sync skeleton
  useEffect(() => {
    const fresh = readPages();
    const map = new Map<string, BookingPage>();
    for (const p of [...pages, ...fresh]) {
      if (p?.id) map.set(p.id, normalizeBookingPage(p));
    }
    const merged = [...map.values()];
    setStoredPages(merged);
    const candidates = merged.filter(p => p.id !== currentDraft.id);
    if (candidates.length > 0) {
      setSourceId(prev => (prev && candidates.some(c => c.id === prev) ? prev : candidates[0].id));
    }
    const timer = window.setTimeout(() => setPhase('ready'), 240);
    return () => window.clearTimeout(timer);
  }, [pages, currentDraft.id]);

  const sourceCandidates = useMemo(
    () => storedPages.filter(p => p.id !== currentDraft.id),
    [storedPages, currentDraft.id]
  );

  const selectedSource = useMemo(
    () => sourceCandidates.find(p => p.id === sourceId) ?? sourceCandidates[0] ?? null,
    [sourceCandidates, sourceId]
  );

  const targetCandidates = useMemo(() => {
    const currentLabel =
      currentDraft.name.trim() ||
      (isEditingExisting
        ? t('Current booking page', 'صفحة الحجز الحالية')
        : t('New booking page (current draft)', 'صفحة الحجز الجديدة (المسودة الحالية)'));
    const items: { id: string; name: string; slug: string; color: string; isCurrent: boolean }[] = [
      {
        id: CURRENT_DRAFT_ID,
        name: currentLabel,
        slug: currentDraft.slug || 'draft',
        color: bookingColor(currentDraft.color),
        isCurrent: true,
      },
    ];
    for (const p of storedPages) {
      if (p.id === currentDraft.id || p.id === selectedSource?.id) continue;
      items.push({
        id: p.id,
        name: p.name || t('Untitled booking page', 'صفحة حجز بدون عنوان'),
        slug: p.slug,
        color: bookingColor(p.color),
        isCurrent: false,
      });
    }
    return items;
  }, [currentDraft, isEditingExisting, storedPages, selectedSource?.id, ar]);

  // Keep targetIds clean if user changes Copy From source
  useEffect(() => {
    if (!selectedSource) return;
    setTargetIds(prev => {
      if (!prev.has(selectedSource.id)) return prev;
      const next = new Set(prev);
      next.delete(selectedSource.id);
      if (next.size === 0) next.add(CURRENT_DRAFT_ID);
      return next;
    });
  }, [selectedSource]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'copying') {
        e.stopPropagation();
        if (sourceOpen) setSourceOpen(false);
        else if (targetOpen) setTargetOpen(false);
        else onClose();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (sourceWrapRef.current && !sourceWrapRef.current.contains(e.target as Node)) {
        setSourceOpen(false);
      }
      if (targetWrapRef.current && !targetWrapRef.current.contains(e.target as Node)) {
        setTargetOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [onClose, phase, sourceOpen, targetOpen]);

  const toggleSectionPill = (id: CopyableSectionId) => {
    if (phase !== 'ready') return;
    setSelectedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSectionsSelected = selectedSections.size === COPY_SECTIONS.length;
  const handleSelectAllSections = () => {
    if (phase !== 'ready') return;
    setSelectedSections(
      allSectionsSelected ? new Set([initialCopyId]) : new Set(COPY_SECTIONS.map(s => s.id))
    );
  };

  const allTargetsSelected =
    targetCandidates.length > 0 && targetCandidates.every(c => targetIds.has(c.id));
  const handleSelectAllTargets = () => {
    if (phase !== 'ready') return;
    setTargetIds(
      allTargetsSelected
        ? new Set([CURRENT_DRAFT_ID])
        : new Set(targetCandidates.map(c => c.id))
    );
  };

  const toggleTarget = (id: string) => {
    if (phase !== 'ready') return;
    setTargetIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const canConfirm =
    phase === 'ready' &&
    Boolean(selectedSource) &&
    selectedSections.size > 0 &&
    targetIds.size > 0;

  const handleCopySettings = async () => {
    if (!canConfirm || !selectedSource) return;
    setSourceOpen(false);
    setTargetOpen(false);
    setPhase('copying');

    await new Promise(resolve => window.setTimeout(resolve, 420));

    try {
      if (targetIds.has(CURRENT_DRAFT_ID)) {
        const updatedDraft = applyCopiedBookingSections(
          currentDraft,
          selectedSource,
          selectedSections
        );
        onApplyToDraft(updatedDraft);
      }

      const otherTargetIds = [...targetIds].filter(id => id !== CURRENT_DRAFT_ID);
      if (otherTargetIds.length > 0) {
        const existingAll = readPages();
        const updatedAll = existingAll.map(item =>
          otherTargetIds.includes(item.id)
            ? applyCopiedBookingSections(item, selectedSource, selectedSections)
            : item
        );
        await write(KEYS.pages, updatedAll);
      }

      setPhase('done');
      showToast.success(
        ar
          ? `تم نسخ الإعدادات من "${selectedSource.name || 'صفحة الحجز'}" بنجاح.`
          : `Settings copied from "${selectedSource.name || 'Booking page'}" successfully.`
      );
      window.setTimeout(() => onClose(), 220);
    } catch (err) {
      setPhase('ready');
      showToast.error(
        err instanceof Error
          ? err.message
          : t('Could not copy booking settings.', 'تعذر نسخ إعدادات صفحة الحجز.')
      );
    }
  };

  const targetSummaryLabel = useMemo(() => {
    const chosen = targetCandidates.filter(c => targetIds.has(c.id));
    if (chosen.length === 0) return t('Select booking page', 'اختر صفحة الحجز');
    if (chosen.length === 1) {
      return chosen[0].isCurrent
        ? `${chosen[0].name} (${t('Current', 'الحالية')})`
        : chosen[0].name;
    }
    return ar ? `تم تحديد ${chosen.length} صفحات حجز` : `${chosen.length} booking pages selected`;
  }, [targetCandidates, targetIds, ar]);

  return createPortal(
    <div
      className="bk-copy-modal-backdrop"
      dir={ar ? 'rtl' : 'ltr'}
      role="presentation"
      onClick={e => {
        if (e.target === e.currentTarget && phase !== 'copying') onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bk-copy-modal-title"
        className="bk-copy-modal-card"
      >
        {(phase === 'copying' || phase === 'loading') && (
          <div className="bk-copy-modal-progress" aria-hidden="true">
            <span />
          </div>
        )}

        <header className="bk-copy-modal-header">
          <span className="bk-copy-modal-icon" aria-hidden="true">
            <ArrowLeftRight size={18} />
          </span>
          <div className="bk-copy-modal-titles">
            <h2 id="bk-copy-modal-title">
              {t('Copy booking page settings', 'نسخ إعدادات صفحة الحجز')}
            </h2>
            <p>
              {t(
                'Save time by copying settings between booking pages',
                'وفّر وقتك بنسخ الإعدادات وتطبيقها بين صفحات الحجز'
              )}
            </p>
          </div>
          <button
            type="button"
            className="bk-copy-modal-close"
            onClick={onClose}
            disabled={phase === 'copying'}
            aria-label={t('Close dialog', 'إغلاق النافذة')}
          >
            <X size={17} />
          </button>
        </header>

        {phase === 'loading' ? (
          <div className="bk-copy-modal-skeleton" role="status" aria-label={t('Loading booking pages...', 'جاري تحميل صفحات الحجز...')}>
            <div className="bk-copy-skel-row">
              <span className="bk-copy-skel-line w-32" />
              <span className="bk-copy-skel-line w-16" />
            </div>
            <div className="bk-copy-skel-pills">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="bk-copy-skel-pill" />
              ))}
            </div>
            <div className="bk-copy-skel-field">
              <span className="bk-copy-skel-line w-24" />
              <span className="bk-copy-skel-input" />
            </div>
            <div className="bk-copy-skel-field">
              <span className="bk-copy-skel-line w-20" />
              <span className="bk-copy-skel-input" />
            </div>
          </div>
        ) : (
          <div className="bk-copy-modal-body">
            {/* 1. Sections to copy */}
            <div className="bk-copy-field-group">
              <div className="bk-copy-label-row">
                <span className="bk-copy-label">
                  {t('Sections to copy', 'الأقسام المراد نسخها')}
                  <span
                    className="bk-copy-help"
                    title={t(
                      'Choose one or more configuration sections to copy from the selected booking page.',
                      'اختر قسماً واحداً أو أكثر لنسخ إعداداته من صفحة الحجز المحددة.'
                    )}
                  >
                    <HelpCircle size={13} />
                  </span>
                  <em className="bk-copy-count-badge">{selectedSections.size}</em>
                </span>
                <button
                  type="button"
                  className="bk-copy-inline-action"
                  onClick={handleSelectAllSections}
                  disabled={phase !== 'ready'}
                >
                  {allSectionsSelected
                    ? t('Reset selection', 'إعادة التعيين')
                    : t('Select all', 'تحديد الكل')}
                </button>
              </div>

              <div className="bk-copy-pills-grid" role="group" aria-label={t('Sections to copy', 'الأقسام المراد نسخها')}>
                {COPY_SECTIONS.map(sec => {
                  const active = selectedSections.has(sec.id);
                  const SecIcon = sec.icon;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      aria-pressed={active}
                      disabled={phase !== 'ready'}
                      onClick={() => toggleSectionPill(sec.id)}
                      className={`bk-copy-pill ${active ? 'is-selected' : ''}`}
                    >
                      {active && (
                        <span className="bk-copy-pill-check" aria-hidden="true">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                      <SecIcon size={13} className="bk-copy-pill-icon" aria-hidden="true" />
                      <span>{ar ? sec.ar : sec.en}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Copy from */}
            <div className="bk-copy-field-group" ref={sourceWrapRef}>
              <div className="bk-copy-label-row">
                <span className="bk-copy-label">
                  {t('Copy from', 'نسخ من')}
                  <span
                    className="bk-copy-help"
                    title={t(
                      'Select the source booking page whose settings will be copied.',
                      'حدد صفحة الحجز المصدر التي سيتم نسخ الإعدادات منها.'
                    )}
                  >
                    <HelpCircle size={13} />
                  </span>
                </span>
              </div>

              {sourceCandidates.length === 0 ? (
                <div className="bk-copy-empty-source">
                  <Sparkles size={15} />
                  <span>
                    {t(
                      'No other saved booking pages found yet. Save another booking page first to copy settings between pages.',
                      'لا توجد صفحات حجز أخرى محفوظة حالياً. احفظ صفحة حجز أخرى أولاً لنسخ الإعدادات بينها.'
                    )}
                  </span>
                </div>
              ) : (
                <div className="bk-copy-dropdown-wrap">
                  <button
                    type="button"
                    className={`bk-copy-select-btn ${sourceOpen ? 'is-open' : ''}`}
                    aria-haspopup="listbox"
                    aria-expanded={sourceOpen}
                    disabled={phase !== 'ready'}
                    onClick={() => {
                      setTargetOpen(false);
                      setSourceOpen(o => !o);
                    }}
                  >
                    {selectedSource ? (
                      <span className="bk-copy-select-val">
                        <i
                          className="bk-copy-color-dot"
                          style={{ background: bookingColor(selectedSource.color) }}
                        />
                        <b className="truncate">
                          {selectedSource.name || t('Untitled booking page', 'صفحة حجز بدون عنوان')}
                        </b>
                        <small dir="ltr">
                          /book/{selectedSource.slug || 'page'} · {selectedSource.duration}m
                        </small>
                      </span>
                    ) : (
                      <span className="bk-copy-select-placeholder">
                        {t('Select source booking page', 'اختر صفحة الحجز المصدر')}
                      </span>
                    )}
                    <ChevronDown
                      size={15}
                      className={`bk-copy-chevron ${sourceOpen ? 'rotated' : ''}`}
                    />
                  </button>

                  {sourceOpen && (
                    <ul className="bk-copy-dropdown-list custom-scrollbar" role="listbox">
                      {sourceCandidates.map(candidate => {
                        const isSelected = candidate.id === selectedSource?.id;
                        return (
                          <li key={candidate.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              className={`bk-copy-dropdown-option ${isSelected ? 'is-active' : ''}`}
                              onClick={() => {
                                setSourceId(candidate.id);
                                setSourceOpen(false);
                              }}
                            >
                              <i
                                className="bk-copy-color-dot"
                                style={{ background: bookingColor(candidate.color) }}
                              />
                              <span className="bk-copy-option-copy">
                                <b>
                                  {candidate.name || t('Untitled booking page', 'صفحة حجز بدون عنوان')}
                                </b>
                                <small dir="ltr">
                                  /book/{candidate.slug || 'page'} · {candidate.duration} min
                                </small>
                              </span>
                              {isSelected && <Check size={14} className="bk-copy-opt-check" />}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* 3. Apply to */}
            <div className="bk-copy-field-group" ref={targetWrapRef}>
              <div className="bk-copy-label-row">
                <span className="bk-copy-label">
                  {t('Apply to', 'تطبيق على')}
                  <span
                    className="bk-copy-help"
                    title={t(
                      'Apply these settings to the booking page you are currently editing, or multiple booking pages at once.',
                      'طبّق هذه الإعدادات على صفحة الحجز الحالية أو على عدة صفحات حجز دفعة واحدة.'
                    )}
                  >
                    <HelpCircle size={13} />
                  </span>
                </span>
                {targetCandidates.length > 1 && (
                  <button
                    type="button"
                    className="bk-copy-inline-action"
                    onClick={handleSelectAllTargets}
                    disabled={phase !== 'ready'}
                  >
                    {allTargetsSelected
                      ? t('Current only', 'الحالية فقط')
                      : t('Select all', 'تحديد الكل')}
                  </button>
                )}
              </div>

              <div className="bk-copy-dropdown-wrap">
                <button
                  type="button"
                  className={`bk-copy-select-btn ${targetOpen ? 'is-open' : ''}`}
                  aria-haspopup="listbox"
                  aria-expanded={targetOpen}
                  disabled={phase !== 'ready'}
                  onClick={() => {
                    setSourceOpen(false);
                    setTargetOpen(o => !o);
                  }}
                >
                  <span className="bk-copy-select-val">
                    <i
                      className="bk-copy-color-dot"
                      style={{ background: bookingColor(currentDraft.color) }}
                    />
                    <b className="truncate">{targetSummaryLabel}</b>
                  </span>
                  <ChevronDown
                    size={15}
                    className={`bk-copy-chevron ${targetOpen ? 'rotated' : ''}`}
                  />
                </button>

                {targetOpen && (
                  <ul className="bk-copy-dropdown-list custom-scrollbar" role="listbox" aria-multiselectable="true">
                    {targetCandidates.map(target => {
                      const checked = targetIds.has(target.id);
                      return (
                        <li key={target.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={checked}
                            className={`bk-copy-dropdown-option ${checked ? 'is-active' : ''}`}
                            onClick={() => toggleTarget(target.id)}
                          >
                            <span className={`bk-copy-checkbox ${checked ? 'is-checked' : ''}`}>
                              {checked && <Check size={11} strokeWidth={3} />}
                            </span>
                            <i className="bk-copy-color-dot" style={{ background: target.color }} />
                            <span className="bk-copy-option-copy">
                              <b>
                                {target.name}
                                {target.isCurrent && (
                                  <em className="bk-copy-current-tag">
                                    {t('Active editor', 'قيد التعديل')}
                                  </em>
                                )}
                              </b>
                              <small dir="ltr">/book/{target.slug}</small>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        <footer className="bk-copy-modal-footer">
          <button
            type="button"
            className="bk-copy-btn-cancel"
            disabled={phase === 'copying'}
            onClick={onClose}
          >
            {t('Cancel', 'إلغاء')}
          </button>
          <button
            type="button"
            className={`bk-copy-btn-submit ${phase === 'done' ? 'is-done' : ''}`}
            disabled={!canConfirm}
            onClick={() => void handleCopySettings()}
          >
            {phase === 'copying' ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>{t('Copying settings...', 'جاري نسخ الإعدادات...')}</span>
              </>
            ) : phase === 'done' ? (
              <>
                <Check size={15} strokeWidth={2.6} />
                <span>{t('Copied!', 'تم النسخ!')}</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>{t('Copy settings', 'نسخ الإعدادات')}</span>
              </>
            )}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
