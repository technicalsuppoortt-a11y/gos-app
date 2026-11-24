import { read, write, rows, entityMutation, spendCredits } from '../store';
import { makeLead, mainPipeline, parseCSV } from '../../pages/crm/model';
import { buildAIFunnelAsset, synthesizeTailoredDraft, type AIFunnelBrief, type AIFunnelGoal, type AIFunnelTone } from '../../backend/aiFunnelArchitect';
import type { CurrencyCode } from '../../utils/currency';
export type ApiRecord = Record<string, any>;
export type GosSource = { id: string; name: string; type: any; status: string; content?: string; chunk_count?: number; error?: string };
export type GosAssistant = { live_enabled: boolean; channels: Record<string, boolean> };
export type PlaygroundTest = { id: string; question: string; answer: string; outcome: string; citations: unknown[]; verdict?: string };
const created = (body: ApiRecord) => ({ ...body, id: body.id || crypto.randomUUID(), created_at: new Date().toISOString() });
export async function gosRequest<T>(input: string, options: { method?: string; body?: any; [key: string]: any } = {}): Promise<T> {
  const url = new URL(input, 'https://demo.invalid');
  const parts = url.pathname.split('/').filter(Boolean), method = options.method ?? 'GET', body = options.body ?? {};
  if (['/health', '/auth/me', '/auth/verify', '/firestore/status'].includes(url.pathname)) return { ok: true, user: { id: 'demo-account-user' }, connected: true } as T;
  if (parts[0] === 'platform' && parts[1] === 'meta-app') {
    const defaultMeta = {
      apps: {
        messenger: { app_id: null, config_id: null, has_secret: false },
        instagram: { app_id: null, config_id: null, has_secret: false },
        whatsapp: { app_id: null, config_id: null, has_secret: false },
      },
      public_url: 'https://api.upklick.net',
      allowed_origins: ['https://app.client-domain.com'],
      unreadable_secrets: [],
      verify_token: 'upclick_meta_verify_demo_token',
      webhook_url: 'https://api.upklick.net/api/v1/webhooks/meta',
      redirect_uri: 'https://api.upklick.net/api/v1/oauth/meta/callback',
    };
    const current = read('platform.metaApp', defaultMeta);
    if (method === 'PUT') {
      const next = {
        ...current,
        public_url: body.public_url || current.public_url,
        allowed_origins: Array.isArray(body.allowed_origins) ? body.allowed_origins : current.allowed_origins,
        apps: {
          messenger: {
            app_id: body.messenger_app_id || null,
            config_id: body.messenger_config_id || null,
            has_secret: Boolean(body.messenger_app_secret || current.apps?.messenger?.has_secret),
          },
          instagram: {
            app_id: body.instagram_app_id || null,
            config_id: body.instagram_config_id || null,
            has_secret: Boolean(body.instagram_app_secret || current.apps?.instagram?.has_secret),
          },
          whatsapp: {
            app_id: body.whatsapp_app_id || null,
            config_id: body.whatsapp_config_id || null,
            has_secret: Boolean(body.whatsapp_app_secret || current.apps?.whatsapp?.has_secret),
          },
        },
      };
      write('platform.metaApp', next);
      return { settings: next } as T;
    }
    return { settings: current } as T;
  }
  if (parts[0] === 'ai') {
    if (parts[1] === 'training') return { embedding_percent: 100 } as T;
    // Flow Builder's Meta connect is not available in the demo account.
    if (parts[1] === 'channels' && parts[2] === 'meta') {
      if (method === 'GET') return { meta: { app_id: null, graph_version: 'v27.0', login_config_id: null, whatsapp_config_id: null, ready: false, channels: { messenger: false, instagram: false, whatsapp: false }, webhook_url: '', verify_token: null } } as T;
      throw new Error('Connecting Meta channels is not available in the demo account.');
    }
    if (parts[1] === 'channels') { const current = read('assistant', { live_enabled: false, channels: { whatsapp: true, instagram: true, webchat: true } }); if (method === 'PUT' && parts[2]) write('assistant', { ...current, channels: { ...current.channels, [parts[2]]: !!body.enabled } }); return { channels: read('assistant', { live_enabled: false, channels: { whatsapp: true, instagram: true, webchat: true } }).channels } as T; }
    if (parts[1] === 'assistant') { if (method !== 'GET') write('assistant', { ...read('assistant', { live_enabled: false, channels: {} }), ...body }); return { assistant: read('assistant', { live_enabled: false, channels: { whatsapp: true, instagram: true } }) } as T; }
    if (parts[1] === 'lead-tracking') {
      const trackIds = ['bookings', 'products', 'funnels', 'meta', 'copilot', 'webchat'] as const;
      const defaultTracks = Object.fromEntries(trackIds.map(t => [t, { enabled: true, channel: 'auto', whatsapp_template: '', whatsapp_language: 'ar' }]));
      const settings = read('leadTracking.settings', {
        enabled: true,
        business_name: 'UpKlick Demo Studio',
        reply_to_email: 'hello@upklick.net',
        default_language: 'auto',
        tone: 'Friendly and professional',
        max_attempts: 3,
        first_delay_minutes: 5,
        second_delay_hours: 24,
        third_delay_hours: 72,
        booking_reminder_24h: true,
        booking_reminder_1h: true,
        tracks: defaultTracks,
      });
      const classify = (src: string) => {
        const s = String(src || '').toLowerCase();
        if (s.includes('book') || s.includes('calendar')) return 'bookings';
        if (s.includes('service') || s.includes('product') || s.includes('checkout')) return 'products';
        if (s.includes('copilot') || s.includes('agent')) return 'copilot';
        if (s.includes('webchat') || s.includes('website chat')) return 'webchat';
        if (s.includes('instagram') || s.includes('whatsapp') || s.includes('facebook')) return 'meta';
        return 'funnels';
      };
      const buildOverview = () => {
        const stored = read<any[]>('leadTracking.leads', []);
        const byKey = new Map<string, any>(stored.map(item => [item.id, item]));
        for (const l of rows('leads') as any[]) {
          const key = `trk-${String(l.email || l.phone || l.id).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
          if (!byKey.has(key)) {
            const trk = classify(l.source || 'Website');
            byKey.set(key, {
              id: key,
              primary_lead_id: l.id,
              linked_lead_ids: [l.id],
              name: l.name || 'Lead',
              email: l.email || '',
              email_normalized: l.email ? String(l.email).toLowerCase() : null,
              phone: l.phone || '',
              phone_normalized: l.phone || null,
              primary_track: trk,
              tracks: [trk],
              sources: [l.source || 'Website'],
              stage: l.lifecycleStage || l.stage || 'LEAD_CAPTURED',
              booking_status: l.bookingStatus || 'Not Scheduled',
              appointment_at: null,
              appointment_service: null,
              appointment_location: null,
              product_name: null,
              order_status: null,
              value: Number(l.value || 0),
              currency: 'USD',
              interest: l.interest || '',
              meta_channel: null,
              meta_thread_id: null,
              last_inbound_at: null,
              status: 'scheduled',
              attempts: 0,
              next_action_kind: 'welcome',
              next_follow_up_at: new Date(Date.now() + 5 * 60000).toISOString(),
              reminder_24h_sent_at: null,
              reminder_1h_sent_at: null,
              last_contacted_at: null,
              last_channel: null,
              last_message_excerpt: null,
              last_error: null,
              history: [],
              created_at: l.createdAt || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
        const list = [...byKey.values()];
        write('leadTracking.leads', list);
        const track_stats: Record<string, any> = Object.fromEntries(trackIds.map(t => [t, { total: 0, scheduled: 0, contacted: 0, replied: 0, converted: 0 }]));
        const summary = { total_tracked: list.length, scheduled: 0, contacted: 0, reminded: 0, replied: 0, converted: 0, paused: 0 };
        for (const item of list) {
          const st = track_stats[item.primary_track] || track_stats.funnels;
          st.total++;
          if (item.status === 'scheduled' || item.next_follow_up_at) { summary.scheduled++; st.scheduled++; }
          if (item.attempts > 0) { summary.contacted++; st.contacted++; }
          if (item.status === 'reminded') summary.reminded++;
          if (item.status === 'replied') { summary.replied++; st.replied++; }
          if (item.status === 'converted') { summary.converted++; st.converted++; }
          if (item.status === 'paused') summary.paused++;
        }
        return {
          settings: read('leadTracking.settings', settings),
          channels: {
            email: { provider: 'ses', mode: 'ses_smtp', configured: true, from_address: 'noreply@upklick.net', region: 'eu-north-1', smtp_host: 'email-smtp.eu-north-1.amazonaws.com' },
            whatsapp: { connected: true, name: 'UpKlick WhatsApp' },
            instagram: { connected: true, name: '@upklick' },
            messenger: { connected: false, name: null },
            whatsapp_templates: [{ name: 'welcome_followup', language: 'ar', category: 'UTILITY' }],
          },
          summary,
          track_stats,
          leads: list,
        };
      };
      if (parts[2] === 'settings' && method === 'PUT') {
        const merged = { ...settings, ...body, tracks: { ...settings.tracks, ...(body.tracks || {}) } };
        write('leadTracking.settings', merged);
        return buildOverview() as T;
      }
      if (parts[2] === 'test-email' && method === 'POST') {
        return { delivery: { ok: true, message_id: 'demo-ses-msg', provider: 'ses_smtp', error: null } } as T;
      }
      if (parts[2] === 'leads' && method === 'POST' && !parts[3]) {
        const now = new Date().toISOString();
        const trk = classify(body.source || 'WhatsApp');
        const crmLead = makeLead({ name: body.name || 'New Lead', email: body.email || 'lead@upklick.net', phone: body.phone || '', source: body.source || 'WhatsApp', interest: body.interest || '', nextFollowUp: 'Follow up today', nextFollowUpAt: now });
        entityMutation('leads', crmLead.id, crmLead);
        const item = {
          id: `trk-${crypto.randomUUID().slice(0, 8)}`,
          primary_lead_id: crmLead.id,
          linked_lead_ids: [crmLead.id],
          name: crmLead.name,
          email: body.email || '',
          email_normalized: body.email ? String(body.email).toLowerCase() : null,
          phone: body.phone || '',
          phone_normalized: body.phone || null,
          primary_track: trk,
          tracks: [trk],
          sources: [body.source || 'WhatsApp'],
          stage: 'LEAD_CAPTURED',
          booking_status: 'Not Scheduled',
          appointment_at: null,
          appointment_service: null,
          appointment_location: null,
          product_name: null,
          order_status: null,
          value: 0,
          currency: 'USD',
          interest: body.interest || '',
          meta_channel: null,
          meta_thread_id: null,
          last_inbound_at: null,
          status: body.send_now ? 'active' : 'scheduled',
          attempts: body.send_now ? 1 : 0,
          next_action_kind: body.send_now ? 'followup_2' : 'welcome',
          next_follow_up_at: new Date(Date.now() + (body.send_now ? 86400000 : 300000)).toISOString(),
          reminder_24h_sent_at: null,
          reminder_1h_sent_at: null,
          last_contacted_at: body.send_now ? now : null,
          last_channel: body.send_now ? (body.phone ? 'whatsapp' : 'email') : null,
          last_message_excerpt: body.send_now ? `Welcome ${crmLead.name}! How can we help you get started?` : null,
          last_error: null,
          history: body.send_now ? [{ id: crypto.randomUUID(), at: now, kind: 'welcome', channel: body.phone ? 'whatsapp' : 'email', status: 'sent', excerpt: `Welcome ${crmLead.name}! How can we help you get started?` }] : [],
          created_at: now,
          updated_at: now,
        };
        const cur = read<any[]>('leadTracking.leads', []);
        write('leadTracking.leads', [item, ...cur]);
        return { lead: item, overview: buildOverview() } as T;
      }
      if (parts[2] === 'leads' && parts[3] && parts[4]) {
        const cur = read<any[]>('leadTracking.leads', []);
        const now = new Date().toISOString();
        const nextList = cur.map(item => {
          if (item.id !== parts[3]) return item;
          if (parts[4] === 'pause') return { ...item, status: 'paused', next_follow_up_at: null, updated_at: now };
          if (parts[4] === 'resume') return { ...item, status: 'scheduled', next_follow_up_at: new Date(Date.now() + 120000).toISOString(), updated_at: now };
          if (parts[4] === 'send-now') {
            const ch = item.phone ? 'whatsapp' : 'email';
            const excerpt = `Hi ${item.name}, following up on your inquiry with ${settings.business_name}!`;
            return {
              ...item,
              status: 'active',
              attempts: (item.attempts || 0) + 1,
              last_contacted_at: now,
              last_channel: ch,
              last_message_excerpt: excerpt,
              next_action_kind: 'followup_2',
              next_follow_up_at: new Date(Date.now() + 86400000).toISOString(),
              history: [{ id: crypto.randomUUID(), at: now, kind: item.next_action_kind || 'welcome', channel: ch, status: 'sent', excerpt }, ...(item.history || [])],
              updated_at: now,
            };
          }
          return item;
        });
        write('leadTracking.leads', nextList);
        return { lead: nextList.find(i => i.id === parts[3]) ?? null, overview: buildOverview() } as T;
      }
      return buildOverview() as T;
    }
    if (parts[1] === 'sources') {
      if (method === 'POST') { const values = body instanceof FormData ? Object.fromEntries(body.entries()) : body; const source = { ...created(values), status: 'ready', chunk_count: 3, content: values.content ?? 'Demo file content' }; entityMutation('knowledge', source.id, source); return { source } as T; }
      if (method === 'DELETE') entityMutation('knowledge', parts[2]);
      return (parts[2] ? { source: rows('knowledge').find(row => row.id === parts[2]) } : { sources: rows('knowledge') }) as T;
    }
    if (parts[1] === 'playground') {
      if (method === 'GET') return { tests: rows('playground') } as T;
      if (parts[3] === 'grade') { entityMutation('playground', parts[2], body, true); return { test: rows('playground').find(row => row.id === parts[2]) } as T; }
      spendCredits();
      const test = { ...created(body), answer: 'Demo response: Thanks for reaching out! We can help you capture leads, automate follow-ups and book a discovery call. What would you like to explore?', outcome: 'answered', citations: [] };
      entityMutation('playground', test.id, test); return { test } as T;
    }
    if (parts[1] === 'copilot') {
      if (parts[2] === 'conversations') return { conversations: rows('copilotConversations') } as T;
      if (parts[2] === 'transcribe') {
        const isAr = String(body.language ?? '').startsWith('ar');
        return { transcript: isAr ? 'عاوز أضيف عميل جديد اسمه كريم محمود تليفونه 01012345678' : 'Add a new lead named Sarah Jenkins phone +14155550199' } as T;
      }
      if (parts[2] === 'draft') {
        const resource = body.draft?.kind === 'landing' ? 'assets' : body.draft?.kind === 'campaign' ? 'templates' : body.draft?.kind === 'booking' ? 'calendars' : 'products';
        const id = body.requestId || crypto.randomUUID();
        const href = body.draft?.kind === 'landing' ? '/dashboard/funnels' : body.draft?.kind === 'campaign' ? '/dashboard/follow-up' : body.draft?.kind === 'booking' ? '/dashboard/booking' : '/dashboard/products';
        entityMutation(resource, id, { ...(body.record ?? body.draft ?? {}), id });
        if (resource === 'assets') write('gos.assets.workspace.v1', { assets: rows('assets'), domains: rows('domains') });
        return { success: true, id, resource, href } as T;
      }
      if (parts[2] === 'action') {
        const kind = String(body.kind ?? 'product');
        const values = (body.values ?? {}) as Record<string, string>;
        const ar = /[\u0600-\u06FF]/.test(Object.values(values).join(' ')) || String(body.uiLanguage ?? '').startsWith('ar');
        const id = body.requestId || crypto.randomUUID();
        if (kind === 'create_lead') {
          const lead = makeLead({ id, name: values.name || 'New Lead', email: values.email || '', phone: values.phone || '', company: values.company || '', value: Number(values.value || 0), pipelineId: values.pipeline_id || 'main', stage: (values.stage as any) || 'LEAD_CAPTURED' });
          entityMutation('leads', lead.id, lead);
          return { ok: true, kind, recordId: lead.id, message: ar ? `تمت إضافة العميل **${lead.name}** بنجاح.` : `Created lead **${lead.name}** in CRM.`, href: '/dashboard/crm', hrefLabel: ar ? 'فتح إدارة العملاء (CRM)' : 'Open CRM & Leads', leads: [lead] } as T;
        }
        if (kind === 'update_lead_stage') {
          const existing = rows('leads').find(l => l.id === values.lead_id || String(l.name ?? '').toLowerCase().includes(String(values.lead_id ?? '').toLowerCase())) ?? rows('leads')[0];
          if (existing) {
            const updated = { ...existing, stage: values.stage || 'QUALIFIED', lifecycleStage: values.stage || 'QUALIFIED' };
            entityMutation('leads', existing.id, updated);
            return { ok: true, kind, recordId: existing.id, message: ar ? `تم نقل **${existing.name}** إلى المرحلة الجديدة.` : `Moved **${existing.name}** to ${values.stage}.`, href: '/dashboard/crm', hrefLabel: ar ? 'فتح إدارة العملاء (CRM)' : 'Open CRM & Leads', leads: [updated] } as T;
          }
        }
        if (kind === 'create_contact') {
          const contact = { id, name: values.name, email: values.email || '', phone: values.phone || '', company: values.company || '' };
          entityMutation('contacts', id, contact);
          return { ok: true, kind, recordId: id, message: ar ? `تمت إضافة جهة الاتصال **${values.name}**.` : `Added **${values.name}** to Contacts.`, href: '/dashboard/contacts', hrefLabel: ar ? 'فتح جهات الاتصال' : 'Open Contacts' } as T;
        }
        if (kind === 'create_appointment') {
          const booking = { id, name: values.customerName, serviceName: values.serviceName || 'Strategy Session', date: values.date, time: values.time, duration: Number(values.duration || 45), location: values.location || 'Google Meet', whatsapp: values.whatsapp || '', email: values.email || '', status: 'Confirmed' };
          entityMutation('bookings', id, booking);
          return { ok: true, kind, recordId: id, message: ar ? `تم تأكيد موعد **${booking.serviceName}** للعميل **${booking.name}**.` : `Confirmed appointment for **${booking.name}** on ${booking.date} at ${booking.time}.`, href: '/dashboard/booking?tab=bookings', hrefLabel: ar ? 'فتح الحجوزات والتقويم' : 'Open Booking & Calendar' } as T;
        }
        if (kind === 'create_knowledge') {
          const src = { id, name: values.name, type: values.sourceType || 'text', url: values.url || null, content: values.content || '', status: 'ready', chunk_count: 2 };
          entityMutation('knowledge', id, src);
          return { ok: true, kind, recordId: id, message: ar ? `تمت إضافة **${values.name}** إلى قاعدة المعرفة.` : `Added **${values.name}** to AI Knowledge Base.`, href: '/dashboard/follow-up', hrefLabel: ar ? 'فتح المتابعة الذكية' : 'Open AI Follow-Up' } as T;
        }
        if (kind === 'update_assistant') {
          write('assistant', {
            live_enabled: values.live_enabled === 'true',
            tone: values.tone || 'Friendly',
            use_emojis: values.use_emojis !== 'false',
            channels: { whatsapp: values.whatsapp === 'true', instagram: values.instagram === 'true', messenger: values.messenger === 'true', webchat: values.webchat === 'true' },
          });
          return { ok: true, kind, recordId: 'assistant', message: ar ? 'تم تحديث إعدادات المساعد الذكي بنجاح.' : 'Updated AI Assistant settings.', href: '/dashboard/follow-up', hrefLabel: ar ? 'فتح المتابعة الذكية' : 'Open AI Follow-Up' } as T;
        }
        if (kind === 'landing') {
          const lang: 'ar' | 'en' = (values.language === 'ar' || values.language === 'en') ? values.language : (ar ? 'ar' : 'en');
          const funnelGoal: AIFunnelGoal = values.funnelType === 'sale' ? 'sale' : values.funnelType === 'booking' ? 'booking' : 'audience';
          const tone: AIFunnelTone = (['persuasive', 'executive', 'friendly', 'urgent'].includes(values.tone || '') ? values.tone : 'persuasive') as AIFunnelTone;
          const brief: AIFunnelBrief = {
            funnelName: values.name || (lang === 'ar' ? 'فانل احترافي' : 'High-Converting Funnel'),
            businessName: values.businessName || values.name || 'UpKlick Workspace',
            niche: values.niche || (lang === 'ar' ? 'الخدمات والاستشارات' : 'Digital Business'),
            goal: funnelGoal,
            audienceAndPainPoints: [values.targetAudience, values.painPoints].filter(Boolean).join(' — ') || (lang === 'ar' ? 'العملاء الباحثون عن نتائج واضحة' : 'Ideal customers seeking fast results'),
            offer: values.offerSummary || values.content || values.name || 'Core Offer',
            price: values.price || '0',
            currency: ((values.currency || 'USD') as CurrencyCode),
            language: lang,
            tone,
            accentColor: values.accentColor || '#7C3AED',
          };
          const draftCopy = synthesizeTailoredDraft(brief);
          if (values.headline?.trim()) draftCopy.headline = values.headline.trim();
          if (values.primaryCta?.trim()) {
            draftCopy.cta = values.primaryCta.trim();
            draftCopy.formCta = values.primaryCta.trim();
          }
          const builtAsset = buildAIFunnelAsset(brief, draftCopy);
          builtAsset.id = id;
          if (values.assetKind === 'website') builtAsset.kind = 'website';
          entityMutation('assets', id, builtAsset);
          write('gos.assets.workspace.v1', { assets: rows('assets'), domains: rows('domains') });
          const pages = builtAsset.document.pages ?? [];
          const totalSections = pages.reduce((sum, p) => sum + (p.sections?.length ?? 0), 0);
          const summary = {
            assetId: id,
            name: builtAsset.name,
            assetKind: builtAsset.kind,
            funnelType: values.funnelType || funnelGoal,
            language: lang,
            accentColor: brief.accentColor || '#7C3AED',
            headline: draftCopy.headline,
            stepsCount: pages.length,
            totalSections,
            firstPageId: pages[0]?.id ?? '',
            steps: pages.map(p => ({ id: p.id, name: p.name, category: p.stepCategory || 'Landing', sectionCount: p.sections?.length ?? 0 })),
          };
          const targetHref = `/${builtAsset.kind === 'website' ? 'dashboard/websites' : 'dashboard/funnels'}/${id}`;
          return {
            ok: true,
            kind,
            recordId: id,
            message: lang === 'ar'
              ? `تم تصميم وبناء الفانل **${builtAsset.name}** (${pages.length} خطوات · ${totalSections} قسماً).`
              : `Built your AI funnel **${builtAsset.name}** (${pages.length} steps · ${totalSections} sections).`,
            href: targetHref,
            hrefLabel: lang === 'ar' ? 'فتح الفانل في المحرر' : 'Open Funnel Builder',
            asset: builtAsset,
            summary,
          } as T;
        }
        const resource = kind === 'campaign' ? 'templates' : kind === 'booking' ? 'calendars' : 'products';
        const href = kind === 'campaign' ? '/dashboard/follow-up' : kind === 'booking' ? '/dashboard/booking' : '/dashboard/products';
        entityMutation(resource, id, { ...(body.record ?? values), id, name: values.name });
        return { ok: true, kind, recordId: id, message: ar ? `تم حفظ **${values.name}** بنجاح.` : `Saved **${values.name}** in your workspace.`, href, hrefLabel: ar ? 'فتح في مساحة العمل' : 'Open in Workspace' } as T;
      }
      spendCredits();
      const rawPrompt = String(body.text ?? body.focus ?? '').replace(/\n\n\[Thinking level: [^\]]+\]$/, '').trim();
      const ar = /[\u0600-\u06FF]/.test(rawPrompt) || String(body.uiLanguage ?? '').startsWith('ar');
      const demoLeads = rows('leads');
      const demoPipelines = rows('pipelines').length ? rows('pipelines') : [mainPipeline];
      const meta = {
        pipelines: demoPipelines.map((p: any) => ({ id: p.id || 'main', name: p.name || 'Main Pipeline', stages: (p.stages ?? mainPipeline.stages).map((s: any) => ({ id: s.id, label: s.label })) })),
        calendars: rows('calendars').map((c: any) => ({ id: c.id, name: c.name, duration: c.duration || 45, location: c.location || 'Google Meet' })),
        leads: demoLeads.slice(0, 20).map((l: any) => ({ id: l.id, name: l.name, stage: l.stage || 'LEAD_CAPTURED', pipelineId: l.pipelineId || 'main', phone: l.phone || '', email: l.email || '' })),
        currency: 'USD',
      };
      const before = rows('copilotConversations').find(row => row.id === body.conversationId);
      const turnIndex = Math.floor(((before?.messages as any[])?.length ?? 0) / 2);
      const isQuestionOrAdvice = /[?؟]\s*$/.test(rawPrompt) || /^(?:how\s+(?:to|do|can|should)|what\s+(?:is|are|should)|why\s+|explain|tips|ideas|write\s+(?:a\s+)?(?:post|email|article))|^(?:ازاي|إزاي|كيف|هل|ليه|لماذا|تنصحني|ايه\s+رأيك|إيه\s+رأيك|اشرح|فكرة|أفكار|اكتبلي\s+(?:بوست|مقال|ايميل|إيميل))/i.test(rawPrompt.trim());

      let text = '';
      let grounded = false;
      let followUps: string[] = [];
      let form: any = null;
      let leadsOut: any[] | undefined;
      let href: string | undefined;
      let hrefLabel: string | undefined;

      if (/اسمك\s*ايه|انت\s*مين|أنت\s*مين|بتعمل\s*ايه|\b(what('?s| is) your name|who are you|what can you do)\b/i.test(rawPrompt)) {
        text = ar
          ? 'أنا **UpKlick Copilot** — مساعدك الذكي وشريكك في التفكير! تقدر تدردش معايا عادي خالص زي ChatGPT في أي موضوع (أفكار، كتابة محتوى، تسويق، برمجة، أو دردشة سريعة)، وكمان متوصل بمساحة شغلك لو حبيت في أي وقت تضيف عميل أو تحجز ميعاد أو تعمل حملة بفورم تفاعلية سريعة. تحب نبدأ بإيه؟'
          : "I'm **UpKlick Copilot** — your everyday conversational AI partner (just like ChatGPT) with live superpowers across your workspace! We can chat naturally about anything — brainstorming, writing copy, strategy, coding, or casual conversation — and whenever you want to create a lead, booking, or campaign, I'll pop open an interactive form for you.";
        followUps = ar
          ? ['اقترح عليّ 3 أفكار محتوى جذابة', 'إزاي أضاعف مبيعاتي الشهر ده؟', 'وريني العملاء المحتملين عندي']
          : ['Give me 3 viral content hooks', 'How can I boost conversions this week?', 'Show my hot leads'];
      } else if (/عامل\s*ايه|ازيك|إزيك|اخبارك|أخبارك|صباح|مساء|مرحبا|اهلا|أهلا|هاي|سلام\s*عليكم/i.test(rawPrompt) || /^(hi|hello|hey|yo|good\s+(morning|afternoon|evening)|how\s+are\s+you|what'?s\s+up|how'?s\s+it\s+going)\b/i.test(rawPrompt.trim())) {
        const arReplies = [
          'الحمد لله تمام وزي الفل! 😊 إنت عامل إيه النهاردة؟ طمني يومك ماشي إزاي؟',
          'يا أهلاً بيك! أنا في أحسن حال الحمد لله — قولّي إيه الأخبار عندك؟ بتفكر في حاجة معينة النهاردة ولا ندردش شوية؟',
          'منور الدنيا كلها! كله تمام الحمد لله وعالي العال. احكيلي، الشغل واليوم ماشيين معاك إزاي النهاردة؟',
        ];
        const enReplies = [
          "Doing great, thanks for asking! How's your day going so far — working on something fun or just checking in?",
          "Hey there! I'm doing awesome today. What's on your mind — feel like brainstorming, writing something cool, or just chatting?",
          "All good on my end! How are things going with you today?",
        ];
        text = ar ? arReplies[turnIndex % arReplies.length] : enReplies[turnIndex % enReplies.length];
        followUps = ar
          ? ['مضغوط شوية وعاوز أرتب يومي', 'قولي فكرة بوست سوشيال ميديا ذكية', 'احكيلي معلومة سريعة ومفيدة']
          : ['Help me organize my priorities today', 'Write a catchy social media post', 'Share a quick productivity tip'];
      } else if (/نكتة|ضحكني|\bjoke\b|\bfunny\b/i.test(rawPrompt)) {
        text = ar
          ? 'خد دي 😄:\nمرة مسوّق إلكتروني دخل مطعم، الجرسون قاله: «تحب تشوف المنيو؟»\nقاله: «لأ ابعتهالي على الواتساب عشان أعملك Retargeting لو معجبتنيش الأكلة!» 😂\n\nإيه رأيك، تحب واحدة كمان ولا نخش في الجد؟'
          : "Here's a quick one 😄:\nWhy did the marketer break up with the calendar?\nBecause he felt their days were numbered — and there was zero conversion! 😂\n\nWant another one, or what's on your mind next?";
        followUps = ar ? ['قولي واحدة كمان 😂', 'اكتبلي بوست خفيف يجيب تفاعل'] : ['Tell me another one!', 'Write an engaging social post'];
      } else if (/مضغوط|تعبان|زهقان|ترتيب\s+يوم|\b(stressed|overwhelmed|tired|bored|prioritize)\b/i.test(rawPrompt)) {
        text = ar
          ? 'حقك والله، ضغط الشغل ساعات بيخلّي الواحد حاسس إن كل حاجة محتاجة تتعمل في نفس اللحظة! خد نفس عميق الأول 🌟\n\nجرب القاعدة البسيطة دي دلوقتي:\n1. **اختار أهم مهمة واحدة بس** لو خلصت النهاردة هتحس بإنجاز حقيقي.\n2. **اقفل أي مشتتات 25 دقيقة** وابدأ فيها فوراً.\n3. **سيب الحاجات الروتينية عليّ** — سواء صياغة رسائل، أفكار، أو تنظيم ردود.\n\nتحب تحكيلي إيه أكتر حاجة شاغلة بالك دلوقتي ونفككها سوا؟'
          : "Totally relatable — when everything feels urgent at once, it's exhausting. Take a quick breath first!\n\nHere's a dead-simple reset for the next hour:\n1. **Pick just ONE high-impact task** that would make today a win.\n2. **Block 25 distraction-free minutes** just to get momentum.\n3. **Offload the heavy writing/planning to me** — tell me what's on your plate and we'll knock it out together!\n\nWhat's the #1 thing weighing on you right now?";
        followUps = ar ? ['ساعدني أكتب رسالة احترافية لعميل', 'رتبلي خطة عمل لـ 3 ساعات'] : ['Draft a polite client follow-up', 'Build me a 3-hour focus plan'];
      } else if (/show.*lead|hot\s+lead|وريني\s+العملاء|اعرض\s+العملاء|العملاء\s+المحتملين/i.test(rawPrompt)) {
        grounded = true;
        leadsOut = demoLeads.slice(0, 4);
        href = '/dashboard/crm';
        hrefLabel = ar ? 'فتح إدارة العملاء (CRM)' : 'Open CRM & Leads';
        text = ar ? `إليك أبرز **${leadsOut.length}** عملاء محتملين في مساحة عملك حالياً:` : `Here are the top **${leadsOut.length}** leads in your CRM right now:`;
      } else {
        const formKind = isQuestionOrAdvice
          ? null
          : /انقل|تغيير\s+مرحلة|\bmove\s+lead/i.test(rawPrompt) ? 'update_lead_stage' :
            /اضف\s+عميل|أضف\s+عميل|ضيف\s+عميل|عاوز\s+اضيف\s+عميل|عميل\s+جديد|\b(add|create|new)\s+(a\s+)?lead/i.test(rawPrompt) ? 'create_lead' :
            /جهة\s+اتصال|\b(add|create)\s+(a\s+)?contact/i.test(rawPrompt) ? 'create_contact' :
            /احجز\s+(موعد|ميعاد)|\b(book|schedule)\s+(an?\s+)?(appointment|call)/i.test(rawPrompt) ? 'create_appointment' :
            /خدمة\s+حجز|نظام\s+حجز|booking\s+flow|booking\s+service/i.test(rawPrompt) ? 'booking' :
            /(?:انشئ|أنشئ|اعمل|جهز|اطلق|افتح\s+نموذج\s+الحمل)\s*حمل|\b(create|launch|build|make|new|open)\s+(a\s+)?(tailored\s+|whatsapp\s+|email\s+|marketing\s+)?campaign/i.test(rawPrompt) ? 'campaign' :
            /(?:انشئ|أنشئ|اعمل|اضف|أضف|ضيف|افتح\s+نموذج\s+إنشاء)\s*(?:ال)?(?:منتج|كورس)|\b(create|build|make|add|new|open)\s+(a\s+)?(course|product)/i.test(rawPrompt) ? 'product' :
            /(?:افتح\s+نموذج|open.*brief|(?:انشئ|أنشئ|اعمل|ابني|صمم)\s*(?:لي\s+)?(?:صفحة\s+هبوط|فانل|موقع)|\b(create|build|design|make|new)\s+(a\s+)?(high-converting\s+|complete\s+)?(landing\s+page|funnel|website))/i.test(rawPrompt) ? 'landing' :
            /(?:اضف|أضف|ضيف|درب)\s+(?:معلومة|قاعدة\s+المعرفة)|\b(add|train)\s+.*knowledge/i.test(rawPrompt) ? 'create_knowledge' :
            /(?:فعل|شغل|اضبط|حدث)\s+(?:الرد\s+التلقائي|المساعد\s+الذكي)|\b(configure|update|enable)\s+(ai\s+)?(assistant|auto-reply)/i.test(rawPrompt) ? 'update_assistant' : null;
        if (formKind) {
          grounded = true;
          const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
          const phoneMatch = rawPrompt.match(/(?:\+?\d[\d\s-]{7,16}\d)/);
          const nameMatch = rawPrompt.match(/(?:اسمه|اسمها|باسم|named|called)\s+([\u0600-\u06FFA-Za-z\s]{2,30}?)(?=\s+(?:تليفون|رقم|phone|email)|$)/i);
          const defaults: Record<string, Record<string, string>> = {
            create_lead: { name: nameMatch?.[1]?.trim() ?? '', phone: phoneMatch?.[0]?.trim() ?? '', email: '', company: '', value: '', pipeline_id: meta.pipelines[0]?.id || 'main', stage: 'LEAD_CAPTURED', notes: '' },
            update_lead_stage: { lead_id: meta.leads[0]?.id || '', pipeline_id: meta.pipelines[0]?.id || 'main', stage: 'QUALIFIED', notes: '' },
            create_contact: { name: nameMatch?.[1]?.trim() ?? '', phone: phoneMatch?.[0]?.trim() ?? '', email: '', company: '' },
            create_appointment: { customerName: nameMatch?.[1]?.trim() ?? '', serviceName: meta.calendars[0]?.name || (ar ? 'جلسة استشارية' : 'Strategy Session'), date: tomorrow, time: '11:00', duration: '45', location: 'Google Meet', whatsapp: phoneMatch?.[0]?.trim() ?? '', email: '' },
            booking: { name: ar ? 'جلسة استشارية' : 'Strategy Session', duration: '45', price: '0', currency: 'USD', location: 'Google Meet', schedulePreset: 'mon_fri_9_5', bufferTime: '15', bookingMode: '1on1', requireApproval: 'false', confirmationBody: '', content: ar ? 'جلسة تشخيص وخطة عمل مخصصة.' : 'One-on-one strategy consultation.' },
            campaign: { name: ar ? 'حملة متابعة واتساب' : 'WhatsApp Growth Campaign', channel: 'WhatsApp', audience: 'All Leads', goal: '', stepsCount: '3', tone: String(body.replyStyle || 'friendly'), useEmojis: body.useEmojis === false ? 'false' : 'true', cta: '', content: ar ? 'أهلاً بك! حابين نساعدك تبدأ معانا خطوة بخطوة — تحب نحجز مكالمة سريعة؟' : 'Hi! Ready to take the next step? Reply here to claim your spot.' },
            product: { name: ar ? 'البرنامج التدريبي المتكامل' : 'Signature Coaching Program', productType: 'Online Course', price: '199', currency: 'USD', billing: 'One-time', deliveryMethod: 'portal', targetAudience: '', guarantee: '', content: ar ? 'برنامج عملي متكامل لمضاعفة المبيعات.' : 'Step-by-step program to scale your revenue.' },
            landing: { name: '', assetKind: 'funnel', funnelType: /حجز|استشار|book/i.test(rawPrompt) ? 'booking' : /بيع|كورس|sale|course/i.test(rawPrompt) ? 'sale' : 'audience', stepsCount: '3', businessName: '', niche: '', targetAudience: '', painPoints: '', offerSummary: '', uniqueValue: '', price: '0', currency: 'USD', headline: '', primaryCta: '', tone: 'persuasive', useEmojis: body.useEmojis === false ? 'false' : 'true', language: ar ? 'ar' : 'en', accentColor: '#7C3AED', goal: 'Capture Leads', content: '' },
            create_knowledge: { name: ar ? 'معلومات عن خدماتنا' : 'Business Overview', sourceType: 'text', url: '', content: '' },
            update_assistant: { live_enabled: 'true', whatsapp: 'true', instagram: 'true', messenger: 'true', webchat: 'true', tone: 'Friendly', use_emojis: 'true', goal: ar ? 'الرد على العملاء وحجز المواعيد' : 'Answer customer questions and book calls' },
          };
          form = { id: `form-${crypto.randomUUID()}`, kind: formKind, status: 'pending', values: defaults[formKind] ?? {}, meta };
          text = ar
            ? 'سمعتك جيداً! جهزت لك النموذج التفاعلي بالأسفل — راجع البيانات أو أكمل الحقول المطلوبة واضغط تأكيد.'
            : 'Got it! Fill in or review the interactive form below and click Confirm to save it to your workspace.';
        } else {
          text = ar
            ? `سؤال ممتاز! خليني أفكر معاك بشكل عملي ومباشر حول **«${rawPrompt.slice(0, 65)}»**:\n\n1. **التركيز على القيمة والوضوح:** أي فكرة أو رسالة بتنجح لما تبدأ بالمشكلة الحقيقية اللي بتهم جمهورك بلغة بسيطة وقريبة منهم.\n2. **خطوة تنفيذية سريعة:** ابدأ بتجربة صغيرة وقيس التفاعل خلال أول 48 ساعة بدل الانتظار للكمال.\n3. **المتابعة الذكية:** السر دايماً في الاستمرارية والرد السريع والودود.\n\nتحب نكتب صياغة جاهزة دلوقتي أو نفصّل نقطة معينة أكتر؟`
            : `Great point! Let's break down **"${rawPrompt.slice(0, 65)}"** practically:\n\n1. **Lead with clarity & value:** Hook attention in the first line by addressing the exact outcome that matters most.\n2. **Test fast, iterate faster:** Launch a lean version today and measure real engagement within 48 hours.\n3. **Keep momentum warm:** Consistent, human follow-ups turn interest into lasting results.\n\nWant me to draft ready-to-use copy for this, or dive deeper into step 1?`;
          followUps = ar
            ? ['اكتبلي صياغة عملية جاهزة للنشر', 'فصّل لي الخطوة الأولى بأمثلة', 'إزاي أطبق ده على مشروعي؟']
            : ['Write ready-to-use copy for this', 'Give me concrete examples', 'How do I apply this to my workspace?'];
        }
      }
      if (body.useEmojis === false) {
        const stripEmoji = (s: string) => s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0E\uFE0F\u200D]+/gu, '').replace(/[ \t]{2,}/g, ' ').trim();
        text = stripEmoji(text);
        followUps = followUps.map(stripEmoji).filter(Boolean);
      }
      const convId = body.conversationId || crypto.randomUUID();
      const userMsg = { id: body.requestId || crypto.randomUUID(), role: 'user', text: rawPrompt };
      const assistantMsg = { id: crypto.randomUUID(), role: 'assistant', text, grounded, ...(followUps.length ? { followUps } : {}), ...(form ? { form } : {}), ...(leadsOut ? { leads: leadsOut } : {}), ...(href ? { href, hrefLabel } : {}) };
      const updatedThread = { id: convId, title: before?.title ?? rawPrompt.slice(0, 60), group: 'Today', category: 'General', time: 'Just now', prompt: rawPrompt, updatedAt: new Date().toISOString(), messages: [...(before?.messages ?? []), userMsg, assistantMsg] };
      entityMutation('copilotConversations', convId, updatedThread);
      if (parts[2] === 'voice') {
        return { transcript: rawPrompt || (ar ? 'رسالة صوتية' : 'Voice note'), conversationId: convId, user: { ...userMsg, transcript: rawPrompt }, assistant: assistantMsg, grounded, followUps, form, leads: leadsOut, href, hrefLabel, conversation: updatedThread } as T;
      }
      return { text, grounded, followUps, conversationId: convId, form, leads: leadsOut, href, hrefLabel, conversation: updatedThread } as T;
    }
  }
  if (parts[0] === 'inbox') {
    if (parts[1] === 'conversations' && parts[2] && parts[3] === 'ai' && method === 'PATCH') {
      const existing = rows('conversations').find(row => row.id === parts[2]);
      const updated = { ...(existing ?? { id: parts[2] }), ai_paused: !body.ai_auto_reply, ai_state: body.ai_auto_reply ? 'answered' : 'human_takeover', updated_at: new Date().toISOString() };
      entityMutation('conversations', parts[2], updated);
      return { conversation: updated } as T;
    }
    if (parts[1] === 'conversations' && parts[2] && parts[3] === 'ai-reply' && method === 'POST') {
      const existing = rows('conversations').find(row => row.id === parts[2]);
      const now = new Date().toISOString();
      const reply = {
        id: crypto.randomUUID(),
        conversation_id: parts[2],
        direction: 'outbound',
        actor: 'assistant',
        body: 'Hello! Thanks for reaching out — how can we help you today?',
        buttons: [
          { id: 'ai_book', title: 'Book Appointment', kind: 'reply', url: null },
          { id: 'ai_services', title: 'Services & Prices', kind: 'reply', url: null },
          { id: 'ai_team', title: 'Talk to Team', kind: 'reply', url: null },
        ],
        outcome: 'answered',
        citations: [{ source_id: 'demo', source_name: 'Knowledge Base' }],
        created_at: now,
      };
      const updated = { ...(existing ?? { id: parts[2] }), ai_paused: false, ai_state: 'answered', last_message: reply.body, updated_at: now, messages: [...(existing?.messages ?? []), reply] };
      entityMutation('conversations', parts[2], updated);
      return { conversation: updated, message: reply, outcome: 'answered' } as T;
    }
    if (method === 'POST') { const conversation = created({ customer_name: body.customer_name ?? 'Demo customer', channel: body.channel ?? 'webchat', messages: [{ body: body.body, role: 'customer', created_at: new Date().toISOString() }] }); entityMutation('conversations', conversation.id, conversation); return { outcome: 'received', conversation, reply: null } as T; }
    const conversations = rows('conversations'), conversation = conversations.find(row => row.id === parts[2]);
    return (parts[2] ? { conversation, messages: conversation?.messages ?? [] } : { conversations }) as T;
  }
  if (parts[0] === 'crm') {
    const resource = parts[1], id = parts[2];
    if (resource === 'pipelines' && id === 'presets') return { presets: [{ ...mainPipeline, key: 'main', name: 'Sales pipeline' }] } as T;
    if (resource === 'leads' && id === 'export') return ['Name,Email,Stage', ...rows('leads').map(row => [row.name, row.email, row.stage].map(value => JSON.stringify(value ?? '')).join(','))].join('\n') as T;
    if (resource === 'leads' && id === 'bulk') {
      for (const leadId of body.lead_ids ?? []) {
        const lead = rows('leads').find(row => row.id === leadId); if (!lead) continue;
        const change = body.action === 'stage' ? { stage: body.value, lifecycleStage: body.value } : body.action === 'tag' ? { tags: [...(lead.tags ?? []), body.value] } : { owner: body.value };
        entityMutation('leads', leadId, body.action === 'delete' ? undefined : { ...lead, ...change });
      }
      return { leads: rows('leads') } as T;
    }
    if (resource === 'leads' && id === 'import') {
      const imported = { added: 0, updated: 0, skipped: 0 };
      const records = body.csv ? parseCSV(body.csv).slice(1).map(row => Object.fromEntries(Object.entries(body.mapping ?? {}).map(([field, index]) => [field, row[Number(index)] ?? '']))) : body.leads ?? body.rows ?? [];
      for (const record of records) {
        const existing = rows('leads').find(lead => lead.email?.toLowerCase() === record.email?.toLowerCase());
        if (existing && body.duplicates !== 'update') { imported.skipped++; continue; }
        const lead = makeLead({ ...existing, ...record, value: Number(record.value ?? 0), pipelineId: body.pipeline_id ?? 'main', id: existing?.id ?? crypto.randomUUID() });
        entityMutation('leads', lead.id, lead); imported[existing ? 'updated' : 'added']++;
      }
      return { import: imported, leads: rows('leads') } as T;
    }
    if (!['leads', 'pipelines'].includes(resource)) throw new Error('Unknown demo CRM resource.');
    if (method === 'DELETE') { entityMutation(resource, id); return { success: true } as T; }
    if (method !== 'GET') {
      if (parts[3] === 'notes') { const previous = rows(resource).find(row => row.id === id); entityMutation(resource, id, { ...previous, activities: [...(previous?.activities ?? []), { id: crypto.randomUUID(), type: 'note', title: body.note, detail: body.note, at: new Date().toISOString() }] }); }
      else {
        const previous = rows(resource).find(row => row.id === id);
        const value = { ...previous, ...body, id: id || body.id || crypto.randomUUID() };
        if (body.lifecycle_stage) Object.assign(value, { stage: body.lifecycle_stage, lifecycleStage: body.lifecycle_stage });
        if (body.pipeline_id) value.pipelineId = body.pipeline_id;
        const record = resource === 'leads' ? makeLead(value) : value;
        entityMutation(resource, record.id, record);
        return { [resource === 'leads' ? 'lead' : 'pipeline']: record } as T;
      }
    }
    return (id ? { [resource === 'leads' ? 'lead' : 'pipeline']: rows(resource).find(row => row.id === id) } : { [resource]: rows(resource) }) as T;
  }
  // Flow Builder: flows are kept in the demo store; the simulator and Messenger need the real API.
  if (parts[0] === 'flows') {
    const flows = read<ApiRecord[]>('flowBuilder.flows', []);
    const save = (next: ApiRecord[]) => write('flowBuilder.flows', next);
    const now = new Date().toISOString();
    if (!parts[1]) {
      if (method === 'POST') {
        const flow = { id: crypto.randomUUID().slice(0, 12), name: body.name, status: 'draft', draft: { triggers: [], rootId: null, nodes: {}, coordinates: {} }, live: null, has_unpublished_changes: false, updated_at: now };
        save([...flows, flow]); return flow as T;
      }
      return flows as T;
    }
    const flow = flows.find(row => row.id === parts[1]);
    if (!flow) throw new Error('Automation not found.');
    const update = (patch: ApiRecord) => { const next = { ...flow, ...patch, updated_at: now }; save(flows.map(row => row.id === flow.id ? next : row)); return next as T; };
    if (parts[2] === 'draft') return update({ draft: body.graph, name: body.name ?? flow.name, has_unpublished_changes: true });
    if (parts[2] === 'publish') return update({ live: flow.draft, status: 'live', has_unpublished_changes: false });
    if (parts[2] === 'stop') return update({ status: 'stopped' });
    if (parts[2] === 'stats') return {} as T;
    if (parts[2] === 'simulator') throw new Error('The demo account cannot run the simulator. Sign in to test flows.');
    return flow as T;
  }
  // WhatsApp message templates: created ones stay PENDING in the demo store; nothing reaches Meta.
  if (parts[0] === 'templates') {
    const templates = read<ApiRecord[]>('templates.v1', demoTemplates.map(t => ({ ...t, id: 'tpl_' + t.name, rejected_reason: null, quality: 'GREEN' })));
    const save = (next: ApiRecord[]) => write('templates.v1', next);
    if (method === 'POST') {
      if (!/^[a-z0-9_]{1,512}$/.test(body.name ?? '')) throw new Error('The name may only use lowercase letters, numbers and underscores (max 512).');
      if (templates.some(t => t.name === body.name && t.language === body.language)) throw new Error('A template with this name and language already exists.');
      const components = [
        body.header && { type: 'HEADER', format: body.header.format ?? 'TEXT', text: body.header.text },
        { type: 'BODY', text: body.body?.text ?? '' },
        body.footer?.text && { type: 'FOOTER', text: body.footer.text },
        body.buttons?.length && { type: 'BUTTONS', buttons: body.buttons },
      ].filter(Boolean);
      const vars = [...new Set<string>((body.body?.text ?? '').match(/\{\{\d+\}\}/g) ?? [])].map((p, i) => tv('body.' + (i + 1), 'body', p, body.body?.examples?.[i]));
      const template = { id: 'tpl_' + crypto.randomUUID().slice(0, 12), name: body.name, language: body.language, category: body.category, status: 'PENDING', rejected_reason: null, quality: null, components, variables: vars };
      save([...templates, template]); return { template } as T;
    }
    if (method === 'DELETE' && parts[1]) { save(templates.filter(t => t.name !== decodeURIComponent(parts[1]))); return { deleted: true, name: parts[1] } as T; }
    return { templates } as T;
  }
  // WhatsApp campaigns: sample templates and campaigns kept in the demo store, in the API's shapes; nothing is sent.
  if (parts[0] === 'campaigns') {
    const campaigns = read<ApiRecord[]>('campaigns.v2', demoCampaigns());
    const save = (next: ApiRecord[]) => write('campaigns.v2', next);
    const now = new Date().toISOString();
    if (parts[1] === 'templates') return { templates: demoTemplates } as T;
    if (parts[1] === 'test-message' || parts[2] === 'test-message') throw new Error('The demo account cannot send WhatsApp messages. Sign in to send a test.');
    if (parts[1] === 'audience' && parts[2] === 'upload') {
      const file = body instanceof FormData ? body.get('file') as File : null;
      const text = file ? await file.text() : String(body.content ?? '');
      const lines = parseCSV(text);
      const headers = (lines[0] ?? []).map(h => String(h).trim());
      write('campaigns.upload', { headers, rows: lines.slice(1) });
      const find = (re: RegExp) => headers.find(h => re.test(h)) ?? null;
      return { upload_id: 'demo-upload', filename: file?.name ?? null, headers, row_count: Math.max(0, lines.length - 1), sample: [], suggested: { phone_column: find(/phone|mobile|whats/i), name_column: find(/name/i) } } as T;
    }
    if (parts[1] === 'audience') {
      const a = body.audience ?? {};
      const digits = (p: unknown) => String(p ?? '').replace(/\D/g, '');
      const leads = rows('leads').filter(lead => lead.phone);
      const fromLeads = a.leads?.enabled ? leads.filter(l => (!a.leads.stages?.length || a.leads.stages.includes(l.stage)) && (!a.leads.tags?.length || a.leads.tags.some((t: string) => (l.tags ?? []).includes(t)))) : [];
      const manual = leads.filter(l => (a.lead_ids ?? []).includes(l.id));
      const upload = a.csv ? read<{ headers: string[]; rows: string[][] }>('campaigns.upload', { headers: [], rows: [] }) : { headers: [], rows: [] };
      const col = upload.headers.indexOf(a.csv?.phone_column);
      const csvPhones = upload.rows.map(r => digits(r[col]));
      const csv = csvPhones.filter(p => p.length >= 8);
      const phones = [...fromLeads.map(l => digits(l.phone)), ...csv, ...manual.map(l => digits(l.phone))];
      const unique = new Set(phones);
      return { total: unique.size, sources: { leads: fromLeads.length, csv: csv.length, manual: manual.length }, duplicates_removed: phones.length - unique.size, opted_out_excluded: 0, invalid: { count: csvPhones.length - csv.length, rows: [] }, sample: [...fromLeads, ...manual].slice(0, 3).map(l => ({ phone: l.phone, name: l.name ?? null })) } as T;
    }
    if (!parts[1]) {
      if (method === 'POST') {
        const campaign = { ...body, id: 'cmp_' + crypto.randomUUID().slice(0, 12), status: 'draft', counts: emptyCounts(), created_at: now, updated_at: now };
        save([campaign, ...campaigns]); return { campaign } as T;
      }
      return { campaigns, stats: {} } as T;
    }
    const campaign = campaigns.find(row => row.id === parts[1]);
    if (!campaign) throw new Error('Campaign not found.');
    const update = (patch: ApiRecord) => { const next = { ...campaign, ...patch, updated_at: now }; save(campaigns.map(row => row.id === campaign.id ? next : row)); return { campaign: next } as T; };
    if (method === 'DELETE') { save(campaigns.filter(row => row.id !== campaign.id)); return { deleted: true } as T; }
    if (method === 'PATCH') return update(body);
    if (parts[2] === 'launch') return campaign.schedule?.mode === 'later'
      ? update({ status: 'scheduled', scheduled_at: now })
      : update({ status: 'completed', started_at: now, completed_at: now, counts: { recipients: 120, sent: 116, delivered: 112, read: 80, replied: 14, failed: 4 } });
    if (parts[2] === 'cancel') return update({ status: 'cancelled', cancelled_at: now });
    if (parts[2] === 'duplicate') {
      const copy = { ...campaign, id: 'cmp_' + crypto.randomUUID().slice(0, 12), name: campaign.name + ' (copy)', status: 'draft', counts: emptyCounts(), created_at: now, started_at: null, completed_at: null };
      save([copy, ...campaigns]); return { campaign: copy } as T;
    }
    if (parts[2] === 'resend-failed') {
      const c = campaign.counts;
      return { requeued: c.failed, ...update({ counts: { ...c, failed: 0, sent: c.sent + c.failed, delivered: c.delivered + c.failed } }) } as T;
    }
    if (parts[2] === 'recipients') {
      const sample = campaign.counts?.sent ? demoRecipients : [];
      if (parts[3] === 'export') return ['name,phone,status,error', ...sample.map(r => [r.name, r.phone, r.status, r.error ?? ''].map(v => JSON.stringify(v ?? '')).join(','))].join('\n') as T;
      const status = url.searchParams.get('status');
      const list = status ? sample.filter(r => r.status === status) : sample;
      return { recipients: list, total: list.length, page: 1 } as T;
    }
    return { campaign } as T;
  }
  throw new Error('Unknown demo API action: ' + url.pathname);
}

const emptyCounts = () => ({ recipients: 0, sent: 0, delivered: 0, read: 0, replied: 0, failed: 0 });
const tv = (key: string, component: string, placeholder: string, example: string | null = null) => ({ key, component, placeholder, example });
const demoTemplates = [
  { name: 'white_friday_offer', language: 'ar', category: 'MARKETING', status: 'APPROVED', variables: [tv('body.1', 'body', '{{1}}'), tv('body.2', 'body', '{{2}}', '30%')], components: [{ type: 'HEADER', format: 'TEXT', text: 'عرض الجمعة البيضاء' }, { type: 'BODY', text: 'أهلًا {{1}}، خصم {{2}} على كل المنتجات حتى نهاية الأسبوع.' }, { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'تسوّق الآن', url: 'https://example.com' }] }] },
  { name: 'booking_reminder', language: 'ar', category: 'UTILITY', status: 'APPROVED', variables: [tv('body.1', 'body', '{{1}}'), tv('body.2', 'body', '{{2}}'), tv('body.3', 'body', '{{3}}')], components: [{ type: 'BODY', text: 'مرحبًا {{1}}، نذكّرك بموعدك يوم {{2}} الساعة {{3}}.' }] },
  { name: 'product_launch', language: 'en', category: 'MARKETING', status: 'APPROVED', variables: [tv('body.1', 'body', '{{1}}')], components: [{ type: 'BODY', text: 'Hi {{1}}, our new collection is live. Reply YES to get early access.' }] },
];

function demoCampaigns(): ApiRecord[] {
  const day = 86400000;
  return [
    { id: 'demo-wf', name: 'عرض الجمعة البيضاء', status: 'completed', template: { name: 'white_friday_offer', language: 'ar' }, variables: { 'body.1': { type: 'field', field: 'name', fallback: 'عميلنا العزيز' }, 'body.2': { type: 'text', value: '30%' } }, audience: {}, schedule: { mode: 'now' }, counts: { recipients: 482, sent: 478, delivered: 467, read: 356, replied: 61, failed: 4 }, started_at: new Date(Date.now() - 2 * day).toISOString() },
    { id: 'demo-launch', name: 'إطلاق المنتج الجديد', status: 'scheduled', template: { name: 'product_launch', language: 'en' }, variables: { 'body.1': { type: 'field', field: 'first_name', fallback: 'there' } }, audience: {}, schedule: { mode: 'later', send_at: new Date(Date.now() + 3 * day).toISOString(), timezone: 'Africa/Cairo' }, counts: { recipients: 311, sent: 0, delivered: 0, read: 0, replied: 0, failed: 0 } },
  ];
}

const demoRecipients: ApiRecord[] = [
  { id: 'r1', name: 'Ahmed Samy', phone: '+201012345678', status: 'replied', lead_id: null, replied_at: new Date().toISOString() },
  { id: 'r2', name: 'Mona Khaled', phone: '+201123456789', status: 'read', read_at: new Date().toISOString() },
  { id: 'r3', name: 'Omar Farouk', phone: '+971501234567', status: 'failed', error: 'The number is not on WhatsApp', failed_at: new Date().toISOString() },
  { id: 'r4', name: 'Sara Adel', phone: '+201007654321', status: 'delivered', delivered_at: new Date().toISOString() },
];
// Keep the application's API contract while replacing its transport exclusively.
const request = (path: string, method = 'GET', body?: any) => gosRequest<any>(path, { method, body });
export const gosApi = {
  health: () => request('/health'), me: () => request('/auth/me'), verify: () => request('/auth/verify'), firestoreStatus: () => request('/firestore/status'),
  sources: () => request('/ai/sources'), source: (id: string) => request('/ai/sources/' + id), createSource: (body: any) => request('/ai/sources', 'POST', body), deleteSource: (id: string) => request('/ai/sources/' + id, 'DELETE'),
  training: () => request('/ai/training'), channels: () => request('/ai/channels'), updateChannel: (channel: string, enabled: boolean, credentials?: any) => request('/ai/channels/' + channel, 'PUT', { enabled, ...credentials }),
  assistant: () => request('/ai/assistant'), updateAssistant: (body: any) => request('/ai/assistant', 'PUT', body), playground: () => request('/ai/playground'), ask: (question: string) => request('/ai/playground', 'POST', { question }), grade: (id: string, verdict: string, note: string) => request('/ai/playground/' + id + '/grade', 'POST', { verdict, note }),
  copilotConversations: () => request('/ai/copilot/conversations'),
  copilot: (body: any) => request('/ai/copilot', 'POST', body),
  copilotStream: async (body: any, handlers: any = {}) => {
    handlers.onStatus?.('generating');
    const res = await request('/ai/copilot', 'POST', body);
    const words = String(res?.text ?? '').split(/(\s+)/).filter(Boolean);
    for (let i = 0; i < words.length; i += 2) {
      handlers.onDelta?.(words.slice(i, i + 2).join(''));
      await new Promise(resolve => setTimeout(resolve, 18));
    }
    return res;
  },
  submitCopilotAction: (body: any) => request('/ai/copilot/action', 'POST', body),
  transcribeCopilotAudio: (body: any) => request('/ai/copilot/transcribe', 'POST', body),
  copilotVoice: (body: any) => request('/ai/copilot/voice', 'POST', body),
  copilotVoiceStream: async (body: any, handlers: any = {}) => {
    handlers.onStatus?.('transcribing');
    const res = await request('/ai/copilot/voice', 'POST', body);
    if (res?.transcript) {
      handlers.onTranscript?.({ transcript: res.transcript, conversationId: res.conversationId, user: res.user });
    }
    const words = String(res?.assistant?.text ?? '').split(/(\s+)/).filter(Boolean);
    for (let i = 0; i < words.length; i += 2) {
      handlers.onDelta?.(words.slice(i, i + 2).join(''));
      await new Promise(resolve => setTimeout(resolve, 18));
    }
    return res;
  },
  createCopilotDraft: (body: any) => request('/ai/copilot/draft', 'POST', body),
  smartReply: (question: string) => request('/ai/playground', 'POST', { question }),
  conversations: () => request('/inbox/conversations'), conversation: (id: string) => request('/inbox/conversations/' + id), inboxSummary: () => request('/inbox/conversations'), receiveMessage: (body: any) => request('/inbox/messages', 'POST', body),
  pipelines: () => request('/crm/pipelines'), pipeline: (id: string) => request('/crm/pipelines/' + id), presets: () => request('/crm/pipelines/presets'), installPreset: () => request('/crm/pipelines', 'POST', { ...mainPipeline, id: crypto.randomUUID() }), createPipeline: (body: any) => request('/crm/pipelines', 'POST', body), updatePipeline: (id: string, body: any) => request('/crm/pipelines/' + id, 'PUT', body),
  leads: () => request('/crm/leads'), lead: (id: string) => request('/crm/leads/' + id), createLead: (body: any) => request('/crm/leads', 'POST', body), updateLead: (id: string, body: any) => request('/crm/leads/' + id, 'PATCH', body), moveLead: (id: string, lifecycle_stage: string) => request('/crm/leads/' + id + '/stage', 'POST', { lifecycle_stage }), addNote: (id: string, note: string) => request('/crm/leads/' + id + '/notes', 'POST', { note }), deleteLead: (id: string) => request('/crm/leads/' + id, 'DELETE'), bulkLeads: (lead_ids: string[], action: string, value?: string) => request('/crm/leads/bulk', 'POST', { lead_ids, action, value }), importLeads: (body: any) => request('/crm/leads/import', 'POST', body), exportLeads: (id: string) => request('/crm/leads/export?pipeline_id=' + id),
};

/** Demo accounts have no stored WhatsApp media. */
export const inboxMediaUrl = async (_apiPath: string): Promise<string> => { throw new Error("Media is not available in the demo."); };
