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
    if (typeof raw !== 'string' || raw.length > MAX_SCREENING_CHOICE || !raw.trim()) return { status: 'incomplete' };
    const answer = raw.trim();
    if (q.type === 'minimum') {
      const amount = Number(answer);
      if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(answer) || !Number.isFinite(amount) || amount < 0) return { status: 'incomplete' };
      if (amount < q.minimum) qualifies = false;
    } else {
      if (!q.options.includes(answer)) return { status: 'incomplete' };
      if (!q.accepted.includes(answer)) qualifies = false;
    }
    responses.push({ id: q.id, label: q.label, answer });
  }
  return qualifies ? { status: 'qualified', responses } : { status: 'ineligible' };
}
