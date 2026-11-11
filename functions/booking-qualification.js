// @ts-check

export const MAX_SCREENING_QUESTIONS = 10;
export const MAX_SCREENING_CHOICES = 12;
export const MAX_SCREENING_LABEL = 160;
export const MAX_SCREENING_CHOICE = 100;

/** @typedef {import('./booking-qualification.js').QualificationQuestion} QualificationQuestion */
/** @typedef {import('./booking-qualification.js').ScreeningQuestion} ScreeningQuestion */
/** @typedef {import('./booking-qualification.js').QualificationResult} QualificationResult */

/** @param {unknown} value @returns {value is Record<string, unknown>} */
const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
/** @param {unknown} value @param {number} limit @returns {value is string} */
const validText = (value, limit) => typeof value === 'string' && value.length <= limit && !!value.trim() && value === value.trim();

/** @param {unknown} value @returns {value is QualificationQuestion[]} */
export function validQualificationQuestions(value) {
  if (!Array.isArray(value) || value.length > MAX_SCREENING_QUESTIONS) return false;
  const ids = new Set();
  for (const q of value) {
    if (!isRecord(q) || typeof q.id !== 'string' || !/^[\w-]{1,150}$/.test(q.id) || ids.has(q.id) || !validText(q.label, MAX_SCREENING_LABEL)) return false;
    ids.add(q.id);
    if (q.type === 'minimum') {
      if (typeof q.minimum !== 'number' || !Number.isFinite(q.minimum) || q.minimum < 0) return false;
    } else {
      const { options, accepted } = q;
      if (q.type !== 'choice' || !Array.isArray(options) || options.length < 2 || options.length > MAX_SCREENING_CHOICES ||
          !options.every(option => validText(option, MAX_SCREENING_CHOICE)) || new Set(options).size !== options.length ||
          !Array.isArray(accepted) || !accepted.length || !accepted.every(option => options.includes(option))) return false;
    }
  }
  return true;
}

/**
 * Extracts qualification rules from either `calendar.qualificationQuestions` or
 * inline screening questions inside `calendar.questions` (`isScreening: true`).
 * @param {Record<string, unknown> | undefined} calendar
 * @returns {unknown}
 */
export function extractCalendarQualificationRules(calendar) {
  if (!isRecord(calendar)) return undefined;
  const inline = Array.isArray(calendar.questions)
    ? calendar.questions
        .filter(q => isRecord(q) && q.active !== false && q.isScreening === true && q.type !== 'text-block' && !['name', 'email', 'whatsapp'].includes(String(q.id || '')))
        .map(q => {
          const id = typeof q.id === 'string' ? q.id : '';
          const label = typeof q.label === 'string' ? q.label.trim() : '';
          const isChoice = q.screeningType === 'choice' || q.type === 'select' || q.type === 'radio';
          if (isChoice) {
            const options = Array.isArray(q.options) ? q.options.map(o => typeof o === 'string' ? o.trim() : o) : [];
            const accepted = Array.isArray(q.accepted) ? q.accepted.map(o => typeof o === 'string' ? o.trim() : o) : [];
            return { id, label, type: 'choice', options, accepted };
          }
          return { id, label, type: 'minimum', minimum: typeof q.minimum === 'number' ? q.minimum : Number(q.minimum) };
        })
    : [];
  if (Array.isArray(calendar.qualificationQuestions) && calendar.qualificationQuestions.length > 0) {
    if (!inline.length) return calendar.qualificationQuestions;
    const byId = new Map(calendar.qualificationQuestions.filter(isRecord).map(q => [q.id, q]));
    for (const item of inline) if (!byId.has(item.id)) byId.set(item.id, item);
    return [...byId.values()];
  }
  return inline.length ? inline : calendar.qualificationQuestions;
}

/**
 * Strips confidential screening criteria (`minimum`, `accepted`) from public form questions.
 * @param {unknown} questions
 */
export function sanitizePublicFormQuestions(questions) {
  if (!Array.isArray(questions)) return questions;
  return questions.map(q => {
    if (!isRecord(q)) return q;
    const { minimum: _min, accepted: _acc, ...safe } = q;
    return safe;
  });
}

/** @param {QualificationQuestion[]} questions @returns {ScreeningQuestion[]} */
export function publicScreeningQuestions(questions) {
  return questions.map(q => q.type === 'minimum'
    ? { id: q.id, label: q.label, type: q.type }
    : { id: q.id, label: q.label, type: q.type, options: q.options });
}

/** @param {QualificationQuestion[]} questions @param {unknown} answers @returns {QualificationResult} */
export function evaluateQualification(questions, answers) {
  const responses = [];
  let qualifies = true;
  for (const q of questions) {
    const raw = isRecord(answers) && Object.hasOwn(answers, q.id) ? answers[q.id] : undefined;
    if (typeof raw !== 'string' || raw.length > MAX_SCREENING_CHOICE || !raw.trim()) return { status: 'incomplete', responses: [] };
    const answer = raw.trim();
    if (q.type === 'minimum') {
      const amount = Number(answer);
      if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(answer) || !Number.isFinite(amount) || amount < 0) return { status: 'incomplete', responses: [] };
      if (amount < q.minimum) qualifies = false;
    } else {
      if (!q.options.includes(answer)) return { status: 'incomplete', responses: [] };
      if (!q.accepted.includes(answer)) qualifies = false;
    }
    responses.push({ id: q.id, label: q.label, answer });
  }
  return qualifies ? { status: 'qualified', responses } : { status: 'ineligible', responses };
}
