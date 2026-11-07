import { callBackend } from './firebase';
import type { FormField } from '../pages/page-template-data';

type PageDraft = {
  headline: string;
  description: string;
  cta: string;
  benefits: string[];
  faq: { question: string; answer: string }[];
};

type Drafts = {
  website: PageDraft;
  funnel: PageDraft & { nextStep: string; confirmation: string };
  form: { name: string; description: string; fields: Omit<FormField, 'id'>[] };
  booking: { name: string; description: string; duration: number };
};

export function generateBuilderDraft<K extends keyof Drafts>(kind: K, brief: string) {
  return callBackend<Drafts[K]>('generateBuilderDraft', { kind, brief }, 85000);
}
