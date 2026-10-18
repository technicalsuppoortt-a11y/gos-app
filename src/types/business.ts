export type LeadStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'BOOKING_OFFERED' | 'BOOKED' | 'CUSTOMER' | 'CLOSED' | 'LEAD_CAPTURED' | 'CONTACT_CREATED' | 'CONVERSATION' | 'BOOKING' | 'PAYMENT_COMPLETED' | 'ACTIVE_CUSTOMER' | 'FOLLOW_UP_NEEDED' | 'RENEWAL_UPSELL' | 'CLOSED_LOST';
export type ProductType = 'Service' | 'Course' | 'Digital Product';
export interface Lead { id:string; name:string; email:string; company:string; source:string; stage:LeadStage; owner:string; value:number; lastActivity:string; nextFollowUp?:string; tags:string[]; avatar:string; color:string; interest:string; }
export interface Product { id:string; name:string; type:ProductType; description:string; price:number; currency:string; status:'Published'|'Draft'; sales:number; calendarId?:string; }
export interface CalendarRecord { id:string; name:string; timezone:string; duration:number; status:'Active'|'Paused'; productId?:string; connected:boolean; }
export interface BookingRecord { id:string; leadId:string; productId:string; calendarId:string; date:string; time:string; status:'Confirmed'|'Pending payment'; }

export const stageLabel:Record<LeadStage,string>={NEW:'New',CONTACTED:'Contacted',QUALIFIED:'Qualified',BOOKING_OFFERED:'Booking offered',BOOKED:'Booked',CUSTOMER:'Customer',CLOSED:'Closed',LEAD_CAPTURED:'Lead captured',CONTACT_CREATED:'Contact created',CONVERSATION:'Conversation',BOOKING:'Booking offered / booked',PAYMENT_COMPLETED:'Payment completed',ACTIVE_CUSTOMER:'Active customer',FOLLOW_UP_NEEDED:'Follow-up needed',RENEWAL_UPSELL:'Renewal / upsell',CLOSED_LOST:'Closed / lost'};
