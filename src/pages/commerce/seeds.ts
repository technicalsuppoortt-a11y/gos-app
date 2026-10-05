import aiCourseImg from '../../assets/products/ai-course.jpg';
import socialPackImg from '../../assets/products/social-pack.jpg';
import strategyCallImg from '../../assets/products/strategy-call.jpg';
import whatsappSetupImg from '../../assets/products/whatsapp-setup.jpg';
import funnelSetupImg from '../../assets/products/funnel-setup.jpg';
import agencyKitImg from '../../assets/products/agency-kit.jpg';
import gosProImg from '../../assets/products/gos-pro.jpg';
import growthBundleImg from '../../assets/products/growth-bundle.jpg';
import type { Product } from './model';
import { defaultConfig } from './model';
export const seedProducts:Product[]=[
 {id:'ai-course',name:'Complete AI Marketing Course',type:'Course / Membership',price:'€297',stats:[['sales','124 sales'],['revenue','€36,828 revenue']],status:'Active',sales:'124',revenue:'€36,828',art:'course',image:aiCourseImg,tag:'Course / Membership',description:'Learn how to create, market and sell digital products using AI. Step by step system with real examples and templates.'},
 {id:'social-pack',name:'Social Media Templates Pack',type:'Digital Product',price:'€47',stats:[['sales','312 sales'],['revenue','€14,664 revenue']],status:'Active',sales:'312',revenue:'€14,664',art:'templates',image:socialPackImg,tag:'Digital Product',description:'A ready-to-use library of branded social templates for growing businesses.'},
 {id:'strategy-call',name:'1-on-1 Strategy Call',type:'Service',price:'€97',stats:[['bookings','48 bookings']],status:'Active',sales:'48',revenue:'€4,656',art:'speaker',image:strategyCallImg,tag:'Service',description:'A focused strategy session to turn your next business goal into a practical plan.'},
 {id:'whatsapp-setup',name:'WhatsApp Automation Setup',type:'Service',price:'€497',stats:[['sales','36 sales']],status:'Active',sales:'36',revenue:'€17,892',art:'whatsapp',image:whatsappSetupImg,tag:'Service',description:'Done-with-you setup for WhatsApp lead capture, routing, and automated follow-up.'},
 {id:'funnel-setup',name:'Done-For-You Funnel Setup',type:'Service',price:'€497',stats:[['sales','36 sales']],status:'Draft',sales:'36',revenue:'€17,892',art:'funnel',image:funnelSetupImg,tag:'Service',description:'A conversion-focused funnel built and connected to your business tools.'},
 {id:'agency-kit',name:'Agency Starter Kit',type:'Digital Product',price:'€67',stats:[['sales','210 sales']],status:'Active',sales:'210',revenue:'€14,070',art:'agency',image:agencyKitImg,tag:'Digital Product',description:'Systems, templates, and resources to launch and grow a modern agency.'},
 {id:'gos-pro',name:'GOS Pro Membership',type:'Subscription',price:'€29 / month',stats:[['members','86 members']],status:'Active',sales:'86',revenue:'€2,494',art:'membership',image:gosProImg,tag:'Subscription',description:'A monthly membership for tools, training, and business growth support.'},
 {id:'growth-bundle',name:'Business Growth Bundle',type:'Bundle',price:'€197',stats:[['sales','54 sales']],status:'Active',sales:'54',revenue:'€10,638',art:'bundle',image:growthBundleImg,tag:'Bundle',description:'A curated bundle of digital tools and resources for business growth.'},
];

// Demo content for the existing catalog; persisted customer edits are never replaced.
for (const product of seedProducts) {
  const config = defaultConfig(product.type, product.price);
  const experience = config.experience!;
  experience.shortDescription = product.description;
  if (product.id === 'ai-course') {
    experience.category = 'Marketing'; experience.tags = ['AI', 'Marketing', 'Digital Products', 'Online Business'];
    experience.instructor = { name: 'Mohamed Joe', bio: 'Digital entrepreneur, AI expert and online business creator.', image: strategyCallImg };
    experience.included = ['Step-by-step framework', 'Ready-to-use templates', 'Private community', 'Lifetime access'].map((title, index) => ({ id: `course-benefit-${index}`, title, enabled: true }));
    config.modules = [{ title: 'Module 1: Introduction', lessons: [
      { id: 'welcome', title: 'Welcome to the Course', kind: 'Video', duration: '08:24', url: '' },
      { id: 'outcomes', title: 'What You Will Learn', kind: 'Video', duration: '06:15', url: '' },
      { id: 'tools', title: 'Tools You Need', kind: 'PDF', duration: '2.4 MB', url: '' },
    ] }];
  }
  if (product.id === 'social-pack') {
    experience.category = 'Design Templates'; experience.tags = ['Templates', 'Social Media', 'Design', 'Canva'];
    experience.included = ['Editable Canva templates', 'Step-by-step instructions', 'Commercial use license', 'Lifetime access & future updates'].map((title, index) => ({ id: `digital-benefit-${index}`, title, enabled: true }));
  }
  if (product.type === 'Service') {
    config.duration = 30; config.fulfillment = product.description; experience.provider = 'Mohamed Joe';
    experience.category = 'Consulting'; experience.included = ['30-minute consultation', 'Personalized recommendations', 'Follow-up summary'].map((title, index) => ({ id: `service-benefit-${index}`, title, enabled: true }));
  }
  if (product.type === 'Subscription') { config.fulfillment = product.description; experience.included = ['Business tools', 'Training library', 'Growth support'].map((title, index) => ({ id: `member-benefit-${index}`, title, enabled: true })); }
  if (product.type === 'Bundle') config.components = ['social-pack', 'agency-kit'];
  product.config = config;
}
