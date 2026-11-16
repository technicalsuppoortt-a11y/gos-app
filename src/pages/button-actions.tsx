import React, { useState } from 'react';
import { X, ArrowRight, Download, CheckCircle2, ShieldCheck } from 'lucide-react';
import { AssetSelect } from './AssetControls';
import { useUILanguage, translateText, localizeNode } from '../i18n/display';
import { showToast } from '../utils/toast';
import type { BuilderPage, BuilderSection } from './BuilderWorkspace';

export type ButtonDestinationType =
  | 'Next Step'
  | 'Specific Page'
  | 'External URL'
  | 'Submit Form'
  | 'Scroll to Section'
  | 'Open Popup'
  | 'Open Booking Modal'
  | 'Download File'
  | 'Phone Call'
  | 'Send Email';

export function getButtonActionOptions() {
  return [
    { value: 'Next Step', label: translateText('Go to Next Funnel Step') },
    { value: 'Specific Page', label: translateText('Go to Specific Page / Step') },
    { value: 'External URL', label: translateText('External URL') },
    { value: 'Submit Form', label: translateText('Submit Form / Trigger Order') },
    { value: 'Scroll to Section', label: translateText('Scroll to Section') },
    { value: 'Open Popup', label: translateText('Open Popup / Modal') },
    { value: 'Open Booking Modal', label: translateText('Open Booking Modal') },
    { value: 'Download File', label: translateText('Download File') },
    { value: 'Phone Call', label: translateText('Phone Call (tel:)') },
    { value: 'Send Email', label: translateText('Send Email (mailto:)') },
  ];
}

export function ButtonActionFields({
  element,
  onChange,
  pages = [],
  currentPage,
}: {
  element: BuilderSection;
  onChange: (key: string, value: string) => void;
  pages?: BuilderPage[];
  currentPage?: BuilderPage;
}) {
  useUILanguage();
  const value = (key: string, fallback = '') => element.content[key] ?? fallback;
  const actionType = value('destinationType', 'Next Step');

  const pageSections = (currentPage?.sections || []).filter(
    sec => sec.id !== element.id.split('::')[0]
  );
  const formOrOrderSections = pageSections.filter(sec =>
    ['Form', 'Contact Form', 'Payment', 'Pricing', 'Pricing Table'].includes(sec.type)
  );
  const popupSections = pageSections.filter(sec => sec.type === 'Popup');

  return (
    <div className="fb-button-action-settings" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label>
        {translateText('Button action type')}
        <AssetSelect
          label="Action destination"
          value={actionType}
          options={getButtonActionOptions()}
          onChange={next => onChange('destinationType', next)}
        />
      </label>

      {actionType === 'Next Step' && (
        <label>
          {translateText('Next step override (optional)')}
          <AssetSelect
            label="Next step override"
            value={value('destination')}
            options={[
              { value: '', label: translateText('Automatic (Next step in funnel flow)') },
              ...pages.map(p => ({
                value: p.id,
                label: `${p.name} (${p.path})`,
                preserveLabel: true,
              })),
            ]}
            onChange={next => onChange('destination', next)}
          />
        </label>
      )}

      {actionType === 'Specific Page' && (
        <label>
          {translateText('Target page / step')}
          <AssetSelect
            label="Target page or step"
            value={value('destination')}
            options={[
              { value: '', label: translateText('Choose a page or step...') },
              ...pages.map(p => ({
                value: p.id,
                label: `${p.name} (${p.path})`,
                preserveLabel: true,
              })),
            ]}
            onChange={next => onChange('destination', next)}
          />
        </label>
      )}

      {actionType === 'External URL' && (
        <>
          <label>
            {translateText('Destination URL')}
            <input
              type="url"
              value={value('destination')}
              onChange={e => onChange('destination', e.target.value)}
              placeholder="https://example.com"
              dir="ltr"
            />
          </label>
          <label className="fb-switch-setting" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={value('openInNewTab', 'true') === 'true'}
              onChange={e => onChange('openInNewTab', String(e.target.checked))}
            />
            <span>{translateText('Open in new tab')}</span>
          </label>
        </>
      )}

      {actionType === 'Submit Form' && (
        <label>
          {translateText('Target Form / Order')}
          <AssetSelect
            label="Target form or order"
            value={value('destination')}
            options={[
              { value: '', label: translateText('Auto (First Form / Order on page)') },
              ...formOrOrderSections.map(sec => ({
                value: sec.id,
                label: `${sec.content.title || sec.type} (${sec.type})`,
                preserveLabel: true,
              })),
            ]}
            onChange={next => onChange('destination', next)}
          />
        </label>
      )}

      {actionType === 'Scroll to Section' && (
        <>
          {pageSections.length > 0 && (
            <label>
              {translateText('Choose section on page')}
              <AssetSelect
                label="Choose section on page"
                value={pageSections.some(s => s.id === value('destination').replace(/^#/, '')) ? value('destination').replace(/^#/, '') : ''}
                options={[
                  { value: '', label: translateText('Select a section...') },
                  ...pageSections.map((sec, idx) => ({
                    value: sec.id,
                    label: `${idx + 1}. ${sec.content.title || sec.type}`,
                    preserveLabel: true,
                  })),
                ]}
                onChange={next => {
                  if (next) onChange('destination', next);
                }}
              />
            </label>
          )}
          <label>
            {translateText('Target section ID')}
            <input
              value={value('destination')}
              onChange={e => onChange('destination', e.target.value)}
              placeholder={translateText('#pricing or section ID')}
              dir="ltr"
            />
          </label>
        </>
      )}

      {actionType === 'Open Popup' && (
        <>
          <label>
            {translateText('Popup source')}
            <AssetSelect
              label="Popup source"
              value={value('popupSource', popupSections[0]?.id || 'inline-lead')}
              options={[
                { value: 'inline-lead', label: translateText('Built-in Lead Capture Popup') },
                { value: 'inline-offer', label: translateText('Built-in Special Offer Modal') },
                ...popupSections.map(sec => ({
                  value: sec.id,
                  label: `${translateText('Page Popup')}: ${sec.content.title || sec.id}`,
                  preserveLabel: true,
                })),
              ]}
              onChange={next => onChange('popupSource', next)}
            />
          </label>
          <label>
            {translateText('Popup headline')}
            <input
              value={value('popupTitle', 'Get Instant Access')}
              onChange={e => onChange('popupTitle', e.target.value)}
              placeholder={translateText('Enter popup headline')}
            />
          </label>
          <label>
            {translateText('Popup description')}
            <textarea
              rows={2}
              value={value('popupBody', 'Enter your details below to continue immediately.')}
              onChange={e => onChange('popupBody', e.target.value)}
              placeholder={translateText('Supporting popup message')}
            />
          </label>
          <label>
            {translateText('Popup CTA label')}
            <input
              value={value('popupCta', 'Submit & Continue')}
              onChange={e => onChange('popupCta', e.target.value)}
              placeholder={translateText('Submit & Continue')}
            />
          </label>
        </>
      )}

      {actionType === 'Download File' && (
        <>
          <label>
            {translateText('File URL')}
            <input
              type="url"
              value={value('destination')}
              onChange={e => onChange('destination', e.target.value)}
              placeholder="https://example.com/guide.pdf"
              dir="ltr"
            />
          </label>
          <label>
            {translateText('File name (optional)')}
            <input
              value={value('downloadFilename')}
              onChange={e => onChange('downloadFilename', e.target.value)}
              placeholder="free-guide.pdf"
              dir="ltr"
            />
          </label>
        </>
      )}

      {actionType === 'Phone Call' && (
        <label>
          {translateText('Phone number')}
          <input
            type="tel"
            value={value('destination')}
            onChange={e => onChange('destination', e.target.value)}
            placeholder="+20 100 000 0000"
            dir="ltr"
          />
        </label>
      )}

      {actionType === 'Send Email' && (
        <>
          <label>
            {translateText('Email address')}
            <input
              type="email"
              value={value('destination')}
              onChange={e => onChange('destination', e.target.value)}
              placeholder="hello@example.com"
              dir="ltr"
            />
          </label>
          <label>
            {translateText('Email subject (optional)')}
            <input
              value={value('emailSubject')}
              onChange={e => onChange('emailSubject', e.target.value)}
              placeholder={translateText('Inquiry from website')}
            />
          </label>
        </>
      )}
    </div>
  );
}

export type ButtonExecutionEnv = {
  currentPageId?: string;
  pagesFlow?: string[];
  pages?: BuilderPage[];
  readOnly?: boolean;
  isPreview?: boolean;
  rootSelector?: string;
  onNavigatePage?: (pageId: string) => void;
  onOpenPopup?: (item: BuilderSection) => void;
  onOpenBookingOrPaymentModal?: (kind: 'booking' | 'payment') => void;
};

export function executeButtonAction(item: BuilderSection, env: ButtonExecutionEnv): void {
  const type = item.content?.destinationType || '';
  const dest = (item.content?.destination || '').trim();
  const openInNewTab = item.content?.openInNewTab !== 'false';

  if (
    env.readOnly &&
    !['Next Step', 'Specific Page', 'Scroll to Section', 'Open Popup'].includes(type)
  ) {
    return;
  }

  switch (type) {
    case 'Next Step': {
      const flow = env.pagesFlow || (env.pages || []).map(p => p.id);
      const currentIdx = env.currentPageId ? flow.indexOf(env.currentPageId) : 0;
      const targetId = dest || flow[currentIdx + 1] || '';
      if (targetId && env.onNavigatePage) {
        env.onNavigatePage(targetId);
      } else if (!targetId) {
        showToast.info(translateText('This is the final step in the funnel flow.'));
      }
      return;
    }

    case 'Specific Page': {
      if (dest && env.onNavigatePage) {
        env.onNavigatePage(dest);
      } else {
        showToast.info(translateText('Choose a target page or step in button settings.'));
      }
      return;
    }

    case 'External URL': {
      if (!dest) {
        showToast.info(translateText('Add a destination URL in button settings.'));
        return;
      }
      try {
        const normalized = /^(https?:\/\/|mailto:|tel:|\/)/i.test(dest) ? dest : `https://${dest}`;
        const url = new URL(normalized, window.location.origin);
        if (!['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol)) return;
        if (openInNewTab || env.isPreview) {
          window.open(url.href, '_blank', 'noopener,noreferrer');
        } else {
          window.location.assign(url.href);
        }
      } catch {
        showToast.error(translateText('Invalid destination URL.'));
      }
      return;
    }

    case 'Submit Form': {
      const container = env.rootSelector
        ? document.querySelector<HTMLElement>(env.rootSelector)
        : document.body;
      let targetForm: HTMLFormElement | null = null;
      if (dest && container) {
        const sec = container.querySelector<HTMLElement>(`[data-section-id="${CSS.escape(dest)}"]`);
        targetForm = sec?.querySelector<HTMLFormElement>('form') ?? null;
        if (!targetForm && sec) {
          const orderBtn = sec.querySelector<HTMLButtonElement>('button');
          if (orderBtn) {
            orderBtn.click();
            return;
          }
        }
      }
      if (!targetForm && container) {
        targetForm = container.querySelector<HTMLFormElement>(
          'form.fb-demo-form, form.fb-lead-form-card, form.fb-custom-form, form'
        );
      }
      if (targetForm) {
        targetForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof targetForm.requestSubmit === 'function') {
          targetForm.requestSubmit();
        } else {
          targetForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
        return;
      }
      if (env.onOpenBookingOrPaymentModal) {
        env.onOpenBookingOrPaymentModal('payment');
        return;
      }
      showToast.info(translateText('Add a Form or Order element on this page to submit.'));
      return;
    }

    case 'Scroll to Section': {
      if (!dest) return;
      const cleanId = dest.replace(/^#/, '');
      const scope = env.rootSelector
        ? document.querySelector<HTMLElement>(env.rootSelector)
        : document;
      const el =
        scope?.querySelector<HTMLElement>(`[data-section-id="${CSS.escape(cleanId)}"]`) ||
        document.getElementById(cleanId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    case 'Open Popup': {
      if (env.onOpenPopup) {
        env.onOpenPopup(item);
      } else if (env.onOpenBookingOrPaymentModal) {
        env.onOpenBookingOrPaymentModal('booking');
      }
      return;
    }

    case 'Open Booking Modal': {
      if (env.onOpenBookingOrPaymentModal) {
        env.onOpenBookingOrPaymentModal('booking');
      } else if (item.content?.bookingUrl) {
        try {
          const url = new URL(item.content.bookingUrl);
          if (url.protocol === 'https:') window.location.assign(url.href);
        } catch {}
      } else if (env.onOpenPopup) {
        env.onOpenPopup(item);
      } else {
        showToast.info(translateText('This action opens the connected booking modal.'));
      }
      return;
    }

    case 'Download File': {
      if (!dest) {
        showToast.info(translateText('Add a file URL to download in button settings.'));
        return;
      }
      try {
        const normalized = /^(https?:\/\/|\/|data:)/i.test(dest) ? dest : `https://${dest}`;
        const link = document.createElement('a');
        link.href = normalized;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        if (item.content?.downloadFilename) {
          link.download = item.content.downloadFilename;
        } else {
          link.download = '';
        }
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch {
        showToast.error(translateText('Unable to start download.'));
      }
      return;
    }

    case 'Phone Call': {
      const phone = dest.replace(/[^\d+]/g, '');
      if (!phone) {
        showToast.info(translateText('Add a phone number in button settings.'));
        return;
      }
      window.location.href = `tel:${phone}`;
      return;
    }

    case 'Send Email': {
      if (!dest) {
        showToast.info(translateText('Add an email address in button settings.'));
        return;
      }
      const subject = item.content?.emailSubject
        ? `?subject=${encodeURIComponent(item.content.emailSubject)}`
        : '';
      window.location.href = `mailto:${dest}${subject}`;
      return;
    }

    default: {
      if (item.content?.bookingUrl) {
        try {
          const url = new URL(item.content.bookingUrl);
          if (url.protocol === 'https:') {
            window.location.assign(url.href);
            return;
          }
        } catch {}
      }
      if (env.onOpenBookingOrPaymentModal) {
        env.onOpenBookingOrPaymentModal(
          item.type === 'Payment' || item.type.toLowerCase().includes('pricing') ? 'payment' : 'booking'
        );
      } else {
        showToast.info(translateText('Configure an action for this button in the Page Builder.'));
      }
    }
  }
}

export function BuilderActionPopupModal({
  triggerItem,
  onClose,
  onSubmitLead,
  onNextStep,
  isDark = false,
}: {
  triggerItem: BuilderSection | null;
  onClose: () => void;
  onSubmitLead?: (data: { name: string; email: string; phone: string }) => Promise<void> | void;
  onNextStep?: () => void;
  isDark?: boolean;
}) {
  useUILanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!triggerItem) return null;

  const source = triggerItem.content?.popupSource || 'inline-lead';
  const title = triggerItem.content?.popupTitle || translateText('Get Instant Access');
  const body =
    triggerItem.content?.popupBody ||
    translateText('Enter your details below to unlock immediate access.');
  const cta = triggerItem.content?.popupCta || translateText('Submit & Continue');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await onSubmitLead?.({ name, email, phone });
      setSubmitted(true);
      showToast.success(translateText('Submitted successfully!'));
      if (onNextStep) {
        setTimeout(() => {
          onClose();
          onNextStep();
        }, 700);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fb-preview-action-backdrop"
      style={{ zIndex: 140 }}
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fb-preview-action-modal"
        style={{
          background: isDark ? '#0f172a' : '#ffffff',
          color: isDark ? '#f8fafc' : '#0f172a',
          borderColor: isDark ? '#334155' : '#e2e8f0',
          maxWidth: 460,
          width: '92vw',
        }}
      >
        <button
          type="button"
          className="fb-preview-action-close"
          onClick={onClose}
          aria-label={translateText('Close')}
        >
          <X size={16} />
        </button>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '18px 6px' }}>
            <CheckCircle2 size={42} style={{ color: '#10b981', margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
              {translateText('Thank you!')}
            </h2>
            <p style={{ fontSize: 14, opacity: 0.8 }}>{translateText('Your submission has been received.')}</p>
          </div>
        ) : source === 'inline-offer' ? (
          <div>
            <p className="fb-preview-eyebrow">{translateText('SPECIAL OFFER')}</p>
            <h2>{localizeNode(title)}</h2>
            <p>{localizeNode(body)}</p>
            <button
              type="button"
              className="fb-site-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
              onClick={() => {
                onClose();
                onNextStep?.();
              }}
            >
              {localizeNode(cta)} <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="fb-preview-eyebrow">{translateText('INSTANT ACCESS')}</p>
            <h2>{localizeNode(title)}</h2>
            <p>{localizeNode(body)}</p>
            <div className="fb-preview-action-fields">
              <label>
                {translateText('Full name')}
                <input
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={translateText('Your full name')}
                />
              </label>
              <label>
                {translateText('Email address')}
                <input
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <label>
                {translateText('Phone number (optional)')}
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+20 100 000 0000"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="fb-site-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {busy ? translateText('Submitting...') : localizeNode(cta)} <ArrowRight size={14} />
            </button>
            <small style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
              <ShieldCheck size={13} />
              {translateText('100% secure & private')}
            </small>
          </form>
        )}
      </section>
    </div>
  );
}

export function renderButtonAnchorOrButton({
  item,
  label,
  className = 'fb-site-primary',
  style,
  onAction,
  icon,
}: {
  item: BuilderSection;
  label: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onAction: (item: BuilderSection) => void;
  icon?: React.ReactNode;
}) {
  const destType = item.content?.destinationType || '';
  const isDownload = destType === 'Download File';
  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={() => onAction(item)}
    >
      {label}
      {isDownload ? <Download size={13} /> : icon ?? <ArrowRight size={13} />}
    </button>
  );
}
