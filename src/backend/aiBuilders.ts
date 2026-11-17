import { callBackend } from './firebase';
import type { FormField } from '../pages/page-template-data';

type PageDraft = {
  headline: string;
  description: string;
  cta: string;
  benefits: string[];
  faq: { question: string; answer: string }[];
};

export type FunnelArchitectDraft = {
  headline: string;
  subheadline: string;
  cta: string;
  benefits: { title: string; description: string }[];
  testimonials: { author: string; role: string; quote: string }[];
  formTitle: string;
  formSubheadline: string;
  formCta: string;
  formFields: {
    label: string;
    type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
    required: boolean;
    placeholder: string;
  }[];
  faq: { question: string; answer: string }[];
  orderHeadline: string;
  orderSummary: string;
  thankYouHeadline: string;
  thankYouBody: string;
  nextActionCta: string;
};

type Drafts = {
  website: PageDraft;
  funnel: PageDraft & { nextStep: string; confirmation: string };
  funnel_architect: FunnelArchitectDraft;
  form: { name: string; description: string; fields: Omit<FormField, 'id'>[] };
  booking: { name: string; description: string; duration: number };
};

export function generateBuilderDraft<K extends keyof Drafts>(kind: K, brief: string) {
  return callBackend<Drafts[K]>('generateBuilderDraft', { kind, brief }, 85000);
}
