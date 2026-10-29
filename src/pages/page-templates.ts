import { createBuilderDocument } from './BuilderWorkspace';
import type { BuilderSection } from './BuilderWorkspace';
import type { Asset, BuilderMode } from './asset-model';

import type { PageTemplate } from './page-template-data';
export { pageTemplates, type PageTemplate } from './page-template-data';
export function createPageAsset(kind:BuilderMode|'form',name:string,template?:PageTemplate):Asset {
  const isForm = template?.mode === 'form' || kind === 'form';
  const effectiveKind: BuilderMode = isForm ? 'website' : (template?.mode === 'funnel' ? 'funnel' : (kind === 'funnel' ? 'funnel' : 'website'));
  const title = name.trim() || template?.name || (isForm ? 'Untitled form' : effectiveKind === 'funnel' ? 'Untitled funnel' : 'Untitled page');
  const document = initializePage(isForm ? 'form' : effectiveKind, title, template);
  return {
    id: crypto.randomUUID(),
    kind: effectiveKind,
    formAsset: isForm,
    name: title,
    document,
    image: template?.image || (isForm ? '/dashboard/product-consultation.png' : '/dashboard/hero-landscape.png'),
    description: template?.body || 'Blank page',
    domain: '',
    updated: new Date().toISOString(),
    settings: {
      seo: title,
      navigation: document.pages.map(page => page.name).join(', '),
      color: template?.color || (isForm ? '#7C3AED' : '#6366f1')
    }
  };
}
const block = (type: BuilderSection['type'], title: string, body = '', content: Record<string, string> = {}): BuilderSection => ({ id: crypto.randomUUID(), type, content: { title, body, ...content }, styles: { backgroundColor: '#ffffff', padding: '28', textAlign: 'Left', typography: 'Default', customCss: '', visibility: 'All devices', animation: 'None' } });

export function initializePage(mode: BuilderMode | 'form', name: string, template?: PageTemplate) {
  if (mode === 'form' || template?.mode === 'form') {
    const document = createBuilderDocument('website', name, template?.image || '/dashboard/product-consultation.png', 1);
    const page = document.pages[0];
    const fields = template?.fields || [
      { id: 'name', label: 'Full name', type: 'text', required: true, options: [], placeholder: 'Your name' },
      { id: 'email', label: 'Email address', type: 'email', required: true, options: [], placeholder: 'you@example.com' },
      { id: 'message', label: 'Message', type: 'textarea', required: false, options: [], placeholder: 'How can we help you?' }
    ];
    page.name = 'Form Page';
    page.path = '/';
    page.status = 'Draft';
    page.showHeader = false;
    page.showFooter = false;
    page.headline = template?.title || name;
    page.subheadline = template?.body || '';
    page.cta = template?.cta || 'Submit';
    page.sections = [
      block('Form', template?.title || name, template?.body || '', {
        title: template?.title || name,
        button: template?.cta || 'Submit',
        customFields: JSON.stringify(fields),
        fields: '[]',
        successMessage: 'Thank you! Your submission has been received.'
      })
    ];
    document.theme = { color: template?.color || '#7C3AED', font: 'Inter', corners: 'Square' };
    document.funnel.goal = template?.goal || 'Lead generation';
    document.pages = [page];
    document.steps = [];
    document.funnel.pagesFlow = [];
    return document;
  }
  const document = createBuilderDocument(mode, name, template?.image || '', 1);
  const page = document.pages[0];
  Object.assign(page, { name: 'Landing Page', path: '/', status: 'Draft', showHeader: false, showFooter: false, headline: template?.title || '', subheadline: template?.body || '', cta: template?.cta || '', seoTitle: name, seoDescription: template?.body || '', featuredImage: template?.image || '', sections: [] });
  if (template) {
    const action = 'Scroll to Section';
    const conversion = template.goal === 'Bookings'
      ? block('Booking', 'Let’s find a time that works for you', 'Choose a consultation time with our team.', { calendar: 'Consultations', serviceType: 'Introductory consultation · 30 minutes', timeSlots: 'Today · 2:00 PM,Tomorrow · 10:30 AM', button: 'Confirm booking', bookingMode: 'step' })
      : template.goal === 'Sales'
        ? block('Pricing', 'Choose your plan', 'Simple pricing. Clear value.', { plans: JSON.stringify([{ id: crypto.randomUUID(), name: template.name, price: template.id === 'studio' ? '49' : '29', period: template.id === 'studio' ? 'month' : 'one-time', features: template.benefits, button: 'Get started', highlighted: true }]) })
        : block('Form', template.cta, 'Leave your details and our team will be in touch.', { fields: JSON.stringify(['Name', 'Email', 'Message']), button: template.cta, successMessage: 'Thank you! Your request has been received.' });
    const benefits = block('Columns', '', '', { columnLayout: '3 Col (33/33/33)', gap: '20' });
    benefits.children = (template.benefits || []).map((title, index) => [block('Heading', title, '', { headingTag: 'H3' }), block('Paragraph', '', ['Designed around your needs, with a clear path forward.', 'Get practical support from people who care about your success.', 'Take the next step with confidence and ongoing guidance.'][index])]);
    page.sections = [block('Hero', template.title, template.body, { button: template.cta, destinationType: action, destination: conversion.id }), benefits, block('Testimonials', 'A better experience, from the first step', '', { testimonials: JSON.stringify([{ id: crypto.randomUUID(), author: 'Alex M.', role: 'Sample customer story', quote: 'Clear guidance and thoughtful support made getting started easy.', rating: 5, avatar: '' }]) }), conversion, block('FAQ', 'Questions before getting started?', 'Contact our team for help choosing the right option.')];
    document.theme = { color: template.color, font: 'Inter', corners: 'Square' };
    document.funnel.goal = template.goal;
  }
  if(template&&mode==='funnel') {
    const conversion=page.sections.find(item=>['Form','Booking','Pricing'].includes(item.type))!;
    const conversionPage={...structuredClone(page),id:crypto.randomUUID(),name:template.goal==='Bookings'?'Book a consultation':template.goal==='Sales'?'Choose your plan':'Get started',path:template.goal==='Bookings'?'/booking':template.goal==='Sales'?'/checkout':'/get-started',featuredImage:'',headline:conversion.content.title,subheadline:conversion.content.body,sections:[{...structuredClone(conversion),id:crypto.randomUUID()}]};
    const thanks={...structuredClone(page),id:crypto.randomUUID(),name:'Thank You',path:'/thank-you',featuredImage:'',headline:'Thank you!',subheadline:'Your next step is confirmed.',sections:[block('Heading','Thank you!','',{headingTag:'H1'}),block('Paragraph','','Your request has been received. Our team will be in touch shortly.')]};
    const target=conversionPage.sections[0];
    target.content.nextPage=thanks.id;target.content.destinationType='Next Step';target.content.destination=thanks.id;
    page.sections=page.sections.filter(item=>item.id!==conversion.id);
    page.sections[0].content.destinationType='Next Step';page.sections[0].content.destination=conversionPage.id;
    document.pages=[page,conversionPage,thanks];
    document.pages.forEach(item=>{item.isFunnelStep=true;});
    document.steps=[{id:crypto.randomUUID(),label:page.name,pageId:page.id,type:'Landing'},{id:crypto.randomUUID(),label:conversionPage.name,pageId:conversionPage.id,type:template.goal==='Bookings'?'Booking':template.goal==='Sales'?'Checkout':'Form'},{id:crypto.randomUUID(),label:thanks.name,pageId:thanks.id,type:'Thank You'}];
    document.funnel.pagesFlow=document.pages.map(item=>item.id);
  } else if(mode==='website') {
    page.name='Home';page.showHeader=true;page.showFooter=true;page.isFunnelStep=false;
    document.pages=[page];document.steps=[];document.funnel.pagesFlow=[];
  } else if (mode === 'funnel') document.steps[0].label = page.name;
  return document;
}
