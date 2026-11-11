type Prompt = { id: string; label: string };
export type ScreeningQuestion = Prompt & ({ type: 'minimum' } | { type: 'choice'; options: string[] });
export type QualificationQuestion = Prompt & (
  | { type: 'minimum'; minimum: number }
  | { type: 'choice'; options: string[]; accepted: string[] }
);
export type ScreeningResponse = Prompt & { answer: string };
export type QualificationResult =
  | { status: 'qualified'; responses: ScreeningResponse[] }
  | { status: 'ineligible'; responses: ScreeningResponse[] }
  | { status: 'incomplete'; responses?: ScreeningResponse[] };
export type PublicQualificationResult = { status: 'qualified' } | { status: 'ineligible' } | { status: 'incomplete'; screeningQuestions: ScreeningQuestion[] };

export const MAX_SCREENING_QUESTIONS: number;
export const MAX_SCREENING_CHOICES: number;
export const MAX_SCREENING_LABEL: number;
export const MAX_SCREENING_CHOICE: number;
export function validQualificationQuestions(value: unknown): value is QualificationQuestion[];
export function extractCalendarQualificationRules(calendar: Record<string, unknown> | undefined): unknown;
export function sanitizePublicFormQuestions(questions: unknown): unknown;
export function publicScreeningQuestions(questions: QualificationQuestion[]): ScreeningQuestion[];
export function evaluateQualification(questions: QualificationQuestion[], answers: unknown): QualificationResult;
