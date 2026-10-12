import { createBuilderDocument } from './BuilderWorkspace';
import type { BuilderSection } from './BuilderWorkspace';
import type { Asset, BuilderMode } from './asset-model';

export const pageTemplates = [
  { mode: 'funnel' as const, id: 'fitness', name: 'Personal coaching', industry: 'Fitness', goal: 'Lead generation', title: 'Build strength. Build confidence.', body: 'A personal training plan and expert support, built around your life.', cta: 'Get my free training plan', color: '#27634b', image: '/dashboard/product-workout.png', benefits: ['A plan that fits your goals', 'Expert coaching every week', 'Progress you can measure'] },
  { mode: 'funnel' as const, id: 'wellness', name: 'Nutrition consultation', industry: 'Health & wellness', goal: 'Bookings', title: 'Feel better, one habit at a time.', body: 'Meet your nutrition coach and discover a sustainable approach to healthier living.', cta: 'Book a consultation', color: '#94764b', image: '/dashboard/product-nutrition.png', benefits: ['Personal nutrition guidance', 'Simple daily habits', 'Support at every step'] },
  { mode: 'funnel' as const, id: 'agency', name: 'Agency growth', industry: 'Business services', goal: 'Lead generation', title: 'Your next stage of growth starts here.', body: 'Strategy, creative and campaigns that help ambitious businesses reach more customers.', cta: 'Request a strategy call', color: '#5e47bb', image: '/dashboard/product-consultation.png', benefits: ['A clear growth strategy', 'Creative that connects', 'Results you can track'] },
  { mode: 'funnel' as const, id: 'launch', name: 'Product launch', industry: 'E-commerce', goal: 'Sales', title: 'Meet your new everyday essential.', body: 'Thoughtful design. Lasting quality. Discover the collection made for your everyday.', cta: 'Explore the collection', color: '#20252d', image: '/dashboard/product-nutrition.png', benefits: ['Thoughtfully designed', 'Made to last', 'Easy delivery & returns'] },
  { mode: 'funnel' as const, id: 'course', name: 'Online masterclass', industry: 'Education', goal: 'Lead generation', title: 'Turn your knowledge into your next opportunity.', body: 'Join a practical masterclass with expert instruction and a community that supports your progress.', cta: 'Reserve my place', color: '#285caa', image: '/dashboard/product-consultation.png', benefits: ['Learn from an expert', 'Practice with real projects', 'Grow with a community'] },
  { mode: 'funnel' as const, id: 'studio', name: 'Studio membership', industry: 'Fitness', goal: 'Sales', title: 'Find your space. Find your strength.', body: 'Discover a welcoming training studio with flexible membership and coaches who know your name.', cta: 'Find my membership', color: '#ac4931', image: '/dashboard/product-workout.png', benefits: ['Flexible membership', 'Small group training', 'Experienced coaches'] },
  {mode:'website' as const,id:'coaching-site',name:'Coaching website',industry:'Fitness',goal:'Lead generation',title:'Coaching built around your life.',body:'Meet your coaches, explore training programs, and find your next step.',cta:'Explore our programs',color:'#27634b',image:'/dashboard/product-workout.png',benefits:['Personal training','Nutrition coaching','Progress reviews']},
  {mode:'website' as const,id:'clinic-site',name:'Wellness clinic website',industry:'Health & wellness',goal:'Bookings',title:'Thoughtful care for a healthier you.',body:'Discover our practitioners, treatments and welcoming clinic.',cta:'Explore our services',color:'#94764b',image:'/dashboard/product-nutrition.png',benefits:['Meet our specialists','Personal care plans','Visit our clinic']},
  {mode:'website' as const,id:'agency-site',name:'Agency portfolio website',industry:'Business services',goal:'Lead generation',title:'Good ideas. Lasting impact.',body:'Explore our work, meet our team, and discover how we help brands grow.',cta:'Explore our work',color:'#5e47bb',image:'/dashboard/product-consultation.png',benefits:['Brand strategy','Design and development','Marketing campaigns']},
  {mode:'website' as const,id:'store-site',name:'Product storefront website',industry:'E-commerce',goal:'Sales',title:'Find something made for you.',body:'Browse our collection, learn our story, and get help from our team.',cta:'Explore the collection',color:'#20252d',image:'/pagefly/headphones-product.png',benefits:['Shop the collection','Our design story','Customer support']},
];
export type PageTemplate = typeof pageTemplates[number];
export function createPageAsset(kind:BuilderMode,name:string,template?:PageTemplate):Asset {
  kind=template?.mode??kind;
  const title=name.trim()||template?.name||(kind==='funnel'?'Untitled funnel':'Untitled page');
  const document=initializePage(kind,title,template);
  return {id:crypto.randomUUID(),kind,name:title,document,image:template?.image||'/dashboard/hero-landscape.png',description:template?.body||'Blank page',domain:'',updated:new Date().toISOString(),settings:{seo:title,navigation:document.pages.map(page=>page.name).join(', '),color:template?.color||'#6366f1'}};
}
const block = (type: BuilderSection['type'], title: string, body = '', content: Record<string, string> = {}): BuilderSection => ({ id: crypto.randomUUID(), type, content: { title, body, ...content }, styles: { backgroundColor: '#ffffff', padding: '28', textAlign: 'Left', typography: 'Default', customCss: '', visibility: 'All devices', animation: 'None' } });

export function initializePage(mode: BuilderMode, name: string, template?: PageTemplate) {
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
    benefits.children = template.benefits.map((title, index) => [block('Heading', title, '', { headingTag: 'H3' }), block('Paragraph', '', ['Designed around your needs, with a clear path forward.', 'Get practical support from people who care about your success.', 'Take the next step with confidence and ongoing guidance.'][index])]);
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
