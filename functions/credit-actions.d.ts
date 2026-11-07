export type CreditAction =
  | 'copilot_chat' | 'copilot_web_search' | 'copilot_deep_research'
  | 'website_ai_generate' | 'funnel_ai_generate' | 'form_ai_generate' | 'booking_ai_setup' | 'copilot_draft'
  | 'voice_transcribe' | 'voice_extract' | 'playground_test' | 'inbox_simulation' | 'knowledge_text'
  | 'knowledge_file_upload' | 'knowledge_url_crawl' | 'followup_generate' | 'inbox_smart_reply' | 'live_auto_reply'
  | 'email_send_single' | 'email_send_attachment';
export type CreditRule = { enabled: boolean; weight: number };
export type CreditRules = Partial<Record<CreditAction, CreditRule>>;
export type CreditSettings = { revision: number; rules: CreditRules };
export const CREDIT_ACTIONS: Readonly<Record<CreditAction, readonly [string, string, string, string, number]>>;
export const MAX_CREDIT_WEIGHT: number;
export const creditActions: readonly CreditAction[];
export function creditRule(action: CreditAction, overrides?: CreditRules): CreditRule;
export function creditBucket(action: CreditAction): 'ai' | 'email';
