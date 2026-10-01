export type LeadStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'BOOKING_OFFERED' | 'BOOKED' | 'CUSTOMER' | 'CLOSED' | 'LEAD_CAPTURED' | 'CONTACT_CREATED' | 'CONVERSATION' | 'BOOKING' | 'PAYMENT_COMPLETED' | 'ACTIVE_CUSTOMER' | 'FOLLOW_UP_NEEDED' | 'RENEWAL_UPSELL' | 'CLOSED_LOST';
export type ProductType = 'Service' | 'Course' | 'Digital Product';
export interface Lead { id:string; name:string; email:string; company:string; source:string; stage:LeadStage; owner:string; value:number; lastActivity:string; nextFollowUp?:string; tags:string[]; avatar:string; color:string; interest:string; }
export interface Product { id:string; name:string; type:ProductType; description:string; price:number; currency:string; status:'Published'|'Draft'; sales:number; calendarId?:string; }
export interface CalendarRecord { id:string; name:string; timezone:string; duration:number; status:'Active'|'Paused'; productId?:string; connected:boolean; }
export interface BookingRecord { id:string; leadId:string; productId:string; calendarId:string; date:string; time:string; status:'Confirmed'|'Pending payment'; }
export const leads:Lead[]=[
 {id:'ld-101',name:'Sarah Chen',email:'sarah@novastudio.co',company:'Nova Studio',source:'Website',stage:'NEW',owner:'Alex Morgan',value:2400,lastActivity:'4 min ago',nextFollowUp:'Today, 3:00 PM',tags:['High intent','Design'],avatar:'SC',color:'peach',interest:'Brand strategy session'},
 {id:'ld-102',name:'Marcus Johnson',email:'marcus@orbitlabs.io',company:'Orbit Labs',source:'Instagram',stage:'CONTACTED',owner:'Jamie Park',value:1800,lastActivity:'22 min ago',nextFollowUp:'Today, 4:30 PM',tags:['SaaS','Priority'],avatar:'MJ',color:'blue',interest:'Growth consulting'},
 {id:'ld-103',name:'Priya Patel',email:'priya@brightpath.com',company:'Brightpath',source:'Referral',stage:'QUALIFIED',owner:'Alex Morgan',value:3200,lastActivity:'1 hour ago',nextFollowUp:'Tomorrow, 10:00 AM',tags:['Referral'],avatar:'PP',color:'lilac',interest:'Brand strategy session'},
 {id:'ld-104',name:'David Kim',email:'david@craftandco.com',company:'Craft & Co.',source:'Landing page',stage:'BOOKING_OFFERED',owner:'Jamie Park',value:1200,lastActivity:'2 hours ago',tags:['E-commerce'],avatar:'DK',color:'mint',interest:'Product launch course'},
 {id:'ld-105',name:'Olivia Martinez',email:'olivia@formstudio.design',company:'Form Studio',source:'Website',stage:'BOOKED',owner:'Alex Morgan',value:2400,lastActivity:'Yesterday',tags:['Design','Returning'],avatar:'OM',color:'rose',interest:'Brand strategy session'},
 {id:'ld-106',name:'Ethan Wright',email:'ethan@northpeak.co',company:'Northpeak',source:'LinkedIn',stage:'CUSTOMER',owner:'Jamie Park',value:4800,lastActivity:'Yesterday',tags:['Enterprise'],avatar:'EW',color:'amber',interest:'Growth consulting'},
 {id:'ld-107',name:'Amara Okafor',email:'amara@monostudio.co',company:'Mono Studio',source:'Instagram',stage:'CLOSED',owner:'Alex Morgan',value:0,lastActivity:'3 days ago',tags:['Unqualified'],avatar:'AO',color:'slate',interest:'Brand strategy session'},
 {id:'ld-108',name:'Noah Thompson',email:'noah@fieldwork.app',company:'Fieldwork',source:'Website',stage:'NEW',owner:'Jamie Park',value:900,lastActivity:'35 min ago',nextFollowUp:'Today, 5:00 PM',tags:['Product-led'],avatar:'NT',color:'green',interest:'Product launch course'},
];
export const products:Product[]=[
 {id:'prd-01',name:'Brand strategy session',type:'Service',description:'A focused 90-minute working session to clarify your positioning and build a practical brand roadmap.',price:1200,currency:'USD',status:'Published',sales:24,calendarId:'cal-01'},
 {id:'prd-02',name:'The Brand Foundations',type:'Course',description:'A self-paced program to build a brand that connects, converts, and scales.',price:349,currency:'USD',status:'Published',sales:86},
 {id:'prd-03',name:'Launch-ready brand kit',type:'Digital Product',description:'A ready-to-customize brand system, templates, and launch checklist for your next idea.',price:89,currency:'USD',status:'Published',sales:142},
];
export const calendars:CalendarRecord[]=[{id:'cal-01',name:'Northstar Consultations',timezone:'America/New_York',duration:60,status:'Active',productId:'prd-01',connected:true},{id:'cal-02',name:'Strategy Session',timezone:'America/New_York',duration:90,status:'Active',productId:'prd-01',connected:false}];
export const bookings:BookingRecord[]=[{id:'bk-801',leadId:'ld-105',productId:'prd-01',calendarId:'cal-01',date:'Today',time:'2:30 PM',status:'Confirmed'},{id:'bk-802',leadId:'ld-103',productId:'prd-01',calendarId:'cal-01',date:'Today',time:'4:00 PM',status:'Confirmed'},{id:'bk-803',leadId:'ld-102',productId:'prd-01',calendarId:'cal-01',date:'Tomorrow',time:'10:30 AM',status:'Pending payment'}];
export const channels=[{id:'whatsapp',name:'WhatsApp',color:'channel-green'},{id:'instagram',name:'Instagram',color:'channel-purple'},{id:'messenger',name:'Messenger',color:'channel-blue'},{id:'email',name:'Email',color:'channel-orange'}];
export const stageLabel:Record<LeadStage,string>={NEW:'New',CONTACTED:'Contacted',QUALIFIED:'Qualified',BOOKING_OFFERED:'Booking offered',BOOKED:'Booked',CUSTOMER:'Customer',CLOSED:'Closed',LEAD_CAPTURED:'Lead captured',CONTACT_CREATED:'Contact created',CONVERSATION:'Conversation',BOOKING:'Booking offered / booked',PAYMENT_COMPLETED:'Payment completed',ACTIVE_CUSTOMER:'Active customer',FOLLOW_UP_NEEDED:'Follow-up needed',RENEWAL_UPSELL:'Renewal / upsell',CLOSED_LOST:'Closed / lost'};
export const initialsColor=(c:string)=>`avatar-${c}`;
import type { Role, StoredAuth } from '../types/auth';

export const demoAccounts: { email: string; password: string; role: Role; name: string; tenant?: { id: string; name: string; domain: string } }[] = [
  { email: 'superadmin@brand.com', password: '12345678', role: 'SUPER_ADMIN', name: 'Jordan Blake' },
  { email: 'admin@brand.com', password: '12345678', role: 'ADMIN', name: 'Taylor Reed', tenant: { id: 'tenant-brand', name: 'Brand Studio', domain: 'brand.com' } },
  { email: 'user@brand.com', password: '12345678', role: 'USER', name: 'Alex Morgan', tenant: { id: 'tenant-brand', name: 'Brand Studio', domain: 'brand.com' } },
];

export function authenticateDemo(email: string, password: string): StoredAuth | null {
  const normalizedEmail = email.trim().toLowerCase();
  const account = demoAccounts.find((candidate) => candidate.email === normalizedEmail);
  const isStandardUser = normalizedEmail.includes('@') && normalizedEmail.split('@')[1]?.includes('.');
  if (password !== '12345678' || (!account && !isStandardUser)) return null;

  const role: Role = account?.role ?? 'USER';
  const name = account?.name ?? normalizedEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  return {
    user: { id: account?.email ?? normalizedEmail, name, email: normalizedEmail },
    role,
    tenant: role === 'SUPER_ADMIN' ? null : account?.tenant ?? { id: 'tenant-brand', name: 'Brand Studio', domain: normalizedEmail.split('@')[1] },
    token: `gos-demo-${role.toLowerCase()}-${btoa(normalizedEmail)}`,
  };
}

