import {
  Bot,
  Globe,
  Kanban,
  MessagesSquare,
  CalendarDays,
  CreditCard,
  ShieldCheck,
  Webhook,
  PhoneCall,
  Send,
  BarChart3,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import { storageGet, storageSet } from '../../utils/browserStorage';

export type ToolStatus = 'Active' | 'Maintenance' | 'Disabled';
export type ToolCategory = 'Core' | 'Intelligence' | 'Growth' | 'Operations' | 'Commerce' | 'Infrastructure' | 'Developer';

export interface ToolSettingField {
  key: string;
  label: [string, string];
  type: 'text' | 'number' | 'boolean' | 'select';
  value: string | number | boolean;
  options?: string[];
  description?: [string, string];
}

export interface ToolItem {
  id: string;
  name: [string, string];
  description: [string, string];
  icon: LucideIcon;
  category: ToolCategory;
  categoryLabel: [string, string];
  status: ToolStatus;
  enabled: boolean;
  route: string;
  stats: {
    activeTenants: number;
    totalTenants: number;
    uptime: string;
    version: string;
  };
  maintenanceNotice?: string;
  accessTier: 'all' | 'pro_agency' | 'agency_only';
  settings: Record<string, string | number | boolean>;
  settingFields: ToolSettingField[];
}

export const initialTools: ToolItem[] = [
  {
    id: 'ai-copilot',
    name: ['AI Copilot & Automations', 'مساعد الذكاء الاصطناعي والأتمتة'],
    description: ['Autonomous AI agents, prompt engines, and workflow automations.', 'وكلاء أذكياء ومحركات التوجيه وأتمتة العمليات عبر المنصة.'],
    icon: Bot,
    category: 'Intelligence',
    categoryLabel: ['Intelligence', 'الذكاء الاصطناعي'],
    status: 'Active',
    enabled: true,
    route: '/admin/ai-usage',
    stats: {
      activeTenants: 31,
      totalTenants: 32,
      uptime: '99.98%',
      version: 'v2.8.4',
    },
    accessTier: 'all',
    settings: {
      defaultModel: 'GPT-4o',
      tokenBudgetPerWorkspace: 1000000,
      autoEscalation: true,
      streamingEnabled: true,
      rateLimitRpm: 120,
    },
    settingFields: [
      {
        key: 'defaultModel',
        label: ['Default Foundation Model', 'النموذج التأسيسي الافتراضي'],
        type: 'select',
        value: 'GPT-4o',
        options: ['GPT-4o', 'Claude 3.5 Sonnet', 'GPT-4o mini', 'Gemini 1.5 Pro'],
      },
      {
        key: 'tokenBudgetPerWorkspace',
        label: ['Token Budget / Workspace', 'ميزانية الرموز لكل مساحة'],
        type: 'number',
        value: 1000000,
      },
      {
        key: 'rateLimitRpm',
        label: ['Rate Limit (RPM)', 'حد الطلبات في الدقيقة'],
        type: 'number',
        value: 120,
      },
      {
        key: 'autoEscalation',
        label: ['Auto-Escalate to Human Agent', 'التحويل التلقائي لموظف بشري'],
        type: 'boolean',
        value: true,
      },
    ],
  },
  {
    id: 'funnel-builder',
    name: ['Funnel & Website Builder', 'منشئ القمع والمواقع'],
    description: ['Drag-and-drop page editor, landing funnels, and checkout flows.', 'محرر الصفحات بالسحب والإفلات وقنوات البيع وتدفقات الشراء.'],
    icon: Globe,
    category: 'Growth',
    categoryLabel: ['Growth & Sales', 'النمو والمبيعات'],
    status: 'Active',
    enabled: true,
    route: '/admin/funnels',
    stats: {
      activeTenants: 29,
      totalTenants: 32,
      uptime: '99.95%',
      version: 'v3.2.1',
    },
    accessTier: 'all',
    settings: {
      customDomainAllowed: true,
      customCodeInjection: true,
      maxPagesPerSite: 50,
      cdnCacheMode: 'Aggressive Edge',
    },
    settingFields: [
      {
        key: 'cdnCacheMode',
        label: ['CDN Caching Strategy', 'استراتيجية التخزين المؤقت CDN'],
        type: 'select',
        value: 'Aggressive Edge',
        options: ['Aggressive Edge', 'Standard Cache', 'Bypass Dynamic'],
      },
      {
        key: 'maxPagesPerSite',
        label: ['Max Pages Allowed / Funnel', 'أقصى عدد صفحات لكل قمع'],
        type: 'number',
        value: 50,
      },
      {
        key: 'customCodeInjection',
        label: ['Allow Custom Code Injection (Head/Body)', 'السماح بحقن الأكواد المخصصة'],
        type: 'boolean',
        value: true,
      },
    ],
  },
  {
    id: 'crm-pipeline',
    name: ['CRM & Lead Pipeline', 'إدارة علاقات العملاء والمسارات'],
    description: ['Multi-stage deal pipelines, lead capture, and contact history.', 'مسارات الصفقات متعددة المراحل، التقاط العملاء وسجل جهات الاتصال.'],
    icon: Kanban,
    category: 'Core',
    categoryLabel: ['Core Platform', 'الأساسيات'],
    status: 'Active',
    enabled: true,
    route: '/admin/crm',
    stats: {
      activeTenants: 32,
      totalTenants: 32,
      uptime: '100%',
      version: 'v2.4.0',
    },
    accessTier: 'all',
    settings: {
      roundRobinAssignment: true,
      maxPipelinesPerTenant: 10,
      deduplicationRule: 'Email & Phone',
      autoArchiveLostDays: 90,
    },
    settingFields: [
      {
        key: 'deduplicationRule',
        label: ['Lead Deduplication Rule', 'قاعدة إزالة التكرار للعملاء'],
        type: 'select',
        value: 'Email & Phone',
        options: ['Email & Phone', 'Email Only', 'Phone Only', 'Disabled'],
      },
      {
        key: 'maxPipelinesPerTenant',
        label: ['Max Pipelines per Workspace', 'الحد الأقصى للمسارات لكل مساحة'],
        type: 'number',
        value: 10,
      },
      {
        key: 'roundRobinAssignment',
        label: ['Automatic Round-Robin Assignment', 'توزيع جهات الاتصال بالتناوب'],
        type: 'boolean',
        value: true,
      },
    ],
  },
  {
    id: 'unified-inbox',
    name: ['Unified Multi-Channel Inbox', 'صندوق الوارد الموحد'],
    description: ['Omnichannel inbox for WhatsApp, Instagram, Live Chat & Email.', 'صندوق رسائل موحد للواتساب وإنستغرام والدردشة المباشرة والبريد.'],
    icon: MessagesSquare,
    category: 'Operations',
    categoryLabel: ['Communication', 'المحادثات'],
    status: 'Active',
    enabled: true,
    route: '/admin/conversations',
    stats: {
      activeTenants: 28,
      totalTenants: 32,
      uptime: '99.92%',
      version: 'v2.1.0',
    },
    accessTier: 'all',
    settings: {
      slaResponseTimeoutMins: 15,
      humanHandoffNotice: true,
      attachmentSizeLimitMb: 25,
      omnichannelSyncRateSec: 5,
    },
    settingFields: [
      {
        key: 'slaResponseTimeoutMins',
        label: ['First Response SLA Timeout (Mins)', 'مهلة الاستجابة الأولى SLA (بالدقائق)'],
        type: 'number',
        value: 15,
      },
      {
        key: 'attachmentSizeLimitMb',
        label: ['Max Media Attachment (MB)', 'الحد الأقصى للمرفقات (ميجابايت)'],
        type: 'number',
        value: 25,
      },
      {
        key: 'humanHandoffNotice',
        label: ['Notify Customer on Human Takeover', 'إشعار العميل عند تحويله لموظف'],
        type: 'boolean',
        value: true,
      },
    ],
  },
  {
    id: 'booking-engine',
    name: ['Booking & Calendar Engine', 'محرك الحجوزات والتقويم'],
    description: ['Automated appointment scheduling, Google sync, and host rosters.', 'جدولة المواعيد التلقائية، مزامنة تقويم جوجل وجداول المضيفين.'],
    icon: CalendarDays,
    category: 'Operations',
    categoryLabel: ['Operations', 'العمليات'],
    status: 'Active',
    enabled: true,
    route: '/admin/booking',
    stats: {
      activeTenants: 26,
      totalTenants: 32,
      uptime: '99.99%',
      version: 'v2.6.2',
    },
    accessTier: 'all',
    settings: {
      bufferMinutes: 15,
      maxAdvanceBookingDays: 60,
      instantGoogleSync: true,
      reminderSmsLeadTimeHours: 24,
    },
    settingFields: [
      {
        key: 'bufferMinutes',
        label: ['Buffer Time Between Meetings (Mins)', 'وقت الفاصل بين المواعيد (بالدقائق)'],
        type: 'number',
        value: 15,
      },
      {
        key: 'maxAdvanceBookingDays',
        label: ['Max Advance Booking Window (Days)', 'أقصى نافذة حجز مسبق (بالأيام)'],
        type: 'number',
        value: 60,
      },
      {
        key: 'instantGoogleSync',
        label: ['Two-Way Google Calendar Sync', 'مزامنة ثنائية مع تقويم جوجل'],
        type: 'boolean',
        value: true,
      },
    ],
  },
  {
    id: 'products-payments',
    name: ['Products & Payments Gateway', 'المنتجات وبوابات الدفع'],
    description: ['Digital courses, services, subscriptions, and multi-gateway checkout.', 'الدورات الرقمية والخدمات والاشتراكات والدفع عبر بوابات متعددة.'],
    icon: CreditCard,
    category: 'Commerce',
    categoryLabel: ['Commerce', 'التجارة والمدفوعات'],
    status: 'Active',
    enabled: true,
    route: '/admin/payments-gateways',
    stats: {
      activeTenants: 30,
      totalTenants: 32,
      uptime: '99.99%',
      version: 'v3.0.0',
    },
    accessTier: 'all',
    settings: {
      defaultCurrency: 'USD',
      platformFeePercentage: 2.5,
      stripeConnectMode: 'Standard Connect',
      instantRefundsAllowed: true,
    },
    settingFields: [
      {
        key: 'defaultCurrency',
        label: ['Default Platform Currency', 'عملة المنصة الافتراضية'],
        type: 'select',
        value: 'USD',
        options: ['USD', 'EUR', 'SAR', 'AED', 'EGP'],
      },
      {
        key: 'platformFeePercentage',
        label: ['Platform Application Fee (%)', 'رسوم تطبيق المنصة (%)'],
        type: 'number',
        value: 2.5,
      },
      {
        key: 'instantRefundsAllowed',
        label: ['Allow Instant Customer Self-Refunds', 'السماح بالاسترداد الذاتي الفوري'],
        type: 'boolean',
        value: true,
      },
    ],
  },
  {
    id: 'custom-domains',
    name: ['Custom Domains & SSL', 'النطاقات المخصصة وSSL'],
    description: ['Automated SSL provisioning, DNS verification, and edge routing.', 'توليد شهادات SSL التلقائي، فحص سجلات DNS والتوجيه السحابي.'],
    icon: ShieldCheck,
    category: 'Infrastructure',
    categoryLabel: ['Infrastructure', 'البنية التحتية'],
    status: 'Active',
    enabled: true,
    route: '/admin/domains',
    stats: {
      activeTenants: 24,
      totalTenants: 32,
      uptime: '100%',
      version: 'v1.9.5',
    },
    accessTier: 'all',
    settings: {
      autoRenewSsl: true,
      enforceHttps: true,
      wildcardSubdomains: true,
      dnsCheckIntervalMins: 10,
    },
    settingFields: [
      {
        key: 'dnsCheckIntervalMins',
        label: ['Automated DNS Check Interval (Mins)', 'فترة الفحص الدوري لسجلات DNS (دقائق)'],
        type: 'number',
        value: 10,
      },
      {
        key: 'enforceHttps',
        label: ['Enforce Strict HTTPS / HSTS', 'فرض التشفير التلقائي الصارم HTTPS'],
        type: 'boolean',
        value: true,
      },
      {
        key: 'wildcardSubdomains',
        label: ['Enable Tenant Wildcard Subdomains (*.gos.app)', 'تفعيل النطاقات الفرعية التلقائية'],
        type: 'boolean',
        value: true,
      },
    ],
  },
  {
    id: 'webhooks-api',
    name: ['Webhooks & API Gateway', 'خطافات الويب والواجهات البرمجية'],
    description: ['Real-time outbound event webhooks and REST API tokens.', 'إشعارات الأحداث الفورية ومفاتيح الربط البرمجي REST API.'],
    icon: Webhook,
    category: 'Developer',
    categoryLabel: ['Developer Tools', 'أدوات المطورين'],
    status: 'Active',
    enabled: true,
    route: '/admin/integrations',
    stats: {
      activeTenants: 19,
      totalTenants: 32,
      uptime: '99.89%',
      version: 'v2.3.1',
    },
    accessTier: 'all',
    settings: {
      maxRetryAttempts: 5,
      rateLimitPerMin: 600,
      signingAlgorithm: 'HMAC-SHA256',
      deadLetterQueue: true,
    },
    settingFields: [
      {
        key: 'signingAlgorithm',
        label: ['Signature Verification Algorithm', 'خوارزمية التوقيع للتحقق'],
        type: 'select',
        value: 'HMAC-SHA256',
        options: ['HMAC-SHA256', 'HMAC-SHA512', 'Ed25519'],
      },
      {
        key: 'maxRetryAttempts',
        label: ['Max Webhook Delivery Retries', 'أقصى عدد لإعادة محاولة الإرسال'],
        type: 'number',
        value: 5,
      },
      {
        key: 'deadLetterQueue',
        label: ['Dead-Letter Queue on Permanent Failure', 'طابور الرسائل المتعثرة عند الفشل الدائم'],
        type: 'boolean',
        value: true,
      },
    ],
  },
  {
    id: 'ai-followup',
    name: ['AI Follow-up & Voice Agents', 'المتابعة الذكية ووكلاء الصوت'],
    description: ['Intelligent re-engagement calls, WhatsApp follow-ups, and reminders.', 'مكالمات المتابعة الذكية، تذكيرات الواتساب وإعادة استهداف العملاء.'],
    icon: PhoneCall,
    category: 'Intelligence',
    categoryLabel: ['Intelligence', 'الذكاء الاصطناعي'],
    status: 'Active',
    enabled: true,
    route: '/admin/ai-usage',
    stats: {
      activeTenants: 18,
      totalTenants: 32,
      uptime: '99.75%',
      version: 'v1.4.0',
    },
    accessTier: 'pro_agency',
    settings: {
      voiceProvider: 'ElevenLabs Ultra',
      callingHoursWindow: '09:00 - 19:00',
      consentRecordingRequired: true,
      maxAttemptsPerLead: 3,
    },
    settingFields: [
      {
        key: 'voiceProvider',
        label: ['Synthetic Voice Engine Provider', 'مزود محرك الصوت الاصطناعي'],
        type: 'select',
        value: 'ElevenLabs Ultra',
        options: ['ElevenLabs Ultra', 'OpenAI Voice', 'Deepgram Nova'],
      },
      {
        key: 'maxAttemptsPerLead',
        label: ['Max Daily Attempts / Lead', 'أقصى محاولات يومية لكل عميل'],
        type: 'number',
        value: 3,
      },
      {
        key: 'consentRecordingRequired',
        label: ['Announce Call Recording Consent Notice', 'إعلان تنبيه تسجيل المكالمة إلزامياً'],
        type: 'boolean',
        value: true,
      },
    ],
  },
  {
    id: 'email-sms',
    name: ['Email & SMS Campaigns', 'حملات البريد والرسائل النصية'],
    description: ['Broadcast newsletters, drip automations, and transactional SMS.', 'النشرات البريدية، سلاسل الرسائل المؤتمتة والرسائل النصية.'],
    icon: Send,
    category: 'Growth',
    categoryLabel: ['Growth & Sales', 'النمو والمبيعات'],
    status: 'Maintenance',
    enabled: false,
    route: '/admin/templates',
    stats: {
      activeTenants: 15,
      totalTenants: 32,
      uptime: '98.50%',
      version: 'v2.0.0-rc3',
    },
    maintenanceNotice: 'Upgrading high-deliverability dedicated SMTP cluster nodes.',
    accessTier: 'all',
    settings: {
      dailyTenantQuota: 10000,
      enforceUnsubscribe: true,
      spamScorePreCheck: true,
      smtpRelay: 'Amazon SES Dedicated',
    },
    settingFields: [
      {
        key: 'smtpRelay',
        label: ['SMTP Relay Cluster', 'خادم ترحيل البريد المعتمد'],
        type: 'select',
        value: 'Amazon SES Dedicated',
        options: ['Amazon SES Dedicated', 'SendGrid Pro', 'Postmark Gateway', 'Custom SMTP'],
      },
      {
        key: 'dailyTenantQuota',
        label: ['Daily Outbound Email Cap / Tenant', 'الحد اليومي لإرسال البريد لكل مساحة'],
        type: 'number',
        value: 10000,
      },
      {
        key: 'enforceUnsubscribe',
        label: ['Enforce 1-Click Unsubscribe Header', 'إلزام رابط إلغاء الاشتراك بنقرة واحدة'],
        type: 'boolean',
        value: true,
      },
    ],
  },
  {
    id: 'analytics-bi',
    name: ['Analytics & Performance BI', 'التحليلات ومؤشرات الأداء'],
    description: ['Real-time funnel conversion metrics, revenue, and usage BI.', 'مقاييس تحويل القمع، إيرادات المبيعات وذكاء الأعمال التشغيلي.'],
    icon: BarChart3,
    category: 'Core',
    categoryLabel: ['Analytics', 'التحليلات'],
    status: 'Active',
    enabled: true,
    route: '/admin/analytics',
    stats: {
      activeTenants: 32,
      totalTenants: 32,
      uptime: '100%',
      version: 'v3.1.0',
    },
    accessTier: 'all',
    settings: {
      samplingRatePercent: 100,
      retentionDays: 365,
      anonymizeIp: true,
      realtimeStream: true,
    },
    settingFields: [
      {
        key: 'retentionDays',
        label: ['Event Retention Period (Days)', 'فترة الاحتفاظ بالأحداث التحليلية (أيام)'],
        type: 'number',
        value: 365,
      },
      {
        key: 'anonymizeIp',
        label: ['GDPR Compliant IP Anonymization', 'إخفاء هوية عناوين IP وفق المعايير'],
        type: 'boolean',
        value: true,
      },
      {
        key: 'realtimeStream',
        label: ['Enable Real-Time Visitor Live Stream', 'تفعيل البث المباشر للزوار'],
        type: 'boolean',
        value: true,
      },
    ],
  },
  {
    id: 'client-portal',
    name: ['Client Portal & Memberships', 'بوابة العملاء والعضويات'],
    description: ['Branded client hub, course learning player, and asset downloads.', 'مركز عملاء مخصص بالعلامة التجارية، مشغل الدورات وملفات التنزيل.'],
    icon: Layers,
    category: 'Core',
    categoryLabel: ['Core Platform', 'الأساسيات'],
    status: 'Disabled',
    enabled: false,
    route: '/admin/products',
    stats: {
      activeTenants: 0,
      totalTenants: 32,
      uptime: '—',
      version: 'v1.0.0-beta',
    },
    accessTier: 'pro_agency',
    settings: {
      ssoEnabled: false,
      maxConcurrentLogins: 2,
      videoWatermark: true,
      allowDownloads: false,
    },
    settingFields: [
      {
        key: 'maxConcurrentLogins',
        label: ['Max Concurrent Device Logins', 'الحد الأقصى للأجهزة المتزامنة'],
        type: 'number',
        value: 2,
      },
      {
        key: 'videoWatermark',
        label: ['Dynamic Anti-Piracy Video Watermark', 'علامة مائية ديناميكية مانعة للقرصنة'],
        type: 'boolean',
        value: true,
      },
      {
        key: 'allowDownloads',
        label: ['Allow Offline Video Downloads', 'السماح بتنزيل مقاطع الفيديو'],
        type: 'boolean',
        value: false,
      },
    ],
  },
];

const STORAGE_KEY = 'gos.admin.tools.v1';

// Mapping from tool id to its icon to survive JSON serialization
const iconMap: Record<string, LucideIcon> = {
  'ai-copilot': Bot,
  'funnel-builder': Globe,
  'crm-pipeline': Kanban,
  'unified-inbox': MessagesSquare,
  'booking-engine': CalendarDays,
  'products-payments': CreditCard,
  'custom-domains': ShieldCheck,
  'webhooks-api': Webhook,
  'ai-followup': PhoneCall,
  'email-sms': Send,
  'analytics-bi': BarChart3,
  'client-portal': Layers,
};

export function loadTools(): ToolItem[] {
  try {
    const raw = storageGet(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Re-attach icons and verify structure
        return parsed.map((item: ToolItem) => ({
          ...item,
          icon: iconMap[item.id] || Layers,
        }));
      }
    }
  } catch (err) {
    console.error('Failed to parse tools state from storage:', err);
  }
  return initialTools;
}

export function saveTools(tools: ToolItem[]): boolean {
  try {
    // Exclude react icon component before serialization
    const serializable = tools.map(({ icon, ...rest }) => rest);
    return storageSet(STORAGE_KEY, JSON.stringify(serializable));
  } catch (err) {
    console.error('Failed to save tools state to storage:', err);
    return false;
  }
}

export function toggleToolEnabled(toolId: string, tools: ToolItem[]): ToolItem[] {
  const next = tools.map((tool) => {
    if (tool.id !== toolId) return tool;
    const nextEnabled = !tool.enabled;
    const nextStatus: ToolStatus = nextEnabled
      ? tool.status === 'Maintenance' ? 'Maintenance' : 'Active'
      : 'Disabled';
    return {
      ...tool,
      enabled: nextEnabled,
      status: nextStatus,
    };
  });
  saveTools(next);
  return next;
}

export function updateTool(updated: ToolItem, tools: ToolItem[]): ToolItem[] {
  const next = tools.map((t) => (t.id === updated.id ? updated : t));
  saveTools(next);
  return next;
}

export function resetTools(): ToolItem[] {
  saveTools(initialTools);
  return initialTools;
}
