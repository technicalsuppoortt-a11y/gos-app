import { defaultConfig, formatPrice, kindLabels, type Product, type ProductKind } from './model';

export interface ProductPreset {
  id: string; kind: ProductKind; label: string; name: string; amount: number; description: string;
  features: string[]; included: string[]; modules?: Array<[string, string[]]>; duration?: number; fulfillment?: string; recurring?: boolean;
}
export const productPresets: ProductPreset[] = [
  { id: 'ebook', kind: 'digital', label: 'E-Book', name: 'The Creator’s Practical E-Book', amount: 29,
    description: 'A practical guide with clear chapters, actionable exercises and a downloadable implementation workbook.',
    features: ['PDF delivery setup', 'Lifetime access', 'Implementation workbook'], included: ['Digital guide (PDF)', 'Action workbook', 'Quick-start checklist'] },
  { id: 'asset-pack', kind: 'digital', label: 'Asset Pack', name: 'Brand & Content Asset Pack', amount: 49,
    description: 'An organized resource library of editable brand assets and content templates for your next launch.',
    features: ['ZIP delivery setup', 'Editable resources', 'Usage instructions'], included: ['Editable asset library', 'Content planning templates', 'Getting-started guide'] },
  { id: 'coaching', kind: 'service', label: '1-on-1 Coaching', name: '1-on-1 Coaching Session', amount: 150, duration: 60,
    description: 'A focused private coaching session to review your goals, work through challenges and define practical next steps.',
    features: ['60-minute online session', 'Client intake', 'Personal action plan'], included: ['Private coaching call', 'Goal review', 'Personal action plan'], fulfillment: 'Collect the client’s goals before the session. Connect a booking calendar, host a 60-minute call and send a written action plan afterward.' },
  { id: 'consultation', kind: 'service', label: 'Strategy Consultation', name: 'Business Strategy Consultation', amount: 250, duration: 90,
    description: 'A structured strategy consultation to identify opportunities, prioritize decisions and create a 90-day roadmap.',
    features: ['90-minute consultation', 'Opportunity assessment', '90-day roadmap'], included: ['Strategy call', 'Opportunity assessment', '90-day roadmap'], fulfillment: 'Collect a business overview and current priorities. Connect a booking calendar, host a 90-minute consultation and deliver the strategic roadmap.' },
  { id: 'masterclass', kind: 'course', label: 'Masterclass', name: 'Creator Launch Masterclass', amount: 99,
    description: 'A focused learning experience that turns one practical framework into a completed implementation project.',
    features: ['3 focused modules', 'Editable lesson outlines', 'Practical project'], included: ['Masterclass curriculum', 'Implementation exercises'],
    modules: [['Welcome & Preparation', ['Learning outcomes', 'Prepare your workspace']], ['The Core Framework', ['Understand the framework', 'Follow the guided demonstration']], ['Apply & Review', ['Complete your project', 'Review your next steps']]] },
  { id: 'video-course', kind: 'course', label: 'Multi-Module Video Course', name: 'From Idea to Launch: Video Course', amount: 199,
    description: 'A structured course that guides learners from foundations through execution, review and an independent final project.',
    features: ['5 course modules', 'Video lesson outlines', 'Capstone project'], included: ['Complete course curriculum', 'Practice exercises', 'Capstone project brief'],
    modules: [['Foundations', ['Welcome and learning path', 'Core concepts']], ['Planning', ['Define your goal', 'Build your project plan']], ['Execution', ['Step-by-step walkthrough', 'Guided practice']], ['Refinement', ['Review and improve', 'Common challenges']], ['Launch & Next Steps', ['Complete the capstone project', 'Create your next action plan']]] },
  { id: 'subscription', kind: 'digital', label: 'Resource Membership', name: 'Growth Resource Membership', amount: 49, recurring: true,
    description: 'A monthly library of practical resources, planning tools and implementation guides for growing creators.',
    features: ['Monthly recurring pricing', 'Member resources', 'Access while subscribed'], included: ['Member resource library', 'Monthly planning tools'] },
];

export function applyProductPreset(product: Product, preset: ProductPreset): Product {
  const type = kindLabels[preset.kind], previous = product.config;
  const config = defaultConfig(type);
  config.currency = previous?.currency || config.currency;
  config.taxRate = previous?.taxRate ?? config.taxRate;
  config.amount = preset.amount;
  config.billing = preset.recurring ? 'Subscription' : 'One-time';
  config.access = preset.recurring ? 'While subscribed' : 'Lifetime access';
  config.duration = preset.duration ?? config.duration;
  config.fulfillment = preset.fulfillment || '';
  config.thankYouUrl = previous?.thankYouUrl || '';
  config.automations.confirmation = previous?.automations.confirmation ?? config.automations.confirmation;
  config.modules = (preset.modules ?? []).map(([title, lessons]) => ({ title, lessons: lessons.map(title => ({ id: crypto.randomUUID(), title, kind: 'Video', duration: '', url: '' })) }));
  config.experience = { ...config.experience!, shortDescription: preset.description, oneTimeAmount: preset.amount,
    recurringEnabled: !!preset.recurring, recurringAmount: preset.recurring ? preset.amount : 0,
    included: preset.included.map(title => ({ id: crypto.randomUUID(), title, enabled: true })),
    paymentMethods: [...(previous?.experience?.paymentMethods ?? config.experience!.paymentMethods)],
    checkout: { ...config.experience!.checkout, ...previous?.experience?.checkout },
    taxHandling: previous?.experience?.taxHandling ?? config.experience!.taxHandling,
  };
  return { ...product, name: preset.name, description: preset.description, type, tag: type, status: 'Draft', image: undefined, config, price: formatPrice(config) };
}
