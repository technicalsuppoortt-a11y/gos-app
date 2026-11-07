// Shared catalog for server enforcement and the admin editor.
export const CREDIT_ACTIONS = Object.freeze({
  copilot_chat: ['AI Copilot', 'مساعد الذكاء الاصطناعي', 'Standard chat', 'المحادثة العادية', 2],
  copilot_web_search: ['AI Copilot', 'مساعد الذكاء الاصطناعي', 'Web search', 'البحث على الويب', 4],
  copilot_deep_research: ['AI Copilot', 'مساعد الذكاء الاصطناعي', 'Deep research', 'البحث المتعمق', 8],
  website_ai_generate: ['AI Copilot', 'مساعد الذكاء الاصطناعي', 'Website and landing page generator', 'إنشاء المواقع وصفحات الهبوط', 10],
  funnel_ai_generate: ['AI Copilot', 'مساعد الذكاء الاصطناعي', 'Funnel generator', 'إنشاء مسارات التسويق', 10],
  form_ai_generate: ['AI Copilot', 'مساعد الذكاء الاصطناعي', 'Form builder and dynamic fields', 'إنشاء النماذج والحقول الديناميكية', 3],
  booking_ai_setup: ['AI Copilot', 'مساعد الذكاء الاصطناعي', 'Booking and calendar setup', 'إعداد الحجز والتقويم', 3],
  copilot_draft: ['AI Copilot', 'مساعد الذكاء الاصطناعي', 'Project draft creation', 'إنشاء مسودة مشروع', 3],
  voice_transcribe: ['Copilot Voice', 'المساعد الصوتي', 'Voice transcription', 'تفريغ التسجيل الصوتي', 2],
  voice_extract: ['Copilot Voice', 'المساعد الصوتي', 'Full voice extraction', 'الاستخراج الكامل من الصوت', 4],
  playground_test: ['Knowledge Base & Playground', 'قاعدة المعرفة والاختبار', 'Playground test', 'اختبار قاعدة المعرفة', 1],
  inbox_simulation: ['Knowledge Base & Playground', 'قاعدة المعرفة والاختبار', 'Live message simulation', 'محاكاة رسالة مباشرة', 2],
  knowledge_text: ['Knowledge Base & Playground', 'قاعدة المعرفة والاختبار', 'Text, FAQ, and instructions', 'النص والأسئلة الشائعة والتعليمات', 1],
  knowledge_file_upload: ['Knowledge Base & Playground', 'قاعدة المعرفة والاختبار', 'File upload and indexing', 'رفع الملفات وفهرستها', 3],
  knowledge_url_crawl: ['Knowledge Base & Playground', 'قاعدة المعرفة والاختبار', 'Website crawling and indexing', 'الزحف للمواقع وفهرستها', 5],
  followup_generate: ['Follow-Up & Inbox', 'المتابعة وصندوق الوارد', 'Follow-up generation', 'إنشاء رسالة متابعة', 2],
  inbox_smart_reply: ['Follow-Up & Inbox', 'المتابعة وصندوق الوارد', 'Inbox smart reply', 'الرد الذكي', 1],
  live_auto_reply: ['Follow-Up & Inbox', 'المتابعة وصندوق الوارد', 'Live channel auto-reply', 'الرد الآلي على القنوات', 2],
  email_send_single: ['Email', 'البريد الإلكتروني', 'Single and bulk email', 'إرسال بريد فردي وجماعي', 1],
  email_send_attachment: ['Email', 'البريد الإلكتروني', 'Email with large attachments', 'بريد بمرفقات كبيرة', 2],
});

export const MAX_CREDIT_WEIGHT = 100000;
export const creditActions = Object.freeze(Object.keys(CREDIT_ACTIONS));
export const creditBucket = action => action.startsWith('email_send_') ? 'email' : 'ai';
export const creditSettingsPath = providerId => providerId === 'platform'
  ? 'billingSettings/creditWeights'
  : `billingSettings/creditWeights/providers/${providerId}`;

export function creditRule(action, overrides) {
  const saved = overrides?.[action];
  return {
    enabled: saved?.enabled !== false,
    weight: Number.isInteger(saved?.weight) && saved.weight >= 0 && saved.weight <= MAX_CREDIT_WEIGHT ? saved.weight : CREDIT_ACTIONS[action][4],
  };
}

export function copilotAction({ webSearch, deepResearch }) {
  return deepResearch === true ? 'copilot_deep_research' : webSearch === true ? 'copilot_web_search' : 'copilot_chat';
}
