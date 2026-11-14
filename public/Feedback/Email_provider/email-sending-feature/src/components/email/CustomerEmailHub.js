'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { authFetch } from '@/lib/domains/client';
import { callClaudeAPI } from '../../utils/ai';
import EmailBuilderModal from '../outreach/email-builder/EmailBuilderModal';
import { PREBUILT_EMAIL_TEMPLATES } from '../outreach/email-builder/emailTemplates';
import { DEFAULT_EMAIL_THEME } from '../outreach/email-builder/defaultBlocks';
import { compileEmailHtml } from '../outreach/email-builder/emailHtmlGenerator';

export default function CustomerEmailHub({
  defaultView = 'campaigns', // 'campaigns' | 'settings'
  preselectedLead = null,
  onClearPreselectedLead = null
}) {
  const { lang, L, GC, saveGC, checkCredits } = useBusiness();
  const isRTL = lang === 'ar';

  const [subTab, setSubTab] = useState(defaultView === 'settings' ? 'settings' : 'compose'); // 'compose' | 'history' | 'settings'
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPromptTopic, setAiPromptTopic] = useState('');
  const [showAiPromptBox, setShowAiPromptBox] = useState(false);

  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', text: string }
  const [copiedRecordId, setCopiedRecordId] = useState(null);

  // Provider Settings State
  const [settings, setSettings] = useState({
    enabled: true,
    mode: 'custom_domain', // 'custom_domain' | 'email_identity'
    senderName: GC?.profile?.name || '',
    replyToEmail: '',
    verifiedSenderEmail: '',
    emailIdentityVerified: false,
    customDomain: '',
    customFromLocal: 'hello',
    customFromEmail: '',
    brandLogoUrl: '',
    footerText: '',
    domainVerified: false,
    sesIdentityVerified: false,
    dkimTokens: [],
    records: []
  });
  const [identity, setIdentity] = useState(null);
  const [awsIamConfigured, setAwsIamConfigured] = useState(true);
  const [verifyingEmailIdentity, setVerifyingEmailIdentity] = useState(false);
  const [testEmailTarget, setTestEmailTarget] = useState('');

  // Campaign Compose State
  const [campaignForm, setCampaignForm] = useState(() => {
    const firstTmpl = PREBUILT_EMAIL_TEMPLATES[0];
    const initialBlocks = firstTmpl ? firstTmpl.blocks : [];
    const initialTheme = firstTmpl?.theme || DEFAULT_EMAIL_THEME;
    const compiled = firstTmpl ? compileEmailHtml(initialBlocks, initialTheme) : '';
    return {
      campaignName: preselectedLead?.email
        ? L(`Follow-up: ${preselectedLead.name || preselectedLead.email}`, `متابعة: ${preselectedLead.name || preselectedLead.email}`)
        : '',
      subject: preselectedLead?.email
        ? L(`Hello {{name}}, quick follow-up`, `مرحباً {{name}}، متابعة سريعة`)
        : '',
      htmlBody: compiled,
      textBody: '',
      actionUrl: '',
      actionText: '',
      emailDesign: firstTmpl ? { blocks: initialBlocks, theme: initialTheme } : null
    };
  });
  const [editorMode, setEditorMode] = useState('visual'); // 'visual' | 'simple'
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  // Audience State
  const [audienceMode, setAudienceMode] = useState(preselectedLead?.email ? 'crm_select' : 'crm_all'); // 'crm_all' | 'crm_stage' | 'crm_select' | 'custom'
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('all');
  const [selectedStageKey, setSelectedStageKey] = useState('all');
  const [selectedLeadEmails, setSelectedLeadEmails] = useState(() =>
    preselectedLead?.email ? [preselectedLead.email.toLowerCase()] : []
  );
  const [customEmailsText, setCustomEmailsText] = useState('');

  // Sent Campaigns History
  const [campaignsHistory, setCampaignsHistory] = useState([]);
  const [previewCampaign, setPreviewCampaign] = useState(null);

  const showNotice = useCallback((type, text) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 5500);
  }, []);

  // If preselectedLead changes from CRM
  useEffect(() => {
    if (!preselectedLead?.email) return undefined;
    const timer = setTimeout(() => {
      setSubTab('compose');
      setAudienceMode('crm_select');
      setSelectedLeadEmails([preselectedLead.email.toLowerCase()]);
      setCampaignForm((prev) => ({
        ...prev,
        campaignName: L(
          `Follow-up: ${preselectedLead.name || preselectedLead.email}`,
          `متابعة: ${preselectedLead.name || preselectedLead.email}`
        ),
        subject:
          prev.subject ||
          L(
            `Hello {{name}}, quick follow-up from ${settings.senderName || 'us'}`,
            `مرحباً {{name}}، متابعة سريعة من ${settings.senderName || 'فريقنا'}`
          )
      }));
    }, 0);
    return () => clearTimeout(timer);
  }, [preselectedLead, L, settings.senderName]);

  const loadSettingsAndHistory = useCallback(async () => {
    try {
      const [settingsRes, histRes] = await Promise.allSettled([
        authFetch('/api/email/settings'),
        authFetch('/api/email/campaigns')
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value?.settings) {
        if (settingsRes.value.awsIamConfigured !== undefined) {
          setAwsIamConfigured(Boolean(settingsRes.value.awsIamConfigured));
        }
        const s = settingsRes.value.settings;
        const gcSaved = GC?.integrations?.emailProvider || {};
        const merged = {
          ...s,
          ...gcSaved,
          senderName: gcSaved.senderName || s.senderName || GC?.profile?.name || ''
        };
        setSettings((prev) => ({
          ...prev,
          ...merged
        }));
        setIdentity(settingsRes.value.identity || null);
        if (!testEmailTarget && merged.replyToEmail) {
          setTestEmailTarget(merged.replyToEmail);
        }
      } else if (GC?.integrations?.emailProvider) {
        setSettings((prev) => ({
          ...prev,
          ...GC.integrations.emailProvider
        }));
      }

      if (histRes.status === 'fulfilled' && Array.isArray(histRes.value?.campaigns)) {
        setCampaignsHistory(histRes.value.campaigns);
      }
    } catch (err) {
      console.warn('[CustomerEmailHub] load error:', err.message);
    } finally {
      setLoadingSettings(false);
    }
  }, [GC?.profile?.name, testEmailTarget]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSettingsAndHistory();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadSettingsAndHistory]);

  // Gather all CRM leads that have valid email addresses
  const crmWorkspaces = useMemo(() => {
    if (Array.isArray(GC?.crm?.workspaces) && GC.crm.workspaces.length > 0) {
      return GC.crm.workspaces;
    }
    return [
      {
        id: 'default',
        name: L('Default Workspace', 'مساحة العمل الافتراضية'),
        stages: [
          { key: 'new', label: L('New Lead', 'ليد جديد') },
          { key: 'contacted', label: L('Contacted', 'تم التواصل') },
          { key: 'qualified', label: L('Qualified', 'مؤهل') },
          { key: 'proposal', label: L('Proposal Sent', 'عرض أُرسل') },
          { key: 'closed', label: L('Closed Won', 'تم الإغلاق') }
        ],
        leads: GC?.crm?.leads || []
      }
    ];
  }, [GC?.crm, L]);

  const allCrmEmailLeads = useMemo(() => {
    const map = new Map();
    crmWorkspaces.forEach((ws) => {
      if (selectedWorkspaceId !== 'all' && ws.id !== selectedWorkspaceId) return;
      (ws.leads || []).forEach((lead) => {
        const email = String(lead.email || '').trim().toLowerCase();
        if (!email || !email.includes('@')) return;
        if (!map.has(email)) {
          map.set(email, {
            id: lead.id || email,
            name: lead.name || email.split('@')[0],
            email,
            phone: lead.phone || '',
            stage: lead.stage || 'new',
            workspaceId: ws.id,
            workspaceName: ws.name
          });
        }
      });
    });
    return Array.from(map.values());
  }, [crmWorkspaces, selectedWorkspaceId]);

  const availableStages = useMemo(() => {
    const stagesMap = new Map();
    crmWorkspaces.forEach((ws) => {
      if (selectedWorkspaceId !== 'all' && ws.id !== selectedWorkspaceId) return;
      (ws.stages || []).forEach((st) => {
        if (!stagesMap.has(st.key)) {
          stagesMap.set(st.key, st.label);
        }
      });
    });
    return Array.from(stagesMap.entries()).map(([key, label]) => ({ key, label }));
  }, [crmWorkspaces, selectedWorkspaceId]);

  // Compute final resolved recipients based on audienceMode
  const resolvedRecipients = useMemo(() => {
    if (audienceMode === 'crm_all') {
      return allCrmEmailLeads;
    }
    if (audienceMode === 'crm_stage') {
      if (selectedStageKey === 'all') return allCrmEmailLeads;
      return allCrmEmailLeads.filter((l) => l.stage === selectedStageKey);
    }
    if (audienceMode === 'crm_select') {
      return allCrmEmailLeads.filter((l) => selectedLeadEmails.includes(l.email));
    }
    if (audienceMode === 'custom') {
      const lines = String(customEmailsText || '')
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const list = [];
      const seen = new Set();
      lines.forEach((entry) => {
        // Support "Name <email@domain.com>" or "email@domain.com"
        const angleMatch = entry.match(/^([^<]+)<([^>]+)>$/);
        const name = angleMatch ? angleMatch[1].trim() : '';
        const email = (angleMatch ? angleMatch[2] : entry).trim().toLowerCase();
        if (email.includes('@') && !seen.has(email)) {
          seen.add(email);
          list.push({ id: email, name: name || email.split('@')[0], email });
        }
      });
      return list;
    }
    return [];
  }, [audienceMode, allCrmEmailLeads, selectedStageKey, selectedLeadEmails, customEmailsText]);

  const handleSaveSettings = async (e) => {
    e?.preventDefault?.();
    setSavingSettings(true);
    try {
      const customDomainClean = String(settings.customDomain || '')
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0];
      const customFromEmail = customDomainClean
        ? `${settings.customFromLocal || 'noreply'}@${customDomainClean}`
        : '';

      const payload = {
        ...settings,
        customDomain: customDomainClean,
        customFromEmail
      };

      const res = await authFetch('/api/email/settings', {
        method: 'PUT',
        body: payload
      });

      if (res.settings) {
        setSettings(res.settings);
        setIdentity(res.identity || null);
        if (saveGC && GC) {
          saveGC({
            ...GC,
            integrations: {
              ...(GC.integrations || {}),
              emailProviderConnected: true,
              emailProvider: res.settings
            }
          });
        }
      }

      // Sync summary into GC.integrations.emailProvider
      if (saveGC && GC) {
        saveGC({
          ...GC,
          integrations: {
            ...(GC.integrations || {}),
            emailProviderConnected: true,
            emailProvider: res.settings || payload
          }
        });
      }

      showNotice(
        'success',
        L('Sender Identity & Email Provider settings saved!', 'تم حفظ هوية المرسل وإعدادات مزود البريد بنجاح!')
      );
    } catch (err) {
      showNotice('error', err.message || L('Failed to save settings', 'فشل حفظ الإعدادات'));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleVerifyEmailAddress = async () => {
    const emailToVerify = String(settings.verifiedSenderEmail || settings.replyToEmail || '').trim().toLowerCase();
    if (!emailToVerify || !emailToVerify.includes('@')) {
      showNotice('error', L('Please enter a valid sender email address first', 'يرجى إدخال عنوان بريد المرسل أولاً'));
      return;
    }
    setVerifyingEmailIdentity(true);
    try {
      const res = await authFetch('/api/email/verify-domain', {
        method: 'POST',
        body: {
          type: 'email',
          email: emailToVerify
        }
      });

      if (res.settings) {
        setSettings(res.settings);
        setIdentity(res.identity || null);
        if (saveGC && GC) {
          saveGC({
            ...GC,
            integrations: {
              ...(GC.integrations || {}),
              emailProviderConnected: true,
              emailProvider: res.settings
            }
          });
        }
      }

      if (res.emailVerified) {
        showNotice(
          'success',
          L(
            `Email ${emailToVerify} is verified in AWS SES and ready for sending!`,
            `البريد ${emailToVerify} موثق في AWS SES وجاهز للإرسال المباشر!`
          )
        );
      } else {
        showNotice(
          'success',
          L(
            `AWS SES sent a verification link to ${emailToVerify}. Click the link in your inbox, then click Check Verification Status!`,
            `أرسل AWS SES رابط تأكيد إلى ${emailToVerify}. افتح بريدك واضغط على الرابط ثم اضغط "فحص حالة التوثيق" هنا!`
          )
        );
      }
    } catch (err) {
      showNotice('error', err.message || L('Email verification failed', 'فشل توثيق البريد الإلكتروني'));
    } finally {
      setVerifyingEmailIdentity(false);
    }
  };

  const handleVerifyDomain = async (autoConfigureDns = false) => {
    if (!settings.customDomain) {
      showNotice('error', L('Please enter your domain name first', 'يرجى إدخال اسم النطاق أولاً'));
      return;
    }
    setVerifyingDomain(true);
    try {
      const res = await authFetch('/api/email/verify-domain', {
        method: 'POST',
        body: {
          type: 'domain',
          domain: settings.customDomain,
          customFromLocal: settings.customFromLocal || 'hello',
          autoConfigureDns
        }
      });

      if (res.settings) {
        setSettings(res.settings);
        setIdentity(res.identity || null);
        if (saveGC && GC) {
          saveGC({
            ...GC,
            integrations: {
              ...(GC.integrations || {}),
              emailProviderConnected: true,
              emailProvider: res.settings
            }
          });
        }
      }

      if (res.autoConfigured && res.domainVerified) {
        showNotice(
          'success',
          L(
            `Domain ${res.domain} is verified in AWS SES and ready to send!`,
            `تم توثيق النطاق ${res.domain} في AWS SES وهو جاهز للإرسال!`
          )
        );
      } else if (res.autoConfigured) {
        showNotice(
          'success',
          L(
            'Real AWS SES DKIM records pushed to your domain DNS! AWS SES takes 1-3 minutes to confirm DNS propagation — click Verify again shortly.',
            'تمت إضافة سجلات AWS SES DKIM الحقيقية إلى DNS نطاقك بنجاح! يستغرق AWS SES من ١ إلى ٣ دقائق لاعتماد السجلات ثم اضغط فحص مرة أخرى.'
          )
        );
      } else if (res.domainVerified) {
        showNotice(
          'success',
          L(
            `Domain ${res.domain} is verified in AWS SES for sending!`,
            `النطاق ${res.domain} موثق بالكامل في AWS SES وجاهز للإرسال!`
          )
        );
      } else {
        showNotice(
          'success',
          L(
            'AWS SES registered your domain and returned the 3 DKIM records below. Add them to your DNS (or click 1-Click Auto-Setup), then click Verify again.',
            'تم تسجيل نطاقك في AWS SES وتوليد سجلات DKIM الحقيقية بالأسفل. أضفها للـ DNS (أو اضغط إعداد تلقائي) ثم اضغط فحص.'
          )
        );
      }
    } catch (err) {
      showNotice('error', err.message || L('Domain verification failed', 'فشل التحقق من النطاق'));
    } finally {
      setVerifyingDomain(false);
    }
  };

  const handleSendTestEmail = async (overrideEmail, overrideHtml) => {
    const targetEmail = String(overrideEmail || testEmailTarget || settings.replyToEmail || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      showNotice('error', L('Enter a valid email address for the test', 'أدخل بريداً إلكترونياً صالحاً للاختبار'));
      return;
    }

    setSendingEmail(true);
    try {
      const res = await authFetch('/api/email/send', {
        method: 'POST',
        body: {
          isTest: true,
          campaignName: 'Sender Identity Test',
          subject: campaignForm.subject || L(`[Test] Email from ${settings.senderName || 'Your Brand'}`, `[تجربة] رسالة من ${settings.senderName || 'علامتك التجارية'}`),
          htmlBody:
            overrideHtml ||
            campaignForm.htmlBody ||
            `<p>${L('Hello {{name}}, your UpKlick AWS SES sender identity is working properly!', 'مرحباً {{name}}، هوية الإرسال الخاصة بك عبر UpKlick AWS SES تعمل بنجاح!')}</p>`,
          recipients: [{ name: settings.senderName || 'Test User', email: targetEmail }],
          settings,
          senderOverrides: {
            fromName: settings.senderName,
            replyTo: settings.replyToEmail
          }
        }
      });

      showNotice(
        'success',
        L(
          `Test email sent to ${targetEmail} as ${res.senderIdentity?.displayFrom || settings.senderName}!`,
          `تم إرسال البريد التجريبي إلى ${targetEmail} باسم ${res.senderIdentity?.displayFrom || settings.senderName}!`
        )
      );
      return res;
    } catch (err) {
      showNotice('error', err.message || L('Failed to send test email', 'فشل إرسال البريد التجريبي'));
      throw err;
    } finally {
      setSendingEmail(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (!aiPromptTopic.trim()) return;
    if (checkCredits && !checkCredits(5)) return;

    setAiGenerating(true);
    try {
      const bizName = settings.senderName || GC?.profile?.name || 'Our Brand';
      const bizDesc = GC?.profile?.desc || '';
      const bizOffer = GC?.profile?.offer?.name || '';
      const prompt = isRTL
        ? `اكتب رسالة بريد إلكتروني تسويقية احترافية وعالية التحويل لصالح "${bizName}" (${bizDesc} - العرض: ${bizOffer}).
موضوع الرسالة المطلوب: "${aiPromptTopic}"
أرجع النتيجة بصيغة JSON فقط بدون أي نص إضافي بهذا الشكل:
{"subject": "عنوان البريد الجذاب مع {{name}}", "htmlBody": "<p>محتوى البريد المنسق بـ HTML مع استخدام {{name}} والفقرات الواضحة</p>", "actionText": "نص زر الدعوة لاتخاذ إجراء"}`
        : `Write a high-converting marketing email for "${bizName}" (${bizDesc} - Offer: ${bizOffer}).
Topic / Goal: "${aiPromptTopic}"
Return ONLY valid JSON in this exact format:
{"subject": "Compelling subject line with {{name}}", "htmlBody": "<p>Well-formatted HTML email body using {{name}} and clear paragraphs</p>", "actionText": "CTA Button Text"}`;

      const system = isRTL
        ? 'أنت خبير تسويق عبر البريد الإلكتروني (Email Copywriter). أجب بـ JSON صالح فقط.'
        : 'You are an expert email marketing copywriter. Respond with valid JSON only.';

      const raw = await callClaudeAPI(prompt, system, lang, GC, 'Email Campaign AI Writer', null, 5);
      const jsonMatch = String(raw || '').match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setEditorMode('simple');
        setCampaignForm((prev) => ({
          ...prev,
          subject: parsed.subject || prev.subject,
          htmlBody: parsed.htmlBody || prev.htmlBody,
          actionText: parsed.actionText || prev.actionText
        }));
      } else {
        setEditorMode('simple');
        setCampaignForm((prev) => ({
          ...prev,
          htmlBody: `<div style="line-height:1.8">${String(raw || '').replace(/\n/g, '<br/>')}</div>`
        }));
      }
      setShowAiPromptBox(false);
      setAiPromptTopic('');
      showNotice('success', L('AI email copy generated!', 'تمت كتابة البريد بالذكاء الاصطناعي بنجاح!'));
    } catch (err) {
      showNotice('error', L('Could not generate AI email copy', 'تعذر توليد البريد بالذكاء الاصطناعي'));
    } finally {
      setAiGenerating(false);
    }
  };

  const handleLaunchCampaign = async () => {
    if (!campaignForm.subject.trim()) {
      showNotice('error', L('Please enter an email subject line', 'يرجى إدخال عنوان الرسالة (Subject)'));
      return;
    }
    if (!campaignForm.htmlBody.trim() && !campaignForm.textBody.trim()) {
      showNotice('error', L('Please design or write your email content', 'يرجى تصميم أو كتابة محتوى البريد الإلكتروني'));
      return;
    }
    if (resolvedRecipients.length === 0) {
      showNotice('error', L('Please select at least 1 recipient with an email address', 'يرجى اختيار مستلم واحد على الأقل لديه بريد إلكتروني'));
      return;
    }

    // Cost: 1 credit per recipient (minimum 1 credit)
    const creditCost = Math.max(1, resolvedRecipients.length);
    if (checkCredits && !checkCredits(creditCost)) {
      return;
    }

    setSendingEmail(true);
    try {
      const res = await authFetch('/api/email/send', {
        method: 'POST',
        body: {
          isTest: false,
          campaignName: campaignForm.campaignName || campaignForm.subject,
          subject: campaignForm.subject,
          htmlBody: campaignForm.htmlBody,
          textBody: campaignForm.textBody,
          actionUrl: campaignForm.actionUrl,
          actionText: campaignForm.actionText,
          emailDesign: campaignForm.emailDesign,
          recipients: resolvedRecipients,
          settings,
          senderOverrides: {
            fromName: settings.senderName,
            replyTo: settings.replyToEmail
          }
        }
      });

      if (res.campaign) {
        setCampaignsHistory((prev) => [res.campaign, ...prev]);
      }

      showNotice(
        'success',
        L(
          `Campaign sent to ${res.sent} recipient(s) from ${res.senderIdentity?.displayFrom || settings.senderName}!`,
          `تم إرسال الحملة بنجاح إلى ${res.sent} مستلم باسم ${res.senderIdentity?.displayFrom || settings.senderName}!`
        )
      );

      if (onClearPreselectedLead) onClearPreselectedLead();
    } catch (err) {
      showNotice('error', err.message || L('Failed to send campaign', 'فشل إرسال الحملة البريدية'));
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDeleteCampaign = async (id) => {
    try {
      await authFetch(`/api/email/campaigns?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      setCampaignsHistory((prev) => prev.filter((c) => c.id !== id));
      showNotice('success', L('Campaign deleted', 'تم حذف الحملة'));
    } catch (err) {
      showNotice('error', err.message);
    }
  };

  const handleCopyRecord = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedRecordId(id);
    setTimeout(() => setCopiedRecordId(null), 2000);
  };

  const totalSentCount = useMemo(
    () => campaignsHistory.reduce((acc, c) => acc + (Number(c.sent) || 0), 0),
    [campaignsHistory]
  );

  const effectiveDisplayFrom = useMemo(() => {
    const sName = settings.senderName || GC?.profile?.name || 'Your Business';
    const addr =
      settings.mode === 'email_identity'
        ? settings.verifiedSenderEmail || settings.replyToEmail
        : settings.customDomain
          ? `${settings.customFromLocal || 'hello'}@${settings.customDomain}`
          : settings.customFromEmail || settings.replyToEmail;
    return addr ? `"${sName}" <${addr}>` : sName;
  }, [settings, GC?.profile?.name]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Status & Sender Identity Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.1), rgba(108, 53, 255, 0.12))',
          border: '1px solid rgba(255, 107, 53, 0.28)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          padding: '18px 20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #FF6B35, #6C35FF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              boxShadow: '0 8px 20px rgba(255, 107, 53, 0.3)'
            }}
          >
            📨
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--t1)' }}>
                {L('UpKlick Email Provider (Powered by AWS SES)', 'مزود البريد السحابي UpKlick (مدعوم بـ AWS SES)')}
              </span>
              <span className="badge b-green" style={{ fontSize: '10.5px' }}>
                {settings.mode === 'custom_domain' && settings.domainVerified
                  ? `✓ ${L('Domain Verified in AWS SES', 'النطاق موثق في AWS SES')}`
                  : settings.mode === 'email_identity' && settings.emailIdentityVerified
                    ? `✓ ${L('Email Verified in AWS SES', 'البريد موثق في AWS SES')}`
                    : `⏳ ${L('Pending AWS SES Verification', 'بانتظار التوثيق في AWS SES')}`}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--t2)', marginTop: '4px', direction: 'ltr', textAlign: isRTL ? 'right' : 'left' }}>
              <strong>From:</strong> {effectiveDisplayFrom}
              {settings.replyToEmail ? `  •  Reply-To: ${settings.replyToEmail}` : ''}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${subTab === 'compose' ? 'btn-prime' : 'btn-ghost'}`}
            onClick={() => setSubTab('compose')}
            style={{ fontSize: '12.5px', padding: '8px 14px' }}
          >
            ✉️ {L('Compose Campaign', 'إنشاء حملة بريدية')}
          </button>
          <button
            type="button"
            className={`btn ${subTab === 'history' ? 'btn-prime' : 'btn-ghost'}`}
            onClick={() => setSubTab('history')}
            style={{ fontSize: '12.5px', padding: '8px 14px' }}
          >
            📊 {L('Sent Campaigns', 'الحملات المرسلة')} ({campaignsHistory.length})
          </button>
          <button
            type="button"
            className={`btn ${subTab === 'settings' ? 'btn-prime' : 'btn-ghost'}`}
            onClick={() => setSubTab('settings')}
            style={{ fontSize: '12.5px', padding: '8px 14px' }}
          >
            ⚙️ {L('Sender & Domain Settings', 'هوية المرسل والنطاق')}
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            background: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.14)' : 'rgba(16, 185, 129, 0.14)',
            border: `1px solid ${feedback.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
            color: feedback.type === 'error' ? '#f87171' : '#34d399',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Row */}
      <div className="g4">
        <div className="stat-card">
          <div className="stat-lbl">📬 {L('Emails Delivered', 'إجمالي الرسائل المرسلة')}</div>
          <div className="stat-val ch-up">{totalSentCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">🚀 {L('Campaigns Sent', 'الحملات المطلقة')}</div>
          <div className="stat-val">{campaignsHistory.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">👥 {L('CRM Email Contacts', 'جهات اتصال البريد بـ CRM')}</div>
          <div className="stat-val">{allCrmEmailLeads.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">🛡️ {L('SES Reputation', 'حالة مزود AWS SES')}</div>
          <div className="stat-val" style={{ fontSize: '15px', color: 'var(--green)' }}>
            {L('Protected (DKIM/SPF)', 'محمي (DKIM/SPF)')}
          </div>
        </div>
      </div>

      {/* ==================== SUB-TAB 1: SENDER & DOMAIN SETTINGS ==================== */}
      {subTab === 'settings' && (
        <div className="g2">
          {/* Left Column: Brand & Sender Identity */}
          <div className="card">
            <div className="sec-hd">
              <div className="sec-title">🪪 {L('Your Brand Sender Identity', 'هوية المرسل الخاصة بعلامتك التجارية')}</div>
            </div>
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--t2)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  {L('White-Label Verification Method', 'طريقة توثيق هوية الإرسال الخاصة بك')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, mode: 'custom_domain' }))}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: settings.mode === 'custom_domain' ? '2px solid var(--orange)' : '1px solid var(--edge)',
                      background: settings.mode === 'custom_domain' ? 'rgba(255, 107, 53, 0.1)' : 'var(--surface2)',
                      color: 'var(--t1)',
                      cursor: 'pointer',
                      textAlign: isRTL ? 'right' : 'left'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '12.5px', marginBottom: '4px' }}>
                      🌐 {L('Custom Domain (@yourdomain)', 'دومين خاص (@yourdomain)')}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--t2)' }}>
                      {L(
                        'Verify your domain via DNS (DKIM) and send from any address on your domain.',
                        'وثق نطاقك عبر DNS (DKIM) وأرسل من أي عنوان على دومينك الخاص.'
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, mode: 'email_identity' }))}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: settings.mode === 'email_identity' ? '2px solid var(--orange)' : '1px solid var(--edge)',
                      background: settings.mode === 'email_identity' ? 'rgba(255, 107, 53, 0.1)' : 'var(--surface2)',
                      color: 'var(--t1)',
                      cursor: 'pointer',
                      textAlign: isRTL ? 'right' : 'left'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '12.5px', marginBottom: '4px' }}>
                      📧 {L('Verify Single Email (No DNS)', 'توثيق إيميل مباشر (بدون DNS)')}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--t2)' }}>
                      {L(
                        'Receive a 1-click verification link in your inbox and send directly from your email.',
                        'استلم رابط تأكيد على بريدك الإلكتروني وأرسل منه مباشرة بدون إعدادات DNS.'
                      )}
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
                  {L('Sender / Business Name (Displayed in recipient inbox)', 'اسم المرسل / النشاط التجاري (يظهر في صندوق وارد العميل)')}
                </label>
                <input
                  className="inp"
                  placeholder={L('e.g. Ahmed Coaching Academy', 'مثال: أكاديمية أحمد للتدريب')}
                  value={settings.senderName}
                  onChange={(e) => setSettings((s) => ({ ...s, senderName: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
                  {L('Reply-To Email Address (Where customer replies go)', 'بريد تلقي الردود (Reply-To — تصل إليه ردود عملائك مباشرة)')}
                </label>
                <input
                  className="inp"
                  type="email"
                  dir="ltr"
                  placeholder="you@yourdomain.com / yourname@gmail.com"
                  value={settings.replyToEmail}
                  onChange={(e) => setSettings((s) => ({ ...s, replyToEmail: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
                  {L('Brand Logo URL (Optional — shown at top of standard emails)', 'رابط شعار علامتك التجارية (اختياري — يظهر أعلى رسائلك)')}
                </label>
                <input
                  className="inp"
                  dir="ltr"
                  placeholder="https://..."
                  value={settings.brandLogoUrl}
                  onChange={(e) => setSettings((s) => ({ ...s, brandLogoUrl: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
                  {L('Custom Email Footer Text', 'نص تذييل البريد الإلكتروني (Footer)')}
                </label>
                <input
                  className="inp"
                  placeholder={L(
                    `© ${new Date().getFullYear()} ${settings.senderName || 'Your Company'} · All rights reserved`,
                    `© ${new Date().getFullYear()} ${settings.senderName || 'شركتك'} · جميع الحقوق محفوظة`
                  )}
                  value={settings.footerText}
                  onChange={(e) => setSettings((s) => ({ ...s, footerText: e.target.value }))}
                />
              </div>

              <button
                type="submit"
                className="btn btn-prime"
                disabled={savingSettings}
                style={{ justifyContent: 'center', marginTop: '4px' }}
              >
                {savingSettings
                  ? L('Saving...', 'جاري الحفظ...')
                  : `💾 ${L('Save Sender Identity', 'حفظ هوية المرسل')}`}
              </button>
            </form>

            {/* Quick Test Box */}
            <div
              style={{
                marginTop: '18px',
                paddingTop: '16px',
                borderTop: '1px solid var(--edge)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--t1)' }}>
                🧪 {L('Send a Quick Test Email', 'إرسال بريد تجريبي للتأكد من الإعدادات')}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="inp"
                  type="email"
                  dir="ltr"
                  placeholder={L('Recipient email for test...', 'أدخل بريدك لاستلام التجربة...')}
                  value={testEmailTarget}
                  onChange={(e) => setTestEmailTarget(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={sendingEmail}
                  onClick={() => handleSendTestEmail(testEmailTarget)}
                >
                  {sendingEmail ? L('Sending...', 'جاري الإرسال...') : `🚀 ${L('Send Test', 'إرسال تجربة')}`}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Custom Domain OR Single Email AWS SES Verification */}
          <div className="card">
            {!awsIamConfigured && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.14)',
                  border: '1px solid rgba(245, 158, 11, 0.45)',
                  color: '#fbbf24',
                  fontSize: '12px',
                  lineHeight: 1.6,
                  marginBottom: '14px'
                }}
              >
                ⚠️ <strong>{L('AWS IAM Keys Required for Auto-Registration:', 'مطلوب مفاتيح AWS IAM لتسجيل النطاقات تلقائياً في AWS SES:')}</strong>
                <div style={{ marginTop: '4px', color: 'var(--t1)' }}>
                  {L(
                    'SMTP_USER & SMTP_PASSWORD only send emails. To automatically register new customer domains/emails inside AWS SES (EU-NORTH-1), add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to your .env.local.',
                    'متغيرات SMTP_USER و SMTP_PASSWORD مخصصة للإرسال فقط. لكي يقوم النظام بتسجيل دومينات وإيميلات العملاء تلقائياً داخل AWS SES (EU-NORTH-1)، أضف AWS_ACCESS_KEY_ID و AWS_SECRET_ACCESS_KEY في ملف .env.local.'
                  )}
                </div>
              </div>
            )}

            {settings.mode === 'email_identity' ? (
              <>
                <div className="sec-hd" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="sec-title">📧 {L('Verify Sender Email Address (No DNS)', 'توثيق عنوان بريد المرسل مباشرة (بدون DNS)')}</div>
                  <span className={`badge ${settings.emailIdentityVerified ? 'b-green' : 'b-ai'}`}>
                    {settings.emailIdentityVerified ? L('Verified in SES', 'موثق في SES') : L('Unverified', 'غير موثق بعد')}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--t2)', lineHeight: 1.6, marginBottom: '12px' }}>
                  {L(
                    'Enter the exact email address you want to send from. AWS SES will send an email with a confirmation link to that inbox. Once clicked, you can send directly from it!',
                    'أدخل البريد الإلكتروني الذي تريد الإرسال منه. سيقوم AWS SES بإرسال رسالة تحتوي على رابط تأكيد إلى هذا البريد؛ بمجرد الضغط عليه يمكنك الإرسال منه مباشرة!'
                  )}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
                      {L('Sender Email Address', 'عنوان البريد الإلكتروني للمرسل')}
                    </label>
                    <input
                      className="inp"
                      type="email"
                      dir="ltr"
                      placeholder="mohamed@mohamed-yasmin-wedding.world"
                      value={settings.verifiedSenderEmail || settings.replyToEmail || ''}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          verifiedSenderEmail: e.target.value,
                          customFromEmail: e.target.value
                        }))
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-prime"
                    disabled={verifyingEmailIdentity}
                    onClick={handleVerifyEmailAddress}
                    style={{ justifyContent: 'center' }}
                  >
                    {verifyingEmailIdentity
                      ? L('Contacting AWS SES...', 'جاري التواصل مع AWS SES...')
                      : `📨 ${L('Send Verification Link / Check Status', 'إرسال رابط التوثيق للبريد / فحص الحالة')}`}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="sec-hd" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="sec-title">🌐 {L('Custom Domain White-Label (AWS SES DKIM)', 'ربط وتوثيق نطاقك الخاص (AWS SES DKIM)')}</div>
                  <span className={`badge ${settings.domainVerified ? 'b-green' : 'b-ai'}`}>
                    {settings.domainVerified ? L('Verified in AWS SES', 'موثق في AWS SES') : L('Pending SES Verification', 'قيد التوثيق في SES')}
                  </span>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--t2)', lineHeight: 1.6, marginBottom: '12px' }}>
                  {L(
                    'Send 100% from your own domain (e.g. hello@yourdomain.com) with zero UpKlick branding. Enter your domain below to register it in AWS SES and get your DKIM records.',
                    'أرسل من نطاقك الخاص بالكامل (مثل hello@yourdomain.com) بدون أي ذكر لـ UpKlick. أدخل نطاقك بالأسفل لتسجيله في AWS SES وتوليد سجلات DKIM.'
                  )}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
                        {L('Sender Prefix', 'اسم صندوق البريد')}
                      </label>
                      <input
                        className="inp"
                        dir="ltr"
                        placeholder="hello / info / noreply"
                        value={settings.customFromLocal || 'hello'}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            customFromLocal: e.target.value.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase()
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11.5px', color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
                        {L('Your Domain Name', 'اسم النطاق (الدومين)')}
                      </label>
                      <input
                        className="inp"
                        dir="ltr"
                        placeholder="yourdomain.com"
                        value={settings.customDomain}
                        onChange={(e) => setSettings((s) => ({ ...s, customDomain: e.target.value }))}
                      />
                    </div>
                  </div>

                  {settings.customDomain && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--t2)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'var(--surface2)',
                        direction: 'ltr'
                      }}
                    >
                      Sender Address: <strong>{`${settings.customFromLocal || 'hello'}@${settings.customDomain}`}</strong>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-prime"
                      disabled={verifyingDomain}
                      onClick={() => handleVerifyDomain(false)}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      {verifyingDomain
                        ? L('Checking AWS SES...', 'جاري الفحص في AWS SES...')
                        : `🔍 ${L('Generate / Verify in AWS SES', 'توليد وفحص التوثيق في AWS SES')}`}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={verifyingDomain || !settings.customDomain}
                      onClick={() => handleVerifyDomain(true)}
                      title={L(
                        'If you purchased this domain inside UpKlick, click here to automatically add all AWS SES DNS records!',
                        'إذا قمت بشراء هذا الدومين من داخل UpKlick، اضغط هنا لإضافة سجلات البريد الحقيقية من AWS SES تلقائياً!'
                      )}
                    >
                      ⚡ {L('1-Click Auto-Setup DNS', 'إعداد تلقائي بنقرة واحدة')}
                    </button>
                  </div>

                  {/* DNS Records Table */}
                  {Array.isArray(settings.records) && settings.records.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t1)', marginBottom: '8px' }}>
                        📋 {L('AWS SES DNS Records for your domain:', 'سجلات AWS SES DNS الخاصة بنطاقك:')}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                        {settings.records.map((rec) => (
                          <div
                            key={rec.id}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '10px',
                              background: 'var(--surface2)',
                              border: `1px solid ${rec.verified ? 'rgba(16, 185, 129, 0.35)' : 'var(--edge)'}`,
                              fontSize: '11.5px',
                              direction: 'ltr'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 700, color: 'var(--orange)' }}>
                                [{rec.type}] {rec.purpose}
                              </span>
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  color: rec.verified ? '#34d399' : '#fbbf24'
                                }}
                              >
                                {rec.verified ? '✓ Propagated in DNS' : '⏳ Pending DNS'}
                              </span>
                            </div>
                            <div style={{ color: 'var(--t2)', wordBreak: 'break-all', marginBottom: '4px' }}>
                              <strong>Host / Name:</strong> {rec.host}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                              <div style={{ color: 'var(--t1)', wordBreak: 'break-all', flex: 1 }}>
                                <strong>Value:</strong> {rec.value}
                              </div>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ fontSize: '10.5px', padding: '3px 8px', flexShrink: 0 }}
                                onClick={() => handleCopyRecord(rec.id, rec.value)}
                              >
                                {copiedRecordId === rec.id ? '✓ Copied' : 'Copy'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 2: COMPOSE & LAUNCH CAMPAIGN ==================== */}
      {subTab === 'compose' && (
        <div className="g2">
          {/* Left Column: Campaign Setup + Email Content */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="sec-hd" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="sec-title">✍️ {L('1. Compose Your Email Campaign', '١. إعداد وتصميم الحملة البريدية')}</div>
              <button
                type="button"
                className="btn-ai"
                onClick={() => setShowAiPromptBox(!showAiPromptBox)}
                style={{ fontSize: '11.5px', padding: '5px 10px' }}
              >
                ✨ {L('Write with AI', 'كتابة بالذكاء الاصطناعي')}
              </button>
            </div>

            {showAiPromptBox && (
              <div
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(108, 53, 255, 0.1)',
                  border: '1px solid rgba(108, 53, 255, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t1)' }}>
                  🤖 {L('What is this email about?', 'ما هو هدف أو موضوع هذه الرسالة البريدية؟')}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="inp"
                    placeholder={L(
                      'e.g. Special 30% discount on our coaching program for 48 hours...',
                      'مثال: خصم خاص ٣٠٪ على البرنامج التدريبي لمدة ٤٨ ساعة...'
                    )}
                    value={aiPromptTopic}
                    onChange={(e) => setAiPromptTopic(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-prime"
                    disabled={aiGenerating}
                    onClick={handleGenerateWithAI}
                  >
                    {aiGenerating ? L('Writing...', 'جاري الكتابة...') : L('Generate (5 Credits)', 'توليد (5 نقاط)')}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
                {L('Campaign Internal Name', 'اسم الحملة (للتنظيم الداخلي)')}
              </label>
              <input
                className="inp"
                placeholder={L('e.g. November Offer Launch', 'مثال: حملة إطلاق عرض نوفمبر')}
                value={campaignForm.campaignName}
                onChange={(e) => setCampaignForm((f) => ({ ...f, campaignName: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
                {L('Email Subject Line (Supports {{name}})', 'عنوان البريد الإلكتروني — Subject (يدعم {{name}})')}
              </label>
              <input
                className="inp"
                placeholder={L('e.g. Special invitation for you, {{name}} 🚀', 'مثال: دعوة خاصة لك يا {{name}} 🚀')}
                value={campaignForm.subject}
                onChange={(e) => setCampaignForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>

            {/* Editor Mode Switcher */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className={`btn ${editorMode === 'visual' ? 'btn-prime' : 'btn-ghost'}`}
                  style={{ fontSize: '11.5px', padding: '5px 12px' }}
                  onClick={() => setEditorMode('visual')}
                >
                  🎨 {L('Visual Email Builder', 'المصمم المرئي الاحترافي')}
                </button>
                <button
                  type="button"
                  className={`btn ${editorMode === 'simple' ? 'btn-prime' : 'btn-ghost'}`}
                  style={{ fontSize: '11.5px', padding: '5px 12px' }}
                  onClick={() => setEditorMode('simple')}
                >
                  📝 {L('Simple Text / HTML', 'محرر نصي سريع')}
                </button>
              </div>

              {editorMode === 'visual' && (
                <button
                  type="button"
                  className="btn btn-prime"
                  onClick={() => setIsBuilderOpen(true)}
                  style={{ fontSize: '12px', padding: '6px 14px', background: 'linear-gradient(135deg, #FF6B35, #6C35FF)' }}
                >
                  ✨ {L('Open Fullscreen Visual Builder', 'فتح مصمم البريد المرئي الكامل')}
                </button>
              )}
            </div>

            {editorMode === 'visual' ? (
              <div
                style={{
                  border: '1px solid var(--edge)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#090912',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    padding: '8px 12px',
                    background: 'var(--surface2)',
                    borderBottom: '1px solid var(--edge)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11.5px',
                    color: 'var(--t2)'
                  }}
                >
                  <span>👁️ {L('Live Email Design Preview', 'معاينة حية لتصميم البريد')}</span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: '11px', padding: '3px 10px' }}
                    onClick={() => setIsBuilderOpen(true)}
                  >
                    ✏️ {L('Edit Design / Change Template', 'تعديل التصميم أو تغيير القالب')}
                  </button>
                </div>
                <iframe
                  title="Email Preview"
                  srcDoc={campaignForm.htmlBody}
                  style={{ width: '100%', height: '320px', border: 'none', background: '#090912' }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
                  {L('Available variables:', 'المتغيرات المتاحة:')} <code>{'{{name}}'}</code>, <code>{'{{email}}'}</code>, <code>{'{{company}}'}</code>
                </div>
                <textarea
                  className="inp"
                  rows="8"
                  placeholder={L('Write your email message here...', 'اكتب محتوى رسالتك البريدية هنا...')}
                  value={campaignForm.htmlBody}
                  onChange={(e) => setCampaignForm((f) => ({ ...f, htmlBody: e.target.value }))}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    className="inp"
                    placeholder={L('CTA Button Text (Optional)', 'نص زر الرابط (اختياري)')}
                    value={campaignForm.actionText}
                    onChange={(e) => setCampaignForm((f) => ({ ...f, actionText: e.target.value }))}
                  />
                  <input
                    className="inp"
                    dir="ltr"
                    placeholder={L('CTA Link https://... (Optional)', 'رابط الزر https://... (اختياري)')}
                    value={campaignForm.actionUrl}
                    onChange={(e) => setCampaignForm((f) => ({ ...f, actionUrl: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Audience Selection + Launch */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="sec-hd">
              <div className="sec-title">👥 {L('2. Select Audience & Send', '٢. اختيار المستلمين والإرسال')}</div>
            </div>

            {preselectedLead && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px'
                }}
              >
                <span>
                  🎯 {L('Sending to CRM Lead:', 'إرسال مباشر للعميل:')} <strong>{preselectedLead.name}</strong> ({preselectedLead.email})
                </span>
                {onClearPreselectedLead && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: '10.5px', padding: '2px 8px' }}
                    onClick={onClearPreselectedLead}
                  >
                    {L('Switch to All Leads', 'عرض كل العملاء')}
                  </button>
                )}
              </div>
            )}

            {/* Audience Source Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { id: 'crm_all', label: L(`All CRM Contacts (${allCrmEmailLeads.length})`, `كل عملاء CRM (${allCrmEmailLeads.length})`), icon: '👥' },
                { id: 'crm_stage', label: L('Filter by CRM Stage', 'حسب مرحلة القمع (Stage)'), icon: '🎯' },
                { id: 'crm_select', label: L('Pick Specific Leads', 'تحديد عملاء معينين'), icon: '☑️' },
                { id: 'custom', label: L('Paste Custom Emails', 'إدخال إيميلات يدوياً'), icon: '📋' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAudienceMode(opt.id)}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    border: audienceMode === opt.id ? '2px solid var(--orange)' : '1px solid var(--edge)',
                    background: audienceMode === opt.id ? 'rgba(255, 107, 53, 0.12)' : 'var(--surface2)',
                    color: 'var(--t1)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: isRTL ? 'right' : 'left'
                  }}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>

            {/* Workspace Filter for CRM modes */}
            {audienceMode !== 'custom' && crmWorkspaces.length > 1 && (
              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
                  {L('CRM Workspace', 'مساحة عمل CRM')}
                </label>
                <select
                  className="inp"
                  value={selectedWorkspaceId}
                  onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                >
                  <option value="all">{L('All Workspaces', 'كل مساحات العمل')}</option>
                  {crmWorkspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Stage Filter */}
            {audienceMode === 'crm_stage' && (
              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
                  {L('Select Pipeline Stage', 'اختر مرحلة العميل')}
                </label>
                <select
                  className="inp"
                  value={selectedStageKey}
                  onChange={(e) => setSelectedStageKey(e.target.value)}
                >
                  <option value="all">{L('All Stages', 'جميع المراحل')}</option>
                  {availableStages.map((st) => (
                    <option key={st.key} value={st.key}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Pick Specific Leads */}
            {audienceMode === 'crm_select' && (
              <div
                style={{
                  maxHeight: '190px',
                  overflowY: 'auto',
                  border: '1px solid var(--edge)',
                  borderRadius: '10px',
                  padding: '8px',
                  background: 'var(--surface2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                {allCrmEmailLeads.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--t3)', textAlign: 'center', padding: '16px' }}>
                    {L('No CRM leads with email addresses found yet.', 'لا يوجد عملاء ببريد إلكتروني في CRM حالياً.')}
                  </div>
                ) : (
                  allCrmEmailLeads.map((lead) => {
                    const checked = selectedLeadEmails.includes(lead.email);
                    return (
                      <label
                        key={lead.email}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '12px',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          background: checked ? 'rgba(255, 107, 53, 0.12)' : 'transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLeadEmails((prev) => [...prev, lead.email]);
                            } else {
                              setSelectedLeadEmails((prev) => prev.filter((em) => em !== lead.email));
                            }
                          }}
                        />
                        <span style={{ fontWeight: 600, color: 'var(--t1)' }}>{lead.name}</span>
                        <span style={{ color: 'var(--t2)', fontSize: '11px', direction: 'ltr' }}>({lead.email})</span>
                      </label>
                    );
                  })
                )}
              </div>
            )}

            {/* Custom Emails Textarea */}
            {audienceMode === 'custom' && (
              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
                  {L(
                    'Enter one email per line (or "Ahmed <ahmed@domain.com>")',
                    'أدخل بريداً إلكترونياً في كل سطر (أو بصيغة "Ahmed <ahmed@domain.com>")'
                  )}
                </label>
                <textarea
                  className="inp"
                  rows="5"
                  dir="ltr"
                  placeholder={'client1@example.com\nSara <sara@company.com>'}
                  value={customEmailsText}
                  onChange={(e) => setCustomEmailsText(e.target.value)}
                />
              </div>
            )}

            {/* Summary Box before Launch */}
            <div
              style={{
                marginTop: 'auto',
                padding: '14px',
                borderRadius: '12px',
                background: 'var(--surface2)',
                border: '1px solid var(--edge)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--t2)' }}>{L('Sending From:', 'يُرسل باسم:')}</span>
                <strong style={{ color: 'var(--t1)', direction: 'ltr' }}>{effectiveDisplayFrom}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--t2)' }}>{L('Reply-To Inbox:', 'بريد تلقي الردود:')}</span>
                <strong style={{ color: 'var(--t1)', direction: 'ltr' }}>
                  {settings.replyToEmail || L('Not set (click Sender Settings)', 'غير محدد (اضبطه من هوية المرسل)')}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--t2)' }}>{L('Total Recipients:', 'إجمالي المستلمين:')}</span>
                <strong style={{ color: 'var(--green)' }}>
                  {resolvedRecipients.length} {L('recipient(s)', 'مستلم')}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--t2)' }}>{L('Estimated Cost:', 'التكلفة التقديرية:')}</span>
                <strong style={{ color: 'var(--orange)' }}>
                  {Math.max(1, resolvedRecipients.length)} {L('Credits', 'نقطة رصيد')}
                </strong>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-prime"
              disabled={sendingEmail || resolvedRecipients.length === 0}
              onClick={handleLaunchCampaign}
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 700
              }}
            >
              {sendingEmail
                ? L('Sending via AWS SES...', 'جاري الإرسال عبر AWS SES...')
                : `🚀 ${L(`Send Campaign Now (${resolvedRecipients.length})`, `إرسال الحملة الآن (${resolvedRecipients.length} مستلم)`)}`}
            </button>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 3: SENT CAMPAIGNS HISTORY ==================== */}
      {subTab === 'history' && (
        <div className="card">
          <div className="sec-hd" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="sec-title">📊 {L('Sent Email Campaigns Log', 'سجل الحملات البريدية المرسلة')}</div>
            <button type="button" className="btn btn-ghost" style={{ fontSize: '11.5px' }} onClick={loadSettingsAndHistory}>
              🔄 {L('Refresh', 'تحديث')}
            </button>
          </div>

          {campaignsHistory.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <div className="es-icon">📭</div>
              <div className="es-title">{L('No email campaigns sent yet', 'لم يتم إرسال أي حملة بريدية بعد')}</div>
              <div className="es-sub">
                {L(
                  'Compose your first email campaign and send it to your CRM leads using your brand identity.',
                  'أنشئ حملتك البريدية الأولى وأرسلها لعملائك في CRM بهويتك التجارية.'
                )}
              </div>
              <button type="button" className="btn btn-prime" onClick={() => setSubTab('compose')}>
                ✉️ {L('Create First Campaign', 'إنشاء أول حملة بريدية')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {campaignsHistory.map((camp) => (
                <div
                  key={camp.id}
                  className="row"
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'var(--surface2)',
                    border: '1px solid var(--edge)'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--t1)' }}>{camp.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--t2)', marginTop: '2px' }}>
                      {L('Subject:', 'العنوان:')} {camp.subject}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '4px', direction: 'ltr' }}>
                      From: {camp.fromName} &lt;{camp.fromEmail}&gt; • {new Date(camp.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span className="badge b-green">
                      ✓ {camp.sent} {L('Sent', 'تم الإرسال')}
                    </span>
                    {camp.failed > 0 && (
                      <span className="badge" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>
                        ✕ {camp.failed} {L('Failed', 'فشل')}
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      onClick={() => setPreviewCampaign(camp)}
                    >
                      👁️ {L('Preview', 'معاينة')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      onClick={() => {
                        setCampaignForm({
                          campaignName: `${camp.name} (Copy)`,
                          subject: camp.subject,
                          htmlBody: camp.htmlBody || '',
                          textBody: '',
                          actionUrl: '',
                          actionText: '',
                          emailDesign: camp.emailDesign || null
                        });
                        setSubTab('compose');
                      }}
                    >
                      📋 {L('Reuse', 'إعادة استخدام')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '11px', padding: '4px 10px', color: 'var(--red)' }}
                      onClick={() => handleDeleteCampaign(camp.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview Sent Campaign Modal */}
      {previewCampaign && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setPreviewCampaign(null)}
        >
          <div
            className="card"
            style={{ maxWidth: '680px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: '12px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>{previewCampaign.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--t2)' }}>{previewCampaign.subject}</div>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setPreviewCampaign(null)}>
                ✕
              </button>
            </div>
            <iframe
              title="Sent Campaign HTML"
              srcDoc={previewCampaign.htmlBody}
              style={{ width: '100%', height: '460px', border: '1px solid var(--edge)', borderRadius: '10px', background: '#090912' }}
            />
          </div>
        </div>
      )}

      {/* Fullscreen Visual Email Builder Modal */}
      <EmailBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        initialBlocks={campaignForm.emailDesign?.blocks}
        initialTheme={campaignForm.emailDesign?.theme}
        campaignName={campaignForm.campaignName || campaignForm.subject}
        isRTL={isRTL}
        onSave={({ blocks, theme, htmlBody }) => {
          setCampaignForm((prev) => ({
            ...prev,
            emailDesign: { blocks, theme },
            htmlBody
          }));
        }}
        onSendTestEmail={async ({ testEmail, htmlBody }) => {
          await handleSendTestEmail(testEmail, htmlBody);
        }}
      />
    </div>
  );
}

