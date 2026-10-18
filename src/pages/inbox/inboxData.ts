import sarah from "../../assets/inbox/sarah.jpg";
import omar from "../../assets/inbox/omar.jpg";
import lina from "../../assets/inbox/lina.jpg";
import ahmed from "../../assets/inbox/ahmed.jpg";
import nour from "../../assets/inbox/nour.jpg";
import karim from "../../assets/inbox/karim.jpg";
import diana from "../../assets/inbox/diana.jpg";
import youssef from "../../assets/inbox/youssef.jpg";
import mona from "../../assets/inbox/mona.jpg";
import hassan from "../../assets/inbox/hassan.jpg";
import mohamed from "../../assets/inbox/mohamed.jpg";

export type ChannelId = "instagram" | "facebook" | "whatsapp" | "messenger" | "webchat" | "email";
export type TagId = "new" | "interested" | "booking" | "question";
export type Sender = "customer" | "ai" | "agent" | "note";
export type ActivityKind = "ai" | "customer" | "tag" | "created" | "agent" | "note" | "handoff";

export type Attachment = { id: string; name: string; size: number; url: string; isImage: boolean };
export type VoiceNote = { url: string; duration: number };

export type Message = {
  id: string;
  sender: Sender;
  text?: string;
  time: string;
  card?: "consultation";
  attachments?: Attachment[];
  voice?: VoiceNote;
};

export type Activity = { id: string; kind: ActivityKind; text: string; time: string };

export type Conversation = {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  channel: ChannelId;
  preview: string;
  time: string;
  unread: number;
  tags: TagId[];
  stage: string;
  source: string;
  phone: string;
  email: string;
  location: string;
  assignee: string;
  aiAutoReply: boolean;
  takenOver: boolean;
  followUp: boolean;
  followUpRules: boolean[];
  starred: boolean;
  messages: Message[];
  activity: Activity[];
};

export const channelMeta: Record<ChannelId, { label: string }> = {
  email: { label: "Email" },
  instagram: { label: "Instagram" },
  facebook: { label: "Facebook" },
  whatsapp: { label: "WhatsApp" },
  messenger: { label: "Messenger" },
  webchat: { label: "Website Chat" },
};

export const channelOrder: ChannelId[] = ["instagram", "facebook", "whatsapp", "messenger", "webchat", "email"];

export const tagMeta: Record<TagId, { label: string; className: string }> = {
  new: {
    label: "New Lead",
    className: "bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300",
  },
  interested: {
    label: "Interested",
    className: "bg-blue-50 text-blue-500 dark:bg-blue-500/15 dark:text-blue-300",
  },
  booking: {
    label: "Booking",
    className: "bg-orange-50 text-orange-500 dark:bg-orange-500/15 dark:text-orange-300",
  },
  question: {
    label: "Question",
    className: "bg-purple-50 text-purple-500 dark:bg-purple-500/15 dark:text-purple-300",
  },
};

export const stages = ["New Lead", "Contacted", "Interested", "Booking", "Customer", "Lost"];

export const teamMembers = [] as {id:string;name:string;initials:string;avatar?:string}[];

export const currentUser = {id:'',name:'',initials:''};

export const followUpRuleLabels = [
  "Auto-reply to new messages",
  "Send follow-up if no response (24h)",
  "Qualify and book consultations",
];

export const replyTemplates = [] as {title:string;body:string}[];

const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

const quickThread = (customer: string, time: string, ai?: string, aiTime?: string): Message[] => [
  { id: uid("m"), sender: "customer", text: customer, time },
  ...(ai ? [{ id: uid("m"), sender: "ai" as const, text: ai, time: aiTime ?? time }] : []),
];

const baseActivity = (created: string, extra: Activity[] = []): Activity[] => [
  ...extra,
  { id: uid("a"), kind: "created", text: "Conversation created", time: created },
];

const rules = (a = true, b = true, c = true) => [a, b, c];

export const initialConversations: Conversation[] = [];

/** Fictional contacts for browser-only demos; never seed the live workspace. */
export function demoConversations(assignee: string): Conversation[] {
  const contact = (id: string, name: string, channel: ChannelId, avatar: string, details: Partial<Conversation>): Conversation => ({
    id: `demo-${id}`, name, avatar, initials: name.split(' ').map(word => word[0]).join(''), channel,
    preview: '', time: 'Just now', unread: 0, tags: [], stage: 'Interested',
    source: channelMeta[channel].label, phone: '', email: `${id}@example.com`, location: 'Cairo, Egypt',
    assignee, aiAutoReply: false, takenOver: true, followUp: true, followUpRules: [true, false, true],
    starred: false, messages: [], activity: [
      { id: `demo-${id}-created`, kind: 'created', text: `Conversation started from ${channelMeta[channel].label}`, time: 'Today, 9:00 AM' },
    ], ...details,
  });
  return [
    contact('sarah', 'Sarah Ahmed', 'whatsapp', sarah, {
      preview: 'Thursday at 2 PM works perfectly. Is the first consultation online?', time: '2 min', unread: 2,
      tags: ['booking', 'interested'], stage: 'Booking', phone: '+20 100 555 0142', starred: true,
      messages: [
        { id: 'demo-sarah-1', sender: 'customer', text: 'Hi! I found your growth consultation on Instagram. I run a small skincare brand and would love some help with our launch.', time: '10:12 AM' },
        { id: 'demo-sarah-2', sender: 'ai', text: 'Hi Sarah! Happy to help. Are you looking for support with your launch strategy, paid ads, or both?', time: '10:12 AM' },
        { id: 'demo-sarah-3', sender: 'customer', text: 'Both, ideally. We launch next month and have a budget of around EGP 15,000 for the first campaign.', time: '10:14 AM' },
        { id: 'demo-sarah-4', sender: 'note', text: 'Warm lead · interested in the Growth package. Discuss launch timeline during the discovery call.', time: '10:16 AM' },
        { id: 'demo-sarah-5', sender: 'agent', text: 'Thanks for the details, Sarah. We can start with a 30-minute discovery call. Would Thursday at 2 PM Cairo time suit you?', time: '10:18 AM' },
        { id: 'demo-sarah-6', sender: 'customer', text: 'Thursday at 2 PM works perfectly. Is the first consultation online?', time: '10:21 AM' },
      ],
      activity: [
        { id: 'demo-sarah-a1', kind: 'tag', text: 'Tagged as Booking and Interested', time: '10:18 AM' },
        { id: 'demo-sarah-a2', kind: 'handoff', text: `${assignee} took over the conversation`, time: '10:16 AM' },
        { id: 'demo-sarah-a3', kind: 'created', text: 'New enquiry from WhatsApp Business', time: '10:12 AM' },
      ],
    }),
    contact('omar', 'Omar Hassan', 'facebook', omar, {
      preview: 'Could you send me the difference between the Starter and Growth packages?', time: '18 min', unread: 1,
      tags: ['new', 'question'], stage: 'New Lead', location: 'Alexandria, Egypt',
      messages: [
        { id: 'demo-omar-1', sender: 'customer', text: 'Hello! I saw your Facebook post about the website + marketing package. Does it include an online booking page?', time: '9:35 AM' },
        { id: 'demo-omar-2', sender: 'agent', text: 'Hi Omar, yes! Both packages include a mobile-friendly booking page. What kind of business are you building it for?', time: '9:39 AM' },
        { id: 'demo-omar-3', sender: 'customer', text: 'A photography studio in Alexandria. We need portrait sessions and event enquiries in one place.', time: '9:42 AM' },
        { id: 'demo-omar-4', sender: 'agent', text: 'That sounds like a great fit. We can give portrait sessions their own calendar and collect event details through a separate enquiry form.', time: '9:44 AM' },
        { id: 'demo-omar-5', sender: 'customer', text: 'Could you send me the difference between the Starter and Growth packages?', time: '10:05 AM' },
      ],
    }),
    contact('lina', 'Lina Mostafa', 'instagram', lina, {
      preview: 'Amazing, thank you! I’ll bring the brand photos to our call 😊', time: '1 hr', unread: 0,
      tags: ['interested', 'booking'], stage: 'Customer', location: 'Giza, Egypt',
      messages: [
        { id: 'demo-lina-1', sender: 'customer', text: 'Good morning! Just checking that our onboarding call is still on for tomorrow at 11?', time: '8:47 AM' },
        { id: 'demo-lina-2', sender: 'agent', text: 'Good morning, Lina! Yes, tomorrow at 11 AM Cairo time is confirmed. Your meeting link is in the confirmation email.', time: '8:52 AM' },
        { id: 'demo-lina-3', sender: 'customer', text: 'Found it! Is there anything I should prepare?', time: '8:55 AM' },
        { id: 'demo-lina-4', sender: 'note', text: 'Existing customer · onboarding for the spring collection landing page. Brand brief received.', time: '8:56 AM' },
        { id: 'demo-lina-5', sender: 'agent', text: 'Your logo, brand photos and your top three goals would be perfect. We’ll map out the landing page together during the call.', time: '8:58 AM' },
        { id: 'demo-lina-6', sender: 'customer', text: 'Amazing, thank you! I’ll bring the brand photos to our call 😊', time: '9:02 AM' },
      ],
    }),
  ];
}

export const demoReplyTemplates = [
  { title: 'Book a discovery call', body: 'Thanks for your interest! We can arrange a 30-minute online discovery call. Which day and time work best for you?' },
  { title: 'Compare our packages', body: 'The Starter package covers your website and booking page. Growth also includes launch planning, campaign support and monthly reporting. I’d be happy to help you choose.' },
  { title: 'Confirm onboarding', body: 'Your onboarding call is confirmed. Please bring your logo, brand photos and your main goals. We look forward to meeting you!' },
];

export const makeId = uid;
