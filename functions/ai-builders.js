import { HttpsError } from 'firebase-functions/v2/https';
import { chargeAction } from './gos-metering.js';
import { recordAIUsage } from './ai-usage.js';

const pageSchema = {
  headline: 'string', description: 'string', cta: 'string',
  benefits: ['string'], faq: [{ question: 'string', answer: 'string' }],
};
const builders = {
  website: { action: 'website_ai_generate', permission: 'funnels', tool: 'funnel-builder', schema: pageSchema, instruction: 'Write a landing page headline, short description, call to action, exactly three benefit headings, and up to four FAQ entries.' },
  funnel: { action: 'funnel_ai_generate', permission: 'funnels', tool: 'funnel-builder', schema: { ...pageSchema, nextStep: 'string', confirmation: 'string' }, instruction: 'Draft a conversion funnel with an opening headline, short description, call to action, exactly three benefit headings, up to four FAQ entries, next-step copy, and a confirmation message.' },
  form: { action: 'form_ai_generate', permission: 'forms', tool: 'funnel-builder', schema: {
    name: 'string', description: 'string', fields: [{ label: 'string', type: { enum: ['text', 'email', 'tel', 'number', 'textarea', 'select', 'radio', 'checkbox'] }, required: 'boolean', placeholder: 'string', options: ['string'] }],
  }, instruction: 'Design an editable form with 2 to 12 fields, using choices for dropdown and radio fields and empty choices for other fields. Ask only for data needed for the stated purpose.' },
  booking: { action: 'booking_ai_setup', permission: 'booking', tool: 'booking-engine', schema: { name: 'string', description: 'string', duration: 'integer' },
    instruction: 'Draft a booking page title, concise description, and suggested appointment duration in minutes from 5 to 480. Never claim a booking exists or promise dates or availability.' },
};

function schema(shape) {
  if (typeof shape === 'string') return { type: shape };
  if (Array.isArray(shape)) return { type: 'array', items: schema(shape[0]) };
  if (shape.enum) return { type: 'string', enum: shape.enum };
  return { type: 'object', properties: Object.fromEntries(Object.entries(shape).map(([name, child]) => [name, schema(child)])), required: Object.keys(shape), additionalProperties: false };
}

function boundedOutput(value, spec) {
  if (spec.enum) return spec.enum.includes(value);
  if (spec.type === 'string') return typeof value === 'string' && value.length <= 2000;
  if (spec.type === 'boolean') return typeof value === 'boolean';
  if (spec.type === 'integer') return Number.isInteger(value) && value >= 5 && value <= 480;
  if (spec.type === 'array') return Array.isArray(value) && value.length <= 16 && value.every(item => boundedOutput(item, spec.items));
  return value && typeof value === 'object' && spec.required.every(key => boundedOutput(value[key], spec.properties[key]));
}

export async function generateBuilderDraft(request, { db, workspace, apiKey, model, fetcher = fetch }) {
  const { kind, brief } = request.data ?? {};
  if (typeof kind !== 'string' || !Object.hasOwn(builders, kind) || typeof brief !== 'string' || !brief.trim() || brief.length > 4000) {
    throw new HttpsError('invalid-argument', 'Enter a brief for a supported draft type.');
  }
  if (!apiKey) throw new HttpsError('failed-precondition', 'AI generation is unavailable until the AI service is configured.');
  const builder = builders[kind];
  const { user, root } = await workspace(request, builder.permission);
  await chargeAction(db, user, builder.action, builder.tool);
  const spec = schema(builder.schema);
  const response = await fetcher('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(60000),
    body: JSON.stringify({
      model, store: false, max_output_tokens: 2200,
      instructions: builder.instruction + ' Write in the language of the brief. Do not invent testimonials, pricing, locations, or business claims. Produce editable plain text without HTML.',
      input: brief.trim(),
      text: { format: { type: 'json_schema', name: 'builder_draft', schema: spec, strict: true } },
    }),
  }).catch(() => null);
  if (!response?.ok) throw new HttpsError('unavailable', 'Draft generation is temporarily unavailable.');
  const result = await response.json();
  const output = result.output?.flatMap(item => item.content ?? []).filter(item => item.type === 'output_text').map(item => item.text).join('');
  const draft = parseDraft(output);
  if (!boundedOutput(draft, spec) || !completeDraft(kind, draft)) {
    throw new HttpsError('internal', 'The assistant returned an incomplete draft. Try refining your brief.');
  }
  await recordAIUsage(root, result, builder.action).catch(error => console.warn('Could not record builder token usage', error));
  return draft;
}

function parseDraft(output) {
  try { return JSON.parse(output); } catch { return null; }
}

function completeDraft(kind, draft) {
  if (kind === 'booking') return Boolean(draft.name.trim());
  if (kind === 'form') {
    return draft.name.trim() && draft.fields.length >= 2 && draft.fields.length <= 12 && draft.fields.every(field =>
      field.label.trim() && (!['select', 'radio'].includes(field.type) || field.options.some(option => option.trim())));
  }
  return draft.headline.trim() && draft.description.trim() && draft.cta.trim() && draft.benefits.length === 3 && draft.faq.length <= 4;
}
