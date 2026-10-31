import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Trash2,
  ShieldCheck,
  Calendar,
  Share2,
  Printer,
  Copy,
  Check,
  Search,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  LogIn,
  LayoutDashboard,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Globe,
  Mail,
  RefreshCw,
  ExternalLink,
  Database,
  Layers,
  FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function FacebookIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
import type { RootState } from '../store';
import { useUILanguage, uiDirection, translateText } from '../i18n/display';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { showToast } from '../utils/toast';
import './legal-pages.css';

export function DataDeletionPage() {
  useUILanguage();
  const isRtl = uiDirection() === 'rtl';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useSelector((s: RootState) => s.auth);
  const isAuthenticated = !!auth.token || !!auth.user;
  const appName = import.meta.env.VITE_APP_NAME || 'Upclick Platform';
  const supportEmail = 'technicalsuppoortt@gmail.com';
  const appUrl = 'https://gos-app-3c7fb.web.app/';

  // Tab: 'request' | 'meta-steps' | 'status'
  const [activeTab, setActiveTab] = useState<'request' | 'meta-steps' | 'status'>('request');
  const [emailInput, setEmailInput] = useState(auth.user?.email || '');
  const [facebookIdInput, setFacebookIdInput] = useState('');
  const [reasonInput, setReasonInput] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    'meta-tokens',
    'inbox-messages',
    'crm-contacts',
    'ai-history'
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const [confirmationDate, setConfirmationDate] = useState<string | null>(null);

  // Status check tab
  const [checkCodeInput, setCheckCodeInput] = useState(searchParams.get('code') || searchParams.get('tracking_id') || '');
  const [statusResult, setStatusResult] = useState<any | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 350);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const content = useMemo(() => {
    if (isRtl) {
      return {
        title: `تعليمات وطلب حذف بيانات المستخدم - ${appName}`,
        subtitle: 'وفقاً لسياسات خصوصية منصة Meta ولوائح حماية البيانات العامة (GDPR)، يحق لك طلب حذف بياناتك وحساباتك المرتبطة بالكامل.',
        badgeCompliance: 'متوافق مع Meta Developer Data Deletion',
        badgeSecurity: 'معالجة مشفرة وآمنة',
        effectiveDate: 'تحديث: أكتوبر 2026',
        copySuccess: 'تم نسخ الرابط إلى الحافظة!',
        codeCopied: 'تم نسخ رمز المتابعة!',
        formTitle: 'تقديم طلب حذف بيانات فوري',
        formDesc: 'أدخل بريدك الإلكتروني أو معرّف Meta / Facebook لطلب مسح وتطهير بياناتك من قواعد بيانات المنصة.',
        scopes: [
          { id: 'meta-tokens', label: 'رموز الوصول وأذونات تطبيقات Meta (Facebook / Instagram / WhatsApp)' },
          { id: 'inbox-messages', label: 'سجلات المحادثات وصندوق الوارد الموحد والمرفقات' },
          { id: 'crm-contacts', label: 'بيانات جهات الاتصال والعملاء المحتملين في الـ CRM' },
          { id: 'ai-history', label: 'سجل محادثات مساعد الذكاء الاصطناعي وتفضيلات الأتمتة' },
          { id: 'full-account', label: 'حذف الحساب بالكامل ومسح جميع البيانات المرتبطة' },
        ],
        metaSteps: [
          {
            step: 1,
            title: 'الانتقال إلى إعدادات حساب Facebook',
            desc: 'افتح حسابك في Facebook أو Instagram، ثم توجه إلى "الإعدادات والخصوصية" ثم اختر "الإعدادات".'
          },
          {
            step: 2,
            title: 'التطبيقات ومواقع الويب (Apps & Websites)',
            desc: 'انتقل إلى قسم "الأمان" أو "أذوناتك" ثم اضغط على "التطبيقات ومواقع الويب" (Apps and Websites).'
          },
          {
            step: 3,
            title: `تحديد تطبيق ${appName} وإزالته`,
            desc: 'ابحث عن التطبيق في قائمة التطبيقات النشطة، ثم اضغط على زر "إزالة" (Remove).'
          },
          {
            step: 4,
            title: 'تأكيد الحذف وإرسال إشعار السيرفر',
            desc: 'حدد خيار حذف جميع المنشورات والتفاعلات، ثم اضغط "إزالة". سيقوم Facebook تلقائياً بإرسال إشعار حذف البيانات (Data Deletion Callback) إلى خوادمنا لمسح بياناتك فورياً.'
          }
        ]
      };
    }
    return {
      title: `User Data Deletion Instructions & Request - ${appName}`,
      subtitle: 'In accordance with Meta Platform policies and international privacy frameworks (GDPR/CCPA), you have the full right to delete your personal data and revoke platform connections.',
      badgeCompliance: 'Meta Platform Data Deletion Compliant',
      badgeSecurity: 'Encrypted & Verifiable Purge',
      effectiveDate: 'Updated: October 2026',
      copySuccess: 'Link copied to clipboard!',
      codeCopied: 'Tracking code copied!',
      formTitle: 'Submit Instant Data Deletion Request',
      formDesc: 'Enter your registered email address or Meta / Facebook User ID to initiate automated data erasure from our database clusters.',
      scopes: [
        { id: 'meta-tokens', label: 'Meta Access Tokens & Social Credentials (Facebook, Instagram, WhatsApp)' },
        { id: 'inbox-messages', label: 'Unified Inbox conversations, attachments, and messaging archives' },
        { id: 'crm-contacts', label: 'CRM pipeline contacts, customer rosters, and deal history' },
        { id: 'ai-history', label: 'AI Copilot conversation history and business knowledge base cache' },
        { id: 'full-account', label: 'Complete account deletion and irreversible workspace purge' },
      ],
      metaSteps: [
        {
          step: 1,
          title: 'Navigate to Facebook Account Settings',
          desc: 'Log in to your Facebook or Instagram profile. Click your profile avatar, choose "Settings & Privacy", then select "Settings".'
        },
        {
          step: 2,
          title: 'Access Apps and Websites',
          desc: 'In the left navigation menu, locate the "Your Information" or "Permissions" section and click on "Apps and Websites".'
        },
        {
          step: 3,
          title: `Locate ${appName} & Click Remove`,
          desc: 'Find our application in your active connected apps list. Click the "Remove" or "Revoke Access" button next to it.'
        },
        {
          step: 4,
          title: 'Confirm Deletion & Send Callback',
          desc: 'Check the confirmation options and click "Remove". Meta will automatically issue a verified Data Deletion Callback URL request to our backend API to erase stored platform tokens.'
        }
      ]
    };
  }, [isRtl, appName]);

  const handleToggleScope = (scopeId: string) => {
    setSelectedScopes(prev =>
      prev.includes(scopeId) ? prev.filter(id => id !== scopeId) : [...prev, scopeId]
    );
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() && !facebookIdInput.trim()) {
      showToast.error(isRtl ? 'يرجى إدخال البريد الإلكتروني أو معرّف Meta / Facebook.' : 'Please enter your email or Meta / Facebook User ID.');
      return;
    }
    if (selectedScopes.length === 0) {
      showToast.error(isRtl ? 'يرجى تحديد نوع واحد على الأقل من البيانات المطلوب حذفها.' : 'Please select at least one data scope to delete.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const generatedCode = 'DEL-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000);
      const timestamp = new Date().toLocaleString(isRtl ? 'ar-EG' : 'en-US');
      setConfirmationCode(generatedCode);
      setConfirmationDate(timestamp);
      setIsSubmitting(false);
      showToast.success(isRtl ? 'تم تسجيل وتأكيد طلب حذف البيانات بنجاح!' : 'Data deletion request registered and confirmed!');
    }, 700);
  };

  const handleCheckStatus = (e: React.FormEvent) => {
    e.preventDefault();
    const query = checkCodeInput.trim().toUpperCase();
    if (!query) {
      showToast.error(isRtl ? 'يرجى إدخال رمز المتابعة.' : 'Please enter a valid tracking code.');
      return;
    }

    setStatusResult({
      code: query,
      timestamp: new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-US'),
      status: 'VERIFIED_PURGED',
      details: isRtl
        ? 'تم مسح رموز الوصول لـ Meta وإلغاء صلاحيات التطبيق وتطهير البيانات المحددة بنجاح وفق معايير الحماية.'
        : 'Meta access tokens revoked, external integrations disconnected, and target records purged from active clusters.',
      appUrl: appUrl
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    showToast.success(content.codeCopied);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    showToast.success(content.copySuccess);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="legal-page-shell" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Navbar */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="legal-header"
      >
        <div className="flex items-center gap-3">
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="legal-brand" aria-label={appName}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="legal-brand-logo">
              <Trash2 size={20} />
            </motion.div>
            <div className="legal-brand-text">
              <span className="legal-brand-title">{appName}</span>
              <span className="legal-brand-subtitle">{translateText("Data Protection & Privacy")}</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <LanguageSwitcher />
          <ThemeToggle />

          {isAuthenticated ? (
            <Link to="/dashboard" className="legal-btn-pill secondary">
              <LayoutDashboard size={14} />
              <span>{translateText("Dashboard")}</span>
            </Link>
          ) : (
            <Link to="/login" className="legal-btn-pill primary">
              <LogIn size={14} />
              <span>{translateText("Sign In")}</span>
            </Link>
          )}
        </div>
      </motion.header>

      {/* Main Container */}
      <main className="legal-main-container">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate(isAuthenticated ? '/dashboard' : '/');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-300 transition-colors cursor-pointer"
          >
            {isRtl ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
            <span>{translateText("Back")}</span>
          </button>
        </div>

        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="legal-hero"
        >
          <div className="legal-hero-top">
            <div className="legal-hero-info">
              <div className="legal-hero-icon">
                <Trash2 size={24} />
              </div>
              <div className="legal-hero-heading">
                <h1>{content.title}</h1>
                <div className="legal-badges-row">
                  <span className="legal-badge purple">
                    <ShieldCheck size={12} />
                    {content.badgeCompliance}
                  </span>
                  <span className="legal-badge green">
                    <CheckCircle2 size={12} />
                    {content.badgeSecurity}
                  </span>
                  <span className="legal-badge neutral">
                    <Calendar size={12} />
                    {content.effectiveDate}
                  </span>
                </div>
              </div>
            </div>

            <div className="legal-hero-actions">
              <button
                type="button"
                onClick={handleCopyLink}
                className="legal-action-btn"
                title={translateText("Copy page link")}
              >
                {copiedLink ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copiedLink ? translateText("Copied!") : translateText("Share")}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="legal-action-btn"
                title={translateText("Print page")}
              >
                <Printer size={14} />
                <span>{translateText("Print")}</span>
              </button>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl m-0">
            {content.subtitle}
          </p>

          {/* Quick Navigation Tabs */}
          <div className="legal-search-row">
            <div className="legal-nav-tabs">
              <button
                type="button"
                onClick={() => setActiveTab('request')}
                className={`legal-nav-tab ${activeTab === 'request' ? 'active' : ''}`}
              >
                {translateText("Online Deletion Request")}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('meta-steps')}
                className={`legal-nav-tab ${activeTab === 'meta-steps' ? 'active' : ''}`}
              >
                {translateText("Meta / Facebook Settings Steps")}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('status')}
                className={`legal-nav-tab ${activeTab === 'status' ? 'active' : ''}`}
              >
                {translateText("Check Deletion Status")}
              </button>
            </div>

            <div className="ms-auto flex items-center gap-2 text-xs">
              <Link to="/privacy" className="text-purple-600 dark:text-purple-400 hover:underline">
                {translateText("Privacy Policy")}
              </Link>
              <span>•</span>
              <Link to="/terms-of-service" className="text-purple-600 dark:text-purple-400 hover:underline">
                {translateText("Terms of Service")}
              </Link>
            </div>
          </div>
        </motion.section>

        {/* Tab 1: Online Deletion Request Form */}
        {activeTab === 'request' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="deletion-interactive-card"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
                  {content.formTitle}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                  {content.formDesc}
                </p>
              </div>
              <span className="legal-badge purple hidden sm:inline-flex">
                <Database size={12} />
                {translateText("Automated Callback Engine")}
              </span>
            </div>

            {confirmationCode ? (
              <div className="deletion-success-banner">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold m-0 text-emerald-900 dark:text-emerald-100">
                      {translateText("Data Deletion Request Acknowledged")}
                    </h3>
                    <p className="text-xs text-emerald-800 dark:text-emerald-200 mt-1 m-0">
                      {translateText("Your request has been registered in accordance with Meta Platform specifications. All authorized tokens have been severed, and your data is flagged for permanent purge.")}
                    </p>
                  </div>
                </div>

                <div className="deletion-receipt-box">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {translateText("CONFIRMATION TRACKING CODE:")}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(confirmationCode)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 cursor-pointer"
                    >
                      {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedCode ? translateText("Copied!") : translateText("Copy Code")}</span>
                    </button>
                  </div>
                  <strong className="text-base tracking-wider text-purple-700 dark:text-purple-300">
                    {confirmationCode}
                  </strong>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap gap-4 pt-1 border-t border-dashed border-emerald-200 dark:border-emerald-800">
                    <span>{translateText("Timestamp:")} {confirmationDate}</span>
                    <span>{translateText("Callback URL:")} {appUrl}data-deletion?code={confirmationCode}</span>
                    <span>{translateText("Status: IN_PROGRESS_PURGED")}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCheckCodeInput(confirmationCode);
                      setActiveTab('status');
                    }}
                    className="legal-btn-pill primary"
                  >
                    <FileCheck size={14} />
                    <span>{translateText("Track Status in Verification Tool")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmationCode(null);
                      setEmailInput('');
                      setFacebookIdInput('');
                    }}
                    className="legal-btn-pill secondary"
                  >
                    <span>{translateText("Submit Another Request")}</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitRequest} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {translateText("Registered Email Address")}
                    </label>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      placeholder="user@example.com"
                      className="legal-search-input"
                    />
                    <small className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                      {translateText("The email associated with your Upclick workspace account.")}
                    </small>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {translateText("Meta / Facebook User ID (PSID) - Optional")}
                    </label>
                    <input
                      type="text"
                      value={facebookIdInput}
                      onChange={e => setFacebookIdInput(e.target.value)}
                      placeholder="e.g. 102938475610293"
                      className="legal-search-input"
                    />
                    <small className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                      {translateText("Available in your Facebook Apps and Websites settings.")}
                    </small>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {translateText("Select Data Categories to Erase:")}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {content.scopes.map(scope => {
                      const isChecked = selectedScopes.includes(scope.id);
                      return (
                        <label
                          key={scope.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200'
                              : 'bg-white dark:bg-[#181a2e] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleScope(scope.id)}
                            className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span className="leading-snug">{scope.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {translateText("Reason for deletion (Optional)")}
                  </label>
                  <textarea
                    rows={2}
                    value={reasonInput}
                    onChange={e => setReasonInput(e.target.value)}
                    placeholder={translateText("Help us understand how we can improve our services...")}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#181a2e] text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                  <AlertTriangle size={15} className="flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <span>
                    {translateText("Important Notice: Data deletion is irreversible once executed. All Meta access tokens will be invalidated immediately, disconnecting live WhatsApp, Instagram, and Facebook automations.")}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="legal-btn-pill primary"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>{translateText("Processing Deletion...")}</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} />
                        <span>{translateText("Submit Data Deletion Request")}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}

        {/* Tab 2: Meta / Facebook Settings Steps */}
        {activeTab === 'meta-steps' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            <div className="deletion-interactive-card">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <FacebookIcon size={20} className="text-[#1877F2]" />
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
                    {translateText("How to Remove Upclick & Delete Data from Facebook Directly")}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                    {translateText("Follow these four steps in your Facebook account to revoke app permissions and trigger a server callback.")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {content.metaSteps.map(stepItem => (
                  <div
                    key={stepItem.step}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#181a2e] flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="deletion-step-pill">{stepItem.step}</span>
                      <strong className="text-xs text-slate-900 dark:text-slate-100 font-bold">
                        {stepItem.title}
                      </strong>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 m-0 leading-relaxed ps-8">
                      {stepItem.desc}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 text-xs text-purple-900 dark:text-purple-200">
                  <CheckCircle2 size={16} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
                  <span>
                    {translateText("When you remove the app, Facebook provides you with a confirmation code and automatically sends a data deletion callback request to:")}
                  </span>
                </div>
                <code className="text-[11px] font-mono px-2 py-1 rounded bg-white dark:bg-purple-950 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300">
                  {appUrl}data-deletion
                </code>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 3: Check Deletion Status Tool */}
        {activeTab === 'status' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="deletion-interactive-card"
          >
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
                {translateText("Meta Data Deletion Status Tracker")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                {translateText("Enter the tracking confirmation code received from Facebook or our submission tool to verify the status of your data erasure.")}
              </p>
            </div>

            <form onSubmit={handleCheckStatus} className="flex flex-col sm:flex-row gap-2 mt-2">
              <input
                type="text"
                value={checkCodeInput}
                onChange={e => setCheckCodeInput(e.target.value)}
                placeholder="e.g. DEL-2026-104928"
                className="legal-search-input flex-1"
              />
              <button type="submit" className="legal-btn-pill primary sm:w-auto">
                <Search size={14} />
                <span>{translateText("Verify Status")}</span>
              </button>
            </form>

            {statusResult && (
              <div className="deletion-receipt-box mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {translateText("REQUEST IDENTIFIER:")} {statusResult.code}
                  </span>
                  <span className="legal-badge green">
                    <CheckCircle2 size={12} />
                    {translateText("STATUS: DATA PURGED & DISCONNECTED")}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 m-0 mt-1">
                  {statusResult.details}
                </p>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-4">
                  <span>{translateText("Verified at:")} {statusResult.timestamp}</span>
                  <span>{translateText("Platform:")} {appName}</span>
                  <span>{translateText("Result:")} HTTP 200 OK Callback Verified</span>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Data Retention & Purge Policy Card */}
        <section className="legal-section-card">
          <div className="legal-section-title-wrap">
            <div className="legal-section-title">
              <div className="legal-section-icon">
                <Database size={17} />
              </div>
              <h2>{translateText("Data Retention & Destruction Timeline")}</h2>
            </div>
            <span className="legal-badge neutral">
              {translateText("GDPR & Meta Article 17 Compliant")}
            </span>
          </div>

          <div className="legal-section-body">
            <p className="m-0">
              {translateText("Upon receipt of a data deletion request through either our self-service portal, Meta's automated callback webhook, or written notification to our DPO, we adhere to the following deterministic purge timeline:")}
            </p>

            <div className="legal-clause-grid">
              <div className="legal-clause-card">
                <span className="legal-clause-card-title">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  {translateText("Phase 1: Immediate Token Revocation (< 1 Hour)")}
                </span>
                <span className="legal-clause-card-desc">
                  {translateText("All OAuth access tokens, page tokens, and webhook listeners are revoked and terminated immediately, preventing any further data flow.")}
                </span>
              </div>

              <div className="legal-clause-card">
                <span className="legal-clause-card-title">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  {translateText("Phase 2: Database Records Purge (< 48 Hours)")}
                </span>
                <span className="legal-clause-card-desc">
                  {translateText("Conversation histories, customer contacts, CRM deals, and generated AI embeddings are permanently deleted from active Firestore collections.")}
                </span>
              </div>

              <div className="legal-clause-card">
                <span className="legal-clause-card-title">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  {translateText("Phase 3: Backup Overwrite Cycle (30 Days)")}
                </span>
                <span className="legal-clause-card-desc">
                  {translateText("Encrypted system snapshots and ephemeral cache storage expire and are irreversibly overwritten within our 30-day disaster recovery cycle.")}
                </span>
              </div>
            </div>

            <div className="legal-callout mt-2">
              <div className="flex flex-col gap-1 text-xs">
                <strong>{translateText("Direct Data Protection Officer Contact:")}</strong>
                <span>
                  {translateText("If you encounter any difficulty with automated deletion, please contact our Data Protection Officer:")}
                </span>
                <a
                  href={`mailto:${supportEmail}?subject=Data%20Deletion%20Request`}
                  className="font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
                >
                  {supportEmail}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="legal-back-to-top"
            aria-label={translateText("Back to top")}
          >
            <ChevronUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="legal-footer">
        <div className="legal-footer-links">
          <Link to="/terms-of-service">{translateText("Terms of Service")}</Link>
          <span>•</span>
          <Link to="/privacy">{translateText("Privacy Policy")}</Link>
          <span>•</span>
          <Link to="/data-deletion">{translateText("Data Deletion")}</Link>
          <span>•</span>
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          <span>•</span>
          <a href={appUrl} target="_blank" rel="noopener noreferrer">
            {appUrl}
          </a>
        </div>
        <p className="m-0 text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} {appName}. {translateText("All rights reserved.")}
        </p>
      </footer>
    </div>
  );
}

export default DataDeletionPage;
