import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  RefreshCw,
  Trash2,
  Zap,
} from 'lucide-react';
import type { RootState } from '../../store';
import { useUILanguage } from '../../i18n/display';
import { callBackend, backendError } from '../../backend/firebase';
import { showToast } from '../../utils/toast';
import { DomainsClient } from '../../lib/domains/client';
import type { RegisteredDomain } from '../../lib/domains/constants';
import '../../pages/domains-provider.css';

export interface SiteDomainSettingsProps {
  funnelId: string;
  tenantId?: string;
  initialDomain?: string;
  initialVerified?: boolean;
  onChanged?: (domain: string, verified: boolean) => void;
}

const DEFAULT_APEX_IP = '76.76.21.21';
const DEFAULT_CNAME_TARGET = 'cname.vercel-dns.com';

function normalizeHost(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');
}

export const DomainSettings: React.FC<SiteDomainSettingsProps> = ({
  funnelId,
  tenantId,
  initialDomain = '',
  initialVerified = false,
  onChanged,
}) => {
  const lang = useUILanguage();
  const isRTL = lang.startsWith('ar');
  const theme = useSelector((s: RootState) => s.ui.theme);
  const t = (en: string, ar: string) => (isRTL ? ar : en);

  const [input, setInput] = useState(initialDomain);
  const [savedDomain, setSavedDomain] = useState(initialDomain);
  const [verified, setVerified] = useState(initialVerified);
  const [busy, setBusy] = useState<'' | 'save' | 'verify' | 'auto-dns' | 'remove'>('');
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');
  const [ownedDomains, setOwnedDomains] = useState<RegisteredDomain[]>([]);

  useEffect(() => {
    setInput(initialDomain);
    setSavedDomain(initialDomain);
    setVerified(initialVerified);
  }, [initialDomain, initialVerified]);

  useEffect(() => {
    void DomainsClient.listMyDomains()
      .then(res => setOwnedDomains(res.domains || []))
      .catch(() => setOwnedDomains([]));
  }, []);

  const currentHost = normalizeHost(savedDomain || input);
  const isApex = currentHost.split('.').filter(Boolean).length === 2;
  const matchingOwned = ownedDomains.find(
    d => d.domain === currentHost || `www.${d.domain}` === currentHost
  );

  const copyValue = (key: string, val: string) => {
    void navigator.clipboard?.writeText(val);
    setCopied(key);
    setTimeout(() => setCopied(''), 1600);
  };

  const handleConnectAndVerify = async (mode: 'save' | 'verify') => {
    const clean = normalizeHost(mode === 'save' ? input : savedDomain);
    if (!clean || !clean.includes('.')) {
      setError(t('Enter a valid domain like www.yourbrand.com', 'أدخل نطاقاً صحيحاً مثل www.yourbrand.com'));
      return;
    }
    setBusy(mode);
    setError('');
    try {
      const res = await callBackend<{ matched?: boolean; verified?: boolean; status?: string }>(
        'verifyDomain',
        { host: clean, funnelId, tenantId }
      );
      const isOk = Boolean(res?.matched || res?.verified || res?.status === 'connected');
      setSavedDomain(clean);
      setInput(clean);
      setVerified(isOk);
      onChanged?.(clean, isOk);
      if (isOk) {
        showToast.success(t('Domain verified and SSL is active!', 'تم التحقق من النطاق وتفعيل شهادة SSL بنجاح!'));
      } else if (mode === 'save') {
        showToast.info(
          t(
            'Domain saved! Point your DNS records below and click Verify.',
            'تم حفظ النطاق! أضف سجلات DNS أدناه ثم اضغط تحقق.'
          )
        );
      } else {
        setError(
          t(
            'DNS records have not propagated yet. Check the A / CNAME values below and retry shortly.',
            'لم تنتشر سجلات DNS بعد. تأكد من القيم أدناه وأعد المحاولة بعد دقائق.'
          )
        );
      }
    } catch (err) {
      setError(backendError(err));
    } finally {
      setBusy('');
    }
  };

  const handleOneClickDns = async () => {
    if (!matchingOwned) return;
    setBusy('auto-dns');
    setError('');
    try {
      const existing = await DomainsClient.getDnsRecords(matchingOwned.id).catch(() => ({ records: [] }));
      const kept = (existing.records || []).filter(
        r => !((r.name === '@' && r.type === 'A') || (r.name === 'www' && r.type === 'CNAME'))
      );
      await DomainsClient.saveDnsRecords(matchingOwned.id, [
        { name: '@', type: 'A', address: DEFAULT_APEX_IP, ttl: '1799' },
        { name: 'www', type: 'CNAME', address: DEFAULT_CNAME_TARGET, ttl: '1799' },
        ...kept,
      ]);
      showToast.success(
        t(
          'DNS records configured automatically on your registered domain!',
          'تم ضبط سجلات DNS تلقائياً على نطاقك المسجل!'
        )
      );
      await handleConnectAndVerify('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Auto-DNS setup failed.', 'تعذر الضبط التلقائي لسجلات DNS.'));
    } finally {
      setBusy('');
    }
  };

  const handleDisconnect = async () => {
    if (!savedDomain) return;
    setBusy('remove');
    try {
      await callBackend('verifyDomain', { host: savedDomain, funnelId, tenantId, disconnect: true });
      setSavedDomain('');
      setInput('');
      setVerified(false);
      onChanged?.('', false);
      showToast.info(t('Custom domain disconnected.', 'تم فصل النطاق المخصص.'));
    } catch (err) {
      setError(backendError(err));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="dp-root" data-dp-theme={theme} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="dp-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <h4 className="dp-card-title">
            <Globe size={17} style={{ color: 'var(--dp-accent)' }} />
            <span>{t('Custom Domain & DNS Verification', 'النطاق المخصص والتحقق من DNS')}</span>
          </h4>
          {savedDomain && (
            <span className={`dp-pill ${verified ? 'dp-pill-emerald' : 'dp-pill-amber'}`}>
              {verified ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              <span>{verified ? t('SSL Active & Connected', 'متصل و SSL مفعل') : t('Pending DNS', 'بانتظار DNS')}</span>
            </span>
          )}
        </div>

        <div className="dp-search-form">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="www.yourbrand.com"
            className="dp-input dp-mono"
            style={{ flex: 1 }}
            dir="ltr"
          />
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void handleConnectAndVerify('save')}
            className="dp-btn dp-btn-primary"
          >
            {busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : null}
            <span>{savedDomain ? t('Update Domain', 'تحديث النطاق') : t('Connect Domain', 'ربط النطاق')}</span>
          </button>
        </div>

        {matchingOwned && (
          <div className="dp-alert dp-alert-emerald">
            <span>
              {t(
                `You own ${matchingOwned.domain} in Upclick Domains — configure DNS in 1 click!`,
                `أنت تملك ${matchingOwned.domain} على المنصة — يمكنك ضبط سجلات DNS بضغطة واحدة!`
              )}
            </span>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void handleOneClickDns()}
              className="dp-btn dp-btn-primary dp-btn-sm"
            >
              {busy === 'auto-dns' ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
              <span>{t('1-Click Auto DNS', 'ضبط DNS تلقائياً')}</span>
            </button>
          </div>
        )}

        {savedDomain && (
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: 'var(--dp-card-alt)',
              border: '1px solid var(--dp-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span className="dp-mono" style={{ fontWeight: 700 }}>
                {savedDomain}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {verified && (
                  <a
                    href={`https://${savedDomain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="dp-btn dp-btn-sm"
                  >
                    <ExternalLink size={12} />
                    <span>{t('Open Live', 'فتح الموقع')}</span>
                  </a>
                )}
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void handleConnectAndVerify('verify')}
                  className="dp-btn dp-btn-sm"
                >
                  <RefreshCw size={12} className={busy === 'verify' ? 'animate-spin' : ''} />
                  <span>{t('Verify DNS', 'تحقق الآن')}</span>
                </button>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void handleDisconnect()}
                  className="dp-btn dp-btn-danger dp-btn-sm"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {!verified && (
              <div className="dp-mono" style={{ fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span>
                  {isApex ? `A   @   →   ${DEFAULT_APEX_IP}` : `CNAME   ${currentHost.split('.')[0]}   →   ${DEFAULT_CNAME_TARGET}`}
                </span>
                <button
                  type="button"
                  onClick={() => copyValue('target', isApex ? DEFAULT_APEX_IP : DEFAULT_CNAME_TARGET)}
                  className="dp-btn dp-btn-sm"
                >
                  {copied === 'target' ? <Check size={12} /> : <Copy size={12} />}
                  <span>{t('Copy Target', 'نسخ')}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="dp-alert dp-alert-red">
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DomainSettings;
